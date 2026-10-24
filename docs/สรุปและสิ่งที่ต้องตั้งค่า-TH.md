# Yoo Yaao — สรุปผลงานและสิ่งที่ต้องตั้งค่า (อัปเดต 24 ต.ค. 2026 ค่ำ)

> ส่งงาน: 25 ต.ค. 12:00–13:30 (ลิงก์เว็บ + คลิป .mp4 2 นาที) · นำเสนอ 25 ต.ค. 19:00
> เว็บ production (เปิดได้ทุกคน): https://yoo-yaao.vercel.app
> โค้ด (public): https://github.com/PERPERn/yoo-yaao · Miro: https://miro.com/app/board/uXjVEWEwo1M=/

---

## ส่วนที่ 1 — สิ่งที่คุณต้องตั้งค่าเอง (เรียงตามความสำคัญ)

ผมทำแทนไม่ได้ เพราะเป็นการกรอกคีย์/รหัสผ่าน หรือเป็นการตั้งค่าในหน้า dashboard ของบัญชีคุณ
**ห้ามส่งคีย์ใดๆ ในแชท** ให้ใส่ในไฟล์ `app/.env` หรือใน dashboard เท่านั้น
repo เป็น public แล้ว จึงต้องระวังเป็นพิเศษว่าไม่มีคีย์ลับใน commit ใดเลย (`.env` อยู่ใน `.gitignore`)

### ต้องทำก่อนส่งงาน

| # | ทำอะไร | ทำที่ไหน | ทำไม |
|---|---|---|---|
| 1 | ตั้ง **Site URL** = `https://yoo-yaao.vercel.app` และเพิ่ม **Redirect URLs**: `https://yoo-yaao.vercel.app/**` กับ `https://*-perpers-projects-f27adadb.vercel.app/**` | Supabase → Authentication → URL Configuration | ถ้ายังไม่ได้ตั้ง ลิงก์ login ในอีเมล (รวมถึงลิงก์ที่ส่งหลังสมัคร partner) จะเด้งกลับไป localhost |
| 2 | สร้างบัญชี admin ของคุณ: ล็อกอินในเว็บ production 1 ครั้ง แล้วรัน `update public.profiles set role='admin' where lower(email)='อีเมลคุณ';` | Supabase → SQL Editor | ถึงจะเข้า `/admin` และดูรายได้ด้วยข้อมูลจริงได้ (ถ้าไม่ login หน้า admin จะแสดงข้อมูลตัวอย่าง) |
| 3 | เปิด **Leaked password protection** | Supabase → Authentication → Settings (Password security) | เป็นคำเตือน security ของ Supabase ใช้เวลา 1 คลิก |
| 4 | ตรวจว่า **Confirm email** และ **Secure email change** เปิดอยู่ | Supabase → Authentication → Providers → Email | ระบบ partner และแชทใช้อีเมลยืนยันตัวตน ถ้าปิดอยู่ คนอื่นอาจอ้างอีเมลของ partner หรือลูกค้าได้ |

### ทำถ้ามีเวลา (ไม่มีก็ยังโชว์ได้ เพราะเว็บมีโหมด demo)

ตรวจเมื่อ 24 ต.ค. ค่ำ: `https://yoo-yaao.vercel.app/api/revenue` ตอบ `"configured": false` แปลว่าบน production ยังไม่มี service-role key ระบบจ่ายเงินจึงยังเป็นโหมดเดโมที่ไม่ตัดเงิน

| # | ทำอะไร | ทำที่ไหน | ได้อะไร |
|---|---|---|---|
| 5 | ใส่ `STRIPE_SECRET_KEY` และ `STRIPE_WEBHOOK_SECRET` (ใช้คีย์ **test mode** ที่ขึ้นต้นด้วย `sk_test_`) | `app/.env` และ Vercel → Settings → Environment Variables แล้ว redeploy | ระบบจ่ายเงินทำงานจริงใน test mode (ตอนนี้เป็นเดโมที่ไม่ตัดเงิน) และยอดรายได้ใน admin เป็นยอดจริง |
| 6 | ใส่ `SUPABASE_SERVICE_ROLE_KEY` | `app/.env` และ Vercel (ห้ามใส่ใน PUBLIC_) | ให้ webhook ของ Stripe อัปเดตสถานะการจ่ายเงินลงฐานข้อมูล และให้ API รายได้ (เฉพาะ admin) อ่านยอดได้ |
| 7 | เปิด **Web Analytics** | Vercel → โปรเจกต์ yoo-yaao → Analytics → Enable | ข้อมูล traffic จริง ซึ่งจะต่อเข้ากับ dashboard ทีหลัง (ตอนนี้ใช้ข้อมูลตัวอย่างที่มีป้าย SAMPLE) |
| 8 | ถ้ายังแปลงวิดีโอไม่ได้: `brew reinstall x265 ffmpeg` | Terminal | แปลงคลิป demo จาก .webm เป็น .mp4 สำหรับส่งงาน |

### เรื่องที่ตัดสินใจแล้ว

1. **ธุรกิจจ่ายเงินหลังได้รับอนุมัติ:** สมัคร → ยืนยันอีเมล → admin ตรวจตัวตนและใบอนุญาต → อนุมัติ → จ่าย $49 ในพอร์ทัล ตรงกับเรื่อง "ตรวจสอบก่อน"
2. **หลังสมัคร ระบบส่งลิงก์ login ทางอีเมลให้ทันที** ผู้สมัครจึงมีบัญชีไว้ติดตามสถานะใบสมัครได้
3. **repo เป็น public** ที่ https://github.com/PERPERn/yoo-yaao ให้กรรมการตรวจโค้ดได้

---

## ส่วนที่ 2 — สรุปผลงานที่ทำเสร็จแล้ว

### สถานะรวม
- **Production live** ที่ https://yoo-yaao.vercel.app เปิดได้โดยไม่ต้อง login
- **repo เป็น public** ที่ https://github.com/PERPERn/yoo-yaao
- ข้อมูลตัวอย่างทุกจุดมีป้ายกำกับ ("Demo view — sample data" หรือ "Sample") ไม่มีตัวเลขไหนแอบอ้างว่าเป็นยอดจริง

### ฝั่งผู้ใช้ (นักท่องเที่ยว/nomad) — `/`
- **หน้าแรกแบบ scroll story:** ฉาก Problem, Visas และ 90-day timeline จะค้างอยู่บนจอขณะเลื่อน ให้อนิเมชันเล่นตามการเลื่อนจนครบก่อนค่อยไปฉากถัดไป และหยุดตรงหัวฉากพอดี (snap)
- **ฟีเจอร์หลัก:**
  - Visa Finder (6 คำถาม)
  - หน้ารายละเอียดวีซ่า 5 แบบ (DTV, LTR, Privilege, Visa-exempt, Retirement) อ้างแหล่งข้อมูลทางการ
  - เครื่องมือ 90-day report และไฟล์ .ics ที่ใส่ปฏิทินได้
  - หน้าเมือง
  - Local Buddies
  - Pricing
  - **แชทกับเอเจนต์ (`/messages`):** ลูกค้าที่ส่งคำขอ "Get expert help" คุยกับเอเจนต์ที่ได้รับ lead นั้นได้ในเว็บ เสร็จแล้ว
  - **หน้าสถานะการจ่ายเงิน (`/checkout/status`) พร้อมอนิเมชัน:** บอกผลชัดเจน 1 ใน 4 แบบ คือ จ่ายแล้ว, ยกเลิก, ล้มเหลว/หมดเวลา (กดลองใหม่ได้) และใบเสร็จเดโมที่ไม่ตัดเงิน แผนภาพอยู่ที่ `docs/pitch/payment-flow.html`
- **อื่นๆ:** ปุ่มกลับขึ้นด้านบน, ธีมสว่าง, โมเดล 3D จาก Blender, พื้นหลัง shader และคลิป demo ในหน้าแรก
- **ฟอนต์อัปเดตแล้ว:** Bricolage Grotesque (หัวข้อ), Public Sans (เนื้อหา) และ Anuphan (ภาษาไทย) โหลดจากเว็บเราเอง ไม่พึ่ง Google Fonts

### ฝั่งธุรกิจ (partner) — `/business` แยกจากฝั่งผู้ใช้
- **Layout แยก:** หัวเว็บของตัวเอง ("Yoo Yaao for Business") ส่วนหน้าผู้ใช้เหลือแค่ลิงก์เล็กๆ "For business"
- **`/business/apply`:** ฟอร์มสมัคร ต้องกรอกเลขใบอนุญาต TAT หรือเลขจดทะเบียน (บังคับสำหรับบริษัทวีซ่า) และติ๊กยินยอมให้ตรวจสอบ ส่งแล้วระบบส่งลิงก์ login ทางอีเมลให้ทันที ยังไม่ต้องจ่ายเงิน
- **`/business/verify`:** หน้าอธิบายขั้นตอนตรวจสอบ partner
- **`/partner` (พอร์ทัล):** ดู lead ที่ได้รับและกด ตอบแล้ว/ได้งาน/ไม่ได้งาน, ตอบแชทลูกค้า (`/partner/messages`), แก้ไขข้อมูล listing, ดูสถานะใบสมัคร และซื้อ featured listing **หลังได้รับอนุมัติแล้วเท่านั้น**

### ฝั่ง admin — `/admin`
- **Dashboard แบบ Cadra:**
  - KPI 4 การ์ด
  - กราฟรายได้ 12 เดือน แยก B2C/B2B/C2C (ข้อมูลตัวอย่าง ติดป้าย Sample)
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
- **รายได้ดูได้เฉพาะ admin:** `/api/revenue` ตรวจว่าผู้เรียกเป็น admin ก่อนส่งยอด ไม่เปิดสาธารณะแล้ว

### ความปลอดภัย (แก้ตามผล security review เสร็จแล้ว)
- **Role 3 ระดับ:** user / partner / admin ผู้ใช้เปลี่ยน role ตัวเองไม่ได้
- **สิทธิ์ partner:** ต้องเป็น role partner **และ** อีเมลตรงกันเท่านั้น ถ้าอีเมลตรงแต่ยังไม่ได้รับอนุมัติ จะเห็นข้อมูล 0 แถว
- **การอนุมัติใบสมัคร:** ฐานข้อมูลปฏิเสธการอนุมัติที่ยังไม่ผ่านการตรวจสอบ แม้แต่ admin ก็ทำไม่ได้ และปิดช่องโหว่ที่สถานะ `paid` เคยข้ามการตรวจได้ (migration `20261024000003_security_fixes.sql`)
- **แชท:** เห็นได้เฉพาะลูกค้าเจ้าของ lead, เอเจนต์ที่ได้รับ lead และ admin ผู้ส่งและเวลาถูกกำหนดโดยฐานข้อมูล ไม่เชื่อค่าจาก browser (migration `20261024000004_messages.sql`)
- **คีย์ลับ:** service-role key ไม่เคยถูกส่งไปที่ browser
- **Security headers:** ตั้ง CSP และ security headers แล้ว
- รายละเอียดอยู่ใน `docs/security.md`

### คุณภาพโค้ด
- `astro check` ไม่มี error และ build ผ่าน
- Playwright ติดตั้งในโปรเจกต์แล้ว อัดคลิป demo ใหม่ได้ด้วย `cd app && npm run record-demo` (ต้องเปิดเว็บด้วย `npx astro dev` ก่อน)

### เอกสารส่งงาน (`docs/pitch/`)
- `submission-th.md` ไอเดีย + ข้อจำกัด 3 ข้อ, หัวข้อนำเสนอ, โมเดลธุรกิจ 3 ขา และแผนรายวัน
- `deck-outline-th.md` โครงสไลด์ 10 หน้า + คำถามกรรมการ 10 ข้อ
- `mindmap-th.html`, `competitors-th.html`, `storyboard-th.html`, `payment-flow.html` ภาพประกอบ
- Miro: frame "3. Mobile wireframes" (ฝั่งผู้ใช้), "4. Mind map" และ "5. Business, partner and admin wireframes"

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
1. ทำส่วนที่ 1 ข้อ 1–4 ให้ครบ โดยเฉพาะ Site URL ของ Supabase เพื่อให้ลิงก์ login บน production ใช้ได้
2. อัดคลิป demo ใหม่ให้มีฉาก business, admin และแชท แล้วตัดเป็น .mp4 ความยาว 2 นาที อัปโหลด Google Drive ตั้ง "anyone with link"
3. smoke test production เช้า 25 ต.ค.: Finder → Pro checkout (เดโม) → หน้าสถานะ, `/business/apply`, `/partner`, `/admin`, `/messages`
4. ทำสไลด์และซ้อมพรีเซนต์ตาม `docs/pitch/deck-outline-th.md`
5. ส่งงาน 25 ต.ค. 12:00–13:30 (ลิงก์เว็บ + ลิงก์วิดีโอ)
