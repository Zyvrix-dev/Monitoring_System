#include "system_metrics.h"
#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <cctype>
#include <cstdlib>
#include <cstdio>
#include <cstring>
#include <exception>
#include <fstream>
#include <iomanip>
#include <iterator>
#include <numeric>
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
#ifndef _WIN32
#include <sys/wait.h>
#endif
#include <unistd.h>

namespace
{
constexpr const char *PROC_STAT_PATH = "/proc/stat";
constexpr const char *PROC_MEMINFO_PATH = "/proc/meminfo";
constexpr const char *PROC_TCP4_PATH = "/proc/net/tcp";
constexpr const char *PROC_TCP6_PATH = "/proc/net/tcp6";
constexpr const char *PROC_UDP4_PATH = "/proc/net/udp";
constexpr const char *PROC_UDP6_PATH = "/proc/net/udp6";
constexpr const char *PROC_NET_DEV_PATH = "/proc/net/dev";
constexpr auto CPU_AVERAGE_WINDOW = std::chrono::seconds(60);
constexpr auto NETWORK_AVERAGE_WINDOW = std::chrono::seconds(30);
constexpr auto MIN_COLLECTION_INTERVAL = std::chrono::milliseconds(400);
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
      has_cached_sample_(false),
      last_collection_time_(),
      cached_metrics_(),
      process_cpu_times_(),
      cpu_samples_(),
      rx_samples_(),
      tx_samples_(),
      dns_cache_()
{
}

SystemMetrics MetricsCollector::collect()
{
    std::lock_guard<std::mutex> lock(mutex_);

    const auto now = std::chrono::steady_clock::now();
    if (has_cached_sample_)
    {
        const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - last_collection_time_);
        if (elapsed < MIN_COLLECTION_INTERVAL)
        {
            return cached_metrics_;
        }
    }

    SystemMetrics metrics{};
    metrics.timestamp = std::chrono::system_clock::now();
    metrics.cpuUsage = read_cpu_usage();
    metrics.memoryUsage = read_memory_usage();
    metrics.swapUsage = read_swap_usage();
    metrics.diskUsage = read_disk_usage();
    auto [rx_rate, tx_rate] = read_network_throughput();
    metrics.networkReceiveRate = rx_rate;
    metrics.networkTransmitRate = tx_rate;
    auto load_avgs = read_load_averages();
    metrics.loadAverage1 = load_avgs[0];
    metrics.loadAverage5 = load_avgs[1];
    metrics.loadAverage15 = load_avgs[2];
    metrics.cpuCount = detect_cpu_count();
    auto [processes, threads] = read_process_thread_counts();
    metrics.processCount = processes;
    metrics.threadCount = threads;
    auto [listeningTcp, listeningUdp] = read_listening_ports();
    metrics.listeningTcp = listeningTcp;
    metrics.listeningUdp = listeningUdp;
    metrics.openFileDescriptors = read_open_file_descriptors();
    auto connectionSummary = read_connection_summary();
    metrics.activeConnections = connectionSummary.totalConnections;
    metrics.domainUsage = build_domain_usage(connectionSummary, metrics.networkReceiveRate, metrics.networkTransmitRate);
    metrics.uniqueDomains = metrics.domainUsage.size();
    metrics.topApplications = read_application_usage();
    update_rollup_samples(metrics.cpuUsage, metrics.networkReceiveRate, metrics.networkTransmitRate, now);
    metrics.cpuUsageAverage = compute_average(cpu_samples_, now, CPU_AVERAGE_WINDOW);
    metrics.networkReceiveRateAverage = compute_average(rx_samples_, now, NETWORK_AVERAGE_WINDOW);
    metrics.networkTransmitRateAverage = compute_average(tx_samples_, now, NETWORK_AVERAGE_WINDOW);
    bool docker_available = false;
    auto [containers, images] = read_docker_inventory(docker_available);
    metrics.dockerAvailable = docker_available;
    metrics.dockerContainers = std::move(containers);
    metrics.dockerImages = std::move(images);

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

double MetricsCollector::read_swap_usage()
{
    std::ifstream meminfo(PROC_MEMINFO_PATH);
    if (!meminfo.is_open())
    {
        return 0.0;
    }

    unsigned long long swap_total = 0;
    unsigned long long swap_free = 0;
    std::string key;
    unsigned long long value = 0;
    std::string unit;

    while (meminfo >> key >> value >> unit)
    {
        if (key == "SwapTotal:")
        {
            swap_total = value;
        }
        else if (key == "SwapFree:")
        {
            swap_free = value;
        }

        if (swap_total != 0 && swap_free != 0)
        {
            break;
        }
    }

    if (swap_total == 0)
    {
        return 0.0;
    }

    const double used = static_cast<double>(swap_total - swap_free);
    const double usage = (used / static_cast<double>(swap_total)) * 100.0;
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

void MetricsCollector::update_rollup_samples(double cpu, double rx, double tx, const std::chrono::steady_clock::time_point &now)
{
    auto push_sample = [&now](std::deque<std::pair<std::chrono::steady_clock::time_point, double>> &samples,
                              double value,
                              const std::chrono::steady_clock::duration &window) {
        if (!std::isfinite(value))
        {
            return;
        }

        samples.emplace_back(now, value);
        while (!samples.empty() && (now - samples.front().first) > window)
        {
            samples.pop_front();
        }
    };

    push_sample(cpu_samples_, cpu, CPU_AVERAGE_WINDOW);
    push_sample(rx_samples_, rx, NETWORK_AVERAGE_WINDOW);
    push_sample(tx_samples_, tx, NETWORK_AVERAGE_WINDOW);
}

double MetricsCollector::compute_average(std::deque<std::pair<std::chrono::steady_clock::time_point, double>> &samples,
                                         const std::chrono::steady_clock::time_point &now,
                                         const std::chrono::steady_clock::duration &window) const
{
    while (!samples.empty() && (now - samples.front().first) > window)
    {
        samples.pop_front();
    }

    if (samples.empty())
    {
        return 0.0;
    }

    const double sum = std::accumulate(samples.begin(), samples.end(), 0.0,
                                       [](double total, const auto &entry) {
                                           return total + entry.second;
                                       });
    return sum / static_cast<double>(samples.size());
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

        std::string commandLine;
        {
            std::ifstream cmdline_file(base_path + "/cmdline", std::ios::in | std::ios::binary);
            if (cmdline_file.is_open())
            {
                std::string raw((std::istreambuf_iterator<char>(cmdline_file)), std::istreambuf_iterator<char>());
                cmdline_file.close();

                for (char &ch : raw)
                {
                    if (ch == '\0')
                    {
                        ch = ' ';
                    }
                }

                std::size_t first_non_space = raw.find_first_not_of(' ');
                if (first_non_space != std::string::npos)
                {
                    commandLine = raw.substr(first_non_space);
                }
            }
        }

        if (commandLine.empty())
        {
            commandLine = name;
        }

        ApplicationUsage usage{pid, name, cpuPercent, memoryMb, commandLine};
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

    return result;
}

std::pair<unsigned int, unsigned int> MetricsCollector::read_process_thread_counts()
{
    DIR *proc_dir = opendir("/proc");
    if (proc_dir == nullptr)
    {
        return {0U, 0U};
    }

    unsigned int process_count = 0;
    unsigned int thread_count = 0;
    struct dirent *entry = nullptr;

    while ((entry = readdir(proc_dir)) != nullptr)
    {
        if (entry->d_name == nullptr || !std::isdigit(static_cast<unsigned char>(entry->d_name[0])))
        {
            continue;
        }

        ++process_count;

        const std::string status_path = std::string("/proc/") + entry->d_name + "/status";
        std::ifstream status_file(status_path);
        if (!status_file.is_open())
        {
            continue;
        }

        std::string line;
        while (std::getline(status_file, line))
        {
            if (line.rfind("Threads:", 0) == 0)
            {
                std::istringstream ss(line.substr(8));
                unsigned int threads = 0;
                ss >> threads;
                thread_count += threads;
                break;
            }
        }
    }

    closedir(proc_dir);
    return {process_count, thread_count};
}

std::pair<unsigned int, unsigned int> MetricsCollector::read_listening_ports() const
{
    auto count_listening = [](const std::string &path, bool tcp) {
        std::ifstream file(path);
        if (!file.is_open())
        {
            return 0U;
        }

        std::string line;
        std::getline(file, line);
        unsigned int count = 0;

        while (std::getline(file, line))
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

            if (tcp)
            {
                if (state == 0x0A)
                {
                    ++count;
                }
            }
            else
            {
                if (state == 0x07)
                {
                    ++count;
                }
            }
        }

        return count;
    };

    const unsigned int tcp4 = count_listening(PROC_TCP4_PATH, true);
    const unsigned int tcp6 = count_listening(PROC_TCP6_PATH, true);
    const unsigned int udp4 = count_listening(PROC_UDP4_PATH, false);
    const unsigned int udp6 = count_listening(PROC_UDP6_PATH, false);

    return {tcp4 + tcp6, udp4 + udp6};
}

unsigned long MetricsCollector::read_open_file_descriptors() const
{
    std::ifstream file("/proc/sys/fs/file-nr");
    if (!file.is_open())
    {
        return 0UL;
    }

    unsigned long allocated = 0UL;
    unsigned long unused = 0UL;
    unsigned long max = 0UL;
    file >> allocated >> unused >> max;
    if (!file)
    {
        return 0UL;
    }

    return allocated - unused;
}

std::pair<std::vector<DockerContainerSummary>, std::vector<DockerImageSummary>> MetricsCollector::read_docker_inventory(bool &available) const
{
    available = false;
    std::vector<DockerContainerSummary> containers;
    std::vector<DockerImageSummary> images;

    auto run_command = [](const char *cmd, std::vector<std::string> &lines) -> bool {
        FILE *pipe = popen(cmd, "r");
        if (pipe == nullptr)
        {
            return false;
        }

        char buffer[512];
        while (fgets(buffer, sizeof(buffer), pipe) != nullptr)
        {
            std::string line(buffer);
            if (!line.empty() && line.back() == '\n')
            {
                line.pop_back();
            }
            lines.push_back(std::move(line));
        }

        const int status = pclose(pipe);
        if (status == -1)
        {
            return false;
        }

#ifndef _WIN32
        if (WIFEXITED(status) && WEXITSTATUS(status) == 0)
        {
            return true;
        }
        return false;
#else
        return status == 0;
#endif
    };

    auto trim = [](const std::string &value) -> std::string {
        const char *whitespace = " \t\r\n";
        const std::size_t begin = value.find_first_not_of(whitespace);
        if (begin == std::string::npos)
        {
            return std::string();
        }
        const std::size_t end = value.find_last_not_of(whitespace);
        return value.substr(begin, end - begin + 1);
    };

    auto parse_percent = [](const std::string &value) -> double {
        std::string trimmed = value;
        trimmed.erase(std::remove_if(trimmed.begin(), trimmed.end(), [](unsigned char ch) { return std::isspace(ch); }), trimmed.end());
        if (!trimmed.empty() && trimmed.back() == '%')
        {
            trimmed.pop_back();
        }
        if (trimmed.empty())
        {
            return 0.0;
        }
        try
        {
            return std::stod(trimmed);
        }
        catch (const std::exception &)
        {
            return 0.0;
        }
    };

    auto parse_bytes = [&trim](const std::string &value) -> double {
        std::string trimmed = trim(value);
        if (trimmed.empty() || trimmed == "--")
        {
            return 0.0;
        }

        std::size_t index = 0;
        while (index < trimmed.size() && (std::isdigit(static_cast<unsigned char>(trimmed[index])) || trimmed[index] == '.'))
        {
            ++index;
        }

        if (index == 0)
        {
            return 0.0;
        }

        double numeric = 0.0;
        try
        {
            numeric = std::stod(trimmed.substr(0, index));
        }
        catch (const std::exception &)
        {
            return 0.0;
        }

        std::string unit = trim(trimmed.substr(index));
        std::transform(unit.begin(), unit.end(), unit.begin(), [](unsigned char ch) { return static_cast<char>(std::tolower(ch)); });

        if (unit.empty() || unit == "b")
        {
            return numeric;
        }
        if (unit == "kb" || unit == "kib")
        {
            return numeric * 1024.0;
        }
        if (unit == "mb" || unit == "mib")
        {
            return numeric * 1024.0 * 1024.0;
        }
        if (unit == "gb" || unit == "gib")
        {
            return numeric * 1024.0 * 1024.0 * 1024.0;
        }
        if (unit == "tb" || unit == "tib")
        {
            return numeric * 1024.0 * 1024.0 * 1024.0 * 1024.0;
        }

        return numeric;
    };

    auto parse_mb = [&parse_bytes](const std::string &value) -> double {
        return parse_bytes(value) / (1024.0 * 1024.0);
    };

    auto parse_kb = [&parse_bytes](const std::string &value) -> double {
        return parse_bytes(value) / 1024.0;
    };

    auto parse_io_pair = [&](const std::string &value) -> std::pair<double, double> {
        const std::size_t slash = value.find('/');
        if (slash == std::string::npos)
        {
            return {parse_kb(value), 0.0};
        }

        const std::string first = value.substr(0, slash);
        const std::string second = value.substr(slash + 1);
        return {parse_kb(first), parse_kb(second)};
    };

    std::unordered_map<std::string, DockerContainerSummary> container_map;

    std::vector<std::string> container_lines;
    if (run_command("docker ps --format '{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}'", container_lines))
    {
        available = true;
        for (const auto &line : container_lines)
        {
            std::array<std::string, 4> parts{};
            std::size_t start = 0;
            std::size_t part_index = 0;
            for (std::size_t i = 0; i <= line.size() && part_index < parts.size(); ++i)
            {
                if (i == line.size() || line[i] == '|')
                {
                    parts[part_index++] = line.substr(start, i - start);
                    start = i + 1;
                }
            }

            DockerContainerSummary summary{};
            summary.id = parts[0];
            summary.name = parts[1].empty() ? parts[0] : parts[1];
            summary.image = parts[2];
            summary.status = parts[3];
            summary.cpuPercent = 0.0;
            summary.memoryUsageMb = 0.0;
            summary.memoryLimitMb = 0.0;
            summary.memoryPercent = 0.0;
            summary.networkRxKb = 0.0;
            summary.networkTxKb = 0.0;
            summary.blockReadKb = 0.0;
            summary.blockWriteKb = 0.0;
            summary.pids = 0U;
            container_map[summary.id] = std::move(summary);
        }
    }

    std::vector<std::string> stats_lines;
    if (run_command("docker stats --no-stream --format '{{.ID}}|{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}|{{.PIDs}}'", stats_lines))
    {
        available = true;
        for (const auto &line : stats_lines)
        {
            std::array<std::string, 8> parts{};
            std::size_t start = 0;
            std::size_t part_index = 0;
            for (std::size_t i = 0; i <= line.size() && part_index < parts.size(); ++i)
            {
                if (i == line.size() || line[i] == '|')
                {
                    parts[part_index++] = line.substr(start, i - start);
                    start = i + 1;
                }
            }

            auto iter = container_map.find(parts[0]);
            if (iter == container_map.end())
            {
                DockerContainerSummary summary{};
                summary.id = parts[0];
                summary.name = parts[1];
                summary.image = std::string();
                summary.status = std::string();
                summary.cpuPercent = 0.0;
                summary.memoryUsageMb = 0.0;
                summary.memoryLimitMb = 0.0;
                summary.memoryPercent = 0.0;
                summary.networkRxKb = 0.0;
                summary.networkTxKb = 0.0;
                summary.blockReadKb = 0.0;
                summary.blockWriteKb = 0.0;
                summary.pids = 0U;
                iter = container_map.emplace(summary.id, std::move(summary)).first;
            }

            DockerContainerSummary &summary = iter->second;
            summary.name = parts[1].empty() ? summary.id : parts[1];
            summary.cpuPercent = parse_percent(parts[2]);

            const std::size_t slash = parts[3].find('/');
            if (slash != std::string::npos)
            {
                summary.memoryUsageMb = parse_mb(parts[3].substr(0, slash));
                summary.memoryLimitMb = parse_mb(parts[3].substr(slash + 1));
            }
            else
            {
                summary.memoryUsageMb = parse_mb(parts[3]);
            }

            summary.memoryPercent = parse_percent(parts[4]);
            const auto net_pair = parse_io_pair(parts[5]);
            summary.networkRxKb = net_pair.first;
            summary.networkTxKb = net_pair.second;
            const auto block_pair = parse_io_pair(parts[6]);
            summary.blockReadKb = block_pair.first;
            summary.blockWriteKb = block_pair.second;

            try
            {
                summary.pids = static_cast<unsigned int>(std::stoul(trim(parts[7])));
            }
            catch (const std::exception &)
            {
                summary.pids = 0U;
            }
        }
    }

    containers.reserve(container_map.size());
    for (auto &entry : container_map)
    {
        containers.push_back(std::move(entry.second));
    }

    std::sort(containers.begin(), containers.end(), [](const DockerContainerSummary &lhs, const DockerContainerSummary &rhs) {
        if (lhs.name != rhs.name)
        {
            return lhs.name < rhs.name;
        }
        return lhs.id < rhs.id;
    });

    std::vector<std::string> image_lines;
    if (run_command("docker images --format '{{.Repository}}|{{.Tag}}|{{.ID}}|{{.Size}}'", image_lines))
    {
        available = true;
        for (const auto &line : image_lines)
        {
            std::array<std::string, 4> parts{};
            std::size_t start = 0;
            std::size_t part_index = 0;
            for (std::size_t i = 0; i <= line.size() && part_index < parts.size(); ++i)
            {
                if (i == line.size() || line[i] == '|')
                {
                    parts[part_index++] = line.substr(start, i - start);
                    start = i + 1;
                }
            }

            DockerImageSummary image{};
            image.repository = parts[0];
            image.tag = parts[1];
            image.id = parts[2];
            image.size = parts[3];
            images.push_back(std::move(image));
        }
    }

    return {containers, images};
}

std::string MetricsCollector::resolve_hostname(const std::string &address, bool ipv6)
{
    if (address.empty() || address == "unknown")
    {
        return "unresolved";
    }

    const std::string cache_key = (ipv6 ? std::string("6|") : std::string("4|")) + address;
    const auto it = dns_cache_.find(cache_key);
    if (it != dns_cache_.end())
    {
        return it->second;
    }

    char host[NI_MAXHOST];
    int result = -1;

    if (ipv6)
    {
        sockaddr_in6 sa{};
        sa.sin6_family = AF_INET6;
        if (inet_pton(AF_INET6, address.c_str(), &sa.sin6_addr) == 1)
        {
            result = getnameinfo(reinterpret_cast<sockaddr *>(&sa), sizeof(sa), host, sizeof(host), nullptr, 0, NI_NAMEREQD);
        }
    }
    else
    {
        sockaddr_in sa{};
        sa.sin_family = AF_INET;
        if (inet_pton(AF_INET, address.c_str(), &sa.sin_addr) == 1)
        {
            result = getnameinfo(reinterpret_cast<sockaddr *>(&sa), sizeof(sa), host, sizeof(host), nullptr, 0, NI_NAMEREQD);
        }
    }

    std::string resolved;
    if (result == 0)
    {
        resolved = host;
    }
    else
    {
        resolved = address;
    }

    dns_cache_[cache_key] = resolved;
    return resolved;
}

MetricsCollector::ConnectionSummary MetricsCollector::read_connection_summary()
{
    ConnectionSummary summary{};
    summary.totalConnections = 0;

    auto parse_tcp_file = [this, &summary](const std::string &path, bool ipv6) {
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
            std::string address = ipv6 ? decode_ipv6_address(remote_hex) : decode_ipv4_address(remote_hex);
            std::string domain = resolve_hostname(address, ipv6);

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
