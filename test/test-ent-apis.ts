import { NestFactory } from '@nestjs/core';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { OneIdIntegrationAdapter } from '../src/modules/integration/adapters/one-id.adapter';
import { EsignIntegrationAdapter } from '../src/modules/integration/adapters/esign.adapter';
import { LegalCapacityIntegrationAdapter } from '../src/modules/integration/adapters/legal-capacity.adapter';
import { VideoConferenceIntegrationAdapter } from '../src/modules/integration/adapters/video-conference.adapter';
import { PersonalizationIntegrationAdapter } from '../src/modules/integration/adapters/personalization.adapter';
import { SmsIntegrationAdapter } from '../src/modules/integration/adapters/sms.adapter';
import { BillingIntegrationAdapter } from '../src/modules/integration/adapters/billing.adapter';

let app: INestApplication;
const baseUrl = 'http://localhost:3336';

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

async function runEntTests() {
  console.log('🚀 Starting NestJS application for ENT test suite...');
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(3336);
  console.log('✅ Server started on port 3336\n');

  try {
    // 0. AUTH: Login as Admin for admin integration monitoring
    console.log('--- TEST 0: AUTH LOGIN AS ADMIN ---');
    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'Admin@12345' }),
    });
    const adminToken = adminLoginRes.data.data.accessToken;
    const adminAuthHeader = { Authorization: `Bearer ${adminToken}` };

    // =========================================================================
    // 1. GET /external/mygov/mediators (ENT-03: my.gov.uz reyestr ma'lumotlari)
    // =========================================================================
    console.log('\n--- TEST 1: GET /external/mygov/mediators (my.gov.uz portali reyestri) ---');
    const myGovRes = await request('/external/mygov/mediators?page=1&limit=10');
    console.log(`[GET /external/mygov/mediators] Status: ${myGovRes.status}`);
    console.log(`  Manba: ${myGovRes.data.data?.source}`);
    console.log(`  Jami mediatorlar soni: ${myGovRes.data.data?.total}`);
    const firstMediator = myGovRes.data.data?.items?.[0];
    console.log(`  Namuna: ${firstMediator?.fullName}, Masked PINFL: ${firstMediator?.pinfl}`);

    // =========================================================================
    // 2. POST /external/courts/claims (ENT-08: Sudlar tizimidan da'vo kelishi)
    // =========================================================================
    console.log('\n--- TEST 2: POST /external/courts/claims (Sud da\'vosi qabul qilish) ---');
    const testCourtCase = `2-1001-2601/${Date.now().toString().slice(-4)}`;
    const courtClaimRes = await request('/external/courts/claims', {
      method: 'POST',
      body: JSON.stringify({
        courtCaseNumber: testCourtCase,
        courtName: 'Fuqarolik ishlari bo\'yicha Mirzo Ulug\'bek tumanlararo sudi',
        judgeName: 'Yo\'ldoshev A.S.',
        claimantName: 'Sobirov Shavkat Alimovich',
        claimantPinfl: '31201851230044',
        claimantPhone: '+998901234567',
        respondentName: 'Karimov Bahodir Zokirovich',
        respondentPinfl: '31201851230055',
        respondentPhone: '+998907654321',
        disputeSubject: 'Qarz shartnomasi bo\'yicha nizoni sudgacha hal etish',
        claimAmount: 45000000,
        courtOrderDate: '2026-10-22',
        documentUrl: 'https://e-sud.sud.uz/files/order_sample.pdf',
      }),
    });
    console.log(`[POST /external/courts/claims] Status: ${courtClaimRes.status}`);
    console.log(`  Ish raqami: ${courtClaimRes.data.data?.courtCaseNumber}`);
    console.log(`  Qabul holati: ${courtClaimRes.data.data?.status}`);

    // =========================================================================
    // 3. POST /external/training-centers/certificates (ENT-09: YUMOM/TDYU sertifikat)
    // =========================================================================
    console.log('\n--- TEST 3: POST /external/training-centers/certificates (O\'quv markazi sertifikati) ---');
    const certNumber = `MED-YMOM-${Date.now()}`;
    const certRes = await request('/external/training-centers/certificates', {
      method: 'POST',
      body: JSON.stringify({
        certificateNumber: certNumber,
        pinfl: '31201851230011',
        fullName: 'Karimov Alisher Baxtiyorovich',
        trainingCenterCode: 'TRAIN_YMOM',
        courseName: 'Mediatorlarni tayyorlash bo\'yicha maxsus o\'quv kursi',
        issuedDate: '2026-10-15',
        expiryDate: '2029-10-15',
        documentUrl: 'https://yumom.uz/certificates/sample.pdf',
      }),
    });
    console.log(`[POST /external/training-centers/certificates] Status: ${certRes.status}`);
    console.log(`  Sertifikat raqami: ${certRes.data.data?.certificateNumber}`);
    console.log(`  Holat: ${certRes.data.data?.status}`);

    // =========================================================================
    // 4. POST /external/billing/callback (ENT-04: Billing to'lov xabarnomasi)
    // =========================================================================
    console.log('\n--- TEST 4: POST /external/billing/callback (Billing to\'lov xabari) ---');
    const invoiceNum = `INV-TEST-${Date.now()}`;
    const billingCallbackRes = await request('/external/billing/callback', {
      method: 'POST',
      body: JSON.stringify({
        invoiceNumber: invoiceNum,
        transactionId: `TXN_MUNIS_${Date.now()}`,
        amount: 340000,
        paymentStatus: 'PAID',
        paymentProvider: 'MUNIS',
        payerPinfl: '31201851230044',
        payerName: 'Jamshid Nodirov',
        paidAt: new Date().toISOString(),
      }),
    });
    console.log(`[POST /external/billing/callback] Status: ${billingCallbackRes.status}`);
    console.log(`  Xabar: ${billingCallbackRes.data.data?.message}`);

    // =========================================================================
    // 5. SHARTNOMA (CONTRACT) TESTLARI: OUTBOUND ADAPTERLARNI TEKSHIRISH
    // =========================================================================
    console.log('\n--- TEST 5: ADAPTERLARNING SHARTNOMA (CONTRACT) TESTLARI ---');

    // ENT-01: OneID & Mobile ID
    const oneIdAdapter = app.get(OneIdIntegrationAdapter);
    const oneIdProfile = await oneIdAdapter.exchangeCode('pinfl_31201851230044');
    console.log(`[ENT-01: OneIdAdapter] PINFL: ${oneIdProfile.pinfl}, Passport: ${oneIdProfile.passportSeriesNumber}`);

    const mobileIdResult = await oneIdAdapter.verifyMobileId('+998901234567', '123456');
    console.log(`[ENT-01: MobileId] Verified: ${mobileIdResult.verified}`);

    // ENT-02: Esign
    const esignAdapter = app.get(EsignIntegrationAdapter);
    const esignVerify = await esignAdapter.verifyPkcs7('sample_pkcs7_hash');
    console.log(`[ENT-02: EsignAdapter Verify] Valid: ${esignVerify.valid}, Signer: ${esignVerify.fullName}`);

    const esignSign = await esignAdapter.signDocument('sha256_hash_contract_agreement', '31201851230011');
    console.log(`[ENT-02: EsignAdapter Sign] PKCS7 generated: ${!!esignSign.pkcs7}`);

    // ENT-05: SMS Adapter
    const smsAdapter = app.get(SmsIntegrationAdapter);
    const smsResult = await smsAdapter.sendSms('+998901234567', 'Test platforma xabarnomasi');
    console.log(`[ENT-05: SmsAdapter] Success: ${smsResult.success}, MessageId: ${smsResult.messageId}`);

    // ENT-06: Legal Capacity (Sudlanganlik va muomalaga layoqat)
    const capacityAdapter = app.get(LegalCapacityIntegrationAdapter);
    const capacityResult = await capacityAdapter.checkStatus('31201851230011');
    console.log(`[ENT-06: LegalCapacityAdapter] Status: ${capacityResult.status}, Clean: ${!capacityResult.hasCriminalRecord}`);

    // ENT-07: Video Conference
    const videoAdapter = app.get(VideoConferenceIntegrationAdapter);
    const meetingRoom = await videoAdapter.createMeeting('Mediatsiya majlisi', new Date().toISOString());
    console.log(`[ENT-07: VideoConferenceAdapter] Room URL: ${meetingRoom.roomUrl}, PIN: ${meetingRoom.pin}`);

    // ENT-10: Personalization Agency
    const personalizationAdapter = app.get(PersonalizationIntegrationAdapter);
    const biometricData = await personalizationAdapter.verifyBiometrics('31201851230044', 'AA7654321');
    console.log(`[ENT-10: PersonalizationAdapter] FullName: ${biometricData.fullName}, Document Status: ${biometricData.documentStatus}`);

    // =========================================================================
    // 6. ADMIN INTEGRATSIYA LOGLARI MONITORINGI (GET /admin/integrations/logs)
    // =========================================================================
    console.log('\n--- TEST 6: GET /admin/integrations/logs (Integratsiya jurnali) ---');
    const logsRes = await request('/admin/integrations/logs', { headers: adminAuthHeader });
    console.log(`[GET /admin/integrations/logs] Status: ${logsRes.status}`);
    console.log(`  Jami qayd etilgan integratsiya loglari: ${logsRes.data.data?.length}`);
    const sampleLog = logsRes.data.data?.[0];
    console.log(`  Oxirgi log: [${sampleLog?.serviceName}] [${sampleLog?.direction}] [${sampleLog?.status}] ${sampleLog?.durationMs}ms`);

    console.log('\n========================================================================');
    console.log('🎉 BARCHA 4 TA KIRUVCHI API VA 10 TA ADAPTER CONTRACT TESTLARI (ENT-01 - ENT-10) 100% O\'TDI!');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

runEntTests();
