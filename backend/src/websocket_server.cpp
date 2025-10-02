#include "websocket_server.h"
#include <nlohmann/json.hpp>
#include <chrono>
#include <thread>

WebSocketServer::WebSocketServer(unsigned short port)
    : acceptor_(ioc, tcp::endpoint(tcp::v4(), port)) {}

void WebSocketServer::run() {
    do_accept();
    ioc.run();
}

void WebSocketServer::do_accept() {
    acceptor_.async_accept([this](boost::system::error_code ec, tcp::socket socket){
        if(!ec) {
            std::thread(&WebSocketServer::handle_session, this, std::move(socket)).detach();
        }
        do_accept();
    });
}

void WebSocketServer::handle_session(tcp::socket socket) {
    websocket::stream<tcp::socket> ws(std::move(socket));
    ws.accept();

    while(true) {
        SystemMetrics m = collector.collect();
        nlohmann::json j;
        j["cpu"] = m.cpuUsage;
        j["memory"] = m.memoryUsage;
        j["connections"] = m.activeConnections;

        ws.text(true);
        ws.write(net::buffer(j.dump()));

        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
}
