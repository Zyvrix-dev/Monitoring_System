#pragma once
#include "system_metrics.h"
#include <cpprest/http_listener.h>

class RestServer
{
public:
    RestServer(const std::string &url);
    void start();

private:
    web::http::experimental::listener::http_listener listener;
    MetricsCollector collector;
    void handle_get(web::http::http_request request);
};
