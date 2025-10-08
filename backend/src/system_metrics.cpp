#include "system_metrics.h"
#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <cctype>
#include <cstdlib>
#include <exception>
#include <fstream>
#include <iomanip>
#include <sstream>
#include <string>
#include <thread>
#include <tuple>
#include <unordered_map>
#include <vector>
#include <ctime>
#include <dirent.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <sys/socket.h>
#include <sys/statvfs.h>
#include <unistd.h>

namespace
{
constexpr const char *PROC_STAT_PATH = "/proc/stat";
constexpr const char *PROC_MEMINFO_PATH = "/proc/meminfo";
constexpr const char *PROC_TCP4_PATH = "/proc/net/tcp";
constexpr const char *PROC_TCP6_PATH = "/proc/net/tcp6";
constexpr const char *PROC_NET_DEV_PATH = "/proc/net/dev";
bool is_active_tcp_state(int state)
{
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
        return true;
    default:
        return false;
    }
}

std::string decode_ipv4_address(const std::string &hex)
{
    if (hex.size() != 8)
    {
        return "unknown";
    }

    try
    {
        unsigned long value = std::stoul(hex, nullptr, 16);
        in_addr addr{};
        addr.s_addr = htonl(static_cast<uint32_t>(value));
        char buffer[INET_ADDRSTRLEN];
        if (inet_ntop(AF_INET, &addr, buffer, sizeof(buffer)) == nullptr)
        {
            return "unknown";
        }
        return buffer;
    }
    catch (const std::exception &)
    {
        return "unknown";
    }
}

std::string decode_ipv6_address(const std::string &hex)
{
    if (hex.size() != 32)
    {
        return "unknown";
    }

    std::array<unsigned char, 16> raw{};
    for (std::size_t i = 0; i < raw.size(); ++i)
    {
        const std::size_t index = i * 2;
        const std::string byte_str = hex.substr(index, 2);
        try
        {
            raw[i] = static_cast<unsigned char>(std::stoul(byte_str, nullptr, 16));
        }
        catch (const std::exception &)
        {
            return "unknown";
        }
    }

    std::array<unsigned char, 16> reordered{};
    for (std::size_t chunk = 0; chunk < 4; ++chunk)
    {
        reordered[chunk * 4 + 0] = raw[chunk * 4 + 3];
        reordered[chunk * 4 + 1] = raw[chunk * 4 + 2];
        reordered[chunk * 4 + 2] = raw[chunk * 4 + 1];
        reordered[chunk * 4 + 3] = raw[chunk * 4 + 0];
    }

    char buffer[INET6_ADDRSTRLEN];
    if (inet_ntop(AF_INET6, reordered.data(), buffer, sizeof(buffer)) == nullptr)
    {
        return "unknown";
    }
    return buffer;
}

std::string format_domain_label(const std::string &address)
{
    if (address == "unknown")
    {
        return "unresolved";
    }
    return address;
}

} // namespace

MetricsCollector::MetricsCollector()
    : mutex_(),
      cpu_initialized_(false),
      previous_total_(0),
      previous_idle_(0),
      last_cpu_total_diff_(0),
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
    metrics.diskUsage = read_disk_usage();
    auto [rx_rate, tx_rate] = read_network_throughput();
    metrics.networkReceiveRate = rx_rate;
    metrics.networkTransmitRate = tx_rate;
    auto load_avgs = read_load_averages();
    metrics.loadAverage1 = load_avgs[0];
    metrics.loadAverage5 = load_avgs[1];
    metrics.loadAverage15 = load_avgs[2];
    metrics.cpuCount = detect_cpu_count();
    auto connectionSummary = read_connection_summary();
    metrics.activeConnections = connectionSummary.totalConnections;
    metrics.domainUsage = build_domain_usage(connectionSummary, metrics.networkReceiveRate, metrics.networkTransmitRate);
    metrics.topApplications = read_application_usage();

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
        last_cpu_total_diff_ = 0;
        return 0.0;
    }

    const unsigned long long total_diff = total - previous_total_;
    const unsigned long long idle_diff = idle_all - previous_idle_;

    previous_total_ = total;
    previous_idle_ = idle_all;
    last_cpu_total_diff_ = total_diff;

    if (total_diff == 0)
    {
        last_cpu_total_diff_ = 0;
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

std::vector<ApplicationUsage> MetricsCollector::read_application_usage()
{
    std::vector<ApplicationUsage> result;
    const unsigned long long total_diff = last_cpu_total_diff_;

    DIR *proc_dir = opendir("/proc");
    if (proc_dir == nullptr)
    {
        process_cpu_times_.clear();
        return result;
    }

    std::unordered_map<int, unsigned long long> next_cpu_times;
    struct dirent *entry = nullptr;

    while ((entry = readdir(proc_dir)) != nullptr)
    {
        if (entry->d_name == nullptr || !std::isdigit(static_cast<unsigned char>(entry->d_name[0])))
        {
            continue;
        }

        const int pid = std::atoi(entry->d_name);
        const std::string base_path = std::string("/proc/") + entry->d_name;

        std::ifstream stat_file(base_path + "/stat");
        if (!stat_file.is_open())
        {
            continue;
        }

        std::string stat_line;
        std::getline(stat_file, stat_line);
        stat_file.close();

        const std::size_t open = stat_line.find('(');
        const std::size_t close = stat_line.rfind(')');
        if (open == std::string::npos || close == std::string::npos || close <= open)
        {
            continue;
        }

        std::string name = stat_line.substr(open + 1, close - open - 1);
        std::string remainder = close + 1 < stat_line.size() ? stat_line.substr(close + 2) : std::string();
        std::istringstream fields(remainder);

        std::string token;
        for (int i = 0; i < 11; ++i)
        {
            if (!(fields >> token))
            {
                token.clear();
                break;
            }
        }

        unsigned long long utime = 0;
        unsigned long long stime = 0;
        if (!(fields >> utime >> stime))
        {
            continue;
        }

        const unsigned long long cpu_time = utime + stime;
        next_cpu_times[pid] = cpu_time;

        double cpuPercent = 0.0;
        auto prev_iter = process_cpu_times_.find(pid);
        if (prev_iter != process_cpu_times_.end() && cpu_time >= prev_iter->second && total_diff > 0)
        {
            const unsigned long long delta = cpu_time - prev_iter->second;
            cpuPercent = static_cast<double>(delta) / static_cast<double>(total_diff) * 100.0;
        }

        std::ifstream status_file(base_path + "/status");
        double memoryMb = 0.0;
        if (status_file.is_open())
        {
            std::string line;
            while (std::getline(status_file, line))
            {
                if (line.rfind("VmRSS:", 0) == 0)
                {
                    std::istringstream rss_stream(line.substr(6));
                    unsigned long long rss_kb = 0;
                    rss_stream >> rss_kb;
                    memoryMb = static_cast<double>(rss_kb) / 1024.0;
                    break;
                }
            }
        }

        ApplicationUsage usage{pid, name, cpuPercent, memoryMb};
        result.push_back(std::move(usage));
    }

    closedir(proc_dir);
    process_cpu_times_ = std::move(next_cpu_times);

    std::sort(result.begin(), result.end(), [](const ApplicationUsage &lhs, const ApplicationUsage &rhs) {
        if (std::abs(lhs.cpuPercent - rhs.cpuPercent) > 0.0001)
        {
            return lhs.cpuPercent > rhs.cpuPercent;
        }
        if (std::abs(lhs.memoryMb - rhs.memoryMb) > 0.0001)
        {
            return lhs.memoryMb > rhs.memoryMb;
        }
        return lhs.pid < rhs.pid;
    });

    constexpr std::size_t maxApplications = 8;
    if (result.size() > maxApplications)
    {
        result.resize(maxApplications);
    }

    return result;
}

MetricsCollector::ConnectionSummary MetricsCollector::read_connection_summary()
{
    ConnectionSummary summary{};
    summary.totalConnections = 0;

    auto parse_tcp_file = [&summary](const std::string &path, bool ipv6) {
        std::ifstream tcp_file(path);
        if (!tcp_file.is_open())
        {
            return;
        }

        std::string line;
        std::getline(tcp_file, line); // skip header

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

            if (!is_active_tcp_state(state))
            {
                continue;
            }

            const auto colon_pos = rem_address.find(':');
            if (colon_pos == std::string::npos)
            {
                continue;
            }

            const std::string remote_hex = rem_address.substr(0, colon_pos);
            std::string domain = ipv6 ? decode_ipv6_address(remote_hex) : decode_ipv4_address(remote_hex);
            domain = format_domain_label(domain);

            ++summary.domainCounts[domain];
            ++summary.totalConnections;
        }
    };

    parse_tcp_file(PROC_TCP4_PATH, false);
    parse_tcp_file(PROC_TCP6_PATH, true);

    return summary;
}

std::vector<DomainUsage> MetricsCollector::build_domain_usage(const ConnectionSummary &summary, double totalRx, double totalTx) const
{
    std::vector<DomainUsage> result;
    if (summary.totalConnections <= 0 || summary.domainCounts.empty())
    {
        return result;
    }

    for (const auto &entry : summary.domainCounts)
    {
        DomainUsage usage;
        usage.domain = entry.first;
        usage.connections = entry.second;
        const double ratio = static_cast<double>(entry.second) / static_cast<double>(summary.totalConnections);
        usage.receiveRate = totalRx * ratio;
        usage.transmitRate = totalTx * ratio;
        result.push_back(std::move(usage));
    }

    std::sort(result.begin(), result.end(), [](const DomainUsage &lhs, const DomainUsage &rhs) {
        if (lhs.connections != rhs.connections)
        {
            return lhs.connections > rhs.connections;
        }
        if (std::abs(lhs.receiveRate - rhs.receiveRate) > 0.0001)
        {
            return lhs.receiveRate > rhs.receiveRate;
        }
        return lhs.domain < rhs.domain;
    });

    constexpr std::size_t maxDomains = 10;
    if (result.size() > maxDomains)
    {
        result.resize(maxDomains);
    }

    return result;
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
