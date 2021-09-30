#!/bin/bash

docker rm -f prometheus

docker run -d --restart unless-stopped \
  --add-host=host.docker.internal:host-gateway \
  --name prometheus \
  -p 9090:9090 \
  -v ~/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
