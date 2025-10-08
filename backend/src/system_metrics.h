#pragma once
#include <array>
#include <chrono>
#include <tuple>
#include <mutex>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

struct ApplicationUsage
{
    int pid;
    std::string name;
    double cpuPercent;
    double memoryMb;
};

struct DomainUsage
{
    std::string domain;
    double receiveRate;
    double transmitRate;
    int connections;
};

struct SystemMetrics
{
    double cpuUsage;       // CPU usage in %
    double memoryUsage;    // Memory usage in %
    int activeConnections; // Active TCP connections
    double diskUsage;      // Root filesystem usage in %
    double loadAverage1;   // Load average for the last minute
    double loadAverage5;   // Load average for the last 5 minutes
    double loadAverage15;  // Load average for the last 15 minutes
    double networkReceiveRate; // Inbound network throughput in KB/s
    double networkTransmitRate; // Outbound network throughput in KB/s
    unsigned int cpuCount;     // Number of logical CPU cores
    std::chrono::system_clock::time_point timestamp; // Collection time
    std::vector<ApplicationUsage> topApplications;    // Top processes by utilisation
    std::vector<DomainUsage> domainUsage;             // Aggregated network usage per domain
};

class MetricsCollector
{
public:
    MetricsCollector();
    SystemMetrics collect();

    static std::string to_iso8601(const std::chrono::system_clock::time_point &timePoint);

private:
    struct ConnectionSummary
    {
        int totalConnections;
        std::unordered_map<std::string, int> domainCounts;
    };

    double read_cpu_usage();
    double read_memory_usage();
    std::vector<ApplicationUsage> read_application_usage();
    ConnectionSummary read_connection_summary();
    std::vector<DomainUsage> build_domain_usage(const ConnectionSummary &summary, double totalRx, double totalTx) const;
    double read_disk_usage();
    std::tuple<double, double> read_network_throughput();
    std::array<double, 3> read_load_averages() const;
    unsigned int detect_cpu_count();
    unsigned int query_cpu_count() const;

    std::mutex mutex_;
    bool cpu_initialized_;
    unsigned long long previous_total_;
    unsigned long long previous_idle_;
    unsigned long long last_cpu_total_diff_;
    bool cpu_count_cached_;
    unsigned int cached_cpu_count_;
    bool network_initialized_;
    unsigned long long previous_rx_bytes_;
    unsigned long long previous_tx_bytes_;
    std::chrono::steady_clock::time_point previous_network_sample_;
    bool has_cached_sample_;
    std::chrono::steady_clock::time_point last_collection_time_;
    SystemMetrics cached_metrics_;
    std::unordered_map<int, unsigned long long> process_cpu_times_;
};
