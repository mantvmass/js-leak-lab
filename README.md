# Memory Leak Laboratory

เครื่องมือเรียนรู้ memory leak pattern ที่พบบ่อยใน JavaScript/TypeScript
แสดง heap usage แบบ realtime พร้อม simulator เปิด/ปิด leak ได้ทันที

- รวม 20 รูปแบบ memory leak เช่น unbounded array, closure scope, event listener สะสม ฯลฯ
- แต่ละหัวข้อมี Bad Code (leak) กับ Good Code (fix) ที่รันได้จริง
- แสดง heap, RSS, external memory ผ่าน gauge + chart ผ่าน WebSocket
- รองรับ desktop และ mobile

## Stack

Bun + Bun.serve() (HTTP + WebSocket), Tailwind CSS (CDN), Chart.js, Prism.js — ไม่มี build step สำหรับ frontend

## วิธีรัน

```bash
bun install
bun run dev
```

เปิด http://localhost:3000

## Docker

```bash
docker build -t js-leak-lab .
docker run -p 3000:3000 js-leak-lab
```

## จำกัด RAM

เพราะ lab นี้จำลอง leak จริง ควรกำหนด memory limit ไว้

```bash
# จำกัด 1GB (แนะนำ)
docker run --memory=1g -p 3000:3000 js-leak-lab

# ปิด swap ด้วย (OOM-kill ทันทีเมื่อ RAM เต็ม)
docker run --memory=1g --memory-swap=1g -p 3000:3000 js-leak-lab
```

อัปเดต limit container ที่รันอยู่แล้วได้เลยไม่ต้องหยุด:

```bash
docker update --memory=1g js-leak-lab
```

## Auto-Restart

container อาจโดน OOM-kill บ่อย ตั้ง restart policy ไว้ให้ฟื้นเอง:

```bash
docker run --restart=unless-stopped --memory=1g -p 3000:3000 js-leak-lab
```

ถ้าต้องการ restart ก่อน crash สร้าง watchdog script `vim /usr/local/bin/mem-watchdog.sh`:

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

ให้สิทธิ์กับ mem-watchdog.sh:
```bash
chmod +x /usr/local/bin/mem-watchdog.sh
```

จากนั้น:

```bash
nohup /usr/local/bin/mem-watchdog.sh >> /var/log/mem-watchdog.log 2>&1 &
```

สำหรับ production ที่ต้องรองรับ reboot ลงทะเบียนเป็น systemd service:

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

ตรวจสอบสถานะ:
```bash
systemctl status mem-watchdog
journalctl -u mem-watchdog -f
```

## โครงสร้างไฟล์

```
src/
  server.ts      - HTTP + WebSocket server
  index.html     - หน้าเว็บหลัก
  script.js      - client-side logic
  styles.css     - custom styles
  leaks/
    01-unbounded-array/
    02-interval-accumulation/
    ...
    20-json-parse-retain/
```

แต่ละ module ใน `src/leaks/` export `startLeak()`, `stopLeak()`, `startFix()`, `stopFix()`, `getSize()` สำหรับควบคุม simulator และ `badCode`, `goodCode` สำหรับแสดงตัวอย่าง
