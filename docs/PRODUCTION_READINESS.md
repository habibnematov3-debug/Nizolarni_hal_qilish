# Production readiness: fuqarolar arizasi, mediator arizasi va videokonferensiya

## Kodda bajarilgan oqimlar

- Fuqaro mediatsiya turini, nizo toifasi va mazmunini, hududni, zarur bo‘lsa sud ishi raqamini, javobgar kontaktini kiritadi. PINFL formatlari, telefon, rozilik va majburiy maydonlar tekshiriladi.
- Backend ariza beruvchining ismi, PINFLi va telefonini so‘rov tanasidan emas, tizimdagi shaxsiy profilidan oladi. Javobgarni user ID bilan o‘zboshimchalik bilan bog‘lash olib tashlangan; server PINFL/telefon bo‘yicha moslikni tekshiradi.
- Ixtiyoriy mediatsiyada ikkala tomon rozilik bergach ariza beruvchi ochiq reyestrdan mediator tanlaydi. Majburiy mediatsiyada mediator faqat faol, tegishli hudud va nizo ixtisosligi mos reyestr yozuvlaridan tanlanadi; eng kam faol yuklamadagi mediatorlar orasidagi tasodifiy tanlov va mezonlar auditga yoziladi. Mos nomzod topilmasa ish mediator tayinlanishini kutadi va auditga sabab yozadi.
- Mediator kelishuv matnini tayyorlaydi. Ishtirokchining PKCS#7 imzosi aynan shu matnning SHA-256 xeshiga tekshiriladi; imzolovchining PINFLi mos bo‘lmasa yoki imzo xizmati ulanmagan bo‘lsa imzo qabul qilinmaydi.
- Mediator imzolangan ishga kelajakdagi uchrashuv belgilaydi. Uchrashuvga faqat ish ishtirokchilari yoki biriktirilgan mediator, belgilangan vaqt oynasida, qisqa muddatli xona tokeni bilan kiradi.
- Mediator maqomi uchun diplom, aloqa ma’lumoti, pasport ma’lumoti, maxsus kurs sertifikati; notarius/advokat istisnosida maqomni tasdiqlovchi hujjat talab qilinadi. Yuklangan fayllar arizachining o‘ziga tegishli PRIVATE fayl yozuvlari ekanligi tekshiriladi. Sudlanganlik va muomala layoqati foydalanuvchi belgilaydigan maydon emas, tashqi vakolatli tekshiruv natijasidan olinadi.

## Productionga chiqarishdan oldingi majburiy tashqi ishlar

Hozirgi repositoryni production deb e’lon qilish mumkin emas. Quyidagi integratsiya va rasmiy qarorlar yo‘q; demo rejimdagi har qanday tasdiq haqiqiy davlat tasdig‘i deb olinmasligi uchun autentifikatsiya adapterlari productionda demo shaxs qaytarishni rad etadi.

1. **OneID, E-IMZO va Mobile ID.** Frontendda OAuth/ERI/SMS avtorizatsiyani boshlash va qaytish oqimi ulanmagan. API tokeni tasdiqlangan autentifikatsiyadan keyin `nizolar.auth.accessToken` kalitida ishlatilishi ko‘zda tutilgan; hozir bu tokenni UI orqali oladigan login oqimi mavjud emas. Vazirlik/provayder bergan endpoint, client credential, callback URL, sertifikat va test muhiti kerak.
2. **Huquqiy layoqat va sudlanganlik manbasi.** `.env`da `LEGAL_CAPACITY_API_URL` va `LEGAL_CAPACITY_API_TOKEN`ni rasmiy shartnoma hamda javob sxemasi bilan sozlang. Ulanmaguncha tekshiruv `IN_PROGRESS` qoladi; tizim shaxsni o‘zboshimchalik bilan “toza” deb belgilamaydi.
3. **Videokonferensiya xizmati.** O‘zbekiston hududida yoki vazirlik tasdiqlagan infratuzilmada self-hosted Jitsi domeni, HTTPS, tarmoq va media relay sozlamalari, monitoring va avariya tiklash kerak. APIga `JITSI_BASE_URL`, `JITSI_APP_ID`, `JITSI_APP_SECRET` bering; Jitsi serverida JWT autentifikatsiya yoqilib, bo‘sh tokenlar rad etilishi shart. Jitsi tokeni faqat bitta xona uchun va sessiya oynasigacha amal qiladi. Jitsi JWT hujjatida `iss`, `sub`, `room`, `exp` claimlari hamda HMAC secret ko‘rsatilgan; Docker sozlamasida `ENABLE_AUTH`, `AUTH_TYPE=jwt`, `JWT_APP_ID`, `JWT_APP_SECRET` va `JWT_ALLOW_EMPTY=0` konfiguratsiyasi bor ([Jitsi JWT token qo‘llanmasi](https://github.com/jitsi/lib-jitsi-meet/blob/master/doc/tokens.md), [Jitsi Docker sozlamalari](https://github.com/jitsi/docker-jitsi-meet/blob/master/env.example)). Hozircha sessiya yozib olinmaydi; recording bo‘yicha huquqiy rozilik, saqlash muddati va o‘chirish siyosati alohida tasdiqlanishi kerak.
4. **Sud va bildirishnomalar.** Sudga yakuniy natija yuborish uchun `COURT_RESULT_API_URL` va `COURT_API_TOKEN`, javobgarni chaqirish/OTP uchun rasmiy SMS yoki shaxsiy kabinet bildirishnoma oqimi va texnik shartnoma kerak. Sud endpointi bo‘lmasa natija soxta “qabul qilindi” deb belgilanmaydi.
5. **Hujjatlarni saqlash.** Hozirgi fayl servisi mahalliy diskka yozadi. Gorizontal production deploy/serverless uchun shifrlangan obyekt ombori, zaxira nusxalari, antivirus tekshiruvi, hujjatni saqlash/o‘chirish muddatlari va audit siyosati kerak.
6. **Adliya vazirligi tasdig‘i.** Nizo toifalari, majburiy mediatsiya mezonlari, mediator hududi/ixtisosligi/yuklama bo‘yicha tanlash formulasi, ariza tarkibi, notarius/advokat istisnosi, rozilik matni, ERI shakli, sud bilan almashuv, maxfiylik va saqlash muddati vakolatli bo‘linmalar tomonidan tasdiqlanishi kerak. Texnik implementatsiya o‘zi rasmiy huquqiy tasdiq o‘rnini bosa olmaydi.

## Ishga tushirish sozlamalari

1. `npx prisma migrate deploy` bilan `202610240001_add_mediation_category_region` migratsiyasini qo‘llang.
2. Productionda kamida 32 belgili sirli `JWT_SECRET`, rasmiy HTTPS API manzillari, `CORS_ORIGINS`dagi faqat tasdiqlangan frontend domenlari va `JITSI_*` qiymatlarini secret managerda sozlang. `.env.example`dagi qiymatlarni productionga nusxalab qo‘ymang.
3. `frontend/.env.example` asosida build paytida `VITE_API_BASE_URL`ni sozlang.
4. OneID/ERI qaytish oqimi va tokenni xavfsiz saqlash qo‘shilmaguncha demo role tanlash production login o‘rnini bosa olmaydi.
5. Vazirlikning yuridik va axborot xavfsizligi jamoalari sinov muhitida ruxsat nazorati, PINFL mos kelmasligi, rozilikni rad etish, takroriy murojaat, mediator topilmasligi, Jitsi tokenining tugashi, E-IMZO xatosi va tashqi servis vaqt tugashi ssenariylarini qabul sinovidan o‘tkazishi kerak.
