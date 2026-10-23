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
