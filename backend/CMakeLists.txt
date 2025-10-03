cmake_minimum_required(VERSION 3.15)
project(CppMonitor LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Find Boost
find_package(Boost REQUIRED COMPONENTS system thread filesystem chrono atomic date_time regex)
if(NOT Boost_FOUND)
  message(FATAL_ERROR "Boost not found. Install libboost-all-dev.")
endif()

# JSON
find_package(nlohmann_json REQUIRED)

# cpprestsdk (Casablanca)
find_package(CPPRESTSDK REQUIRED)
if(NOT CPPRESTSDK_FOUND)
  message(FATAL_ERROR "cpprestsdk not found. Install libcpprest-dev (Casablanca).")
endif()

# OpenSSL (needed at link time for crypto symbols)
find_package(OpenSSL REQUIRED)
if(NOT OpenSSL_FOUND)
  message(FATAL_ERROR "OpenSSL not found. Install libssl-dev.")
endif()

# Include directories
include_directories(${Boost_INCLUDE_DIRS})
include_directories(${CMAKE_SOURCE_DIR}/src)
include_directories(${OPENSSL_INCLUDE_DIR}) # optional

# Explicit source files
set(SRC_FILES
    src/main.cpp
    src/system_metrics.cpp
    src/rest_server.cpp
    src/websocket_server.cpp
)

add_executable(cpp_monitor ${SRC_FILES})

# Link libraries - order can matter; include OpenSSL::Crypto
target_link_libraries(cpp_monitor
    ${Boost_LIBRARIES}
    nlohmann_json::nlohmann_json
    cpprestsdk::cpprest
    OpenSSL::SSL
    OpenSSL::Crypto
    pthread
)
