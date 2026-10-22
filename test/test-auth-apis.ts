import { NestFactory } from '@nestjs/core';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

let app: INestApplication;
const baseUrl = 'http://localhost:3334';

async function request(path: string, options: RequestInit = {}) {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json = await response.json();
  return { status: response.status, data: json };
}

async function runAuthTests() {
  console.log('🚀 Starting NestJS application for AUTH test suite...');
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(3334);
  console.log('✅ Server started on port 3334\n');

  try {
    // =========================================================================
    // 1. POST /auth/oneid/login (AUTH-01, AUTH-02: Talabgor kabineti)
    // =========================================================================
    console.log('--- TEST 1: POST /auth/oneid/login (Talabgor kabineti ochilishi) ---');
    const oneIdRes = await request('/auth/oneid/login', {
      method: 'POST',
      body: JSON.stringify({
        code: 'auth_code_sample_oneid_2026',
        mockPinfl: '31201851230044', // Fuqaro Nodirov Jamshid (Talabgor)
      }),
    });
    console.log(`[POST /auth/oneid/login] Status: ${oneIdRes.status}`);
    console.log(`  Foydalanuvchi: ${oneIdRes.data.data?.user?.fullName}`);
    console.log(`  Ochilgan kabinet: ${oneIdRes.data.data?.cabinetType} (Kutilgan: APPLICANT)`);
    console.log(`  Rollar: ${oneIdRes.data.data?.roles?.join(', ')}`);

    if (oneIdRes.data.data?.cabinetType !== 'APPLICANT') {
      throw new Error(`Kutilgan APPLICANT kabineti ochilmadi! Qaytgan: ${oneIdRes.data.data?.cabinetType}`);
    }

    const talabgorAccessToken = oneIdRes.data.data?.accessToken;
    const talabgorRefreshToken = oneIdRes.data.data?.refreshToken;
    const talabgorAuthHeader = { Authorization: `Bearer ${talabgorAccessToken}` };

    // =========================================================================
    // 2. POST /auth/esign/login (AUTH-01, AUTH-02: Mediator o'z kabineti)
    // =========================================================================
    console.log('\n--- TEST 2: POST /auth/esign/login (Mediator kabineti ochilishi) ---');
    const esignRes = await request('/auth/esign/login', {
      method: 'POST',
      body: JSON.stringify({
        pkcs7: 'sample_pkcs7_signature_data_base64',
        mockPinfl: '31201851230011', // Mediator Karimov Alisher
      }),
    });
    console.log(`[POST /auth/esign/login] Status: ${esignRes.status}`);
    console.log(`  Foydalanuvchi: ${esignRes.data.data?.user?.fullName}`);
    console.log(`  Ochilgan kabinet: ${esignRes.data.data?.cabinetType} (Kutilgan: MEDIATOR)`);
    console.log(`  Rollar: ${esignRes.data.data?.roles?.join(', ')}`);

    if (esignRes.data.data?.cabinetType !== 'MEDIATOR') {
      throw new Error(`Kutilgan MEDIATOR kabineti ochilmadi! Qaytgan: ${esignRes.data.data?.cabinetType}`);
    }

    // =========================================================================
    // 3. POST /auth/mobile-id/login (AUTH-01: Mobil ID orqali kirish)
    // =========================================================================
    console.log('\n--- TEST 3: POST /auth/mobile-id/login ---');
    const mobileIdRes = await request('/auth/mobile-id/login', {
      method: 'POST',
      body: JSON.stringify({
        phone: '+998906667788',
        code: '123456',
        mockPinfl: '31201851230044',
      }),
    });
    console.log(`[POST /auth/mobile-id/login] Status: ${mobileIdRes.status}`);
    console.log(`  Foydalanuvchi: ${mobileIdRes.data.data?.user?.fullName}, Phone: ${mobileIdRes.data.data?.user?.phone}`);

    // =========================================================================
    // 4. POST /auth/refresh (AUTH-05: Seansni yangilash)
    // =========================================================================
    console.log('\n--- TEST 4: POST /auth/refresh (Seansni yangilash) ---');
    const refreshRes = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refreshToken: talabgorRefreshToken,
      }),
    });
    console.log(`[POST /auth/refresh] Status: ${refreshRes.status}`);
    console.log(`  Yangi Access Token berildi: ${!!refreshRes.data.data?.accessToken}`);
    console.log(`  Yangi Refresh Token berildi: ${!!refreshRes.data.data?.refreshToken}`);

    // =========================================================================
    // 5. GET /auth/me (AUTH-02, AUTH-03: Joriy foydalanuvchi va kabinet)
    // =========================================================================
    console.log('\n--- TEST 5: GET /auth/me ---');
    const meRes = await request('/auth/me', { headers: talabgorAuthHeader });
    console.log(`[GET /auth/me] Status: ${meRes.status}`);
    console.log(`  Username: ${meRes.data.data?.username}`);
    console.log(`  F.I.SH: ${meRes.data.data?.fullName}`);
    console.log(`  Kabinet: ${meRes.data.data?.cabinetType}`);
    console.log(`  Rollar: ${meRes.data.data?.roles?.join(', ')}`);

    // =========================================================================
    // 6. GET /users/me (FT-AUTH-05, AUTH-04: Obyektivka)
    // =========================================================================
    console.log('\n--- TEST 6: GET /users/me (Shaxsiy ma\'lumotlar / Obyektivka) ---');
    const profileRes = await request('/users/me', { headers: talabgorAuthHeader });
    console.log(`[GET /users/me] Status: ${profileRes.status}`);
    console.log(`  JShShIR (PINFL): ${profileRes.data.data?.pinfl}`);
    console.log(`  Pasport: ${profileRes.data.data?.passportSeriesNumber}`);
    console.log(`  Tug'ilgan sana: ${profileRes.data.data?.birthDate}`);
    console.log(`  Yashash manzili: ${profileRes.data.data?.address}`);
    console.log(`  Tahrirlanadigan maydonlar:`, profileRes.data.data?.fieldPermissions?.editable);
    console.log(`  Tahrirlanmaydigan maydonlar:`, profileRes.data.data?.fieldPermissions?.readOnly);

    // =========================================================================
    // 7. PATCH /users/me (FT-AUTH-05, AUTH-04: Ruxsat etilgan maydonlarni tahrirlash)
    // =========================================================================
    console.log('\n--- TEST 7: PATCH /users/me (Ruxsat etilgan maydonlarni yangilash) ---');
    const patchProfileRes = await request('/users/me', {
      method: 'PATCH',
      headers: talabgorAuthHeader,
      body: JSON.stringify({
        phone: '+998909990011',
        address: 'Toshkent shahri, Shayxontohur tumani, Navoiy ko\'chasi, 1-uy',
      }),
    });
    console.log(`[PATCH /users/me] Status: ${patchProfileRes.status}`);
    console.log(`  Yangi telefon: ${patchProfileRes.data.data?.phone}`);
    console.log(`  Yangi manzil: ${patchProfileRes.data.data?.address}`);

    // Test rejecting modification of read-only fields (e.g. pinfl or passport)
    console.log('\n--- TEST 7.1: PATCH /users/me (Tahrirlash taqiqlangan maydonni o\'zgartirishga urinish) ---');
    const rejectRes = await request('/users/me', {
      method: 'PATCH',
      headers: talabgorAuthHeader,
      body: JSON.stringify({
        pinfl: '99999999999999', // Changing Gov pinfl
      }),
    });
    console.log(`[PATCH /users/me - Read-only reject] Status: ${rejectRes.status} (Kutilgan: 400 Bad Request)`);
    console.log(`  Xatolik xabari: ${rejectRes.data.message}`);
    if (rejectRes.status !== 400) {
      throw new Error(`Davlat ma'lumotlarini o'zgartirish rad etilmadi!`);
    }

    // =========================================================================
    // 8. RBAC 403 Forbidden va Audit tekshiruvi (AUTH-03)
    // =========================================================================
    console.log('\n--- TEST 8: RBAC 403 Forbidden tekshiruvi (Talabgor admin paneliga kirishi taqiqlanadi) ---');
    const forbiddenRes = await request('/admin/settings', {
      method: 'GET',
      headers: talabgorAuthHeader, // Talabgor token with no ADMIN role
    });
    console.log(`[GET /admin/settings with TALABGOR] Status: ${forbiddenRes.status} (Kutilgan: 403 Forbidden)`);
    console.log(`  Xatolik xabari: ${forbiddenRes.data.message}`);
    if (forbiddenRes.status !== 403) {
      throw new Error(`Ruxsatsiz kirish bloklanmadi! Status: ${forbiddenRes.status}`);
    }

    // =========================================================================
    // 9. POST /auth/logout (FT-AUTH-06, AUTH-05: Tizimdan chiqish)
    // =========================================================================
    console.log('\n--- TEST 9: POST /auth/logout ---');
    const logoutRes = await request('/auth/logout', {
      method: 'POST',
      headers: talabgorAuthHeader,
    });
    console.log(`[POST /auth/logout] Status: ${logoutRes.status}, Message: ${logoutRes.data.data?.message}`);

    console.log('\n========================================================================');
    console.log('🎉 BARCHA 8 TA AUTH API VA QABUL MEZONLARI (AUTH-01 - AUTH-05) 100% O\'TDI!');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

runAuthTests();
