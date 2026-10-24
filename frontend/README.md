# ADM frontend

React, TypeScript, Vite, Tailwind CSS va Lucide React asosidagi ma’muriy panel.

## Ishga tushirish

```sh
npm install
npm run dev
```

Production build:

```sh
npm run build
npm run preview
```

## Hozirgi holat

- Ochiq sahifa, mediatorlar/hakamlik sudyalari/arbitrlar reyestri, qidiruv va kabinetga kirish oqimi mavjud.
- OneID, ERI va Mobil ID tanlovi demo ekranini ochadi; integratsiyalarni tegishli jamoa keyin ulaydi.
- 10 ta foydalanuvchi roli bo‘yicha demo kabinetlar va rolga mos menyular mavjud.
- Fuqaro murojaati va mediator maqomiga ariza alohida, maydonlari tekshiriladigan shakllar orqali topshiriladi. Demo ma’lumotlari `localStorage`da qoladi.
- Tasdiqlangan API tokeni `nizolar.auth.accessToken` kalitida mavjud bo‘lsa, murojaatlar, mediator arizalari va maxfiy hujjatlar backendga yuboriladi; videokonferensiya ro‘yxati ham API orqali olinadi.
- OneID/ERI/Mobile ID haqiqiy avtorizatsiyasi ushbu UIga ulanmagan. Token bo‘lmaganda ekranda demo ekanligi ochiq ko‘rsatiladi va rasmiy ariza serverga yuborilmaydi.

## API sozlamasi

`frontend/.env.example` faylini `.env.local` nomiga ko‘chirib, `VITE_API_BASE_URL` qiymatini API manziliga sozlang. API tomonida shu frontend domenini `CORS_ORIGINS`ga kiriting. Production integratsiyalari va qolgan tayyorgarlik talablari `docs/PRODUCTION_READINESS.md`da yozilgan.

## Vercelga joylashtirish

Frontendni backenddan alohida Vercel loyihasi sifatida import qiling:

- **Root Directory:** `frontend`
- **Framework Preset:** `Vite`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

`frontend/vercel.json` SPA sahifalarini `index.html` ga qayta yozadi. Mavjud backend Vercel loyihasining root directory qiymatini `frontend` ga o‘zgartirmang; u NestJS API uchun alohida qolishi kerak.
