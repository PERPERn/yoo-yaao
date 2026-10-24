# HANDOFF — Yoo Yaao (อัปเดต 24 ต.ค. 2026 23:10)

> **อัปเดต 23:10 (commit 44623b3 deploy แล้ว):** งานที่เสร็จแล้วรอบนี้คือเมนูโปรไฟล์และปุ่ม logout, หน้าตั้งค่าโปรไฟล์ครั้งแรก (ชื่อ รูป สัญชาติ วีซ่า วันเข้า เมือง), ปรับหน้า login, หน้าส่งงานของ agency (`/partner/deliver`), ปุ่มยืนยันรับงานและรีวิวดาว, ปุ่ม Message ในหน้า `/experts`, โมเดล 3D ในฉาก 90 วัน และแก้ตามผล audit P1–P3 (migration 0007 และ 0008)
> สาเหตุที่ login ดูเหมือนใช้ไม่ได้: header ไม่รู้จัก session (แก้แล้ว) และไปกดลิงก์เก่าที่ใช้ไปแล้ว ส่วนที่ยังค้างคือ **ผู้ใช้ต้องตั้ง Supabase URL Configuration** เอง
> ไฟล์สรุปที่ทำแล้ว: `docs/สรุปผลงาน-TH.pdf` และ Business Model Canvas `docs/pitch/business-model-canvas-th.pdf` ส่วนข้อ 3–4 ด้านล่างให้ถือว่าเป็นประวัติ อัปเดต 23:15 (2f16010): overstay calculator, checklist 7 วันแรก และแชร์ผล Finder เสร็จแล้ว ที่ยังเหลือคือ test reminder email (ต้องใช้คีย์ Resend) และการทดสอบด้วยบัญชีจริงหลังตั้งค่า Supabase URL

> เอกสารนี้ใช้ส่งต่องานไปทำต่อบนเครื่องอื่น ไม่ว่าจะเป็นคนหรือ Claude ก็อ่านไฟล์นี้ก่อนเป็นอันดับแรก
> ตั้งแต่ commit `f9f247a` เป็นต้นไป โค้ดทั้งหมดอยู่บน GitHub และ deploy ขึ้น production แล้ว

## ⏱ จุดที่ค้างล่าสุด (25 ต.ค. 00:00, production = commit 655fb39 ทุกอย่าง push และ deploy แล้ว)
- ข้อความ "Too many tries" ตอน login มาจากเพดานส่งอีเมลรายชั่วโมงของ Supabase ซึ่งตั้งค่าใช้บริการส่งอีเมลฟรีเป็นค่าเริ่มต้น ถ้าจะแก้ถาวรให้ใส่ Custom SMTP (เช่น Resend) ใน Supabase → Authentication → Emails แล้วเพิ่ม rate limit
- ไฟล์ที่ไม่ได้อยู่ใน git เพราะใหญ่เกินไป อยู่บนเครื่องนี้เท่านั้น ได้แก่ docs/pitch/yoo-yaao-demo-2min.mp4, docs/checkpoint3/yoo-yaao-demo-2min.mp4 และ video/out/ ถ้าจะย้ายเครื่องให้ copy ไฟล์เหล่านี้ไปเอง หรืออัปขึ้น Google Drive

### ประวัติ (23:55)
- QA, security review และ fact-check ทำครบแล้ว ดูรายละเอียดได้ใน git log
- PDF สรุปและ BMC สร้างใหม่จากข้อมูลที่แก้แล้ว
- **คลิป mp4 ยังเป็นเวอร์ชันเก่า (18:41):** ผู้ใช้สั่งไม่ต้องทำใหม่ ในคลิปจึงยังมีคำว่า "ใบอนุญาต" กับ "฿1,600–10,000" อยู่ ถ้าจะทำใหม่ให้ดูข้อ 6

### ประวัติ (23:40)
- production ล่าสุด: commit `2f16010` / `fb168ec` (deploy แล้ว)
- **ยังไม่ได้ commit:** `app/astro.config.mjs` ซึ่งปรับ CSP img-src ให้รับรูปได้เฉพาะ supabase project ของเรา (ผล security review: ไม่พบช่องโหว่ที่ใช้โจมตีได้จริง)
- **agent ที่กำลังทำงานอยู่ ถ้าย้ายเครื่องให้สั่งใหม่ตามรายการนี้:**
  1. **QA agent:** ทดสอบทุกฟีเจอร์แบบ end-to-end โดยเน้นหน้าโปรไฟล์ด้วย test user จริง แล้วลบ test user ออกหลังทดสอบเสร็จ
  2. **Fact-check agent:** แก้ข้อมูลตามรีวิวของ Claude อีกตัว
     - Plumia → Nomad Citizen
     - Nomad List $149–200
     - เปลี่ยนเหตุผลขาย Pro จากค่าปรับ TM30 เป็นค่าปรับ 90 วัน ฿2,000
     - เป้า ทททท. ที่ปรับลดเมื่อ 8 เม.ย. 2026
     - ค่าเอเจนต์ DTV ฿3,000–10,000+
     - LTR 12,010
     - /pricing แยก Free กับ Pro ให้ชัด
     - "TAT licence" → "business registration (DBD) + Lawyers Council licence"
     - ช่องยินยอม PDPA ที่ /experts
     - ประกัน DTV ต้องมีแหล่งอ้างอิง หรือเขียนให้อ่อนลง
     - Finder ย้ายคำตอบไปไว้ใน URL hash
     - ตัวเลือก Study/Learn Thai ใน Finder
- ถ้าแก้ caption ใน `video/src/script.json` ต้อง render คลิปใหม่ (ดูข้อ 6)

## 0. ลิงก์สำคัญ
- Production: https://yoo-yaao.vercel.app
- Repo (public): https://github.com/PERPERn/yoo-yaao
- Miro: https://miro.com/app/board/uXjVEWEwo1M=/
- Supabase project: `longstay-th` (ref `eydalrefulzulohhthcp`)
- Vercel project: `yoo-yaao` (team `perpers-projects-f27adadb`)
- แผนที่ความรู้ (graphify): `graphify-out/graph.html` เปิดด้วย browser ได้เลย ส่วนสรุปอยู่ใน `graphify-out/GRAPH_REPORT.md`

## 1. กำหนดส่ง
- **23:00 24/10 — Checkpoint 3:** ส่ง Prototype, Business Model Canvas และ Wireframe ขึ้น Google Drive ของทีม ตั้งชื่อโฟลเดอร์ว่า `สายการแข่ง_หมายเลขทีม_ชื่อทีม_วันที่` (เช่น `IOT_02_ทีมงาน3`) ตรวจสิทธิ์การเข้าถึงลิงก์ก่อนส่งด้วย (ดูรายการไฟล์ในข้อ 4)
- **25/10 12:00–13:30:** ส่งลิงก์เว็บและคลิป .mp4 ยาวไม่เกิน 2 นาที (คลิปอยู่ที่ `docs/pitch/yoo-yaao-demo-2min.mp4` ซึ่งไม่ได้ขึ้น git; สร้างใหม่ได้ตามข้อ 6)
- **25/10 19:00:** นำเสนอเป็นภาษาไทย ใช้ `docs/pitch/deck-outline-th.md`

## 2. วิธีเริ่มงานบนเครื่องใหม่
```bash
git clone https://github.com/PERPERn/yoo-yaao.git && cd yoo-yaao/app
cp .env.example .env        # ใส่ค่าเอง ห้ามส่งคีย์ในแชท
npm install && npx astro dev --background   # http://localhost:4321
npx astro check             # ต้องได้ 0 errors
```
**Deploy production** ต้อง build จากสำเนาที่สะอาดของ HEAD เพื่อไม่ให้งานที่ยังทำไม่เสร็จหลุดขึ้นไป:
```bash
W=/tmp/yy-prod && rm -rf $W && git worktree add --detach $W HEAD
cp -R app/.vercel $W/app/ && cp app/.env $W/app/.env
cd $W/app && npm ci && npx astro build && npx -y vercel@65.2.0 deploy --prebuilt --prod
cd - && git worktree remove --force $W
```
ถ้าเครื่องใหม่ยังไม่มี `app/.vercel` ให้รัน `npx vercel login` แล้วตามด้วย `npx vercel link` เลือก project `yoo-yaao`

**ข้อควรระวังเรื่อง git**
- ตั้ง `git config user.email "242900910+PERPERn@users.noreply.github.com"` ไว้ เพื่อไม่ให้อีเมลจริงไปโผล่ใน repo ที่เป็น public
- ห้าม push branch `history-private` ซึ่งมีอยู่บนเครื่องเดิมเท่านั้น

## 3. บั๊กที่ผู้ใช้รายงาน แต่ยังไม่ได้แก้ (เรียงตามความสำคัญ)
1. **Login ไม่สำเร็จ:** กดลิงก์ในอีเมลแล้วหน้ายังขึ้นว่า "Check your inbox" และปุ่ม Log in ยังอยู่
   - สาเหตุที่น่าจะเป็น (ข้อ a ยังไม่ได้ตรวจยืนยัน): (a) ยังไม่ได้ตั้งค่า Supabase → Authentication → URL Configuration: Site URL = `https://yoo-yaao.vercel.app`, Redirect URLs = `https://yoo-yaao.vercel.app/**` และ `http://localhost:4321/**` (b) ลิงก์นั้นเคยถูกกดไปแล้ว (ลิงก์ใช้ได้ครั้งเดียว) (c) client ใช้ `flowType: 'implicit'` (`app/src/lib/supabase.ts:12`) ซึ่งต้องเปิดลิงก์ที่ origin เดียวกับที่ขอลิงก์
   - สิ่งที่ต้องทำ: เมื่อมี session แล้ว header ต้องเปลี่ยนจาก "Log in" เป็นเมนูโปรไฟล์ (avatar + ชื่อ) ที่มี Account / Messages / Log out
2. **ฉาก 90-day บนหน้าแรก** ครึ่งขวาว่าง (ภาพ #53) โมเดล 3D ตั้งใจให้โชว์แค่ hero กับ finale (ดู POSES ใน `app/src/scripts/home-scroll.ts`) ผู้ใช้คาดว่าจะเห็นโมเดลตรงนั้น ทางเลือกคือเอาโมเดลกลับมาโชว์ในฉาก blueprint (แก้ pose `blueprint` ให้ opacity 1 และวางไว้ทางขวา) หรือใส่ภาพหรือเนื้อหาแทนช่องว่าง
3. ~~หน้า Stay Tools และ Cities การ์ดบีบแคบ~~ **แก้แล้ว** (f9f247a): กฎ `--measure` เคยไปครอบ `li`/`dd`
4. ~~วันที่ต้องพิมพ์เอง~~ **แก้แล้ว**: คลิกช่องวันที่แล้วปฏิทินเปิดขึ้นมา

## 4. ฟีเจอร์ที่ผู้ใช้ขอเพิ่ม (ยังไม่ได้ทำ)
**ฝั่งผู้ใช้ (traveller)**
- **หน้าโปรไฟล์:**
  - ถ้าเป็นบัญชีใหม่ให้เข้า onboarding ก่อน: ตั้งชื่อ, อัปโหลดรูปโปรไฟล์ (Supabase Storage bucket `avatars` ตั้ง RLS ให้แต่ละคนเขียนได้แค่ไฟล์ของตัวเอง), สัญชาติ, วีซ่าปัจจุบัน, วันเข้าประเทศ, เมือง
  - มีปุ่ม Log out ให้เห็นชัด
- **แชทกับ agency:** ต้องเข้าถึงได้ง่าย มีปุ่ม Messages ใน header หรือเมนูโปรไฟล์ และปุ่ม "Contact agency" ในหน้า experts และหน้า listing ที่สร้างการสนทนาได้เลย (ระบบแชทมีอยู่แล้ว: `/messages` + ตาราง `lead_messages`)
- **ปรับหน้า login:** ส่ง magic link ซ้ำ (มีแล้ว), เพิ่มปุ่ม "Continue with Google" (ต้องเปิด Google provider ใน Supabase ก่อน), ลิงก์ Terms/Privacy, จำอีเมลไว้
- **รีวิว agency:** ลูกค้าให้ดาวและเขียนรีวิวได้หลังงานเสร็จ
  - ทำตาราง `agency_reviews` (lead_id, rating 1–5, body, created_at) ตั้ง RLS ให้รีวิวได้เฉพาะลูกค้าของ lead นั้น ครั้งเดียว และเฉพาะเมื่อสถานะงานเป็น delivered/won
  - แสดงคะแนนเฉลี่ยในหน้า listing และหน้า experts
  - ใช้แนวทางเดียวกันกับรีวิว Buddy

**ฝั่ง agency (partner)**
- **หน้าส่งงานหลังทำเสร็จ:** `/partner/deliver?lead=` สำหรับอัปโหลดไฟล์งาน ใช้ Supabase Storage bucket ที่ตั้ง RLS ให้เฉพาะลูกค้าของ lead นั้นกับ agency เท่านั้นที่เข้าถึงได้
  - กดแล้วสถานะ lead เปลี่ยนเป็น `delivered` จากนั้นลูกค้ากดยืนยันว่าได้รับงาน แล้วระบบเปิดให้รีวิว
  - ต้องเพิ่มค่า `delivered` ใน check constraint ของ `leads.status` ด้วย

**ไอเดียจากทีม (ภาพ #58–60) ให้เลือกทำเฉพาะที่ใช้แรงน้อย**
- ทำได้เลย:
  - Overstay fine calculator (`/tools/overstay`) ค่าปรับต้องอ้างแหล่งทางการพร้อม SourceTag ห้ามใช้ตัวเลขจากความจำ
  - "First 7 days in Thailand" checklist ที่มีปุ่ม "ให้บัดดี้ช่วย"
  - แชร์ผลลัพธ์จาก Finder
- ปุ่ม "Send me a test reminder" เพื่อพิสูจน์ว่าระบบเตือนของ Pro ใช้ได้จริง ต้องมีคีย์ของบริการส่งเมล (เช่น Resend) และ service-role key ก่อน
- เก็บไว้เล่าตอน pitch ว่า "ต่อยอดได้": Stay budget planner, Web push, Invite a friend, "Explore while you stay", ส่วนธุรกิจภาษาไทย, หน้า "What changed", แจ้งเตือนผ่าน LINE หรือ Telegram, ขยายไป SEA

**ผลทดสอบจาก Claude อีกตัว (ปรับใช้ตามความเหมาะสม):** `docs/reviews/browser-test.md` และ `docs/reviews/site-audit.md`
- P1:
  - หน้าแรกบนมือถือโหลดช้า
  - สีข้อความ contrast ต่ำกว่า 4.5:1 อยู่ 32 จุด
  - ลิงก์ในข้อความท้ายเว็บแยกจากข้อความด้วยสีอย่างเดียว
- P2:
  - LCP 3.2–3.5 วินาที
  - กล่องเลื่อนในแนวนอนรับโฟกัสคีย์บอร์ดไม่ได้
  - หน้า admin มี h1 สองอัน
  - landmark `aside` ซ้อนอยู่ใน landmark อื่น
  - โหมดมืดไม่ทำงาน (ตอนนี้บังคับธีมสว่างไว้ ให้ตัดสินใจว่าจะแก้เอกสารดีไซน์ให้ตรง)
  - ไฟล์ใหญ่ในชุด production
  - เป้ากดของลิงก์บางอันเล็ก
- P3:
  - `/dev/hero` หลุดเข้าไปใน build
  - เครื่องคิด 90 วันเริ่มนับ "ครั้งถัดไป" จากรอบที่เลยกำหนดแล้ว
  - ใส่วันเข้าไทยล่วงหน้าไม่ได้

**Checkpoint 3 (ส่งขึ้น Drive)**
- Prototype: ลิงก์เว็บ + `docs/pitch/yoo-yaao-demo-2min.mp4`
- Business Model Canvas: ยังไม่มีไฟล์ภาพ ให้ทำ `docs/pitch/business-model-canvas-th.html` แล้ว export เป็น PDF โดยดึงข้อมูลจาก `docs/business-model.md` ซึ่งมี BMC 9 ช่องอยู่แล้ว
- Wireframe: อยู่บน Miro (frame 3 และ 5) ให้ export เป็นภาพหรือ PDF

## 5. สิ่งที่ผู้ใช้ต้องตั้งค่าเอง
1. **Supabase:**
   - URL Configuration (ข้อ 3.1)
   - ทำบัญชีตัวเองให้เป็น admin: login 1 ครั้ง แล้วรัน `update public.profiles set role='admin' where lower(email)='...';`
   - เปิด Leaked password protection
   - ตรวจว่า Confirm email ยังเปิดอยู่
2. **Vercel (ไม่บังคับ):** `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` (sk_test_), `STRIPE_WEBHOOK_SECRET` ตอนนี้ยังไม่ได้ใส่ ระบบจ่ายเงินจึงทำงานเป็นโหมด demo

## 6. สร้างคลิปใหม่
```bash
cd app && npx astro dev --background
cd ../video && npm install && npm run record && npm run voice && npm run render
```
- ข้อความและเสียงพากย์แก้ได้ใน `video/src/script.json`
- เสียงพากย์ใช้ macOS `say -v Kanya` จึงต้องรันบน Mac

## 7. งานที่ค้างระหว่างทาง
- **Review agent รอบสุดท้าย (web-design-guidelines, impeccable)** ติด rate limit ก่อนจะทำเสร็จ งานที่แก้ไปบางส่วนยังไม่ได้ commit ตรวจได้ด้วย `git status` บนเครื่องเดิม ถ้าย้ายเครื่องให้รันรีวิวใหม่ทั้งหมด
- **สรุปเป็น PDF ภาษาไทย** ยังไม่ได้ทำ แนวทางคือเขียน HTML (ใช้ฟอนต์ Anuphan) แล้วใช้ Playwright `page.pdf()` ลงไปที่ `docs/สรุปโปรเจกต์-TH.pdf` (ทับไฟล์เดิม) ข้อมูลตั้งต้นอยู่ใน `docs/สรุปและสิ่งที่ต้องตั้งค่า-TH.md` และเอกสารนี้

## 8. โครงสร้างระบบโดยย่อ
- **`app/` (Astro 7 + Vercel):**
  - หน้าฝั่งผู้ใช้
  - `/business/*` ใช้ layout `Business.astro`
  - `/partner/*` พอร์ทัลของ agency
  - `/admin/*` ใช้ layout `Admin.astro`
  - `/messages` หน้าแชท
  - `src/lib/ops.ts` รวม query ทั้งหมดของฝั่ง partner/admin/chat
  - `src/data/demo-ops.ts` ข้อมูลตัวอย่างสำหรับโหมด demo ตอนที่ยังไม่ได้ login
- **`supabase/migrations/0001–0006`:**
  - roles และ RLS
  - การตรวจสอบ partner: ต้องติ๊ก verified ก่อน approve และ `approve_partner(app_type, app_id, listing_id, agent_id)`
  - แชท `lead_messages` + Realtime
- **ความปลอดภัย:** ดู `docs/security.md` ทุก migration ทดสอบด้วย JWT ปลอมภายใน transaction แล้ว rollback
- **กฎการทำงาน:**
  - ข้อมูลกฎหมายและราคาทุกตัวต้องมีแหล่งอ้างอิงทางการพร้อม SourceTag
  - ห้ามส่งคีย์ในแชท
  - ใช้ agent พร้อมกันได้ไม่เกิน 3 ตัว แบ่งหน้าที่ตามไฟล์ที่แต่ละตัวรับผิดชอบ
