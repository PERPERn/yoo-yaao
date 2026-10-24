# Yoo Yaao — สรุปผลงานและสิ่งที่ต้องตั้งค่า (อัปเดต 24 ต.ค. 2026)

> ส่งงาน: 25 ต.ค. 12:00–13:30 (ลิงก์เว็บ + คลิป .mp4 2 นาที) · นำเสนอ 25 ต.ค. 19:00
> Preview ล่าสุด: https://yoo-yaao-efbpqtvti-perpers-projects-f27adadb.vercel.app (ต้อง login Vercel ถึงเปิดได้)

---

## ส่วนที่ 1 — สิ่งที่คุณต้องตั้งค่าเอง (เรียงตามความสำคัญ)

ผมทำแทนไม่ได้ เพราะเป็นการกรอกคีย์/รหัสผ่าน หรือเป็นการตั้งค่าในหน้า dashboard ของบัญชีคุณ
**ห้ามส่งคีย์ใดๆ ในแชท** ให้ใส่ในไฟล์ `app/.env` หรือใน dashboard เท่านั้น

### ต้องทำก่อนส่งงาน

| # | ทำอะไร | ทำที่ไหน | ทำไม |
|---|---|---|---|
| 1 | บอกผมว่า **"deploy prod"** | แชท | ตอนนี้มีแค่ลิงก์ preview ที่ต้อง login ส่วนกรรมการต้องใช้ลิงก์ production ที่เปิดได้ทุกคน |
| 2 | ตั้ง **Site URL** = ลิงก์ production (ผมจะส่งให้หลัง deploy) และเพิ่ม **Redirect URLs**: `https://*-perpers-projects-f27adadb.vercel.app/**` กับ `https://<ลิงก์ prod>/**` | Supabase → Authentication → URL Configuration | แก้ปัญหาลิงก์ login เด้งกลับไป localhost |
| 3 | สร้างบัญชี admin ของคุณ: สมัคร/ล็อกอินในเว็บก่อน 1 ครั้ง แล้วรัน `update public.profiles set role='admin' where lower(email)='อีเมลคุณ';` | Supabase → SQL Editor | ถึงจะเข้า `/admin` ด้วยข้อมูลจริงได้ (ถ้าไม่ login หน้า admin จะแสดงข้อมูลตัวอย่าง) |
| 4 | เปิด **Leaked password protection** | Supabase → Authentication → Settings (Password security) | เป็นคำเตือน security ของ Supabase ใช้เวลา 1 คลิก |
| 5 | ตรวจว่า **Confirm email** และ **Secure email change** เปิดอยู่ | Supabase → Authentication → Providers → Email | ระบบ partner ใช้อีเมลยืนยันตัวตน ถ้าปิดอยู่ คนอื่นอาจอ้างอีเมลของ partner ได้ |

### ทำถ้ามีเวลา (ไม่มีก็ยังโชว์ได้ เพราะเว็บมีโหมด demo)

| # | ทำอะไร | ทำที่ไหน | ได้อะไร |
|---|---|---|---|
| 6 | ใส่ `STRIPE_SECRET_KEY` และ `STRIPE_WEBHOOK_SECRET` (ใช้คีย์ **test mode** ที่ขึ้นต้นด้วย `sk_test_`) | `app/.env` และ Vercel → Settings → Environment Variables | ระบบจ่ายเงินทำงานจริง (ตอนนี้เป็น demo ที่ไม่ตัดเงิน) และหน้า Revenue แสดงยอดจริง |
| 7 | ใส่ `SUPABASE_SERVICE_ROLE_KEY` | `app/.env` และ Vercel (ห้ามใส่ใน PUBLIC_) | ให้ webhook ของ Stripe อัปเดตสถานะการจ่ายเงินลงฐานข้อมูลได้ |
| 8 | เปิด **Web Analytics** | Vercel → โปรเจกต์ yoo-yaao → Analytics → Enable | ข้อมูล traffic จริง ซึ่งจะต่อเข้ากับ dashboard ทีหลัง (ตอนนี้ใช้ข้อมูลตัวอย่างที่มีป้าย SAMPLE) |
| 9 | ซ่อม ffmpeg: `brew reinstall x265 ffmpeg` | Terminal | แปลงคลิป demo จาก .webm เป็น .mp4 สำหรับส่งงาน |

### เรื่องที่รอคุณตัดสินใจ

1. **จ่ายเงินหลังอนุมัติ หรือจ่ายทันทีตอนสมัคร?** ตอนนี้เป็นแบบ *สมัคร → ยืนยันตัวตน → อนุมัติ → จ่าย $49 ในพอร์ทัล* ผมแนะนำแบบนี้เพราะตรงกับเรื่อง "ตรวจสอบก่อน"
2. **หลังสมัคร ระบบส่งลิงก์ login ทางอีเมลให้ทันที** (ทำให้ผู้สมัครมีบัญชีเพื่อติดตามสถานะได้) โอเคไหม?

---

## ส่วนที่ 2 — สรุปผลงานที่ทำเสร็จแล้ว

### ฝั่งผู้ใช้ (นักท่องเที่ยว/nomad) — `/`
- **หน้าแรกแบบ scroll story:** ฉาก Problem, Visas และ 90-day timeline จะค้างอยู่บนจอขณะเลื่อน ให้อนิเมชันเล่นตามการเลื่อนจนครบก่อนค่อยไปฉากถัดไป และหยุดตรงหัวฉากพอดี (snap)
- **ฟีเจอร์หลัก:**
  - Visa Finder (6 คำถาม)
  - หน้ารายละเอียดวีซ่า 5 แบบ (DTV, LTR, Privilege, Visa-exempt, Retirement) อ้างแหล่งข้อมูลทางการ
  - เครื่องมือ 90-day report และไฟล์ .ics ที่ใส่ปฏิทินได้
  - หน้าเมือง
  - Local Buddies
  - Pricing
  - หน้าสถานะการจ่ายเงิน
- **อื่นๆ:** ปุ่มกลับขึ้นด้านบน, ธีมสว่าง, โมเดล 3D จาก Blender, พื้นหลัง shader และคลิป demo ในหน้าแรก

### ฝั่งธุรกิจ (partner) — `/business` แยกจากฝั่งผู้ใช้
- **Layout แยก:** หัวเว็บของตัวเอง ("Yoo Yaao for Business") ส่วนหน้าผู้ใช้เหลือแค่ลิงก์เล็กๆ "For business"
- **`/business/apply`:** ฟอร์มสมัคร ต้องกรอกเลขใบอนุญาต TAT หรือเลขจดทะเบียน (บังคับสำหรับบริษัทวีซ่า) และติ๊กยินยอมให้ตรวจสอบ
- **`/business/verify`:** หน้าอธิบายขั้นตอนตรวจสอบ partner
- **`/partner` (พอร์ทัล):** ดู lead ที่ได้รับและกด ตอบแล้ว/ได้งาน/ไม่ได้งาน, แก้ไขข้อมูล listing, ดูสถานะใบสมัคร และซื้อ featured listing

### ฝั่ง admin — `/admin`
- **Dashboard แบบ Cadra:**
  - KPI 4 การ์ด
  - กราฟรายได้ 12 เดือน แยก B2C/B2B/C2C
  - รายการรอดำเนินการ
  - สัดส่วนรายได้
  - สถานะเว็บ
  - Traffic
  - Sales funnel
- **การจัดการ:**
  - ใบสมัคร: มี checklist "ตรวจตัวตน" และ "ตรวจใบอนุญาต" โดยปุ่ม Approve จะกดไม่ได้จนกว่าจะติ๊กครบ
  - Leads: มอบหมาย lead ให้ agent
  - Listings: เปิด/ปิด featured
  - ผู้ใช้: เปลี่ยน role โดยมีขั้นตอนยืนยันก่อนเปลี่ยน

### ความปลอดภัย
- **Role 3 ระดับ:** user / partner / admin ผู้ใช้เปลี่ยน role ตัวเองไม่ได้
- **สิทธิ์ partner:** ต้องเป็น role partner **และ** อีเมลตรงกันเท่านั้น ถ้าอีเมลตรงแต่ยังไม่ได้รับอนุมัติ จะเห็นข้อมูล 0 แถว
- **การอนุมัติใบสมัคร:** ฐานข้อมูลปฏิเสธการอนุมัติที่ยังไม่ผ่านการตรวจสอบ แม้แต่ admin ก็ทำไม่ได้
- **คีย์ลับ:** service-role key ไม่เคยถูกส่งไปที่ browser
- **Security headers:** ตั้ง CSP และ security headers แล้ว
- รายละเอียดอยู่ใน `docs/security.md`
- กำลังมี agent ทดสอบเจาะระบบอีกรอบ (ผลจะอัปเดตในไฟล์นี้)

### คุณภาพโค้ด
- `astro check` ไม่มี error และ build ผ่าน
- Playwright ติดตั้งในโปรเจกต์แล้ว อัดคลิป demo ใหม่ได้ด้วย `cd app && npm run record-demo` (ต้องเปิดเว็บด้วย `npx astro dev` ก่อน)

### กำลังทำอยู่
- ปรับฟอนต์และการจัดวางทั้งเว็บ โดยใช้ skill ด้าน design (taste, impeccable, ui-ux-pro-max)
- ทดสอบความปลอดภัยฝั่ง partner/admin

---

## ส่วนที่ 3 — Skill ที่ใช้

| กลุ่ม | Skill |
|---|---|
| วางแผน/ทำงานเป็นทีม | using-superpowers, dispatching-parallel-agents, systematic-debugging, verification-before-completion |
| โค้ด | ponytail, security-and-hardening, security-review, supabase, supabase-postgres-best-practices |
| ออกแบบ | design-taste-frontend, impeccable, ui-ux-pro-max, frontend-design, interface-design, baseline-ui, fixing-accessibility, web-design-guidelines, dataviz |
| อนิเมชัน/3D | gsap-scrolltrigger, gsap-performance, threejs-*, fixing-motion-performance |
| ธุรกิจ | cro, onboarding, paywalls, diagram-design |
| MCP | Supabase, Vercel, Chrome, Blender, 21st.dev |

## ส่วนที่ 4 — การแบ่งหน้าที่ agent

| Agent | หน้าที่ |
|---|---|
| Main | วางแผน ตรวจงานในเบราว์เซอร์ commit และ deploy |
| A — DB/Backend | migration, RLS, ระบบตรวจสอบ partner, `ops.ts` |
| B — Business/Partner | `/business`, `/partner` |
| C — Admin | `/admin` dashboard |
| Security/QA | ทดสอบเจาะระบบ |
| UI | ฟอนต์และการจัดวาง |

## ส่วนที่ 5 — งานถัดไปก่อนส่ง
1. แก้ตามผล security review
2. ปรับฟอนต์และ layout ให้เสร็จ แล้วอัดคลิป demo ใหม่ โดยเพิ่มฉาก business/admin
3. Deploy production (รอคำสั่งจากคุณ)
4. แปลงคลิปเป็น .mp4 ความยาว 2 นาที
5. ซ้อมพรีเซนต์ตาม `docs/pitch/`
