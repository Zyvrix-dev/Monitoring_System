#include "websocket_server.h"

// Include Boost beast/asio only in .cpp (limits macro/template exposure)
#include <boost/asio.hpp>
#include <boost/beast.hpp>
#include <boost/beast/websocket.hpp>
#include <nlohmann/json.hpp>
#include <chrono>
#include <thread>
#include <iostream>

namespace beast = boost::beast;
namespace websocket = beast::websocket;
namespace net = boost::asio;
using tcp = net::ip::tcp;

WebSocketServer::WebSocketServer(unsigned short port)
    : collector(), port_(port) {}

SystemMetrics WebSocketServer::collect_once() {
    return collector.collect();
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
                    websocket::stream<tcp::socket> ws{std::move(s)};
                    ws.accept();

                    while (ws.is_open()) {
                        SystemMetrics m = this->collect_once();
                        nlohmann::json j;
                        j["cpu"] = m.cpuUsage;
                        j["memory"] = m.memoryUsage;
                        j["connections"] = m.activeConnections;

                        ws.text(true);
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
