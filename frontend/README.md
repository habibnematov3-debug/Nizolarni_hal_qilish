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

- Tashkilotlar sahifasida qidiruv, holat filtri, qo‘shish, tahrirlash va demo yozuvni o‘chirish ishlaydi.
- Tashkilotlar hozircha UI ichidagi demo ma’lumotlardan foydalanadi.
- Boshqa ADM menyu bo‘limlari keyingi ishlab chiqish bosqichlari uchun joy sifatida ko‘rsatilgan.
- NestJS API’dagi `/admin/organizations` endpointlari JWT va `ADMIN` rolini talab qiladi. API bilan bog‘lashdan avval autentifikatsiya va refresh/session oqimini frontendga ulash kerak.
