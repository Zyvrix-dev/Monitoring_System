#include "system_metrics.h"
#include <algorithm>
#include <fstream>
#include <sstream>
#include <string>

namespace
{
constexpr const char *PROC_STAT_PATH = "/proc/stat";
constexpr const char *PROC_MEMINFO_PATH = "/proc/meminfo";
constexpr const char *PROC_TCP4_PATH = "/proc/net/tcp";
constexpr const char *PROC_TCP6_PATH = "/proc/net/tcp6";
}

MetricsCollector::MetricsCollector()
    : mutex_(), cpu_initialized_(false), previous_total_(0), previous_idle_(0)
{
}

SystemMetrics MetricsCollector::collect()
{
    std::lock_guard<std::mutex> lock(mutex_);

    SystemMetrics metrics{};
    metrics.cpuUsage = read_cpu_usage();
    metrics.memoryUsage = read_memory_usage();
    metrics.activeConnections = read_active_connections();

    return metrics;
}

double MetricsCollector::read_cpu_usage()
{
    std::ifstream stat_file(PROC_STAT_PATH);
    if (!stat_file.is_open())
    {
        return 0.0;
    }

    std::string line;
    if (!std::getline(stat_file, line))
    {
        return 0.0;
    }

    std::istringstream ss(line);
    std::string cpu_label;
    unsigned long long user = 0, nice = 0, system = 0, idle = 0;
    unsigned long long iowait = 0, irq = 0, softirq = 0, steal = 0;
    ss >> cpu_label >> user >> nice >> system >> idle >> iowait >> irq >> softirq >> steal;

    const unsigned long long idle_all = idle + iowait;
    const unsigned long long non_idle = user + nice + system + irq + softirq + steal;
    const unsigned long long total = idle_all + non_idle;

    if (!cpu_initialized_)
    {
        cpu_initialized_ = true;
        previous_total_ = total;
        previous_idle_ = idle_all;
        return 0.0;
    }

    const unsigned long long total_diff = total - previous_total_;
    const unsigned long long idle_diff = idle_all - previous_idle_;

    previous_total_ = total;
    previous_idle_ = idle_all;

    if (total_diff == 0)
    {
        return 0.0;
    }

    const double usage = (static_cast<double>(total_diff - idle_diff) / static_cast<double>(total_diff)) * 100.0;
    return std::clamp(usage, 0.0, 100.0);
}

double MetricsCollector::read_memory_usage()
{
    std::ifstream meminfo(PROC_MEMINFO_PATH);
    if (!meminfo.is_open())
    {
        return 0.0;
    }

    unsigned long long mem_total = 0;
    unsigned long long mem_available = 0;
    std::string key;
    unsigned long long value;
    std::string unit;

    while (meminfo >> key >> value >> unit)
    {
        if (key == "MemTotal:")
        {
            mem_total = value;
        }
        else if (key == "MemAvailable:")
        {
            mem_available = value;
        }

        if (mem_total != 0 && mem_available != 0)
        {
            break;
        }
    }

    if (mem_total == 0)
    {
        return 0.0;
    }

    const double used = static_cast<double>(mem_total - mem_available);
    const double usage = (used / static_cast<double>(mem_total)) * 100.0;
    return std::clamp(usage, 0.0, 100.0);
}

int MetricsCollector::read_active_connections()
{
    int connections_v4 = count_connections_from_proc(PROC_TCP4_PATH);
    int connections_v6 = count_connections_from_proc(PROC_TCP6_PATH);
    return connections_v4 + connections_v6;
}

int MetricsCollector::count_connections_from_proc(const std::string &path)
{
    std::ifstream tcp_file(path);
    if (!tcp_file.is_open())
    {
        return 0;
    }

    std::string line;
    int count = 0;

    // Skip header line
    std::getline(tcp_file, line);

    while (std::getline(tcp_file, line))
    {
        if (!line.empty())
        {
            ++count;
        }
    }

    return count;
}
