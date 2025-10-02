#pragma once
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
    SystemMetrics collect();
};
