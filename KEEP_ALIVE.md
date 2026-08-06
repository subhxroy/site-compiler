# 24/7 Render Health Router & Keep-Alive Guide

Render's free tier web services automatically spin down (go inactive) after 15 minutes of inbound HTTP inactivity. When a new request arrives, Render takes 30–50 seconds to cold-start.

This project includes a **Health Router** (`GET /health` and `GET /api/health`) and multiple keep-alive options to ensure your Render backend stays active 24 hours a day, 7 days a week.

---

## 1. Health Router Endpoints

Your backend exposes lightweight health endpoints:
- `https://<your-render-backend>.onrender.com/health`
- `https://<your-render-backend>.onrender.com/api/health`

**Sample Response:**
```json
{
  "status": "ok",
  "service": "sitecompiler-backend",
  "timestamp": "2026-08-06T20:00:00.000Z",
  "uptimeSeconds": 14205,
  "memoryUsage": { ... }
}
```

---

## 2. Automatic Keep-Alive Methods (Choose Any)

### Option A: GitHub Actions Cron Workflow (Built-in & Recommended)
This repository includes `.github/workflows/keep-alive.yml` which automatically triggers every 5 minutes (`cron: "*/5 * * * *"`).

**Setup Steps:**
1. Push your repository to **GitHub**.
2. In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions**.
3. Click **New repository secret**.
4. Name: `RENDER_BACKEND_URL`
5. Value: `https://<your-render-backend-name>.onrender.com`
6. Done! GitHub Actions will ping your Render health endpoint every 5 minutes 24/7.

---

### Option B: Free External Cron Ping Services (1-Minute Setup)
You can configure a free external ping service to send an HTTP GET request to your health router every 5 minutes:

1. **UptimeRobot** ([uptimerobot.com](https://uptimerobot.com)):
   - Create a free account.
   - Click **Add New Monitor**.
   - Monitor Type: `HTTP(s)`
   - Friendly Name: `SiteCompiler Render Backend`
   - URL/IP: `https://<your-render-backend>.onrender.com/health`
   - Monitoring Interval: `Every 5 minutes`

2. **Cron-job.org** ([cron-job.org](https://cron-job.org)):
   - Create a free account.
   - Create a new cronjob.
   - Address: `https://<your-render-backend>.onrender.com/health`
   - Schedule: `Every 5 minutes`

3. **Healthchecks.io** ([healthchecks.io](https://healthchecks.io)):
   - Set up an HTTP check targeting `/health`.

---

### Option C: Local / Node Keep-Alive Script
Run the included keep-alive runner on any VPS or background process:

```bash
# Set your backend URL and run
RENDER_BACKEND_URL=https://<your-render-backend>.onrender.com npm run keep-alive
```

---

## 3. Render Blueprint Health Check Configuration

In `render.yaml`, Render is configured to use `/health` as its primary health check path:

```yaml
services:
  - type: web
    name: sitecompiler-backend
    healthCheckPath: /health
```

This guarantees zero downtime deployments and ensures Render knows when the application is healthy.
