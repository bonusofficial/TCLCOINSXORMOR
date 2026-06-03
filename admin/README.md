# ORMOR Admin

Next.js project สำหรับระบบหลังบ้านที่แยกออกจากเว็บผู้ใช้เดิม

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

ค่าเริ่มต้นของ `dev` และ `start` ใช้ port `3001` เพื่อรันคู่กับเว็บผู้ใช้ที่ port `3000`

## Deploy

ตั้งค่า root directory ของ deployment เป็น `admin`

Environment variables สำคัญ:

```env
DATABASE_URL=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://dashboard.tclcoinsxormor.com
BETTER_AUTH_TRUSTED_ORIGINS=https://tclcoinsxormor.com,https://www.tclcoinsxormor.com,https://dashboard.tclcoinsxormor.com
COOKIE_DOMAIN=.tclcoinsxormor.com
NEXT_PUBLIC_API_URL=
UPLOAD_PUBLIC_ROOT=/absolute/path/to/frontend/public
UPLOAD_PUBLIC_BASE_URL=https://tclcoinsxormor.com
```

ใช้ `BETTER_AUTH_SECRET` และ `DATABASE_URL` ชุดเดียวกับเว็บผู้ใช้ ถ้าต้องการให้ session/cookie และข้อมูลผู้ใช้ร่วมกันได้

Upload จาก admin จะเขียนไฟล์ไปที่ `UPLOAD_PUBLIC_ROOT/uploads/...` และคืน URL ด้วย `UPLOAD_PUBLIC_BASE_URL/uploads/...`
