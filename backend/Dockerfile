FROM ubuntu:24.04

RUN apt-get update && apt-get install -y \
    build-essential cmake g++ git \
    libboost-all-dev libcpprest-dev \
    nlohmann-json3-dev

WORKDIR /app

COPY src/ ./src/
COPY CMakeLists.txt .

RUN mkdir build && cd build && cmake -DCMAKE_CXX_STANDARD=17 .. && make

EXPOSE 8080 9002
CMD ["./build/cpp_monitor"]
