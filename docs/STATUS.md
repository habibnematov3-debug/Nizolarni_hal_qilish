# Loyiha holati — STATUS

## Xulosa jadvali

| Modul | Bosqich | Hikoyalar (bajarilgan/jami) | Endpointlar (bajarilgan/jami) | Testlar | Holat |
|-------|---------|------------------------------|--------------------------------|---------|-------|
| AUTH | 1 | aniq emas / aniq emas | 7 / 8 | Ha | Bajarilmoqda |
| ADM | 1 | aniq emas / aniq emas | 20 / 20 | Yo'q | Bajarilmoqda |
| BIL | 1 | aniq emas / aniq emas | 9 / 9 | Ha | Bajarildi |
| MED | 2 | aniq emas / aniq emas | 9 / aniq emas | Yo'q | Boshlandi |
| MK | 2 | aniq emas / aniq emas | 11 / aniq emas | Yo'q | Boshlandi |
| HIS | 2 | aniq emas / aniq emas | 11 / aniq emas | Yo'q | Bajarildi |
| ENT | 2 | aniq emas / aniq emas | 10 / aniq emas | Ha | Boshlandi |
| INFRA | 1 | aniq emas / aniq emas | 6 / 6 | Yo'q | Bajarildi |
| PUB | 1-3 | 0 / aniq emas | 0 / aniq emas | Yo'q | Boshlanmadi |
| REG | 1-3 | 9 / 9 | 17 / 14 | Yo'q | Bajarildi |
| TAL | 1-3 | 0 / aniq emas | 0 / aniq emas | Yo'q | Boshlanmadi |
| SHA | 2 | 0 / aniq emas | 0 / aniq emas | Yo'q | Boshlanmadi |
| MTS | 2 | 0 / aniq emas | 0 / aniq emas | Yo'q | Boshlanmadi |
| MON | 3 | 0 / aniq emas | 0 / aniq emas | Yo'q | Boshlanmadi |
| REY | 3 | 0 / aniq emas | 0 / aniq emas | Yo'q | Boshlanmadi |
| INT | 2 | 0 / aniq emas | 0 / aniq emas | Yo'q | Boshlanmadi |
| OKM | 3 | 5 / 5 | 9 / 9 | Yo'q | Bajarildi |
| TOL | 2 | 0 / aniq emas | 0 / aniq emas | Yo'q | Boshlanmadi |
| BIL | 1 | aniq emas / aniq emas | 9 / 9 | Ha | Bajarildi |
| ADM | 1 | aniq emas / aniq emas | 20 / 20 | Yo'q | Bajarilmoqda |

## Hozir nima ishlaydi

### Backend API (NestJS + TypeScript + Prisma)
- **Server ishga tushadi**: `npm run start:dev` buyrug'i bilan http://localhost:3000
- **Swagger hujjatlari**: http://localhost:3000/api/docs
- **Ma'lumotlar bazasi**: PostgreSQL 18+ bilan Prisma ORM
- **Migratsiya va seed**: `npx prisma db push` va `npm run prisma:seed`

### Bajarilgan modullar (kod dalillari bilan):

**1. AUTH (Autentifikatsiya) — src/modules/auth/**
- POST /auth/oneid/login — ONE ID orqali kirish
- POST /auth/esign/login — E-imzo orqali kirish
- POST /auth/mobile-id/login — Mobil ID orqali kirish
- POST /auth/login — Parol bilan kirish (admin uchun)
- POST /auth/refresh — Token yangilash
- POST /auth/logout — Chiqish
- GET /auth/me — Joriy foydalanuvchi
- GET /users/me — Obyektivka olish
- PATCH /users/me — Profil tahrirlash
- Dalil: src/modules/auth/auth.controller.ts, src/modules/users/user-profile.controller.ts

**2. ADM (Administrator paneli) — src/modules/**
- Tashkilotlar: GET/POST/PATCH /admin/organizations (src/modules/organizations/organizations.controller.ts)
- Foydalanuvchilar: GET/POST/PATCH/PUT /admin/users (src/modules/users/users.controller.ts)
- Rollar: GET /admin/roles, PUT /admin/roles/:id/permissions (src/modules/roles/roles.controller.ts)
- Spravochniklar: GET/POST/PATCH /admin/dictionaries (src/modules/dictionaries/dictionaries.controller.ts)
- Audit: GET /admin/audit-log (src/modules/audit/audit.controller.ts)
- Sozlamalar: GET/PUT /admin/settings (src/modules/settings/settings.controller.ts)
- Kontent: GET/POST/PUT/DELETE/POST publish /admin/content (src/modules/content/content.controller.ts)

**3. BIL (Bildirishnomalar) — src/modules/notifications/**
- GET /cabinet/notifications — Xabarlar ro'yxati
- PATCH /cabinet/notifications/:id/read — Xabarni o'qish
- POST /cabinet/notifications/read-all — Barchasini o'qish
- GET /admin/notification-templates — Shablonlar ro'yxati
- PUT /admin/notification-templates/:id — Shablon yangilash
- GET /admin/timers — Taymer sozlamalari
- PUT /admin/timers/:key — Taymer yangilash
- POST /admin/notifications/send — Xabar yuborish
- POST /events/emit — Hodisa yuborish
- Dalil: src/modules/notifications/controllers/

**4. MED (Mediator kabineti) — src/modules/med/**
- GET /cabinet/med/portfolio — Portfolio
- PATCH /cabinet/med/portfolio — Portfolio yangilash
- GET /cabinet/med/calendar — Kalendar
- POST /cabinet/med/calendar — Tadbir yaratish
- DELETE /cabinet/med/calendar/:id — Tadbir o'chirish
- GET /cabinet/med/applications — Arizalar
- POST /cabinet/med/applications/registry-removal — Reyestrdan chiqarish
- POST /cabinet/med/applications/certificate-replacement — Guvohnoma almashtirish
- GET/POST /cabinet/med/messages — Yozishmalar
- Dalil: src/modules/med/med.controller.ts

**5. MK (Malaka komissiyasi) — src/modules/mk/**
- POST /cabinet/mk/applications — Ariza yuborish
- GET /cabinet/mk/applications — Talabgor arizalari
- GET /cabinet/mk/applications/:id — Ariza tafsiloti
- GET /committee/mk/applications — Komissiya arizalari
- POST /committee/mk/applications/:id/accept — Qabul qilish
- POST /committee/mk/applications/:id/reject — Rad etish
- POST /committee/mk/applications/:id/invite — Imtihonga chaqirish
- GET /cabinet/mk/exams/:id — Talabgor imtihoni
- POST /committee/mk/exams/:id/score — Baholash
- POST /admin/mk/questions — Savol qo'shish
- GET /admin/mk/questions — Savollar banki
- POST /admin/mk/committee-members — Komissiya a'zosi
- POST /admin/mk/exams/:id/members — A'zoni biriktirish
- Dalil: src/modules/mk/mk.controller.ts

**6. HIS (Hisobotlar) — src/modules/reports/**
- GET /cabinet/reports — Mediator hisobotlari
- GET /cabinet/reports/current — Joriy chorak
- PUT /cabinet/reports/:id — Hisobot to'ldirish
- POST /cabinet/reports/:id/submit — Yuborish
- GET /staff/reports — Hududiy hisobotlar
- GET /staff/reports/:id — Hisobot tafsiloti
- POST /staff/reports/:id/return — Qaytarish
- POST /staff/reports/:id/accept — Qabul qilish
- POST /staff/report-summaries — Jamlanma yaratish
- POST /staff/report-summaries/:id/submit — Jamlanmani yuborish
- GET /ministry/report-summaries — Vazirlik jamlanmalari
- GET /ministry/analytics — Tahlil
- GET /ministry/analytics/export — Eksport
- Dalil: src/modules/reports/reports.controller.ts

**7. ENT (Integratsiya) — src/modules/integration/**
- GET /external/mygov/mediators — my.gov.uz uchun reyestr
- POST /external/courts/claims — Sud da'volari
- POST /external/training-centers/certificates — Sertifikatlar
- POST /external/billing/callback — To'lov callback
- GET /admin/integrations/logs — Integratsiya loglari
- GET /admin/integrations/claims — Sud da'volari ro'yxati
- GET /admin/integrations/certificates — Sertifikatlar ro'yxati
- GET /admin/integrations/billing-transactions — To'lovlar
- POST /admin/integrations/test/legal-capacity/:pinfl — Test
- POST /admin/integrations/test/video-meeting — Test
- POST /admin/integrations/test/personalization/:pinfl — Test
- Dalil: src/modules/integration/controllers/external-integration.controller.ts

**8. INFRA (Platforma) — src/modules/platform/**
- GET /platform/health — Tizim holati
- GET /platform/metrics — Metrikalar
- GET /platform/logs — Loglar
- POST /platform/files/upload — Fayl yuklash
- GET /platform/files/:id — Fayl olish
- DELETE /platform/files/:id — Fayl o'chirish
- Dalil: src/modules/platform/monitoring/monitoring.controller.ts, src/modules/platform/files/file-storage.controller.ts

### Testlar
- test/test-auth-apis.ts — AUTH moduli testlari
- test/test-bil-apis.ts — BIL moduli testlari
- test/test-all-apis.ts — ADM moduli testlari
- test/test-ent-apis.ts — ENT integratsiya testlari
- Ishga tushirish: `npx ts-node test/test-*.ts`

### Ma'lumotlar bazasi sxemasi
- Prisma schema: prisma/schema.prisma (852 qator)
- 30+ model: User, Role, Permission, Organization, Notification, AuditLog, SystemSetting, Content, MkApplication, MkExam, DisciplineCase, MediatorDossier, QuarterlyReport, ReportSummary va boshqalar
- Seed: prisma/seed.ts (9 ta rol, shablonlar, taymerlar, spravochniklar)

## Nima yetishmayapti

### Hujjatlar (jiddiy muammo)
- **TZ (Texnik topshiriq) topilmadi**: /docs katalogida TZ fayllari yo'q
- **Per-modul TZ fayllari yo'q**: AUTH, PUB, REG, TAL, MED, MK, SHA, MTS, MON, HIS, REY, INT, OKM, TOL, BIL, ADM, ENT, INFRA modullari uchun TZ fayllari topilmadi
- **OpenAPI spec yo'q**: api_nizolarni_muqobil_hal_etish.openapi.yaml fayli topilmadi
- **Jira CSV yo'q**: Epics va stories bo'yicha Jira export fayli topilmadi

### Bajarilmagan modullar (kod yo'q)
- **PUB (Ochiq portal)**: src/modules/ katalogida yo'q
- **REG (Reyestr)**: `src/modules/reg/` — public/staff registry, Excel import/export, status history, regional access and my.gov.uz sync queue
- **TAL (Talabgor kabineti)**: src/modules/ katalogida yo'q
- **SHA (Shartnomalar)**: src/modules/ katalogida yo'q
- **MTS (Mediatsiya seanslari)**: src/modules/ katalogida yo'q
- **MON (Monitoring)**: Platform monitoring module bor, lekin MON moduli alohida yo'q
- **REY (Reytinglar)**: src/modules/ katalogida yo'q
- **INT (Ichki integratsiya)**: ENT module bor, INT alohida yo'q
- **OKM (Malaka komissiyasi)**: MK module qisman qamraydi, OKM alohida yo'q
- **TOL (To'lovlar)**: ENT module qisman qamraydi, TOL alohida yo'q

### Frontend
- **Frontend yo'q**: frontend/ katalogida faqat README.md bor, kod yo'q
- React/Angular/Vue kodi topilmadi

### Endpointlar solishtirishi (OpenAPI yo'qligi sababli)
OpenAPI spec fayli topilmagani uchun:
- Implementatsiya qilingan endpointlar ro'yxati yuqorida keltirildi
- "Missing" endpointlarni aniqlab bo'lmadi (spec yo'q)
- "Kodda bor lekin specda yo'q" endpointlarni aniqlab bo'lmadi

## Xatar va to'siqlar

### 1. Hujjatlar yetishmasligi (Kritik)
- TZ fayllari yo'q — qaysi funksiyalar qaysi bosqichda ekanini aniqlab bo'lmayapti
- Jira stories yo'q — progressni track qilib bo'lmayapti
- OpenAPI spec yo'q — API contract testini qilib bo'lmayapti

### 2. Bosqich 1 modullari to'liq emas
- PUB (ochiq portal) yo'q — tashqi foydalanuvchilar kirishi mumkin emas
- REG (reyestr) — implemented in `src/modules/reg/`; verify migration deployment and configure my.gov.uz credentials for outbound delivery
- TAL (talabgor kabineti) yo'q — arizalar topshirib bo'lmayapti

### 3. Frontend yo'q
- Backend API bor, lekin frontend interfeysi yo'q
- Foydalanuvchilar tizimdan foydalana olmaydi

### 4. Test qoplamasi past
- Faqat 4 ta test fayli bor (AUTH, BIL, ADM, ENT)
- MED, MK, HIS, INFRA modullari uchun testlar yo'q
- Unit testlar yo'q, faqat API integration testlar

### 5. Bajarilgan modullar ham to'liq emas
- MED: Portfolio, calendar, arizalar bor, lekin mediatsiya jarayoni yo'q
- MK: Arizalar va imtihonlar bor, lekin komissiya to'liq ishlashi shubhali
- HIS: Hisobotlar bor, lekin tahlil va eksport to'liq emas
- ENT: Adapterlar bor, lekin real integratsiya yo'q (mock adapterlar)

## Keyingi 5 qadam (prioritet bo'yicha, bosqich tartibida)

### 1. Bosqich 1: PUB (Ochiq portal) — Kritik
- **Nima qilish kerak**: src/modules/public/ modulini yaratish
- **Endpointlar**: Public API (reyestrga kirish, mediator qidirish, yangiliklar, qonunchilik)
- **Dalil**: Hozircha yo'q, yangi yaratish kerak
- **Test**: test/test-public-apis.ts yaratish

### 2. Bosqich 1: REG (Reyestr) — Kritik
- **Nima qilish kerak**: src/modules/registry/ modulini yaratish
- **Endpointlar**: Mediatorlar reyestrini boshqarish (ro'yxatga olish, o'chirish, status)
- **Dalil**: Hozircha yo'q, yangi yaratish kerak
- **Test**: test/test-registry-apis.ts yaratish

### 3. Bosqich 1: TAL (Talabgor kabineti) — Kritik
- **Nima qilish kerak**: src/modules/applicant/ modulini yaratish
- **Endpointlar**: Ariza yuborish, holatni kuzatish, hujjatlar yuklash
- **Dalil**: Hozircha yo'q, yangi yaratish kerak
- **Test**: test/test-applicant-apis.ts yaratish

### 4. Bosqich 1: Frontend — Kritik
- **Nima qilish kerak**: frontend/ katalogiga React yoki Angular ilovasini yaratish
- **Komponentlar**: Login page, Admin panel, Mediator kabineti, Talabgor kabineti
- **Dalil**: Hozircha faqat README.md bor, kod yo'q
- **Test**: Frontend unit va E2E testlar

### 5. Bosqich 2: SHA (Shartnomalar) — Yuqori prioritet
- **Nima qilish kerak**: src/modules/contracts/ modulini yaratish
- **Endpointlar**: Shartnomalar yaratish, imzolash, holatni kuzatish
- **Dalil**: Hozircha yo'q, yangi yaratish kerak
- **Test**: test/test-contracts-apis.ts yaratish

## Teknik ma'lumotlar

### Texnologiyalar
- **Backend**: NestJS 10.x (Node.js / TypeScript)
- **Database**: PostgreSQL 18+
- **ORM**: Prisma 5.x
- **Auth**: JWT (passport-jwt), Bcrypt, ONE ID, E-IMZO, Mobile ID adapters
- **Validation**: Class-Validator, Class-Transformer
- **API Docs**: Swagger / OpenAPI 3.0
- **Deployment**: Vercel (vercel.json bor)

### Loyihani ishga tushirish
```bash
# 1. Dependencies
npm install

# 2. Database
npx prisma db push
npm run prisma:seed

# 3. Server
npm run start:dev

# 4. Swagger docs
http://localhost:3000/api/docs
```

### Testlarni ishga tushirish
```bash
# AUTH moduli
npx ts-node test/test-auth-apis.ts

# BIL moduli
npx ts-node test/test-bil-apis.ts

# ADM moduli
npx ts-node test/test-all-apis.ts

# ENT integratsiya
npx ts-node test/test-ent-apis.ts
```

### Buzilgan narsalar
- **Hujjatlar yo'q**: TZ, OpenAPI, Jira CSV topilmadi
- **Frontend yo'q**: Faqat README.md bor
- **Bosqich 1 modullari yo'q**: PUB, REG, TAL
- **Testlar kam**: Faqat 4 ta test fayli

### Qo'shimcha izohlar
- Backend kod sifati yaxshi (Hexagonal architecture, proper DTOs, Swagger docs)
- Prisma schema to'liq va yaxshi tuzilgan
- Audit logging bor (src/modules/audit/, src/modules/platform/audit/)
- File storage bor (src/modules/platform/files/)
- Monitoring bor (src/modules/platform/monitoring/)
- Lekin hujjatlar yetishmasligi tufayli progressni aniq baholab bo'lmayapti
