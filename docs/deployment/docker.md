# Docker Containerization Guide

SiteCompiler provides production-ready Docker containers designed for resource-constrained (512MB RAM) and high-concurrency cloud environments.

## Dockerfile Specification

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-freefont-ttf \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start:server"]
```

## Running with Docker Compose

```yaml
version: '3.8'

services:
  sitecompiler-backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - ALLOW_FREE_EXPORTS=true
      - EXPORT_JOB_TIMEOUT_MS=900000
    deploy:
      resources:
        limits:
          memory: 1024M
        reservations:
          memory: 512M
    restart: unless-stopped
```
