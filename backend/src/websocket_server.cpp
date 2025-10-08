#include "websocket_server.h"

// Include Boost beast/asio only in .cpp (limits macro/template exposure)
#include <boost/asio.hpp>
#include <boost/beast.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/version.hpp>
#include <boost/beast/websocket.hpp>
#include <nlohmann/json.hpp>
#include <chrono>
#include <cstdlib>
#include <functional>
#include <memory>
#include <thread>
#include <iostream>
#include <unordered_map>
#include <sstream>

namespace beast = boost::beast;
namespace websocket = beast::websocket;
namespace net = boost::asio;
using tcp = net::ip::tcp;

namespace
{
std::unordered_map<std::string, std::string> parse_query_string(beast::string_view target)
{
    std::unordered_map<std::string, std::string> params;
    const auto pos = target.find('?');
    if (pos == beast::string_view::npos)
    {
        return params;
    }

    const auto query = target.substr(pos + 1);
    std::string query_str(query);
    std::stringstream ss(query_str);
    std::string pair;

    auto url_decode = [](const std::string &value) {
        std::string result;
        result.reserve(value.size());
        for (std::size_t i = 0; i < value.size(); ++i)
        {
            if (value[i] == '%' && i + 2 < value.size())
            {
                std::string hex = value.substr(i + 1, 2);
                char decoded = static_cast<char>(std::strtol(hex.c_str(), nullptr, 16));
                result.push_back(decoded);
                i += 2;
            }
            else if (value[i] == '+')
            {
                result.push_back(' ');
            }
            else
            {
                result.push_back(value[i]);
            }
        }
        return result;
    };

    while (std::getline(ss, pair, '&'))
    {
        if (pair.empty())
        {
            continue;
        }
        const auto equal_pos = pair.find('=');
        if (equal_pos == std::string::npos)
        {
            continue;
        }

        std::string key = pair.substr(0, equal_pos);
        std::string value = pair.substr(equal_pos + 1);
        params[url_decode(key)] = url_decode(value);
    }

    return params;
}

bool constant_time_equals(const std::string &lhs, const std::string &rhs)
{
    if (lhs.size() != rhs.size())
    {
        return false;
    }

    unsigned char result = 0;
    for (std::size_t i = 0; i < lhs.size(); ++i)
    {
        result |= static_cast<unsigned char>(lhs[i] ^ rhs[i]);
    }
    return result == 0;
}
}

WebSocketServer::WebSocketServer(unsigned short port, std::string apiToken, std::size_t maxSessions)
    : collector(), port_(port), api_token_(std::move(apiToken)),
      max_sessions_(maxSessions == 0 ? 1 : maxSessions), active_sessions_(0) {}

SystemMetrics WebSocketServer::collect_once() {
    return collector.collect();
}

bool WebSocketServer::is_token_valid(const std::string &provided) const
{
    if (api_token_.empty())
    {
        return true;
    }

    if (provided.empty())
    {
        return false;
    }

    return constant_time_equals(provided, api_token_);
}

void WebSocketServer::run() {
    try {
        net::io_context ioc{1};
        tcp::acceptor acceptor{ioc, tcp::endpoint(tcp::v4(), port_)};

        std::cout << "WebSocket server listening on port: " << port_ << std::endl;

        for (;;) {
            tcp::socket socket{ioc};
            acceptor.accept(socket);

            // Launch a detached thread to handle the session
            std::thread([s = std::move(socket), this]() mutable {
                try {
                    s.set_option(tcp::no_delay(true));
                    s.set_option(net::socket_base::keep_alive(true));

                    websocket::stream<tcp::socket> ws{std::move(s)};
                    ws.set_option(websocket::stream_base::timeout::suggested(beast::role_type::server));
                    ws.read_message_max(64 * 1024);
                    ws.set_option(websocket::stream_base::decorator([](websocket::response_type &res) {
                        res.set(beast::http::field::server, BOOST_BEAST_VERSION_STRING " monitoring-service");
                    }));

                    beast::http::request<beast::http::string_body> req;
                    ws.accept(req);

                    const auto params = parse_query_string(req.target());
                    const auto it = params.find("token");
                    const std::string provided_token = it != params.end() ? it->second : std::string();
                    if (!is_token_valid(provided_token)) {
                        std::cerr << "Rejected WebSocket client due to invalid token" << std::endl;
                        websocket::close_reason reason(websocket::close_code::policy_error);
                        reason.reason = "Missing or invalid token";
                        ws.close(reason);
                        return;
                    }

                    const auto current_sessions = active_sessions_.fetch_add(1, std::memory_order_relaxed) + 1;

                    if (current_sessions > max_sessions_) {
                        std::cerr << "Rejecting WebSocket client: too many active sessions" << std::endl;
                        active_sessions_.fetch_sub(1, std::memory_order_relaxed);
                        websocket::close_reason reason(websocket::close_code::try_again_later);
                        reason.reason = "Server busy";
                        ws.close(reason);
                        return;
                    }

                    auto guard = std::unique_ptr<void, std::function<void(void*)>>(nullptr, [this](void*) {
                        active_sessions_.fetch_sub(1, std::memory_order_relaxed);
                    });

                    ws.text(true);
                    while (ws.is_open()) {
                        SystemMetrics m = this->collect_once();
                        nlohmann::json j;
                        j["cpu"] = m.cpuUsage;
                        j["memory"] = m.memoryUsage;
                        j["connections"] = m.activeConnections;
                        j["disk"] = m.diskUsage;
                        j["load1"] = m.loadAverage1;
                        j["load5"] = m.loadAverage5;
                        j["load15"] = m.loadAverage15;
                        j["netRx"] = m.networkReceiveRate;
                        j["netTx"] = m.networkTransmitRate;
                        j["cpuCores"] = m.cpuCount;
                        j["timestamp"] = MetricsCollector::to_iso8601(m.timestamp);

                        ws.write(net::buffer(j.dump()));
                        std::this_thread::sleep_for(std::chrono::seconds(1));
                    }
                } catch (const std::exception& e) {
                    // Session error — log and exit thread
                    std::cerr << "WebSocket session error: " << e.what() << std::endl;
                }
            }).detach();
        }
    } catch (const std::exception& e) {
        std::cerr << "WebSocket server fatal error: " << e.what() << std::endl;
    }
}

// Unused placeholder to match header signature (keeps header simple)
void WebSocketServer::handle_session(void* /*socket_placeholder*/) {
    // implementation lives in run() above (we used lambda threads there)
}
