# Memory Leak Laboratory

เครื่องมือสำหรับเรียนรู้ memory leak pattern ที่พบบ่อยใน JavaScript/TypeScript
มี web UI แสดง heap usage แบบ realtime พร้อม simulator ที่สามารถเปิด/ปิด leak ได้ทันที

## รายละเอียด

- รวม 20 รูปแบบ memory leak ที่พบบ่อย เช่น unbounded array, Map ไม่มี eviction, closure scope, event listener สะสม, WeakMap vs Map เป็นต้น
- แต่ละหัวข้อมี Bad Code (leak) และ Good Code (fix) พร้อมตัวอย่างที่รันได้จริง
- แสดง heap usage, RSS, external memory ผ่าน gauge และ chart แบบ realtime ผ่าน WebSocket
- รองรับทั้ง desktop และ mobile

## Tech Stack

- Runtime: Bun
- Server: Bun.serve() (HTTP + WebSocket)
- Frontend: Tailwind CSS (CDN), Chart.js, Prism.js
- ไม่มี build step สำหรับ frontend

## วิธีรัน

```bash
bun install
bun run dev
```

เปิดเบราว์เซอร์ที่ http://localhost:3000

## วิธีรันด้วย Docker

```bash
docker build -t js-leak-lab .
docker run -p 3000:3000 js-leak-lab
```

## โครงสร้างไฟล์

```
src/
  server.ts          - HTTP + WebSocket server
  index.html         - หน้าเว็บหลัก
  script.js          - client-side logic
  styles.css         - custom styles
  leaks/
    01-unbounded-array/
    02-interval-accumulation/
    ...
    20-json-parse-retain/
```

แต่ละ module ใน `src/leaks/` export object ที่มี `startLeak()`, `stopLeak()`, `startFix()`, `stopFix()`, `getSize()` สำหรับควบคุม simulator และ `badCode`, `goodCode` สำหรับแสดงตัวอย่าง

---

## การจำกัด RAM ของ Container

เนื่องจาก `js-leak-lab` จำลอง memory leak จริง ควรกำหนด memory limit เพื่อป้องกัน container กินทรัพยากรของ host จนเกินไป

### ตั้งค่า RAM limit ตั้งแต่ตอน `docker run`

```bash
# จำกัด RAM ที่ 512MB
docker run --memory=512m -p 3000:3000 js-leak-lab

# จำกัด RAM ที่ 1GB (แนะนำสำหรับ lab นี้)
docker run --memory=1g -p 3000:3000 js-leak-lab

# จำกัด RAM + swap รวมกัน (--memory-swap = RAM + swap)
# ตัวอย่างนี้ให้ RAM 1g และ swap อีก 1g รวม 2g
docker run --memory=1g --memory-swap=2g -p 3000:3000 js-leak-lab

# ปิด swap ทั้งหมด (container จะถูก OOM-kill ทันทีเมื่อ RAM เต็ม)
docker run --memory=1g --memory-swap=1g -p 3000:3000 js-leak-lab
```

> **หมายเหตุ:** ถ้าไม่ระบุ `--memory-swap` Docker จะให้ swap เท่ากับ RAM โดยอัตโนมัติ (รวม 2x)

### อัปเดต RAM limit ของ container ที่รันอยู่แล้ว

ไม่จำเป็นต้องหยุด container สามารถใช้ `docker update` ได้ทันที:

```bash
# เปลี่ยน memory limit เป็น 1GB
docker update --memory=1g js-leak-lab

# เปลี่ยนทั้ง memory และ swap
docker update --memory=1g --memory-swap=2g js-leak-lab
```

ตรวจสอบ limit ที่ตั้งไว้:

```bash
docker inspect js-leak-lab --format='Memory: {{.HostConfig.Memory}} | MemorySwap: {{.HostConfig.MemorySwap}}'
```

ดู memory usage แบบ realtime:

```bash
docker stats js-leak-lab
```

---

## การจัดการ Memory Limit และ Auto-Restart Container

เนื่องจาก `js-leak-lab` จำลอง memory leak จริง container อาจใช้ RAM ถึง limit (1GiB) ได้บ่อย
แนะนำให้ตั้งค่า auto-restart เพื่อให้ container ฟื้นตัวได้อัตโนมัติ

### วิธีที่ 1 — Docker Restart Policy (แนะนำสำหรับการใช้งานทั่วไป)

ตั้งค่า restart policy ให้ container restart อัตโนมัติเมื่อถูก OOM-kill โดย kernel:

```bash
docker update --restart=unless-stopped js-leak-lab
```

หรือระบุตั้งแต่ตอน `docker run`:

```bash
docker run --restart=unless-stopped --memory=1g -p 3000:3000 js-leak-lab
```

> **หลักการทำงาน:** เมื่อ RAM เต็ม kernel จะ OOM-kill process และ Docker จะ restart container ให้อัตโนมัติตาม policy ที่กำหนด

---

### วิธีที่ 2 — Watchdog Script (ควบคุม threshold ได้)

สร้าง shell script ที่คอย monitor memory usage และ restart ก่อนที่จะ crash:

```bash
cat << 'EOF' > /usr/local/bin/mem-watchdog.sh
#!/bin/bash
CONTAINER="js-leak-lab"
THRESHOLD=95  # restart เมื่อ memory usage ถึง 95%

while true; do
  MEM_PERCENT=$(docker stats --no-stream --format "{{.MemPerc}}" "$CONTAINER" | tr -d '%')
  MEM_INT=${MEM_PERCENT%.*}

  if [ "$MEM_INT" -ge "$THRESHOLD" ]; then
    echo "[$(date)] $CONTAINER at ${MEM_PERCENT}% — restarting..."
    docker restart "$CONTAINER"
  fi

  sleep 10
done
EOF

chmod +x /usr/local/bin/mem-watchdog.sh
```

รัน watchdog แบบ background process:

```bash
nohup /usr/local/bin/mem-watchdog.sh >> /var/log/mem-watchdog.log 2>&1 &
```

ดู log:

```bash
tail -f /var/log/mem-watchdog.log
```

---

### วิธีที่ 3 — systemd Service (สำหรับ production / รองรับ reboot)

ลงทะเบียน watchdog เป็น systemd service เพื่อให้ทำงานอัตโนมัติแม้หลัง host reboot:

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

ตรวจสอบสถานะ service:

```bash
systemctl status mem-watchdog
journalctl -u mem-watchdog -f
```

---

### สรุปแนวทางที่แนะนำ

| สถานการณ์ | RAM Limit | Auto-Restart |
|-----------|-----------|--------------|
| Development / ทดสอบในเครื่อง | `--memory=1g` | วิธีที่ 1 (Restart Policy) |
| ต้องการ restart ก่อน crash | `--memory=1g` | วิธีที่ 1 + วิธีที่ 2 |
| Production server / ต้องรองรับ reboot | `--memory=1g --memory-swap=1g` | วิธีที่ 1 + วิธีที่ 3 |

> **หมายเหตุ:** วิธีเหล่านี้เป็นการแก้ปัญหาเฉพาะหน้า (workaround) สำหรับ lab นี้เท่านั้น
> ในระบบ production จริง ควรแก้ไข memory leak ที่ต้นเหตุแทนการพึ่ง auto-restart