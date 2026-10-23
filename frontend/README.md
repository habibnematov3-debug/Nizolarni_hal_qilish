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
- Mediator arizasi va imtihon, mediatsiya bosqichlari, kelishuv monitoringi, mediator hisoboti, malaka oshirish, portfolio va kontent oqimlari demo holatda ishlaydi.
- Demo yozuvlar `localStorage` da saqlanadi. Hech qanday tashqi to‘lov, SMS, identifikatsiya yoki backend API chaqirilmaydi.
- Davlat tizimlari, haqiqiy autentifikatsiya, maxfiylik va vakolat nazoratlari integratsiya bosqichida ulanadi.

## Vercelga joylashtirish

Frontendni backenddan alohida Vercel loyihasi sifatida import qiling:

- **Root Directory:** `frontend`
- **Framework Preset:** `Vite`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

`frontend/vercel.json` SPA sahifalarini `index.html` ga qayta yozadi. Mavjud backend Vercel loyihasining root directory qiymatini `frontend` ga o‘zgartirmang; u NestJS API uchun alohida qolishi kerak.
