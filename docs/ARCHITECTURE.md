# Nizolarni Muqobil Hal Etish Platformasi — Arxitektura Hujjati

## 1. Tizim haqida umumiy ma'lumot

**Platforma nomi:** Nizolarni Muqobil Hal Etish (NMH)  
**Versiya:** 1.0.0  
**Yaratilgan sana:** 2026-10-22  
**Muallif:** Antigravity agentic team

Ushbu platforma mediatsiya, arbitraj va hakamlik sud jarayonlarini raqamlashtirish va boshqarishga mo'ljallangan davlat axborot tizimi hisoblanadi.

---

## 2. Arxitektura paradigmasi: Hexagonal Architecture (Olti burchak arxitektura)

Platforma **Hexagonal Architecture** (Ports & Adapters) paradigmasiga asoslanadi.

```
          ┌─────────────────────────────────────────────┐
          │              APPLICATION CORE               │
          │                                             │
  REST ───►  Port (IService)  ►  Domain Logic           │
  API     │                        │                   │
          │                   Use Cases                │
  Admin ──►  Port (IRepository)  ◄──────────────────── │
  Panel   │                        │                   │
          │                   Domain Models            │
  Events──►  Port (IEventBus)  ◄──────────────────────  │
          └─────────────────────────────────────────────┘
                    │              │              │
             ┌──────┘         ┌───┘          ┌──┘
             ▼                ▼              ▼
        PostgreSQL          Redis          FileStorage
        (Prisma ORM)       Cache         (Local/S3)
```

### 2.1 Asosiy printsiplar

- **Domain Logic** tashqi tizimlardan mustaqil
- **Port** — abstraktsiya interfeysi (`I*Service`, `I*Repository`)
- **Adapter** — portning aniq implementatsiyasi
- Har bir modul o'z domeniga javobgar

---

## 3. Modul strukturasi

```
src/
├── modules/
│   ├── auth/           # Autentifikatsiya (JWT, OneID, E-Sign, Mobile ID)
│   ├── users/          # Foydalanuvchilar boshqaruvi
│   ├── organizations/  # Tashkilotlar (Vazirlik, Hududiy, O'quv markazi)
│   ├── roles/          # Rol va ruxsatlar (RBAC)
│   ├── dictionaries/   # Lug'at (ma'lumotnomalar)
│   ├── settings/       # Tizim sozlamalari va taymerlar
│   ├── content/        # Kontent (yangiliklar, qonunchilik, shablonlar)
│   ├── notifications/  # Bildirishnomalar (Cabinet, SMS, Email)
│   ├── integration/    # Tashqi tizim integratsiyalari
│   ├── reports/        # Hisobotlar (choraklik, jamlama)
│   ├── audit/          # Audit loglari
│   └── platform/       # Platforma infratuzilmasi (INFRA moduli)
│       ├── monitoring/ # Monitoring va health check
│       ├── audit/      # Kengaytirilgan audit xizmati
│       ├── files/      # Fayl saqlash xizmati
│       └── security/   # Xavfsizlik middleware va sirlar
├── prisma/             # Prisma modul va servis
└── main.ts             # Kirish nuqtasi
```

---

## 4. Tech Stack

| Komponent        | Texnologiya                |
|------------------|----------------------------|
| Backend framework | NestJS 10.x               |
| Dasturlash tili  | TypeScript 5.x             |
| Ma'lumotlar bazasi | PostgreSQL 15+            |
| ORM              | Prisma 5.x                 |
| Autentifikatsiya | JWT (passport-jwt)         |
| API hujjatlari   | Swagger / OpenAPI 3.0      |
| Konteyner        | Docker + Docker Compose    |
| CI/CD            | GitHub Actions             |
| Monitoring       | Health Check + Custom Metrics |
| Logging          | NestJS built-in Logger     |

---

## 5. API dizayn printsiplari

- **RESTful** arxitektura
- **Versioning**: `/api/v1/...`
- **JWT Bearer** autentifikatsiya
- **RBAC** — rol asosida ruxsat
- Barcha javoblar: `{ success, data, message, meta }` formatida
- Xatolar: `{ statusCode, message, error }` formatida

---

## 6. Ma'lumotlar bazasi sxemasi

### Asosiy modellar

| Model               | Jadval nomi            | Tavsif                            |
|---------------------|------------------------|-----------------------------------|
| Organization        | organizations          | Tashkilotlar                      |
| User                | users                  | Foydalanuvchilar                  |
| Role                | roles                  | Rollar                            |
| Permission          | permissions            | Ruxsatlar                         |
| AuditLog            | audit_logs             | Audit loglari                     |
| SystemSetting       | system_settings        | Tizim sozlamalari                 |
| Content             | contents               | Kontent                           |
| Notification        | notifications          | Bildirishnomalar                  |
| CourtClaim          | court_claims           | Sud da'volari                     |
| BillingTransaction  | billing_transactions   | To'lov tranzaksiyalari            |
| IntegrationLog      | integration_logs       | Integratsiya loglari              |
| FileRecord          | file_records           | Fayl yozuvlari                    |

---

## 7. Xavfsizlik arxitekturasi

```
Internet
    │
    ▼
[Nginx Reverse Proxy]
    │  - HTTPS redirect
    │  - Rate limiting
    │  - WAF qoidalari
    ▼
[NestJS Application]
    │  - JWT autentifikatsiya
    │  - RBAC avtorizatsiya
    │  - Helmet headers
    │  - Input validation
    ▼
[PostgreSQL]
    │  - SSL ulanish
    │  - Minimal ruxsatlar
```

---

## 8. Muhitlar

| Muhit       | Maqsad                          | Branch    |
|-------------|----------------------------------|-----------|
| development | Lokal ishlab chiqish             | develop   |
| test        | Avtomatik testlar                | feature/* |
| stage       | Final tekshirish (UAT)           | main      |
| production  | Ishlab turuvchi tizim            | main (tag) |

---

## 9. CI/CD jarayoni

```
Push/PR → GitHub Actions
    │
    ├── Lint & Type Check
    ├── Prisma Generate
    ├── Build
    ├── Unit Tests
    │
    └── Deploy (branch asosida)
        ├── develop → dev muhit
        ├── main → stage muhit
        └── tag (v*) → production
```
