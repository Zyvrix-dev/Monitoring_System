#!/bin/bash

set -e

echo "===== Installing Docker & Docker Compose ====="
# Install dependencies
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release git

# Add Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Add current user to docker group
sudo usermod -aG docker $USER
echo "Docker installed successfully. Log out and log back in to use docker without sudo."

echo "===== Cloning monitoring system repo ====="
# Replace this URL with your repo URL if applicable
git clone https://github.com/yourusername/monitoring-system.git
cd monitoring-system

echo "===== Building and starting containers ====="
docker-compose up --build -d

echo "===== Setup Complete ====="
echo "React dashboard: http://localhost:3000"
echo "Grafana: http://localhost:3001"
echo "C++ backend REST API: http://localhost:8080/metrics"
echo "C++ backend WebSocket: ws://localhost:9002"
