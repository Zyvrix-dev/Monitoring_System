#pragma once
#include <atomic>
#include <cstddef>
#include <string>
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
    explicit WebSocketServer(unsigned short port, std::string apiToken = {}, std::size_t maxSessions = 32);
    void run();
private:
    // io_context and acceptor are declared in implementation (.cpp)
    SystemMetrics collect_once(); // helper to call collector from .cpp
    void do_accept();
    void handle_session(/* socket type hidden */ void* socket_placeholder);
    MetricsCollector collector;
    unsigned short port_;
    std::string api_token_;
    std::size_t max_sessions_;
    std::atomic<std::size_t> active_sessions_;
    bool is_token_valid(const std::string &provided) const;
};
