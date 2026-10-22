# API Qo'llanma

## 1. Umumiy ma'lumot

**Base URL (dev):** `http://localhost:3000`  
**Base URL (stage):** `https://api.stage.nizolar.uz`  
**API versiyasi:** `v1`  
**Hujjatlar:** `GET /api/docs` (Swagger UI)

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
