#include "rest_server.h"
#include "websocket_server.h"
#include <thread>
#include <iostream>

int main()
{
    RestServer restServer("http://0.0.0.0:8080/metrics");
    std::thread([&]
                { restServer.start(); })
        .detach();

    WebSocketServer wsServer(9002);
    std::cout << "WebSocket server running on ws://localhost:9002" << std::endl;
    wsServer.run();

    return 0;
}
