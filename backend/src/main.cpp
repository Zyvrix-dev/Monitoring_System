#include "rest_server.h"
#include "server_config.h"
#include "websocket_server.h"

#include <iostream>
#include <thread>

int main()
{
    const ServerConfig config = load_server_config();

    RestServer restServer(config.metrics_endpoint, config.api_token);
    std::thread rest_thread([&restServer]() { restServer.start(); });
    rest_thread.detach();

    WebSocketServer wsServer(config.websocket_port, config.api_token, config.max_sessions);
    std::cout << "WebSocket server running on ws://0.0.0.0:" << config.websocket_port << std::endl;
    wsServer.run();

    return 0;
}
