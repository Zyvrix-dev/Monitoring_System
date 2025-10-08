#include "server_config.h"

#include <cstdlib>
#include <iostream>
#include <limits>
#include <stdexcept>

namespace
{

    unsigned short parse_port(const char *raw, unsigned short fallback)
    {
        if (raw == nullptr || *raw == '\0')
        {
            return fallback;
        }

        try
        {
            const long value = std::stol(raw);
            if (value <= 0 || value > std::numeric_limits<unsigned short>::max())
            {
                throw std::out_of_range("port out of range");
            }
            return static_cast<unsigned short>(value);
        }
        catch (const std::exception &ex)
        {
            std::cerr << "Invalid MONITORING_WS_PORT value ('" << raw << "'): " << ex.what()
                      << ". Falling back to " << fallback << std::endl;
            return fallback;
        }
    }

    std::size_t parse_limit(const char *raw, std::size_t fallback, std::size_t min_value, std::size_t max_value)
    {
        if (raw == nullptr || *raw == '\0')
        {
            return fallback;
        }

        try
        {
            const unsigned long long value = std::stoull(raw);
            if (value < min_value)
            {
                return min_value;
            }
            if (value > max_value)
            {
                return max_value;
            }
            return static_cast<std::size_t>(value);
        }
        catch (const std::exception &ex)
        {
            std::cerr << "Invalid MONITORING_WS_MAX_CLIENTS value ('" << raw << "'): " << ex.what()
                      << ". Falling back to " << fallback << std::endl;
            return fallback;
        }
    }

} // namespace

ServerConfig load_server_config()
{
    ServerConfig config{};

    if (const char *endpoint = std::getenv("MONITORING_METRICS_ENDPOINT"))
    {
        if (*endpoint != '\0')
        {
            config.metrics_endpoint = endpoint;
        }
    }

    if (config.metrics_endpoint.empty())
    {
        config.metrics_endpoint = "http://0.0.0.0:8080/metrics";
    }

    if (const char *token = std::getenv("MONITORING_API_TOKEN"))
    {
        config.api_token = token;
    }

    config.websocket_port = parse_port(std::getenv("MONITORING_WS_PORT"), 9002);
    config.max_sessions = parse_limit(std::getenv("MONITORING_WS_MAX_CLIENTS"), 32, 1, 4096);

    return config;
}
