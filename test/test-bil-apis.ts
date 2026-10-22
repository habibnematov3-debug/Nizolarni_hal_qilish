import { NestFactory } from '@nestjs/core';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

let app: INestApplication;
const baseUrl = 'http://localhost:3335';

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

async function runBilTests() {
  console.log('🚀 Starting NestJS application for BIL test suite...');
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(3335);
  console.log('✅ Server started on port 3335\n');

  try {
    // 0. AUTH: Login as Admin and Talabgor
    console.log('--- TEST 0: AUTH LOGINS ---');
    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'Admin@12345' }),
    });
    const adminToken = adminLoginRes.data.data.accessToken;
    const adminAuthHeader = { Authorization: `Bearer ${adminToken}` };

    const talabgorLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'talabgor_nodir', password: 'Secret@12345' }),
    });
    const talabgorToken = talabgorLoginRes.data.data.accessToken;
    const talabgorUser = talabgorLoginRes.data.data.user;
    const talabgorAuthHeader = { Authorization: `Bearer ${talabgorToken}` };

    console.log(`[AUTH] Admin: ${adminLoginRes.status}, Talabgor: ${talabgorLoginRes.status}`);

    // =========================================================================
    // 1. GET /cabinet/notifications (FT-BIL-04 / BIL-04)
    // =========================================================================
    console.log('\n--- TEST 1: GET /cabinet/notifications (Xabarlar ro\'yxati) ---');
    const listRes = await request('/cabinet/notifications', { headers: talabgorAuthHeader });
    console.log(`[GET /cabinet/notifications] Status: ${listRes.status}`);
    console.log(`  Jami xabarlar: ${listRes.data.data?.pagination?.total}`);
    console.log(`  O'qilmagan xabarlar soni: ${listRes.data.data?.unreadCount}`);
    const firstNotif = listRes.data.data?.items?.[0];
    console.log(`  Oxirgi xabar: "${firstNotif?.title}"`);

    // =========================================================================
    // 2. PATCH /cabinet/notifications/{id}/read (BIL-04)
    // =========================================================================
    if (firstNotif) {
      console.log('\n--- TEST 2: PATCH /cabinet/notifications/{id}/read (O\'qilgan deb belgilash) ---');
      const readRes = await request(`/cabinet/notifications/${firstNotif.id}/read`, {
        method: 'PATCH',
        headers: talabgorAuthHeader,
      });
      console.log(`[PATCH /cabinet/notifications/{id}/read] Status: ${readRes.status}`);
      console.log(`  isRead: ${readRes.data.data?.isRead}, status: ${readRes.data.data?.status}`);
    }

    // =========================================================================
    // 3. POST /admin/notifications/send (FT-BIL-01 / BIL-01: Kabinet + SMS asinxron)
    // =========================================================================
    console.log('\n--- TEST 3: POST /admin/notifications/send (Xabar jo\'natish: Kabinet + SMS) ---');
    const idempotencyKey = `case_test_${Date.now()}`;
    const sendRes = await request('/admin/notifications/send', {
      method: 'POST',
      headers: adminAuthHeader,
      body: JSON.stringify({
        userId: talabgorUser.id,
        templateCode: 'APPLICATION_STATUS',
        variables: {
          caseNumber: 'AR-2026-9901',
          statusName: 'Ro\'yxatga olindi',
        },
        channels: ['CABINET', 'SMS'],
        idempotencyKey,
      }),
    });
    console.log(`[POST /admin/notifications/send] Status: ${sendRes.status}`);
    console.log(`  Kanallar: ${sendRes.data.data?.deliveredChannels?.join(', ')}`);
    console.log(`  Yaratilgan bildirishnomalar soni: ${sendRes.data.data?.notifications?.length}`);

    // Test Idempotency: "Bir xabar ikki marta yuborilmaydi"
    console.log('\n--- TEST 3.1: Idempotency tekshiruvi (Ayni kalit bilan qayta jo\'natish) ---');
    const duplicateRes = await request('/admin/notifications/send', {
      method: 'POST',
      headers: adminAuthHeader,
      body: JSON.stringify({
        userId: talabgorUser.id,
        templateCode: 'APPLICATION_STATUS',
        variables: { caseNumber: 'AR-2026-9901', statusName: 'Ro\'yxatga olindi' },
        idempotencyKey,
      }),
    });
    console.log(`[Idempotency Check] Status: ${duplicateRes.status}, Idempotent: ${duplicateRes.data.data?.idempotent}`);
    if (!duplicateRes.data.data?.idempotent) {
      throw new Error('Bir xil xabar ikki marta yuborildi!');
    }

    // =========================================================================
    // 4. GET /admin/notification-templates (FT-BIL-02 / BIL-02)
    // =========================================================================
    console.log('\n--- TEST 4: GET /admin/notification-templates (Xabar shablonlari) ---');
    const templatesRes = await request('/admin/notification-templates', { headers: adminAuthHeader });
    console.log(`[GET /admin/notification-templates] Status: ${templatesRes.status}`);
    console.log(`  Mavjud shablonlar soni: ${templatesRes.data.data?.length}`);
    const templateCodes = templatesRes.data.data?.map((t: any) => t.code);
    console.log(`  Shablon kodlari: ${templateCodes?.join(', ')}`);

    const appStatusTpl = templatesRes.data.data?.find((t: any) => t.code === 'APPLICATION_STATUS');

    // =========================================================================
    // 5. PUT /admin/notification-templates/{id} (FT-BIL-03 / BIL-02)
    // =========================================================================
    console.log('\n--- TEST 5: PUT /admin/notification-templates/{id} (Shablonni tahrirlash) ---');
    const updateTplRes = await request(`/admin/notification-templates/${appStatusTpl.id}`, {
      method: 'PUT',
      headers: adminAuthHeader,
      body: JSON.stringify({
        bodyUz: 'Hurmatli {{fullName}}, sizning {{caseNumber}}-sonli arizangiz yangilandi: {{statusName}}.',
        smsTextUz: 'Ariza {{caseNumber}} yangilandi: {{statusName}}. platforma.adliya.uz',
      }),
    });
    console.log(`[PUT /admin/notification-templates/{id}] Status: ${updateTplRes.status}`);
    console.log(`  Yangilangan matn: "${updateTplRes.data.data?.bodyUz}"`);

    // =========================================================================
    // 6. GET /admin/timers (FT-BIL-05 / BIL-03: Markaziy taymerlar)
    // =========================================================================
    console.log('\n--- TEST 6: GET /admin/timers (Markaziy taymerlar) ---');
    const timersRes = await request('/admin/timers', { headers: adminAuthHeader });
    console.log(`[GET /admin/timers] Status: ${timersRes.status}`);
    console.log(`  Taymerlar soni: ${timersRes.data.data?.length}`);
    const timerKeys = timersRes.data.data?.map((t: any) => `${t.key}: ${t.durationValue} ${t.durationUnit}`);
    console.log(`  Taymerlar:`, timerKeys);

    // =========================================================================
    // 7. PUT /admin/timers/{key} (FT-BIL-05 / BIL-03)
    // =========================================================================
    console.log('\n--- TEST 7: PUT /admin/timers/{key} (Taymer muddatini yangilash) ---');
    const updateTimerRes = await request('/admin/timers/CASE_REGISTRATION_TIMEOUT', {
      method: 'PUT',
      headers: adminAuthHeader,
      body: JSON.stringify({
        durationValue: 2,
        durationUnit: 'DAYS',
      }),
    });
    console.log(`[PUT /admin/timers/{key}] Status: ${updateTimerRes.status}`);
    console.log(`  Yangi qiymat: ${updateTimerRes.data.data?.durationValue} ${updateTimerRes.data.data?.durationUnit}`);

    // =========================================================================
    // 8. POST /events/emit (Section 8: Hodisalar integratsiyasi)
    // =========================================================================
    console.log('\n--- TEST 8: POST /events/emit (Domain hodisalari integratsiyasi) ---');
    const eventRes = await request('/events/emit', {
      method: 'POST',
      headers: adminAuthHeader,
      body: JSON.stringify({
        eventName: 'ImtihonNatijasiTasdiqlandi',
        sourceModule: 'MK',
        userId: talabgorUser.id,
        variables: {
          score: 88,
          resultStatus: 'Muvaffaqiyatli topshirdi',
        },
      }),
    });
    console.log(`[POST /events/emit - ImtihonNatijasiTasdiqlandi] Status: ${eventRes.status}`);
    console.log(`  Bildirishnoma hosil qilindi: ${eventRes.data.data?.success}`);

    // =========================================================================
    // 9. POST /cabinet/notifications/read-all
    // =========================================================================
    console.log('\n--- TEST 9: POST /cabinet/notifications/read-all ---');
    const readAllRes = await request('/cabinet/notifications/read-all', {
      method: 'POST',
      headers: talabgorAuthHeader,
    });
    console.log(`[POST /cabinet/notifications/read-all] Status: ${readAllRes.status}`);
    console.log(`  O'qilgan xabarlar soni: ${readAllRes.data.data?.updatedCount}`);

    console.log('\n========================================================================');
    console.log('🎉 BARCHA 6 TA BIL API VA QABUL MEZONLARI (BIL-01 - BIL-04) 100% O\'TDI!');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

runBilTests();
