# API Qo'llanma

## 1. Umumiy ma'lumot

**Base URL (dev):** `http://localhost:3000`  
**Base URL (stage):** `https://api.stage.nizolar.uz`  
**API versiyasi:** `v1`  
**Hujjatlar:** `GET /api/docs` (Swagger UI)

## REG — Mediatorlar, sudyalar va arbitrlar reyestri

Public endpoints return only active records with `publicProfile=true` and expose a limited profile projection:

| Method | Route | Purpose |
|---|---|---|
| GET | `/public/mediators` | Search public registry by name, region, type, or specialization |
| GET | `/public/mediators/map` | Public map points for matching entries |
| GET | `/public/mediators/:id` | Public profile |

Registry staff endpoints require a JWT and one of `ADMIN`, `MINISTRY_STAFF`, or `REGIONAL_STAFF`. Regional staff are restricted to their own region.

| Method | Route | Purpose |
|---|---|---|
| GET, POST | `/staff/registry/mediators` | Search/list and create entries |
| GET, PATCH, DELETE | `/staff/registry/mediators/:id` | Read, edit, or remove an entry |
| PATCH | `/staff/registry/mediators/:id/status` | Change status (`ACTIVE`, `SUSPENDED`, `REVOKED`) and record reason/history |
| GET | `/staff/registry/mediators/:id/status-history` | View status history |
| GET | `/staff/registry/statistics` | Registry counts and breakdown |
| GET | `/staff/registry/export` | Export filtered records to Excel |
| GET | `/staff/registry/imports/template` | Download Excel import template |
| POST | `/staff/registry/imports` | Upload an `.xlsx` file (`file`, max 10 MB) |
| GET | `/staff/registry/imports/:id` | Read import results, duplicate and row error report |
| POST | `/staff/registry/sync/run` | Admin-only retry of queued my.gov.uz updates |

The existing `GET /external/mygov/mediators` endpoint serves the active public mediator projection. Outbound updates are queued; configure `MYGOV_API_URL` and optionally `MYGOV_API_TOKEN` to enable delivery. When no URL is configured, queued items remain available for retry after configuration.

The schema change is in `prisma/migrations/202610230002_add_registry_module`.

## REY — Reyting

Public rating endpoints expose active, public registry profiles and their latest calculated rating for the requested year (`periodYear`, defaults to the current year). Ratings sort from highest to lowest; a profile with no calculation yet has a null rating.

| Method | Route | Purpose |
|---|---|---|
| GET | `/public/ratings` | Ranked public profiles; supports `page`, `limit`, `periodYear`, `type`, and `region` |
| GET | `/public/ratings/methodology` | Public explanation of the rating indicators, weights, and provisional status |
| GET | `/public/mediators/:id/rating` | A public profile's rating by registry-entry UUID or linked user UUID |
| GET | `/ministry/rating/methodology` | Read methodology; JWT required (`ADMIN`, `MINISTRY_STAFF`) |
| PUT | `/ministry/rating/methodology` | Set indicator weights, which must total 100 |
| POST | `/ministry/rating/recalculate?periodYear=2026` | Recalculate the requested year |
| GET | `/internal/cron/ratings` | Daily Vercel Cron endpoint; requires `CRON_SECRET` bearer token |

The initial weights are provisional: report compliance 30%, settlement rate 40%, and agreement-obligation fulfillment 30%. Quarterly reports, mediation outcomes, and monitoring obligations are used because the current database has no separate mediation-contract records. Methodology is returned with `status: DRAFT` until the buyer confirms the final criteria. Long-running hosts calculate on startup and daily at 02:00 UTC; Vercel invokes the secured cron route daily at 02:00 UTC and requires `CRON_SECRET` to be configured.

## SHA — Xizmat shartnomalari va invoyslar

SHA contract endpoints require JWT authentication. Users can access contracts where they are the creator, provider, or a listed party; administrators can access all contracts. Providers must have the active registry role matching the contract type. Create a draft from a published template, add an invoice, then send it for signing.

| Method | Route | Purpose |
|---|---|---|
| GET | `/contracts` | List accessible contracts; filters: `status`, `type`, `search`, `page`, `limit` |
| POST | `/contracts` | Create a draft from a published template |
| GET | `/contracts/statistics` | Accessible contract counts by status and expired signed contracts |
| GET, PUT | `/contracts/:id` | Read or update a draft/returned contract |
| POST | `/contracts/:id/invoice` | Create and send a provider invoice for the draft |
| POST | `/contracts/:id/send` | Send the invoiced contract to parties for signing |
| POST | `/contracts/:id/sign` | Party signs with a PKCS#7 E-imzo value |
| POST | `/contracts/:id/reject` | Reject the contract with an optional reason |
| POST | `/contracts/:id/return-for-edit` | Return the contract for changes |
| POST | `/contracts/:id/approve` | Provider signs last; finalizes and stores the signed PDF |
| GET | `/contracts/:id/document` | Download draft PDF or immutable signed PDF |
| GET | `/contracts/:id/signatures` | Read signer status, verification result, serial and timestamp |
| GET | `/contract-templates?type=MEDIATION` | List published templates |
| GET, PUT | `/cabinet/bank-details` | Read or update the authenticated provider's bank details |
| GET | `/invoices/:id` | Read invoice and payment status |
| GET | `/invoices/:id/receipt` | Download receipt PDF after confirmed payment |
| GET, POST, PUT | `/admin/contract-templates` and `/admin/contract-templates/:id` | Admin template version listing, creation, editing, publishing, and archiving |

Contract states are `DRAFT`, `PENDING_PARTIES`, `AWAITING_PROVIDER_APPROVAL`, `SIGNED`, `REJECTED`, and `RETURNED_FOR_EDIT`. When returned for edits, the parties sign the updated draft again. E-imzo verification requires `ESIGN_VERIFY_URL`; optionally set `ESIGN_API_TOKEN`. Billing can use a provider configured with `BILLING_API_URL` and `BILLING_API_TOKEN`. In production, billing callbacks require `BILLING_WEBHOOK_SECRET` and a hexadecimal HMAC-SHA256 signature over the newline-joined values `invoiceNumber`, `transactionId`, `amount` (two decimals), `paymentStatus`, `paymentProvider`, `paidAt` (or empty string), `payerPinfl` (or empty string), and `payerName` (or empty string). The E-imzo verification API must accept `{ pkcs7, documentHash }` and return `{ valid, pinfl, serialNumber? }`; the billing invoice API must return `{ invoiceNumber, qrCodeUrl }`.

The schema change is in `prisma/migrations/202610230004_add_sha_contracts`.

## TAL — Talabgor kabineti

The applicant cabinet uses existing AUTH profile identity, MK application/exam records, cabinet notifications, REG public mediator entries, MTS mediation, SHA contracts, and platform file uploads. The routes below require JWT authentication; applicant-only actions require `TALABGOR`. The existing `GET /cabinet/notifications` route supplies the notification menu and read/unread state.

| Method | Route | Purpose |
|---|---|---|
| GET | `/cabinet/tal` | Role-aware cabinet menu, recent MK application statuses, and unread notification count |
| GET, PATCH | `/cabinet/profile` | Read the user's identity details and update their phone, email, or address; government-verified identity fields are read-only |
| GET | `/cabinet/training/course-info` | Read published special-course materials |
| GET | `/cabinet/applications` | Read the applicant's MK application and exam results |
| GET, POST | `/cabinet/threads` | List own chats or choose an active public mediator and open a chat with an initial message |
| POST | `/cabinet/threads/:id/messages` | Send a message and up to 10 private uploaded-file attachments |
| GET | `/cabinet/notifications` | Existing paginated notification list and unread count |

Special-course information is managed as published `manuals` content with metadata `{ "module": "TAL", "topic": "SPECIAL_COURSE" }`. If no such item is published, the API reports that course information has not yet been configured. Chat attachments must first be uploaded as private files through `/platform/files/upload`; the other participant can download an attachment after it is associated with a message in their conversation. The menu links to `/cabinet/mk/applications`, `/contracts` (SHA), and `/cabinet/mts/mediations` (MTS).

## TOL — To‘lovlar

| Method | Route | Purpose |
|---|---|---|
| POST | `/payments/exam-fee` | Create a configured exam-fee invoice for the applicant's accepted MK application |
| GET | `/payments` | Paginated payment history for the current account; filter by service, status, and date |
| GET | `/payments/:id` | Read payment by transaction UUID or invoice number; only the owner or admin can read it |
| POST | `/payments/:id/reconcile` | Query the billing provider and apply its signed status response |
| POST | `/external/billing/callback` | Existing billing webhook for payment status updates |
| GET | `/staff/payments/report?format=json` | Regional, ministry, or admin payment report; `format=csv` downloads an export |

The exam fee is charged after the MK application is accepted and before the committee schedules/invites the applicant to the exam. MK rejects an exam invitation unless a paid `QUALIFICATION_EXAM_FEE` transaction exists for that application. Configure the amount and justice-authority beneficiary in the admin `PUT /admin/settings` body under `paymentSettings` (`examFeeAmount`, `examFeeBeneficiaryName`, `examFeeBeneficiaryAccount`, `examFeeBeneficiaryBankCode`, optional `examFeeBeneficiaryRegion`). `MK_EXAM_FEE_AMOUNT` can supply the amount as a deployment fallback; beneficiary details must still be configured. The billing invoice API receives the beneficiary in transaction metadata and must route the `QUALIFICATION_EXAM_FEE` service to that configured account.

The client supplies an `idempotencyKey` for each logical attempt. A retry with the same key returns the existing invoice; after a failed attempt, a new key may start a new invoice. Payment status is authoritative in the billing transaction. A transition to `PAID` emits the `TolovTasdiqlandi` event once per invoice through the shared event/notification handler; MK and SHA can read the linked transaction status. Reconciliation uses `BILLING_STATUS_API_URL` (either a URL containing `:invoiceNumber` or a base URL with the invoice number appended), and its response must use the signed callback shape documented in the billing integration settings.

The idempotency uniqueness migration is `prisma/migrations/202610230005_add_tol_payment_idempotency`.

---

## 2. Autentifikatsiya

### 2.1 Login

```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "SecurePassword123"
}
```

**Javob:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "fullName": "Admin User",
    "cabinetType": "ADMIN"
  }
}
```

### 2.2 Token yangilash

```http
POST /auth/refresh
Authorization: Bearer <refresh_token>
```

### 2.3 Barcha so'rovlarda token

```http
GET /users
Authorization: Bearer <access_token>
```

---

## 3. Javob formati

### Muvaffaqiyatli javob

```json
{
  "success": true,
  "data": { ... },
  "message": "Muvaffaqiyatli bajarildi",
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### Xato javob

```json
{
  "statusCode": 404,
  "message": "Foydalanuvchi topilmadi",
  "error": "Not Found"
}
```

## OKM moduli — o'quv va malaka oshirish

Barcha OKM kabinet endpointlari JWT bilan himoyalangan. Hududiy adliya, vazirlik va admin rollari reyestrlarni ko'radi; mediator, hakamlik sudyasi va arbitr o'z sertifikatlari hamda arizalarini ko'radi.

| Metod | Yo'l | Vazifasi |
| :--- | :--- | :--- |
| `GET` | `/staff/training/certified` | Maxsus kurs sertifikatlari reyestri. `page`, `limit`, `search`, `region`, `gender` filtrlari mavjud. |
| `GET` | `/staff/training/qualified` | Malaka oshirish sertifikatlari reyestri va keyingi muddat. |
| `GET` | `/staff/training/overdue` | Malaka muddati o'tgan yoki malaka sertifikati bo'lmagan mediatorlar. |
| `GET` | `/cabinet/certificates` | Joriy foydalanuvchining sertifikatlari. |
| `GET` | `/certificates/{id}/file` | Foydalanuvchi o'ziga tegishli sertifikatni, xodim esa vakolat doirasida sertifikat faylini ochadi. Manzil HTTPS bo'lishi kerak. |
| `POST` | `/cabinet/training/applications` | `trainingCenterCode`, `courseName`, ixtiyoriy `note` bilan malaka oshirish arizasi yaratadi. |
| `GET` | `/cabinet/training/applications` | Joriy foydalanuvchining arizalari va shartnoma holati. |
| `POST` | `/cabinet/training/applications/{id}/contract` | Ariza bo'yicha o'quv markazi va mediator ma'lumotlaridan shartnoma yozuvini yaratadi. Takroriy chaqiruv mavjud shartnomani qaytaradi. |
| `POST` | `/external/training-centers/certificates` | YUMOM, TDYU yoki integratsiyalangan markazdan sertifikat qabul qiladi. `certificateType`: `SPECIAL_COURSE` yoki `QUALIFICATION_UPGRADE`. |
| `POST` | `/admin/training/reminders/run` | Administrator yoki tashqi scheduler malaka muddati eslatmalarini tekshiradi. Lokal backend jarayoni bu tekshiruvni kuniga bir marta ham ishga tushiradi. |

Malaka eslatmasi `QUALIFICATION_UPGRADE_ALERT_DAYS` taymeridagi muddat ichida yuboriladi. Sertifikat va muddat bo'yicha idempotency kaliti takroriy bildirishnomalarni oldini oladi.

---

## 4. Pagination

```http
GET /users?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

---

## 5. Asosiy endpointlar

### Auth

| Metod | URL | Tavsif |
|-------|-----|--------|
| POST | `/auth/login` | Tizimga kirish |
| POST | `/auth/refresh` | Tokenni yangilash |
| POST | `/auth/logout` | Tizimdan chiqish |
| GET | `/auth/profile` | Joriy foydalanuvchi |

### Users

| Metod | URL | Tavsif |
|-------|-----|--------|
| GET | `/users` | Foydalanuvchilar ro'yxati |
| POST | `/users` | Foydalanuvchi yaratish |
| GET | `/users/:id` | Foydalanuvchi ma'lumoti |
| PATCH | `/users/:id` | Foydalanuvchini tahrirlash |
| DELETE | `/users/:id` | Foydalanuvchini o'chirish |

### Platform (INFRA)

| Metod | URL | Tavsif | Auth |
|-------|-----|--------|------|
| GET | `/platform/health` | Tizim holati | Yo'q |
| GET | `/platform/metrics` | Ko'rsatkichlar | JWT + Admin |
| GET | `/platform/logs` | Loglar | JWT + Admin |
| POST | `/platform/files/upload` | Fayl yuklash | JWT |
| GET | `/platform/files/:id` | Fayl olish | JWT |
| DELETE | `/platform/files/:id` | Fayl o'chirish | JWT |

---

## 6. HTTP status kodlari

| Kod | Ma'no |
|-----|-------|
| 200 | Muvaffaqiyatli |
| 201 | Yaratildi |
| 204 | Kontent yo'q |
| 400 | Noto'g'ri so'rov |
| 401 | Avtorizatsiya kerak |
| 403 | Ruxsat yo'q |
| 404 | Topilmadi |
| 409 | Konflikt (allaqachon mavjud) |
| 429 | Juda ko'p so'rovlar |
| 500 | Server xatosi |

---

## 7. Rate Limiting

- **Umumiy:** 100 so'rov / minut (IP bo'yicha)
- **Auth endpointlar:** 10 so'rov / minut
- Limit oshganda: `429 Too Many Requests`

---

## 8. Swagger UI

Development muhitda Swagger hujjatlari mavjud:

```
http://localhost:3000/api/docs
```
