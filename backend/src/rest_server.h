#pragma once
#include "system_metrics.h"
#include <cpprest/http_listener.h>

class RestServer
{
public:
    RestServer(const std::string &url, std::string apiToken = {});
    void start();

private:
    web::http::experimental::listener::http_listener listener;
    MetricsCollector collector;
    std::string api_token_;
    bool authorize(const web::http::http_request &request) const;
    void handle_get(web::http::http_request request);
};
