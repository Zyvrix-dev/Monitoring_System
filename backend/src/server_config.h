#pragma once

#include <cstddef>
#include <string>

struct ServerConfig
{
    std::string metrics_endpoint;
    std::string api_token;
    unsigned short websocket_port;
    std::size_t max_sessions;
};

ServerConfig load_server_config();

