#include "rest_server.h"
#include <cpprest/json.h>

RestServer::RestServer(const std::string &url)
    : listener(web::http::experimental::listener::http_listener(url))
{
    listener.support(web::http::methods::GET, std::bind(&RestServer::handle_get, this, std::placeholders::_1));
}

void RestServer::start()
{
    listener.open().wait();
}

void RestServer::handle_get(web::http::http_request request)
{
    SystemMetrics m = collector.collect();
    web::json::value response;
    response["cpu"] = web::json::value::number(m.cpuUsage);
    response["memory"] = web::json::value::number(m.memoryUsage);
    response["connections"] = web::json::value::number(m.activeConnections);
    request.reply(web::http::status_codes::OK, response);
}
