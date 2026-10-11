# วิธีเอา Collab Poker ขึ้น host (Render ฟรี + Upstash Redis ฟรี)

แอปรันเป็น service เดียว: server (Express) ให้บริการทั้ง API `/api/*` และหน้าเว็บจาก `client/dist`
ข้อมูลโต๊ะและ PIN ดีลเลอร์เก็บใน **Upstash Redis** จึงไม่หายเมื่อ server restart หรือ deploy ใหม่
ถ้าไม่ได้ตั้งค่า Redis ระบบจะเก็บเป็นไฟล์ใน `server/data` แทน (ใช้ตอนพัฒนาในเครื่อง)

## Environment variables
| ชื่อ | ใช้ทำอะไร |
|---|---|
| `UPSTASH_REDIS_REST_URL` | URL จาก Upstash (`https://xxx.upstash.io`) |
| `UPSTASH_REDIS_REST_TOKEN` | Token จาก Upstash |
| `DEALER_PIN` | PIN ดีลเลอร์ตอนเริ่มครั้งแรก (ถ้าไม่ตั้งจะเป็น 245678) **ควรตั้งเสมอ** |
| `PORT` | host กำหนดให้อัตโนมัติ |

## 1. สร้าง Redis ฟรีบน Upstash
1. https://console.upstash.com → สมัคร/Login
2. **Create Database** → ตั้งชื่อ → Region เลือก **Singapore (ap-southeast-1)** → Free
3. ในหน้า database เลื่อนไปที่ **REST API** แล้ว copy `UPSTASH_REDIS_REST_URL` และ `UPSTASH_REDIS_REST_TOKEN`

## 2. Deploy บน Render
1. Push โปรเจกต์ขึ้น GitHub
2. https://render.com → **New → Blueprint** → เลือก repo
3. ใส่ `DEALER_PIN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` → **Apply**
4. ตรวจที่แท็บ Logs ต้องเห็น `storage: redis`
   (ถ้าสร้าง service ไว้แล้ว: ไปที่ Environment แล้วเพิ่ม 3 ค่านี้ จากนั้น Manual Deploy)

## 3. กันไม่ให้ server หลับ (UptimeRobot ฟรี)
Render ฟรีจะหลับเมื่อไม่มีคนใช้ 15 นาที แก้ได้โดยให้มีระบบ ping ทุก 5 นาที:
1. https://uptimerobot.com → สมัครฟรี
2. **New Monitor** → Type: **HTTP(s)**
3. URL: `https://<ชื่อ-service>.onrender.com/api/health`
4. Interval: **5 minutes** → Create

Render ฟรีให้ 750 ชั่วโมง/เดือน เพียงพอให้ service เดียวรันตลอด 24 ชั่วโมง

## ทดสอบในเครื่อง
```bash
npm ci
npm run build
npm start        # http://localhost:4000 (ข้อมูลเก็บใน server/data)
```
