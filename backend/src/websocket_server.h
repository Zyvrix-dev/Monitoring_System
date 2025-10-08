#pragma once
#include <atomic>
#include <cstddef>
#include <string>
#include <thread>

#include "system_metrics.h"

class WebSocketServer {
public:
    explicit WebSocketServer(unsigned short port, std::string apiToken = {}, std::size_t maxSessions = 32);
    void run();
private:
    SystemMetrics collect_once();
    MetricsCollector collector;
    unsigned short port_;
    std::string api_token_;
    std::size_t max_sessions_;
    std::atomic<std::size_t> active_sessions_;
    bool is_token_valid(const std::string &provided) const;
};
