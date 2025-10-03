#pragma once
#include <thread>
#include "system_metrics.h"

// Forward-declare Boost types to keep header lightweight.
namespace boost {
namespace asio {
namespace ip {
class tcp;
} // ip
} // asio
} // boost

class WebSocketServer {
public:
    explicit WebSocketServer(unsigned short port);
    void run();
private:
    // io_context and acceptor are declared in implementation (.cpp)
    SystemMetrics collect_once(); // helper to call collector from .cpp
    void do_accept();
    void handle_session(/* socket type hidden */ void* socket_placeholder);
    MetricsCollector collector;
    unsigned short port_;
};
