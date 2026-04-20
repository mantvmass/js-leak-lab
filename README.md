# Memory Leak Laboratory

[ภาษาไทย](./README.th.md) | [English](./README.md)

A hands-on learning tool for common JavaScript/TypeScript memory leak patterns.
Visualizes heap usage in real time with an interactive simulator to toggle leaks on and off instantly.

- Covers 20 memory leak patterns including unbounded arrays, closure scope issues, accumulating event listeners, and more
- Each topic includes runnable **Bad Code** (leaking) and **Good Code** (fixed) examples
- Displays heap, RSS, and external memory via gauges + charts over WebSocket
- Supports both desktop and mobile

## Stack

Bun + Bun.serve() (HTTP + WebSocket), Tailwind CSS (CDN), Chart.js, Prism.js — no frontend build step required

## Getting Started

```bash
bun install
bun run dev
```

Open http://localhost:3000

## Docker

Build locally:

```bash
docker build -t js-leak-lab .
```

Or pull the prebuilt image:

```bash
docker pull ghcr.io/mantvmass/js-leak-lab:latest
```

Then run it:

```bash
docker run -d --name js-leak-lab -p 3000:3000 ghcr.io/mantvmass/js-leak-lab:latest # or js-leak-lab if you build local
```

## Limiting RAM

Since this lab simulates real leaks, it is recommended to set a memory limit.

```bash
# Limit to 1GB (recommended)
docker run -d --name js-leak-lab --memory=1g -p 3000:3000 ghcr.io/mantvmass/js-leak-lab:latest # or js-leak-lab if you build local

# Also disable swap (OOM-kill immediately when RAM is full)
docker run -d --name js-leak-lab --memory=1g --memory-swap=1g -p 3000:3000 ghcr.io/mantvmass/js-leak-lab:latest # or js-leak-lab if you build local
```

You can update the memory limit of a running container without stopping it:

```bash
docker update --memory=1g js-leak-lab
```

## Auto-Restart

The container may be OOM-killed frequently. Set a restart policy so it recovers automatically:

```bash
docker run -d --name js-leak-lab --restart=unless-stopped --memory=1g -p 3000:3000 ghcr.io/mantvmass/js-leak-lab:latest # or js-leak-lab if you build local
```

To restart before a crash occurs, create a watchdog script at `vim /usr/local/bin/mem-watchdog.sh`:

```bash
#!/bin/bash
CONTAINER="js-leak-lab"
THRESHOLD=95

while true; do
    MEM_PERCENT=$(docker stats --no-stream --format "{{.MemPerc}}" "$CONTAINER" | tr -d '%')
    MEM_INT=${MEM_PERCENT%.*}
    if [ "$MEM_INT" -ge "$THRESHOLD" ]; then
        echo "[$(date)] ${MEM_PERCENT}% — restarting..."
        docker restart "$CONTAINER"
    fi
    sleep 10
done
```

Make it executable:
```bash
chmod +x /usr/local/bin/mem-watchdog.sh
```

Then run it in the background:

```bash
nohup /usr/local/bin/mem-watchdog.sh >> /var/log/mem-watchdog.log 2>&1 &
```

For production environments that need to survive reboots, register it as a systemd service:

```bash
cat << 'EOF' > /etc/systemd/system/mem-watchdog.service
[Unit]
Description=Docker Memory Watchdog for js-leak-lab
After=docker.service

[Service]
ExecStart=/usr/local/bin/mem-watchdog.sh
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now mem-watchdog
```

Check the service status:
```bash
systemctl status mem-watchdog
journalctl -u mem-watchdog -f
```