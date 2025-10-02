#include "system_metrics.h"
#include <fstream>
#include <sstream>
#include <string>
#include <cstdlib>
#include <regex>

SystemMetrics MetricsCollector::collect()
{
    SystemMetrics m{};

    // Simple CPU usage simulation (replace with actual if needed)
    m.cpuUsage = rand() % 100;

    // Simple memory usage simulation
    m.memoryUsage = rand() % 100;

    // Active TCP connections (simulate or parse from /proc/net/tcp)
    m.activeConnections = rand() % 50;

    return m;
}
