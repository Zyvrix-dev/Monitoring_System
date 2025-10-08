#include "system_metrics.h"
#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <exception>
#include <fstream>
#include <iomanip>
#include <sstream>
#include <string>
#include <thread>
#include <tuple>
#include <vector>
#include <ctime>
#include <sys/statvfs.h>
#include <unistd.h>

namespace
{
constexpr const char *PROC_STAT_PATH = "/proc/stat";
constexpr const char *PROC_MEMINFO_PATH = "/proc/meminfo";
constexpr const char *PROC_TCP4_PATH = "/proc/net/tcp";
constexpr const char *PROC_TCP6_PATH = "/proc/net/tcp6";
constexpr const char *PROC_NET_DEV_PATH = "/proc/net/dev";
}

MetricsCollector::MetricsCollector()
    : mutex_(),
      cpu_initialized_(false),
      previous_total_(0),
      previous_idle_(0),
      cpu_count_cached_(false),
      cached_cpu_count_(1),
      network_initialized_(false),
      previous_rx_bytes_(0),
      previous_tx_bytes_(0),
      has_cached_sample_(false)
{
}

SystemMetrics MetricsCollector::collect()
{
    std::lock_guard<std::mutex> lock(mutex_);

    const auto now = std::chrono::steady_clock::now();
    if (has_cached_sample_)
    {
        const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - last_collection_time_);
        if (elapsed.count() < 900)
        {
            return cached_metrics_;
        }
    }

    SystemMetrics metrics{};
    metrics.timestamp = std::chrono::system_clock::now();
    metrics.cpuUsage = read_cpu_usage();
    metrics.memoryUsage = read_memory_usage();
    metrics.activeConnections = read_active_connections();
    metrics.diskUsage = read_disk_usage();
    auto [rx_rate, tx_rate] = read_network_throughput();
    metrics.networkReceiveRate = rx_rate;
    metrics.networkTransmitRate = tx_rate;
    auto load_avgs = read_load_averages();
    metrics.loadAverage1 = load_avgs[0];
    metrics.loadAverage5 = load_avgs[1];
    metrics.loadAverage15 = load_avgs[2];
    metrics.cpuCount = detect_cpu_count();

    cached_metrics_ = metrics;
    last_collection_time_ = now;
    has_cached_sample_ = true;

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
        if (line.empty())
        {
            continue;
        }

        std::istringstream ss(line);
        std::string sl;
        std::string local_address;
        std::string rem_address;
        std::string state_hex;

        if (!(ss >> sl >> local_address >> rem_address >> state_hex))
        {
            continue;
        }

        int state = 0;
        try
        {
            state = std::stoi(state_hex, nullptr, 16);
        }
        catch (const std::exception &)
        {
            continue;
        }

        switch (state)
        {
        case 0x01: // ESTABLISHED
        case 0x02: // SYN_SENT
        case 0x03: // SYN_RECV
        case 0x04: // FIN_WAIT1
        case 0x05: // FIN_WAIT2
        case 0x06: // TIME_WAIT
        case 0x08: // CLOSE_WAIT
        case 0x09: // LAST_ACK
        case 0x0B: // CLOSING
        case 0x0C: // NEW_SYN_RECV
            ++count;
            break;
        default:
            break;
        }
    }

    return count;
}

double MetricsCollector::read_disk_usage()
{
    struct statvfs fs_stats
    {
    };
    if (statvfs("/", &fs_stats) != 0)
    {
        return 0.0;
    }

    const double total = static_cast<double>(fs_stats.f_blocks) * static_cast<double>(fs_stats.f_frsize);
    const double available = static_cast<double>(fs_stats.f_bavail) * static_cast<double>(fs_stats.f_frsize);
    if (total <= 0.0)
    {
        return 0.0;
    }

    const double used = total - available;
    const double usage = (used / total) * 100.0;
    return std::clamp(usage, 0.0, 100.0);
}

std::tuple<double, double> MetricsCollector::read_network_throughput()
{
    std::ifstream net_file(PROC_NET_DEV_PATH);
    if (!net_file.is_open())
    {
        return {0.0, 0.0};
    }

    std::string line;
    // Skip the first two header lines
    std::getline(net_file, line);
    std::getline(net_file, line);

    unsigned long long rx_total = 0;
    unsigned long long tx_total = 0;

    while (std::getline(net_file, line))
    {
        if (line.empty())
        {
            continue;
        }

        std::istringstream ss(line);
        std::string interface_name;
        std::getline(ss, interface_name, ':');
        interface_name.erase(0, interface_name.find_first_not_of(" \t"));

        if (interface_name == "lo")
        {
            continue; // Skip loopback interface
        }

        unsigned long long rx_bytes = 0;
        unsigned long long tx_bytes = 0;
        ss >> rx_bytes; // receive bytes

        // Skip fields we do not need (7 fields after rx_bytes)
        for (int i = 0; i < 7 && ss; ++i)
        {
            unsigned long long discard;
            ss >> discard;
        }

        ss >> tx_bytes; // transmit bytes

        rx_total += rx_bytes;
        tx_total += tx_bytes;
    }

    const auto now = std::chrono::steady_clock::now();
    if (!network_initialized_)
    {
        network_initialized_ = true;
        previous_rx_bytes_ = rx_total;
        previous_tx_bytes_ = tx_total;
        previous_network_sample_ = now;
        return {0.0, 0.0};
    }

    const auto elapsed = std::chrono::duration_cast<std::chrono::duration<double>>(now - previous_network_sample_);
    previous_network_sample_ = now;

    if (elapsed.count() <= 0.0)
    {
        return {0.0, 0.0};
    }

    const double rx_rate = static_cast<double>(rx_total - previous_rx_bytes_) / (1024.0 * elapsed.count());
    const double tx_rate = static_cast<double>(tx_total - previous_tx_bytes_) / (1024.0 * elapsed.count());

    previous_rx_bytes_ = rx_total;
    previous_tx_bytes_ = tx_total;

    return {std::max(0.0, rx_rate), std::max(0.0, tx_rate)};
}

std::array<double, 3> MetricsCollector::read_load_averages() const
{
    std::array<double, 3> loads{0.0, 0.0, 0.0};
    if (getloadavg(loads.data(), static_cast<int>(loads.size())) != -1)
    {
        return loads;
    }
    return {0.0, 0.0, 0.0};
}

unsigned int MetricsCollector::detect_cpu_count()
{
    if (!cpu_count_cached_)
    {
        cached_cpu_count_ = query_cpu_count();
        cpu_count_cached_ = true;
    }
    return cached_cpu_count_;
}

unsigned int MetricsCollector::query_cpu_count() const
{
    const unsigned int count = std::thread::hardware_concurrency();
    return count == 0 ? 1U : count;
}

std::string MetricsCollector::to_iso8601(const std::chrono::system_clock::time_point &timePoint)
{
    std::time_t time = std::chrono::system_clock::to_time_t(timePoint);
    std::tm tm{};
#ifdef _WIN32
    gmtime_s(&tm, &time);
#else
    gmtime_r(&time, &tm);
#endif

    std::ostringstream oss;
    oss << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
    return oss.str();
}
