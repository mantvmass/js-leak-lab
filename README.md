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
