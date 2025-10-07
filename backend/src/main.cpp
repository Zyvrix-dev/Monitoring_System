#include "rest_server.h"
#include "websocket_server.h"
#include <thread>
#include <iostream>
#include <cstdlib>
#include <string>
#include <stdexcept>

int main()
{
    const char *token_env = std::getenv("MONITORING_API_TOKEN");
    std::string apiToken = token_env ? token_env : "";

    std::size_t maxSessions = 32;
    if (const char *max_sessions_env = std::getenv("MONITORING_WS_MAX_CLIENTS"))
    {
        try
        {
            unsigned long value = std::stoul(max_sessions_env);
            if (value > 0)
            {
                maxSessions = value;
            }
        }
        catch (const std::exception &)
        {
            std::cerr << "Invalid MONITORING_WS_MAX_CLIENTS value. Falling back to default." << std::endl;
        }
    }

    RestServer restServer("http://0.0.0.0:8080/metrics", apiToken);
    std::thread([&]
                { restServer.start(); })
        .detach();

    WebSocketServer wsServer(9002, apiToken, maxSessions);
    std::cout << "WebSocket server running on ws://localhost:9002" << std::endl;
    wsServer.run();

    return 0;
}
