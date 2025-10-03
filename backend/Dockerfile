# backend/Dockerfile
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install build tools and libs (including Boost dev)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    wget \
    ca-certificates \
    libssl-dev \
    libboost-all-dev \
    libcpprest-dev \
    nlohmann-json3-dev \
    pkg-config \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy sources and CMake
COPY src/ ./src/
COPY CMakeLists.txt .

# Build
RUN mkdir -p build && cd build && cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_STANDARD=17 .. && make -j$(nproc)

EXPOSE 8080 9002

CMD ["./build/cpp_monitor"]
