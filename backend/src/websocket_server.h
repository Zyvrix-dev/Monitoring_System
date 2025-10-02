#pragma once
#include <boost/asio.hpp>
#include <boost/beast.hpp>
#include <thread>
#include "system_metrics.h"

namespace beast = boost::beast;
namespace websocket = beast::websocket;
namespace net = boost::asio;
using tcp = net::ip::tcp;

class WebSocketServer
{
public:
    WebSocketServer(unsigned short port);
    void run();

private:
    net::io_context ioc;
    tcp::acceptor acceptor_;
    MetricsCollector collector;
    void do_accept();
    void handle_session(tcp::socket socket);
};
