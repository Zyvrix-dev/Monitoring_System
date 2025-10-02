cmake_minimum_required(VERSION 3.16)
project(cpp_monitor)

set(CMAKE_CXX_STANDARD 20) # <- Use C++20
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(Boost REQUIRED COMPONENTS system thread random filesystem chrono atomic date_time regex)
find_package(OpenSSL REQUIRED)
find_package(nlohmann_json REQUIRED)
find_package(ZLIB REQUIRED)

add_executable(cpp_monitor src/main.cpp src/websocket_server.h)

target_link_libraries(cpp_monitor Boost::system Boost::thread Boost::random Boost::filesystem Boost::chrono Boost::atomic Boost::date_time Boost::regex OpenSSL::SSL OpenSSL::Crypto)
