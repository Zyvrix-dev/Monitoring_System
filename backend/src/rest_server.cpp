#include "rest_server.h"
#include <cpprest/http_headers.h>
#include <cpprest/json.h>
#include <iostream>
#include <functional>

namespace
{
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

RestServer::RestServer(const std::string &url, std::string apiToken)
    : listener(utility::conversions::to_string_t(url)), collector(), api_token_(std::move(apiToken))
{
    listener.support(web::http::methods::GET, std::bind(&RestServer::handle_get, this, std::placeholders::_1));
}

void RestServer::start()
{
    listener.open()
        .then([]
              { std::cout << "REST endpoint listening for metrics" << std::endl; })
        .wait();
}

void RestServer::handle_get(web::http::http_request request)
{
    if (!authorize(request))
    {
        web::http::http_response response(web::http::status_codes::Unauthorized);
        response.headers().add(web::http::header_names::cache_control, utility::conversions::to_string_t("no-store"));
        response.headers().add(web::http::header_names::content_type, utility::conversions::to_string_t("application/json"));
        web::json::value body;
        body[utility::conversions::to_string_t("error")] = web::json::value::string(utility::conversions::to_string_t("Unauthorized"));
        response.set_body(body);
        request.reply(response);
        return;
    }

    SystemMetrics m = collector.collect();
    web::json::value response;
    response[utility::conversions::to_string_t("cpu")] = web::json::value::number(m.cpuUsage);
    response[utility::conversions::to_string_t("memory")] = web::json::value::number(m.memoryUsage);
    response[utility::conversions::to_string_t("connections")] = web::json::value::number(m.activeConnections);
    response[utility::conversions::to_string_t("disk")] = web::json::value::number(m.diskUsage);
    response[utility::conversions::to_string_t("load1")] = web::json::value::number(m.loadAverage1);
    response[utility::conversions::to_string_t("load5")] = web::json::value::number(m.loadAverage5);
    response[utility::conversions::to_string_t("load15")] = web::json::value::number(m.loadAverage15);
    response[utility::conversions::to_string_t("netRx")] = web::json::value::number(m.networkReceiveRate);
    response[utility::conversions::to_string_t("netTx")] = web::json::value::number(m.networkTransmitRate);
    response[utility::conversions::to_string_t("cpuCores")] = web::json::value::number(m.cpuCount);
    response[utility::conversions::to_string_t("timestamp")] = web::json::value::string(utility::conversions::to_string_t(MetricsCollector::to_iso8601(m.timestamp)));

    web::http::http_response httpResponse(web::http::status_codes::OK);
    httpResponse.headers().add(web::http::header_names::cache_control, utility::conversions::to_string_t("no-store"));
    httpResponse.headers().add(web::http::header_names::content_type, utility::conversions::to_string_t("application/json"));
    httpResponse.set_body(response);
    request.reply(httpResponse);
}

bool RestServer::authorize(const web::http::http_request &request) const
{
    if (api_token_.empty())
    {
        return true;
    }

    const auto &headers = request.headers();
    auto authIter = headers.find(web::http::header_names::authorization);
    if (authIter == headers.end())
    {
        return false;
    }

    const std::string headerValue = utility::conversions::to_utf8string(authIter->second);
    constexpr char prefix[] = "Bearer ";
    if (headerValue.compare(0, sizeof(prefix) - 1, prefix) != 0)
    {
        return false;
    }

    const std::string token = headerValue.substr(sizeof(prefix) - 1);
    return constant_time_equals(token, api_token_);
}
