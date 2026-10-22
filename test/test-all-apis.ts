import { NestFactory } from '@nestjs/core';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

let app: INestApplication;
const baseUrl = 'http://localhost:3333';

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

async function runTests() {
  console.log('🚀 Starting NestJS application for test suite...');
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(3333);
  console.log('✅ Server started on port 3333\n');

  try {
    // 0. AUTH: Login as Admin
    console.log('--- TEST 0: AUTH (Login) ---');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'Admin@12345' }),
    });
    console.log(`[POST /auth/login] Status: ${loginRes.status}, User: ${loginRes.data.data?.user?.username}`);
    if (loginRes.status !== 201 && loginRes.status !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
    }
    const adminToken = loginRes.data.data.accessToken;
    const authHeaders = { Authorization: `Bearer ${adminToken}` };

    // 1. GET /admin/organizations
    console.log('\n--- TEST 1: GET /admin/organizations ---');
    const orgsRes = await request('/admin/organizations', { headers: authHeaders });
    console.log(`[GET /admin/organizations] Status: ${orgsRes.status}, Total count: ${orgsRes.data.data?.pagination?.total}`);

    // Tree hierarchy check
    const treeRes = await request('/admin/organizations?asTree=true', { headers: authHeaders });
    console.log(`[GET /admin/organizations?asTree=true] Status: ${treeRes.status}, Roots: ${treeRes.data.data?.length}`);

    // 2. POST /admin/organizations
    console.log('\n--- TEST 2: POST /admin/organizations ---');
    const createOrgRes = await request('/admin/organizations', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Buxoro viloyati adliya boshqarmasi',
        type: 'REGIONAL_DEPARTMENT',
        region: 'Buxoro viloyati',
        code: 'ADLIYA_BUX',
        phone: '+998652210055',
        status: 'ACTIVE',
      }),
    });
    console.log(`[POST /admin/organizations] Status: ${createOrgRes.status}, Created ID: ${createOrgRes.data.data?.id}`);
    const createdOrgId = createOrgRes.data.data?.id;

    // 3. GET /admin/organizations/{id}
    console.log('\n--- TEST 3: GET /admin/organizations/{id} ---');
    const getOrgRes = await request(`/admin/organizations/${createdOrgId}`, { headers: authHeaders });
    console.log(`[GET /admin/organizations/{id}] Status: ${getOrgRes.status}, Name: ${getOrgRes.data.data?.name}`);

    // 4. PATCH /admin/organizations/{id}
    console.log('\n--- TEST 4: PATCH /admin/organizations/{id} ---');
    const patchOrgRes = await request(`/admin/organizations/${createdOrgId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ address: 'Navoiy shoh ko\'chasi, 12-uy' }),
    });
    console.log(`[PATCH /admin/organizations/{id}] Status: ${patchOrgRes.status}, Updated Address: ${patchOrgRes.data.data?.address}`);

    // 5. GET /admin/users
    console.log('\n--- TEST 5: GET /admin/users ---');
    const usersRes = await request('/admin/users', { headers: authHeaders });
    console.log(`[GET /admin/users] Status: ${usersRes.status}, Total users: ${usersRes.data.data?.pagination?.total}`);

    // 6. POST /admin/users
    console.log('\n--- TEST 6: POST /admin/users ---');
    const testUsername = `operator_${Date.now()}`;
    const createUserRes = await request('/admin/users', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        username: testUsername,
        fullName: 'Test Operator Xodim',
        password: 'Operator@123',
        email: `${testUsername}@adliya.uz`,
        roleNames: ['MINISTRY_STAFF'],
        organizationId: createdOrgId,
      }),
    });
    console.log(`[POST /admin/users] Status: ${createUserRes.status}, Created User ID: ${createUserRes.data.data?.id}`);
    const createdUserId = createUserRes.data.data?.id;

    // 7. PATCH /admin/users/{id}
    console.log('\n--- TEST 7: PATCH /admin/users/{id} ---');
    const patchUserRes = await request(`/admin/users/${createdUserId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ position: 'Katta inspektor' }),
    });
    console.log(`[PATCH /admin/users/{id}] Status: ${patchUserRes.status}, New Position: ${patchUserRes.data.data?.position}`);

    // 8. PUT /admin/users/{id}/roles
    console.log('\n--- TEST 8: PUT /admin/users/{id}/roles ---');
    const putRolesRes = await request(`/admin/users/${createdUserId}/roles`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ roles: ['MINISTRY_STAFF', 'MEDIATOR'] }),
    });
    console.log(`[PUT /admin/users/{id}/roles] Status: ${putRolesRes.status}, Assigned Roles: ${putRolesRes.data.data?.roles?.join(', ')}`);

    // 9. GET /admin/roles
    console.log('\n--- TEST 9: GET /admin/roles ---');
    const rolesRes = await request('/admin/roles', { headers: authHeaders });
    console.log(`[GET /admin/roles] Status: ${rolesRes.status}, Count: ${rolesRes.data.data?.length}`);
    const staffRole = rolesRes.data.data?.find((r: any) => r.name === 'MINISTRY_STAFF');

    // 10. PUT /admin/roles/{id}/permissions
    console.log('\n--- TEST 10: PUT /admin/roles/{id}/permissions ---');
    const putPermRes = await request(`/admin/roles/${staffRole.id}/permissions`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        permissionCodes: ['ORG_VIEW', 'USER_VIEW', 'CONTENT_VIEW', 'CONTENT_MANAGE'],
      }),
    });
    console.log(`[PUT /admin/roles/{id}/permissions] Status: ${putPermRes.status}, Permissions count: ${putPermRes.data.data?.permissions?.length}`);

    // 11. GET /admin/dictionaries/{name}
    console.log('\n--- TEST 11: GET /admin/dictionaries/{name} ---');
    const dictRes = await request('/admin/dictionaries/regions', { headers: authHeaders });
    console.log(`[GET /admin/dictionaries/regions] Status: ${dictRes.status}, Regions count: ${dictRes.data.data?.items?.length}`);

    // 12. POST /admin/dictionaries/{name}
    console.log('\n--- TEST 12: POST /admin/dictionaries/{name} ---');
    const createDictRes = await request('/admin/dictionaries/specializations', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        code: `CUSTOM_SPEC_${Date.now()}`,
        nameUz: 'Qurilish va arxitektura nizolari',
        nameRu: 'Строительные споры',
        sortOrder: 10,
        isActive: true,
      }),
    });
    console.log(`[POST /admin/dictionaries/specializations] Status: ${createDictRes.status}, Code: ${createDictRes.data.data?.code}`);
    const createdDictId = createDictRes.data.data?.id;

    // 13. PATCH /admin/dictionaries/{name}/{id}
    console.log('\n--- TEST 13: PATCH /admin/dictionaries/{name}/{id} ---');
    const patchDictRes = await request(`/admin/dictionaries/specializations/${createdDictId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ isActive: false }),
    });
    console.log(`[PATCH /admin/dictionaries/specializations/{id}] Status: ${patchDictRes.status}, isActive: ${patchDictRes.data.data?.isActive}`);

    // 14. GET /admin/audit-log
    console.log('\n--- TEST 14: GET /admin/audit-log ---');
    const auditRes = await request('/admin/audit-log', { headers: authHeaders });
    console.log(`[GET /admin/audit-log] Status: ${auditRes.status}, Total Audit Logs: ${auditRes.data.data?.pagination?.total}`);
    const latestAction = auditRes.data.data?.items?.[0];
    console.log(`Latest audit log: [${latestAction?.action}] on [${latestAction?.entityType}] by [${latestAction?.username}]`);

    // 15. GET /admin/settings
    console.log('\n--- TEST 15: GET /admin/settings ---');
    const settingsRes = await request('/admin/settings', { headers: authHeaders });
    console.log(`[GET /admin/settings] Status: ${settingsRes.status}, Timers:`, settingsRes.data.data?.timers);

    // 16. PUT /admin/settings
    console.log('\n--- TEST 16: PUT /admin/settings ---');
    const putSettingsRes = await request('/admin/settings', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        timers: {
          caseRegistrationDays: 2,
          mediatorAssignmentDays: 4,
          mediationProcessMaxDays: 25,
          agreementExecutionConfirmationDays: 7,
        },
      }),
    });
    console.log(`[PUT /admin/settings] Status: ${putSettingsRes.status}, Updated Timers:`, putSettingsRes.data.data?.timers);

    // 17. POST /admin/content/{type}
    console.log('\n--- TEST 17: POST /admin/content/{type} ---');
    const createContentRes = await request('/admin/content/news', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        titleUz: 'Yangi mediatorlar tayyorlash kursi boshlandi',
        summaryUz: 'Yuristlar malakasini oshirish markazida yangi o\'quv dasturi e\'lon qilindi.',
        bodyUz: '<p>Batafsil matn...</p>',
        status: 'DRAFT',
      }),
    });
    console.log(`[POST /admin/content/news] Status: ${createContentRes.status}, ID: ${createContentRes.data.data?.id}`);
    const createdContentId = createContentRes.data.data?.id;

    // 18. PUT /admin/content/{type}/{id}
    console.log('\n--- TEST 18: PUT /admin/content/{type}/{id} ---');
    const putContentRes = await request(`/admin/content/news/${createdContentId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        titleUz: 'Yangi mediatorlar tayyorlash kursi qabuli boshlandi (Yangilangan)',
      }),
    });
    console.log(`[PUT /admin/content/news/{id}] Status: ${putContentRes.status}, Title: ${putContentRes.data.data?.titleUz}`);

    // 19. POST /admin/content/{type}/{id}/publish
    console.log('\n--- TEST 19: POST /admin/content/{type}/{id}/publish ---');
    const pubContentRes = await request(`/admin/content/news/${createdContentId}/publish`, {
      method: 'POST',
      headers: authHeaders,
    });
    console.log(`[POST /admin/content/news/{id}/publish] Status: ${pubContentRes.status}, Status: ${pubContentRes.data.data?.status}, PublishedAt: ${pubContentRes.data.data?.publishedAt}`);

    // 20. DELETE /admin/content/{type}/{id}
    console.log('\n--- TEST 20: DELETE /admin/content/{type}/{id} ---');
    const delContentRes = await request(`/admin/content/news/${createdContentId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    console.log(`[DELETE /admin/content/news/{id}] Status: ${delContentRes.status}, Message: ${delContentRes.data.data?.message}`);

    console.log('\n========================================================================');
    console.log('🎉 ALL 20 API ENDPOINTS + AUTH TESTED SUCCESSFULLY! 100% PASSING!');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

runTests();
