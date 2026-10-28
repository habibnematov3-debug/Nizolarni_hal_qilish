# Tashqi ma’lumotlar portali va bosh sahifa

## Texnik topshiriq

| Maydon | Qiymat |
|---|---|
| Modul | PUB — Tashqi ma’lumotlar portali |
| Versiya | 1.0 |
| Holati | Ishchi loyiha |
| Qamrov | Ochiq bosh sahifa va undan boshlanadigan ommaviy foydalanuvchi oqimlari |

## 1. Maqsad

Tashqi portal jamoatchilikka nizolarni muqobil hal etish bo‘yicha ishonchli, yangilanib turadigan va shaxsiy ma’lumotlardan tozalangan ma’lumotlarni taqdim etadi. Bosh sahifadan foydalanuvchi mediator, hakamlik sudyasi yoki arbitrni topishi, reyting va umumlashtirilgan statistikani ko‘rishi, tartib-taomillarni o‘rganishi va zarur bo‘lsa OneID orqali shaxsiy kabinetga kirishi kerak.

Ochiq portal va shaxsiy kabinet vazifalari ajratiladi: ochiq sahifada ma’lumot izlanadi va o‘rganiladi; ariza yuborish, sud taklifiga javob berish, hujjat imzolash va videomuloqotga kirish autentifikatsiyadan keyin tegishli kabinetda bajariladi.

## 2. Talablar manbasi

Talablar quyidagi hujjatlardan olindi:

- “ADR TZ.pdf”, 4.2.17 — ochiq reyestr va reyting, anonim va umumlashtirilgan statistika, ADR tartiblari, majburiy sudgacha mediatsiya toifalari, yo‘riqnomalar va yangiliklar, OneID orqali kabinetga kirish. Shuningdek 4.2.17 dagi oqim bo‘yicha ichki tizimdagi ochiq ma’lumotlar portalga davriy sinxronlanadi, portal kontentini vazirlik xodimi boshqaradi.
- “ADR TZ.pdf”, 4.2.1 va portal tavsifi — jismoniy va yuridik shaxslar nizoga ariza yuborishi, mutaxassis tanlashi, onlayn jarayonda qatnashishi mumkin; portal shu yopiq xizmatlarga kirish nuqtasini beradi.
- “Nizolarni muqobil hal etish” elektron platformasi tuzilishi haqida MA’LUMOT, 3, 8–10, 12–13, 17–20-bandlar — reyestr qidiruvi, qo‘llanma va videoqo‘llanmalar, interaktiv xarita, hisobot va reyting, yangiliklar, huquqiy baza, hujjat namunalari hamda FAQ.

Hujjatda aniq belgilanmagan statistik ko‘rsatkichlar, e’lon qilish davriyligi va kontakt ma’lumotlarini ko‘rsatish qoidalari quyidagi topshiriqda alohida tasdiqlanishi kerak bo‘lgan masalalar sifatida berildi.

## 3. Foydalanuvchilar va kirish huquqi

| Foydalanuvchi | Portalda bajaradigan ishlar |
|---|---|
| Jamoatchilik va OAV | Ochiq reyestr, reyting, statistikalar, huquqiy ma’lumot, yangilik va yo‘riqnomalarni autentifikatsiyasiz ko‘radi. |
| Jismoniy yoki yuridik shaxs | Ochiq ma’lumotlarni ko‘radi; ariza yoki boshqa shaxsiy amalni boshlaganda OneID orqali kabinetga kiradi. |
| Vazirlikning vakolatli xodimi | Yangilik, yo‘riqnoma, FAQ, huquqiy hujjat va boshqa portal kontentini yaratadi, tahrirlaydi, nashrga chiqaradi yoki nashrdan oladi. |
| Tizim | Tasdiqlangan ochiq reyestr va reyting ma’lumotlarini, shuningdek umumlashtirilgan statistikani ichki modullardan portalga belgilangan tartibda uzatadi. |

Portalda kabinetga kirish OneID bilan bog‘lanadi. Hozirgi demo oynasidagi OneID tugmasi ishlab turgan integratsiya hisoblanmaydi; production oqimi uchun OneID provayderining haqiqiy yo‘naltirish, callback va xatolik shartnomasi talab qilinadi.

## 4. Bosh sahifa tarkibi

Bo‘limlar quyidagi tartibda joylashtiriladi. Tor ekranlarda ular bir ustun bo‘lib ko‘rinadi; katta ekranda bir necha ustunli tartibga o‘tadi.

| № | Bo‘lim | Mazmun va xatti-harakat |
|---:|---|---|
| 1 | Yuqori navigatsiya | Platforma nomi va asosiy havolalar: Bosh sahifa, Mutaxassislar reyestri, Reyting, Statistika, Qonunchilik va Yo‘riqnomalar. “Kabinetga kirish” doimo ko‘rinib turadi. |
| 2 | Kirish qismi | Nizoni muqobil hal qilish xizmati nima ekanini qisqa tushuntiradi. Asosiy amallar: “Mutaxassis topish”, “Nizom bo‘yicha yo‘riqnoma”, “Kabinetga kirish”. “Murojaat yuborish” autentifikatsiyani talab qiladi va login tugagach shu amalni davom ettiradi. |
| 3 | Asosiy ko‘rsatkichlar | Faol mutaxassislar, hududiy qamrov va ADR ishlari bo‘yicha tasdiqlangan umumiy ko‘rsatkichlar. Har bir ko‘rsatkich davr va oxirgi yangilangan vaqt bilan beriladi. Maxfiy yoki shaxsni aniqlashga imkon beradigan kesimlar chiqarilmaydi. |
| 4 | Nizo bo‘yicha yo‘lni tanlash | Ixtiyoriy mediatsiya, majburiy sudgacha mediatsiya, hakamlik va arbitraj haqida qisqa ta’riflar. Har bir yo‘nalish tegishli tartib, shartlar va keyingi qadamlar sahifasiga olib boradi. Majburiy mediatsiya toifalari vazirlik yuritadigan ma’lumotdan ko‘rsatiladi. |
| 5 | Mutaxassislarni izlash | Mediator, hakamlik sudyasi va arbitr turlari orasidan tanlash; F.I.Sh., hudud va ixtisoslik bo‘yicha qidirish; ochiq reyestrdagi profilni ko‘rish. Bosh sahifada qisqa natijalar yoki yetakchi profillar ko‘rsatiladi, to‘liq qidiruv reyestr sahifasida bajariladi. |
| 6 | Interaktiv xarita | Ochiq profilga ega mutaxassislarning tasdiqlangan hududiy nuqtalarini ko‘rsatadi. Nuqta tanlanganda mutaxassis nomi, hududi va ruxsat etilgan kontakt ma’lumoti ochiladi. Koordinatasi yo‘q yozuvlar xaritada soxta nuqta bilan belgilanmaydi. |
| 7 | Ochiq reyting | Har bir mutaxassis turi bo‘yicha reytingdan qisqa ko‘rinish, reyting davri va mezonlar metodikasiga havola. Reyting ma’lumoti mavjud bo‘lmasa, ballni 0.0 qilib ko‘rsatish o‘rniga “Reyting shakllanmagan” deb yoziladi. |
| 8 | Ishlash tartibi va qo‘llanmalar | Fuqaro yoki tashkilot uchun bosqichlar: nizoni aniqlash, xizmat turini tanlash, OneID orqali kirish, ariza yoki taklifga javob berish, uchrashuv va kelishuv jarayonida qatnashish. Matnli va videoqo‘llanmalarga havola beriladi. |
| 9 | Majburiy mediatsiya haqida | Qaysi nizolarda qo‘llanishi, foydalanuvchi nima qilishi va qayerga murojaat qilishi tushuntiriladi. Toifalar va yo‘riqnomalar nashr qilingan kontentdan olinadi; statik matn kodga qotirib qo‘yilmaydi. |
| 10 | Yangilik va e’lonlar | Eng so‘nggi nashr qilingan yangiliklar hamda jamoatchilikka tegishli e’lonlar. Mediator kabinetida tanishish talab qilinadigan ichki e’lonlar ochiq yangiliklar bilan aralashtirilmaydi. |
| 11 | Huquqiy baza va namunalar | Mediatsiya va ADR bo‘yicha normativ hujjatlar, shartnoma yoki kelishuv namunalari, ularning sanasi va yuklab olish/rasmiy manbaga o‘tish havolasi. |
| 12 | Ko‘p beriladigan savollar | Fuqarolar va tashkilotlar uchun savol-javoblar; kerakli yo‘riqnoma, qonun yoki xizmatga ichki havola. |
| 13 | Pastki qism | Tashkilotning aloqa ma’lumoti, maxfiylik siyosati, foydalanish shartlari va rasmiy manbalarga havolalar. Aloqa rekvizitlari buyurtmachi tomonidan tasdiqlanadi. |

## 5. Asosiy foydalanuvchi oqimlari

### 5.1. Ochiq ma’lumotdan foydalanish

1. Mehmon bosh sahifani ochadi; reyestr, statistika, huquqiy ma’lumot va nashr qilingan kontent login talab qilmasdan yuklanadi.
2. Mehmon mutaxassis turini, hudud yoki ixtisoslikni tanlab qidiradi.
3. Portal faqat ochiq deb belgilangan yozuvlarni ko‘rsatadi. Profil, reyting yoki xarita tafsilotlari alohida ko‘riladi.
4. Tizimda ma’lumot topilmasa, bo‘sh holat tushunarli ko‘rsatiladi; sahifa ishlashdan to‘xtab qolmaydi.

### 5.2. Murojaatni boshlash

1. Mehmon “Murojaat yuborish” yoki “Murojaat qilish”ni bosadi.
2. Autentifikatsiya bo‘lmasa, portal OneID kirish oqimiga yo‘naltiradi va boshlamoqchi bo‘lgan amalni vaqtincha eslab qoladi.
3. OneID muvaffaqiyatli yakunlangach, foydalanuvchi tegishli kabinetdagi ariza shakliga qaytadi.
4. Sud taklifini qabul qilish/rad etish, hujjat imzolash yoki videomuloqotga qatnashish kabi shaxsiy amallar kabinet ichida bajariladi.
5. Kirish muvaffaqiyatsiz yoki bekor qilinganida, foydalanuvchiga xabar ko‘rsatiladi va ochiq sahifaga qaytish imkoniyati saqlanadi.

### 5.3. Portal kontentini yangilash

1. Vakolatli vazirlik xodimi kontentni boshqarish modulida yangilik, qo‘llanma, huquqiy hujjat, FAQ yoki majburiy mediatsiya ma’lumotini kiritadi.
2. Xodim yozuvni qoralama sifatida saqlaydi, oldindan ko‘radi va nashrga chiqaradi.
3. Ochiq portal faqat “Nashr qilingan” holatdagi kontentni ko‘rsatadi.
4. Tahrir, nashr va nashrdan olish amallari audit jurnaliga yoziladi.

## 6. Ma’lumotlar va integratsiyalar

### 6.1. Ochiq reyestr yozuvi

Minimal ko‘rsatiladigan maydonlar: mutaxassis turi, F.I.Sh., reyestr raqami, faol/nofaol holati, hudud, ixtisoslik va mavjud bo‘lsa reyting. Aloqa, xizmat manzili, fotosurat va xarita koordinatasi faqat tegishli ochiq profil maydoni ruxsat etganida chiqariladi.

JSHSHIR, pasport ma’lumoti, ichki xodim izohlari, ariza hujjatlari, nizo ishtirokchilari va ish tafsilotlari ochiq API orqali uzatilmaydi. Ochiq ro‘yxatdagi yozuv Adliya organi yoki reyestr manbasida nofaol qilinganda portalda ham yangilanadi.

### 6.2. Statistikalar

Portal ichki tizimdagi ishlar va reyestr ma’lumotlaridan yig‘ilgan, shaxssizlantirilgan umumiy statistikani ko‘rsatadi. Ko‘rsatkich nomlari, hisoblash formulasi, davri (oy/chorak/yil) va yangilanish jadvali Adliya vazirligi hamda ma’lumot egasi tomonidan tasdiqlanadi. Bosh sahifada ko‘rsatilgan har bir raqam tafsilot sahifasidagi manba va davrga mos bo‘lishi shart.

### 6.3. API va ichki modullar

| Maqsad | Mavjud yo‘l yoki modul | TZ bo‘yicha talab |
|---|---|---|
| Bosh sahifa agregati | `GET /public/home` | Yangilik, e’lon va statistika bilan birga sahifaga kerakli reyestr/reyting ko‘rsatkichlarini kelishilgan yagona javobda yoki aniq hujjatlashtirilgan mustaqil so‘rovlarda taqdim etish. |
| Ochiq kontent | `GET /public/content/:type` | `news`, `legal_framework`, `templates`, `manuals`, `video_manuals`, `faq` turlari uchun faqat nashr qilingan yozuvlar. |
| Ochiq reyestr | `GET /public/mediators` | Mediator, hakamlik sudyasi va arbitr turi, hudud, ixtisoslik, qidiruv va sahifalash parametrlarini qo‘llash. |
| Xarita nuqtalari | `GET /public/mediators/map` | Faqat ochiq va koordinatasi mavjud mutaxassislarni qaytarish. |
| Reyting | `GET /public/ratings` va profil reytingi | Ochiq reyting va uni hisoblash metodikasi; bosh sahifa va reyestrdagi ball bir manbadan olinishi. |
| Ochiq statistika | `GET /public/statistics` | Hozirgi reyestr ko‘rsatkichlarini ADR bo‘yicha anonim, umumlashtirilgan statistikalar bilan kengaytirish yoki alohida `adr` resursi bilan aniq ajratish. |
| OneID | autentifikatsiya moduli | Haqiqiy provayderga yo‘naltirish, callback, xatolik va boshlang‘ich amalni davom ettirish. |
| Kontent boshqaruvi | `admin/content/:type` | Faqat `ADMIN` va vakolatli `MINISTRY_STAFF` uchun yaratish/tahrirlash/nashr qilish; ochiq API qoralamalarni chiqarmasligi. |

### 6.4. Davriylik va xatolik holatlari

Reyestr yangilanganda uning ochiq ko‘rinishi belgilangan sinxronlash oynasida yangilanishi kerak. Reyting va statistika o‘z modullaridagi tasdiqlangan qayta hisoblash jadvali bo‘yicha uzatiladi. Har bir bo‘lim o‘z yuklanish, bo‘sh ma’lumot va xatolik holatiga ega bo‘ladi; bitta API xatosi bosh sahifaning qolgan bo‘limlarini yashirmaydi. Ma’lumot eskirgan bo‘lsa, oxirgi yangilangan vaqt ko‘rsatiladi.

## 7. Joriy kod holati va bajarilishi kerak bo‘lgan ishlar

### Mavjud qismlar

- `frontend/src/App.tsx` ichida bosh sahifa, ko‘rsatkich kartalari, mediatorlar xaritasi, yetakchi mediatorlar, yangiliklar, huquqiy baza, FAQ va qo‘llanmalar bo‘limlari mavjud.
- `frontend/src/RegistryDirectory.tsx` reyestrni mediator, hakamlik sudyasi va arbitr turlariga ajratib qidirish, hudud bo‘yicha filtrlash va xarita ko‘rsatish imkoniyatini beradi.
- Backendda `PUB`, `REG`, `REY` va kontent boshqaruvi modullari mavjud. `GET /public/home`, ochiq kontent, reyestr, xarita, reyting va vazirlikning kontent boshqaruvi uchun endpointlar yozilgan.

### Joriy kod bilan aniqlangan bo‘shliqlar

1. `PubController` va `PublicRegistryController` ikkalasi ham `GET /public/mediators` yo‘lini e’lon qiladi. Bitta kanonik endpoint va bitta javob formati tanlanib, frontend va backend shu formatga moslashtirilishi kerak.
2. Joriy `GET /public/statistics` reyestrdagi mediator va dossier sonlarini beradi; ADR murojaatlari va yakunlangan jarayonlar bo‘yicha hujjatda so‘ralgan umumiy anonim statistikani qamramaydi.
3. Bosh sahifadagi xarita hamda yetakchi mutaxassislar ko‘rinishi mediatorlarga yo‘naltirilgan. Hujjatdagi uch mutaxassis turi reyestr sahifasida qolishi mumkin, ammo bosh sahifa statistikasi va kirish havolalari uch turga ham olib borishi kerak.
4. Majburiy sudgacha mediatsiya toifalari va “qanday foydalanaman” oqimi alohida, vazirlik yangilaydigan ko‘rinadigan kontent sifatida aniqlanmagan.
5. Bosh sahifadagi “Murojaat qilish” tugmasi login qilmagan holatda ham ariza oynasini ochishi mumkin. U OneID oqimiga yo‘naltirib, login tugagach amaldagi amalni davom ettirishi kerak.
6. `GET /public/home` mavjud bo‘lsa-da, bosh sahifa uning agregat javobidan to‘liq foydalanmaydi. Sahifa uchun ma’lumot yuklash kontrakti yagona va hujjatlashtirilgan bo‘lishi kerak.
7. Ochiq reyting faqat ball bilan cheklanmay, hisoblash mezonlari va davrini ham ko‘rsatishi kerak.

## 8. Qabul mezonlari

1. Mehmon autentifikatsiyasiz bosh sahifani, ochiq reyestrni, nashr qilingan huquqiy va o‘quv materiallarini ko‘ra oladi.
2. Reyestrdan mediator, hakamlik sudyasi va arbitrni belgilangan ochiq filtrlar bo‘yicha topish mumkin; natijalar sahifalanadi.
3. Reyting ko‘rsatilgan har bir joyda uning davri va metodikasiga havola bor; reytingi yo‘q profil uchun noto‘g‘ri 0 ball ko‘rsatilmaydi.
4. Bosh sahifa statistikasi faqat tasdiqlangan umumlashtirilgan ko‘rsatkichlardan iborat; individual nizo yoki shaxsiy ma’lumot chiqmaydi.
5. Majburiy mediatsiya toifalari, tartib-taomillar va qo‘llanmalar vazirlik vakolatli xodimi nashr qilgan kontentdan olinadi.
6. Kabinet yoki ariza talab qiladigan har qanday CTA login qilmagan foydalanuvchini OneID oqimiga olib boradi va muvaffaqiyatli login so‘ng mo‘ljallangan amalni davom ettiradi.
7. Ochiq reyestr API faqat `publicProfile` ruxsat bergan maydonlarni qaytaradi; JSHSHIR, hujjat va nizo tafsilotlari chiqarilmaydi.
8. Reyestr, reyting, statistika yoki kontent so‘rovlaridan biri vaqtincha ishlamasa, qolgan bosh sahifa bo‘limlari ochiq qoladi va tegishli bo‘lim xatolik holatini ko‘rsatadi.
9. Portal kontentini boshqarish vakolatsiz foydalanuvchiga ochilmaydi; qoralama kontent ommaviy API orqali ko‘rinmaydi.
10. Bosh sahifaning asosiy amallari telefon, planshet va kompyuter ekranlarida ishlaydi; klaviatura bilan boshqarish va aniq sarlavha tartibi saqlanadi.

## 9. Ish bosqichlari

1. **Kontrakt va ma’lumot xavfsizligi:** `GET /public/mediators` dublikatini bartaraf etish, ochiq profil maydonlari va maxfiy ma’lumotlar ro‘yxatini tasdiqlash.
2. **Bosh sahifa ma’lumotlari:** PUB agregati, ADR statistikasi, reyestr/reyting ko‘rsatkichlari va yangilanish vaqtlarini kelishilgan API formatiga moslash.
3. **Kontent:** majburiy mediatsiya toifalari, yo‘riqnomalar, FAQ va video materiallarni CMS orqali boshqarish va sahifalarda ko‘rsatish.
4. **Foydalanuvchi oqimi:** kabinetga kirish va murojaat CTA’larini OneID bilan bog‘lash, login tugagach kerakli amalni davom ettirish.
5. **Qabul sinovi:** yuqoridagi qabul mezonlari, anonim foydalanuvchi, autentifikatsiyadan o‘tgan foydalanuvchi, bo‘sh ma’lumot va API xatolik holatlari bo‘yicha tekshirish.

## 10. Buyurtmachi bilan tasdiqlanadigan masalalar

- Bosh sahifada e’lon qilinadigan ADR statistik ko‘rsatkichlari va ularning formulasi.
- Har bir statistik ko‘rsatkichning davri va yangilanish jadvali.
- Mutaxassisning telefon, xizmat manzili, fotosurat va xarita koordinatalaridan qaysilari ommaga ochiq bo‘lishi.
- Majburiy sudgacha mediatsiya toifalarining rasmiy manbasi va ularni yangilash vakolati.
- Portalning davlat tillarida va boshqa tillarda taqdim etilishi hamda har bir kontent turiga tarjima talabi.
- Sud taklifini qabul qilish/rad etish va videomuloqotga kirish uchun tashqi tizimlardan keladigan havola va autentifikatsiya shartlari.
