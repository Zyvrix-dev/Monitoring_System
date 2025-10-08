#include "rest_server.h"

#include "token_utils.h"

#include <cpprest/http_headers.h>
#include <cpprest/json.h>
#include <algorithm>
#include <cctype>
#include <exception>
#include <functional>
#include <iostream>
#include <map>
#include <vector>

#include <cpprest/asyncrt_utils.h>
#include <cpprest/uri.h>

namespace
{
std::string to_lower_copy(const std::string &value)
{
    std::string result(value.size(), '\0');
    std::transform(value.begin(), value.end(), result.begin(), [](unsigned char ch) { return static_cast<char>(std::tolower(ch)); });
    return result;
}

bool icontains(const std::string &haystack, const std::string &needle)
{
    if (needle.empty())
    {
        return false;
    }

    std::string hay = to_lower_copy(haystack);
    std::string need = to_lower_copy(needle);
    return hay.find(need) != std::string::npos;
}
} // namespace

RestServer::RestServer(const std::string &url, std::string apiToken)
    : listener(utility::conversions::to_string_t(url)), collector(), api_token_(std::move(apiToken))
{
    listener.support(web::http::methods::GET, std::bind(&RestServer::handle_get, this, std::placeholders::_1));
}

void RestServer::start()
{
    try
    {
        listener.open()
            .then([]
                  { std::cout << "REST endpoint listening for metrics" << std::endl; })
            .wait();
    }
    catch (const std::exception &ex)
    {
        std::cerr << "Failed to start REST listener: " << ex.what() << std::endl;
        throw;
    }
}

void RestServer::handle_get(web::http::http_request request)
{
    if (!authorize(request))
    {
        web::http::http_response response(web::http::status_codes::Unauthorized);
        response.headers().add(web::http::header_names::cache_control, utility::conversions::to_string_t("no-store"));
        response.headers().add(web::http::header_names::content_type, utility::conversions::to_string_t("application/json"));
        web::json::value body;
        body[utility::conversions::to_string_t("error")] = web::json::value::string(utility::conversions::to_string_t("Unauthorized"));
        response.set_body(body);
        request.reply(response);
        return;
    }

    SystemMetrics m = collector.collect();

    std::string scopedTarget;
    const auto query = web::uri::split_query(request.request_uri().query());
    auto targetIter = query.find(utility::conversions::to_string_t("target"));
    if (targetIter != query.end())
    {
        scopedTarget = utility::conversions::to_utf8string(targetIter->second);
    }
    web::json::value response;
    response[utility::conversions::to_string_t("cpu")] = web::json::value::number(m.cpuUsage);
    response[utility::conversions::to_string_t("cpuAvg")] = web::json::value::number(m.cpuUsageAverage);
    response[utility::conversions::to_string_t("memory")] = web::json::value::number(m.memoryUsage);
    response[utility::conversions::to_string_t("swap")] = web::json::value::number(m.swapUsage);
    response[utility::conversions::to_string_t("connections")] = web::json::value::number(m.activeConnections);
    response[utility::conversions::to_string_t("disk")] = web::json::value::number(m.diskUsage);
    response[utility::conversions::to_string_t("load1")] = web::json::value::number(m.loadAverage1);
    response[utility::conversions::to_string_t("load5")] = web::json::value::number(m.loadAverage5);
    response[utility::conversions::to_string_t("load15")] = web::json::value::number(m.loadAverage15);
    response[utility::conversions::to_string_t("netRx")] = web::json::value::number(m.networkReceiveRate);
    response[utility::conversions::to_string_t("netTx")] = web::json::value::number(m.networkTransmitRate);
    response[utility::conversions::to_string_t("netRxAvg")] = web::json::value::number(m.networkReceiveRateAverage);
    response[utility::conversions::to_string_t("netTxAvg")] = web::json::value::number(m.networkTransmitRateAverage);
    response[utility::conversions::to_string_t("cpuCores")] = web::json::value::number(m.cpuCount);
    response[utility::conversions::to_string_t("processes")] = web::json::value::number(m.processCount);
    response[utility::conversions::to_string_t("threads")] = web::json::value::number(m.threadCount);
    response[utility::conversions::to_string_t("listeningTcp")] = web::json::value::number(m.listeningTcp);
    response[utility::conversions::to_string_t("listeningUdp")] = web::json::value::number(m.listeningUdp);
    response[utility::conversions::to_string_t("openFds")] = web::json::value::number(static_cast<double>(m.openFileDescriptors));
    response[utility::conversions::to_string_t("uniqueDomains")] = web::json::value::number(static_cast<double>(m.uniqueDomains));
    response[utility::conversions::to_string_t("dockerAvailable")] = web::json::value::boolean(m.dockerAvailable);
    response[utility::conversions::to_string_t("timestamp")] = web::json::value::string(utility::conversions::to_string_t(MetricsCollector::to_iso8601(m.timestamp)));

    web::json::value applications = web::json::value::array(m.topApplications.size());
    for (std::size_t i = 0; i < m.topApplications.size(); ++i)
    {
        const auto &app = m.topApplications[i];
        web::json::value item;
        item[utility::conversions::to_string_t("pid")] = web::json::value::number(app.pid);
        item[utility::conversions::to_string_t("name")] = web::json::value::string(utility::conversions::to_string_t(app.name));
        item[utility::conversions::to_string_t("cpu")] = web::json::value::number(app.cpuPercent);
        item[utility::conversions::to_string_t("memoryMb")] = web::json::value::number(app.memoryMb);
        item[utility::conversions::to_string_t("commandLine")] = web::json::value::string(utility::conversions::to_string_t(app.commandLine));
        applications[i] = std::move(item);
    }
    response[utility::conversions::to_string_t("applications")] = std::move(applications);

    web::json::value domains = web::json::value::array(m.domainUsage.size());
    for (std::size_t i = 0; i < m.domainUsage.size(); ++i)
    {
        const auto &domain = m.domainUsage[i];
        web::json::value item;
        item[utility::conversions::to_string_t("domain")] = web::json::value::string(utility::conversions::to_string_t(domain.domain));
        item[utility::conversions::to_string_t("receiveRate")] = web::json::value::number(domain.receiveRate);
        item[utility::conversions::to_string_t("transmitRate")] = web::json::value::number(domain.transmitRate);
        item[utility::conversions::to_string_t("connections")] = web::json::value::number(domain.connections);
        domains[i] = std::move(item);
    }
    response[utility::conversions::to_string_t("domains")] = std::move(domains);

    web::json::value dockerContainers = web::json::value::array(m.dockerContainers.size());
    for (std::size_t i = 0; i < m.dockerContainers.size(); ++i)
    {
        const auto &container = m.dockerContainers[i];
        web::json::value item;
        item[utility::conversions::to_string_t("id")] = web::json::value::string(utility::conversions::to_string_t(container.id));
        item[utility::conversions::to_string_t("name")] = web::json::value::string(utility::conversions::to_string_t(container.name));
        item[utility::conversions::to_string_t("image")] = web::json::value::string(utility::conversions::to_string_t(container.image));
        item[utility::conversions::to_string_t("status")] = web::json::value::string(utility::conversions::to_string_t(container.status));
        item[utility::conversions::to_string_t("cpu")] = web::json::value::number(container.cpuPercent);
        item[utility::conversions::to_string_t("memoryMb")] = web::json::value::number(container.memoryUsageMb);
        item[utility::conversions::to_string_t("memoryLimitMb")] = web::json::value::number(container.memoryLimitMb);
        item[utility::conversions::to_string_t("memoryPercent")] = web::json::value::number(container.memoryPercent);
        item[utility::conversions::to_string_t("netRxKb")] = web::json::value::number(container.networkRxKb);
        item[utility::conversions::to_string_t("netTxKb")] = web::json::value::number(container.networkTxKb);
        item[utility::conversions::to_string_t("blockReadKb")] = web::json::value::number(container.blockReadKb);
        item[utility::conversions::to_string_t("blockWriteKb")] = web::json::value::number(container.blockWriteKb);
        item[utility::conversions::to_string_t("pids")] = web::json::value::number(static_cast<double>(container.pids));
        dockerContainers[i] = std::move(item);
    }
    response[utility::conversions::to_string_t("dockerContainers")] = std::move(dockerContainers);

    web::json::value dockerImages = web::json::value::array(m.dockerImages.size());
    for (std::size_t i = 0; i < m.dockerImages.size(); ++i)
    {
        const auto &image = m.dockerImages[i];
        web::json::value item;
        item[utility::conversions::to_string_t("repository")] = web::json::value::string(utility::conversions::to_string_t(image.repository));
        item[utility::conversions::to_string_t("tag")] = web::json::value::string(utility::conversions::to_string_t(image.tag));
        item[utility::conversions::to_string_t("id")] = web::json::value::string(utility::conversions::to_string_t(image.id));
        item[utility::conversions::to_string_t("size")] = web::json::value::string(utility::conversions::to_string_t(image.size));
        dockerImages[i] = std::move(item);
    }
    response[utility::conversions::to_string_t("dockerImages")] = std::move(dockerImages);

    if (!scopedTarget.empty())
    {
        web::json::value scoped = web::json::value::object();
        scoped[utility::conversions::to_string_t("target")] = web::json::value::string(utility::conversions::to_string_t(scopedTarget));

        double processCpu = 0.0;
        double processMemory = 0.0;
        std::vector<web::json::value> processEntries;
        for (const auto &app : m.topApplications)
        {
            if (icontains(app.name, scopedTarget) || icontains(app.commandLine, scopedTarget))
            {
                web::json::value entry;
                entry[utility::conversions::to_string_t("pid")] = web::json::value::number(app.pid);
                entry[utility::conversions::to_string_t("name")] = web::json::value::string(utility::conversions::to_string_t(app.name));
                entry[utility::conversions::to_string_t("commandLine")] = web::json::value::string(utility::conversions::to_string_t(app.commandLine));
                entry[utility::conversions::to_string_t("cpu")] = web::json::value::number(app.cpuPercent);
                entry[utility::conversions::to_string_t("memoryMb")] = web::json::value::number(app.memoryMb);
                processEntries.push_back(std::move(entry));
                processCpu += app.cpuPercent;
                processMemory += app.memoryMb;
            }
        }

        if (!processEntries.empty())
        {
            web::json::value processObject;
            processObject[utility::conversions::to_string_t("count")] = web::json::value::number(static_cast<double>(processEntries.size()));
            processObject[utility::conversions::to_string_t("cpuTotal")] = web::json::value::number(processCpu);
            processObject[utility::conversions::to_string_t("memoryTotalMb")] = web::json::value::number(processMemory);
            web::json::value processArray = web::json::value::array(processEntries.size());
            for (std::size_t i = 0; i < processEntries.size(); ++i)
            {
                processArray[i] = std::move(processEntries[i]);
            }
            processObject[utility::conversions::to_string_t("entries")] = std::move(processArray);
            scoped[utility::conversions::to_string_t("processes")] = std::move(processObject);
        }

        double containerCpu = 0.0;
        double containerMemory = 0.0;
        double containerMemoryLimit = 0.0;
        double containerNetRx = 0.0;
        double containerNetTx = 0.0;
        double containerBlockRead = 0.0;
        double containerBlockWrite = 0.0;
        std::vector<web::json::value> containerEntries;
        for (const auto &container : m.dockerContainers)
        {
            if (icontains(container.name, scopedTarget) || icontains(container.id, scopedTarget) || icontains(container.image, scopedTarget))
            {
                web::json::value entry;
                entry[utility::conversions::to_string_t("id")] = web::json::value::string(utility::conversions::to_string_t(container.id));
                entry[utility::conversions::to_string_t("name")] = web::json::value::string(utility::conversions::to_string_t(container.name));
                entry[utility::conversions::to_string_t("image")] = web::json::value::string(utility::conversions::to_string_t(container.image));
                entry[utility::conversions::to_string_t("status")] = web::json::value::string(utility::conversions::to_string_t(container.status));
                entry[utility::conversions::to_string_t("cpu")] = web::json::value::number(container.cpuPercent);
                entry[utility::conversions::to_string_t("memoryMb")] = web::json::value::number(container.memoryUsageMb);
                entry[utility::conversions::to_string_t("memoryLimitMb")] = web::json::value::number(container.memoryLimitMb);
                entry[utility::conversions::to_string_t("memoryPercent")] = web::json::value::number(container.memoryPercent);
                entry[utility::conversions::to_string_t("netRxKb")] = web::json::value::number(container.networkRxKb);
                entry[utility::conversions::to_string_t("netTxKb")] = web::json::value::number(container.networkTxKb);
                entry[utility::conversions::to_string_t("blockReadKb")] = web::json::value::number(container.blockReadKb);
                entry[utility::conversions::to_string_t("blockWriteKb")] = web::json::value::number(container.blockWriteKb);
                entry[utility::conversions::to_string_t("pids")] = web::json::value::number(static_cast<double>(container.pids));
                containerEntries.push_back(std::move(entry));

                containerCpu += container.cpuPercent;
                containerMemory += container.memoryUsageMb;
                containerMemoryLimit += container.memoryLimitMb;
                containerNetRx += container.networkRxKb;
                containerNetTx += container.networkTxKb;
                containerBlockRead += container.blockReadKb;
                containerBlockWrite += container.blockWriteKb;
            }
        }

        if (!containerEntries.empty())
        {
            web::json::value containerObject;
            containerObject[utility::conversions::to_string_t("count")] = web::json::value::number(static_cast<double>(containerEntries.size()));
            containerObject[utility::conversions::to_string_t("cpuTotal")] = web::json::value::number(containerCpu);
            containerObject[utility::conversions::to_string_t("memoryTotalMb")] = web::json::value::number(containerMemory);
            containerObject[utility::conversions::to_string_t("memoryLimitMb")] = web::json::value::number(containerMemoryLimit);
            containerObject[utility::conversions::to_string_t("netRxTotalKb")] = web::json::value::number(containerNetRx);
            containerObject[utility::conversions::to_string_t("netTxTotalKb")] = web::json::value::number(containerNetTx);
            containerObject[utility::conversions::to_string_t("blockReadTotalKb")] = web::json::value::number(containerBlockRead);
            containerObject[utility::conversions::to_string_t("blockWriteTotalKb")] = web::json::value::number(containerBlockWrite);
            web::json::value containerArray = web::json::value::array(containerEntries.size());
            for (std::size_t i = 0; i < containerEntries.size(); ++i)
            {
                containerArray[i] = std::move(containerEntries[i]);
            }
            containerObject[utility::conversions::to_string_t("entries")] = std::move(containerArray);
            scoped[utility::conversions::to_string_t("containers")] = std::move(containerObject);
        }

        if (scoped.has_field(utility::conversions::to_string_t("processes")) || scoped.has_field(utility::conversions::to_string_t("containers")))
        {
            response[utility::conversions::to_string_t("scopedMetrics")] = std::move(scoped);
        }
    }

    web::http::http_response httpResponse(web::http::status_codes::OK);
    httpResponse.headers().add(web::http::header_names::cache_control, utility::conversions::to_string_t("no-store"));
    httpResponse.headers().add(web::http::header_names::content_type, utility::conversions::to_string_t("application/json"));
    httpResponse.set_body(response);
    request.reply(httpResponse);
}

bool RestServer::authorize(const web::http::http_request &request) const
{
    if (api_token_.empty())
    {
        return true;
    }

    const auto &headers = request.headers();
    auto authIter = headers.find(web::http::header_names::authorization);
    if (authIter == headers.end())
    {
        return false;
    }

    const std::string headerValue = utility::conversions::to_utf8string(authIter->second);
    constexpr char prefix[] = "Bearer ";
    if (headerValue.compare(0, sizeof(prefix) - 1, prefix) != 0)
    {
        return false;
    }

    const std::string token = headerValue.substr(sizeof(prefix) - 1);
    return security::tokens_equal(token, api_token_);
}
