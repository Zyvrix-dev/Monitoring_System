#pragma once
#include <mutex>
#include <string>
#include <vector>

struct SystemMetrics
{
    double cpuUsage;       // CPU usage in %
    double memoryUsage;    // Memory usage in %
    int activeConnections; // Active TCP connections
};

class MetricsCollector
{
public:
    MetricsCollector();
    SystemMetrics collect();

private:
    double read_cpu_usage();
    double read_memory_usage();
    int read_active_connections();
    int count_connections_from_proc(const std::string &path);

    std::mutex mutex_;
    bool cpu_initialized_;
    unsigned long long previous_total_;
    unsigned long long previous_idle_;
};
