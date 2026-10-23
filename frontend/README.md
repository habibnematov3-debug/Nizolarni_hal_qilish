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

- Tizimga kirish `/auth/login` endpointi orqali amalga oshadi; panelga `ADMIN` roli bo‘lgan hisob kira oladi.
- Access va refresh tokenlar joriy brauzer seansida saqlanadi, access token muddati tugaganda yangilanadi.
- Tashkilotlar `/admin/organizations` dan olinadi. Qo‘shish va tahrirlash API orqali saqlanadi; o‘chirish amali backend endpointi mavjud emasligi sabab faolsizlantirish sifatida bajariladi.
- Boshqa ADM menyu bo‘limlari keyingi ishlab chiqish bosqichlari uchun joy sifatida ko‘rsatilgan.
- API manzili `VITE_API_BASE_URL` orqali belgilanadi. Production uchun qiymat `frontend/.env.production` da turibdi.

Backend Vercel loyihasidagi `CORS_ORIGINS` muhit o‘zgaruvchisiga deployed frontend domenini qo‘shing (masalan, `https://frontend-sooty-kappa-37.vercel.app`) va backendni qayta deploy qiling.

## Vercelga joylashtirish

Frontendni backenddan alohida Vercel loyihasi sifatida import qiling:

- **Root Directory:** `frontend`
- **Framework Preset:** `Vite`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

`frontend/vercel.json` SPA sahifalarini `index.html` ga qayta yozadi. Mavjud backend Vercel loyihasining root directory qiymatini `frontend` ga o‘zgartirmang; u NestJS API uchun alohida qolishi kerak.
