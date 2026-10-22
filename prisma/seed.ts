import { PrismaClient, OrganizationType, EntityStatus, UserStatus, ContentStatus, RegistryStatus, CabinetType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database for Nizolarni muqobil hal etish platformasi...');

  // 1. Tashkilotlar (FT-ADM-01 / ADM-01)
  console.log('Creating organizations hierarchy...');
  const ministry = await prisma.organization.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'O\'zbekiston Respublikasi Adliya vazirligi',
      type: OrganizationType.MINISTRY,
      region: 'Toshkent shahri',
      code: 'ADLIYA_CENTRAL',
      address: 'Sayilgoh ko\'chasi, 5-uy',
      phone: '+998712070444',
      email: 'info@adliya.uz',
      status: EntityStatus.ACTIVE,
    },
  });

  const tashkentDept = await prisma.organization.upsert({
    where: { id: '22222222-2222-2222-2222-222222222221' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222221',
      name: 'Toshkent shahar adliya boshqarmasi',
      type: OrganizationType.REGIONAL_DEPARTMENT,
      parentId: ministry.id,
      region: 'Toshkent shahri',
      code: 'ADLIYA_TAS',
      address: 'Amir Temur ko\'chasi, 16-uy',
      phone: '+998712330055',
      email: 'tashkent@adliya.uz',
      status: EntityStatus.ACTIVE,
    },
  });

  const samarkandDept = await prisma.organization.upsert({
    where: { id: '22222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Samarqand viloyati adliya boshqarmasi',
      type: OrganizationType.REGIONAL_DEPARTMENT,
      parentId: ministry.id,
      region: 'Samarqand viloyati',
      code: 'ADLIYA_SAM',
      address: 'Bo\'stonsaroy ko\'chasi, 82-uy',
      phone: '+998662330055',
      email: 'samarkand@adliya.uz',
      status: EntityStatus.ACTIVE,
    },
  });

  const trainingCenter = await prisma.organization.upsert({
    where: { id: '33333333-3333-3333-3333-333333333331' },
    update: {},
    create: {
      id: '33333333-3333-3333-3333-333333333331',
      name: 'Yuristlar malakasini oshirish markazi (Mediatorlar tayyorlash kursi)',
      type: OrganizationType.TRAINING_CENTER,
      parentId: ministry.id,
      region: 'Toshkent shahri',
      code: 'TRAIN_YMOM',
      address: 'Mustaqillik shox ko\'chasi, 42-uy',
      phone: '+998712331555',
      email: 'markaz@yumom.uz',
      status: EntityStatus.ACTIVE,
    },
  });

  // 2. Huquqlar (Permissions)
  console.log('Creating permissions...');
  const permissionsList = [
    { code: 'ORG_VIEW', name: 'Tashkilotlarni ko\'rish', module: 'ADM' },
    { code: 'ORG_MANAGE', name: 'Tashkilotlarni yaratish va tahrirlash', module: 'ADM' },
    { code: 'USER_VIEW', name: 'Foydalanuvchilarni ko\'rish', module: 'ADM' },
    { code: 'USER_MANAGE', name: 'Foydalanuvchilarni boshqarish', module: 'ADM' },
    { code: 'ROLE_VIEW', name: 'Rollarni ko\'rish', module: 'ADM' },
    { code: 'ROLE_MANAGE', name: 'Rollar va huquqlarni sozlash', module: 'ADM' },
    { code: 'DICT_VIEW', name: 'Spravochniklarni ko\'rish', module: 'ADM' },
    { code: 'DICT_MANAGE', name: 'Spravochniklarni boshqarish', module: 'ADM' },
    { code: 'AUDIT_VIEW', name: 'Audit jurnalini ko\'rish', module: 'ADM' },
    { code: 'SETTINGS_VIEW', name: 'Sozlamalarni ko\'rish', module: 'ADM' },
    { code: 'SETTINGS_MANAGE', name: 'Sozlamalarni o\'zgartirish', module: 'ADM' },
    { code: 'CONTENT_VIEW', name: 'Kontentlarni ko\'rish', module: 'ADM' },
    { code: 'CONTENT_MANAGE', name: 'Kontentlarni yaratish va tahrirlash', module: 'ADM' },
    { code: 'CONTENT_PUBLISH', name: 'Kontentlarni nashr qilish', module: 'ADM' },
    // AUTH permissions
    { code: 'PROFILE_VIEW', name: 'O\'z profilini ko\'rish', module: 'AUTH' },
    { code: 'PROFILE_EDIT', name: 'O\'z profilini tahrirlash', module: 'AUTH' },
    // BIL module permissions
    { code: 'NOTIFICATIONS_VIEW', name: 'Xabarlarni ko\'rish', module: 'BIL' },
    { code: 'TEMPLATE_MANAGE', name: 'Xabar shablonlarini boshqarish', module: 'BIL' },
    { code: 'TIMERS_MANAGE', name: 'Taymerlarni boshqarish', module: 'BIL' },
  ];

  for (const perm of permissionsList) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, module: perm.module },
      create: perm,
    });
  }

  // 3. Rollar (Roles) - 9 ta asosiy rol (FT-AUTH-04 / AUTH-03)
  console.log('Creating all 9 roles...');
  const rolesData = [
    { name: 'ADMIN', displayName: 'Administrator', description: 'Tizimning to\'liq vakolatli administratori', isSystem: true },
    { name: 'MINISTRY_STAFF', displayName: 'Vazirlik xodimi', description: 'Adliya vazirligi mas\'ul xodimi', isSystem: true },
    { name: 'REGIONAL_STAFF', displayName: 'Hududiy adliya xodimi', description: 'Viloyat / shahar adliya boshqarmasi xodimi', isSystem: true },
    { name: 'COMMISSION', displayName: 'Malaka komissiyasi', description: 'Mediatorlar malakasini baholash komissiyasi a\'zosi', isSystem: true },
    { name: 'MEDIATOR', displayName: 'Professional Mediator', description: 'Reyestrdagi professional mediator', isSystem: false },
    { name: 'ARBITRATION_JUDGE', displayName: 'Hakamlik sudyasi', description: 'Doimiy faoliyat ko\'rsatuvchi hakamlik sudyasi', isSystem: false },
    { name: 'ARBITRATOR', displayName: 'Arbitr', description: 'Xalqaro va mahalliy tijoriy arbitraj arbitri', isSystem: false },
    { name: 'TALABGOR', displayName: 'Talabgor', description: 'Ariza beruvchi, nizo ishtirokchisi (jismoniy yoki yuridik shaxs)', isSystem: false },
    { name: 'OPERATOR', displayName: 'Operator', description: 'Qo\'llab-quvvatlash xizmati / Call-center operatori', isSystem: false },
  ];

  const roleEntities: Record<string, any> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { displayName: r.displayName, isSystem: r.isSystem, description: r.description },
      create: r,
    });
    roleEntities[r.name] = role;
  }

  // Bind permissions
  const allPermissions = await prisma.permission.findMany();
  for (const p of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roleEntities.ADMIN.id, permissionId: p.id } },
      update: {},
      create: { roleId: roleEntities.ADMIN.id, permissionId: p.id },
    });
  }

  // 4. Foydalanuvchilar (Users) - 9 ta rol va maqomlar bo'yicha
  console.log('Creating initial users for each cabinet type...');
  const commonPasswordHash = await bcrypt.hash('Secret@12345', 10);
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const staffPasswordHash = await bcrypt.hash('Vazirlik@12345', 10);

  const usersToSeed = [
    {
      username: 'admin',
      fullName: 'Tizim Bosh Administratori',
      email: 'admin@adliya.uz',
      phone: '+998901234567',
      passwordHash: adminPasswordHash,
      organizationId: ministry.id,
      position: 'Bosh administrator',
      status: UserStatus.ACTIVE,
      role: 'ADMIN',
      cabinetType: CabinetType.ADMIN,
      registryStatus: RegistryStatus.NONE,
      pinfl: '31201801230001',
      passportSeriesNumber: 'AA1000001',
    },
    {
      username: 'vazirlik',
      fullName: 'Vazirlik Mas\'ul Xodimi',
      email: 'staff@adliya.uz',
      phone: '+998909876543',
      passwordHash: staffPasswordHash,
      organizationId: ministry.id,
      position: 'Bosh mutaxassis',
      status: UserStatus.ACTIVE,
      role: 'MINISTRY_STAFF',
      cabinetType: CabinetType.MINISTRY_STAFF,
      registryStatus: RegistryStatus.NONE,
      pinfl: '31201801230002',
      passportSeriesNumber: 'AA1000002',
    },
    {
      username: 'hudud_toshkent',
      fullName: 'Toshkent Hududiy Adliya Xodimi',
      email: 'tashkent_staff@adliya.uz',
      phone: '+998901112233',
      passwordHash: commonPasswordHash,
      organizationId: tashkentDept.id,
      position: 'Hududiy inspektor',
      status: UserStatus.ACTIVE,
      role: 'REGIONAL_STAFF',
      cabinetType: CabinetType.REGIONAL_STAFF,
      registryStatus: RegistryStatus.NONE,
      pinfl: '31201801230003',
      passportSeriesNumber: 'AA1000003',
    },
    {
      username: 'komissiya_azosi',
      fullName: 'Komissiya Raisi Qodirov Sardor',
      email: 'komissiya@adliya.uz',
      phone: '+998902223344',
      passwordHash: commonPasswordHash,
      organizationId: trainingCenter.id,
      position: 'Komissiya a\'zosi',
      status: UserStatus.ACTIVE,
      role: 'COMMISSION',
      cabinetType: CabinetType.COMMISSION,
      registryStatus: RegistryStatus.NONE,
      pinfl: '31201801230004',
      passportSeriesNumber: 'AA1000004',
    },
    {
      username: 'mediator_karim',
      fullName: 'Karimov Alisher Baxtiyorovich',
      email: 'karimov_mediator@mail.uz',
      phone: '+998903334455',
      passwordHash: commonPasswordHash,
      status: UserStatus.ACTIVE,
      role: 'MEDIATOR',
      cabinetType: CabinetType.MEDIATOR,
      registryStatus: RegistryStatus.MEDIATOR,
      pinfl: '31201851230011',
      passportSeriesNumber: 'AA1000005',
      address: 'Toshkent shahri, Yakkasaroy tumani, Shota Rustaveli ko\'chasi, 25-uy',
      nationality: 'O\'zbek',
      gender: 'MALE',
      birthDate: '1982-06-20',
      birthPlace: 'Samarqand shahri',
    },
    {
      username: 'sudya_akrom',
      fullName: 'Akromov Rustam Ilhomovich',
      email: 'akromov_judge@mail.uz',
      phone: '+998904445566',
      passwordHash: commonPasswordHash,
      status: UserStatus.ACTIVE,
      role: 'ARBITRATION_JUDGE',
      cabinetType: CabinetType.ARBITRATION_JUDGE,
      registryStatus: RegistryStatus.ARBITRATION_JUDGE,
      pinfl: '31201851230022',
      passportSeriesNumber: 'AA1000006',
      address: 'Toshkent shahri, Mirzo Ulug\'bek tumani, 5-mavze',
      nationality: 'O\'zbek',
      gender: 'MALE',
      birthDate: '1979-11-14',
      birthPlace: 'Buxoro shahri',
    },
    {
      username: 'arbitr_dilshod',
      fullName: 'Dilshodov Azizbek Olimovich',
      email: 'dilshodov_arbitr@mail.uz',
      phone: '+998905556677',
      passwordHash: commonPasswordHash,
      status: UserStatus.ACTIVE,
      role: 'ARBITRATOR',
      cabinetType: CabinetType.ARBITRATOR,
      registryStatus: RegistryStatus.ARBITRATOR,
      pinfl: '31201851230033',
      passportSeriesNumber: 'AA1000007',
      address: 'Toshkent shahri, Yunusobod tumani, 12-mavze',
      nationality: 'O\'zbek',
      gender: 'MALE',
      birthDate: '1988-02-18',
      birthPlace: 'Farg\'ona shahri',
    },
    {
      username: 'talabgor_nodir',
      fullName: 'Nodirov Jamshid Shuhratovich',
      email: 'j.nodirov@mail.uz',
      phone: '+998906667788',
      passwordHash: commonPasswordHash,
      status: UserStatus.ACTIVE,
      role: 'TALABGOR',
      cabinetType: CabinetType.APPLICANT,
      registryStatus: RegistryStatus.NONE,
      pinfl: '31201851230044',
      passportSeriesNumber: 'AA7654321',
      passportGivenDate: '2020-05-15',
      passportExpireDate: '2030-05-15',
      birthDate: '1985-04-12',
      birthPlace: 'Toshkent shahri, Shayxontohur tumani',
      nationality: 'O\'zbek',
      gender: 'MALE',
      address: 'Toshkent shahri, Chilonzor tumani, 9-mavze, 14-uy',
    },
    {
      username: 'operator_aziz',
      fullName: 'Azizova Nigora Mansurovna',
      email: 'operator@adliya.uz',
      phone: '+998907778899',
      passwordHash: commonPasswordHash,
      organizationId: ministry.id,
      position: 'Texnik operator',
      status: UserStatus.ACTIVE,
      role: 'OPERATOR',
      cabinetType: CabinetType.OPERATOR,
      registryStatus: RegistryStatus.NONE,
      pinfl: '31201801230009',
      passportSeriesNumber: 'AA1000009',
    },
  ];

  for (const u of usersToSeed) {
    const { role, ...userData } = u;
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: userData,
      create: userData,
    });

    const roleEntity = roleEntities[role];
    if (roleEntity) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: roleEntity.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: roleEntity.id,
        },
      });
    }
  }

  // 5. Spravochniklar (FT-ADM-05 / ADM-03)
  console.log('Seeding dictionaries...');
  const regions = [
    { code: 'TAS_CITY', nameUz: 'Toshkent shahri', nameRu: 'г. Ташкент' },
    { code: 'TAS_REG', nameUz: 'Toshkent viloyati', nameRu: 'Ташкентская область' },
    { code: 'SAM', nameUz: 'Samarqand viloyati', nameRu: 'Самаркандская область' },
    { code: 'AND', nameUz: 'Andijon viloyati', nameRu: 'Андижанская область' },
    { code: 'FER', nameUz: 'Farg\'ona viloyati', nameRu: 'Ферганская область' },
    { code: 'NAM', nameUz: 'Namangan viloyati', nameRu: 'Наманганская область' },
    { code: 'BUX', nameUz: 'Buxoro viloyati', nameRu: 'Бухарская область' },
    { code: 'XOR', nameUz: 'Xorazm viloyati', nameRu: 'Хорезмская область' },
    { code: 'NAV', nameUz: 'Navoiy viloyati', nameRu: 'Навоийская область' },
    { code: 'QASH', nameUz: 'Qashqadaryo viloyati', nameRu: 'Кашкадарьинская область' },
    { code: 'SUR', nameUz: 'Surxondaryo viloyati', nameRu: 'Сурхандарьинская область' },
    { code: 'JIZ', nameUz: 'Jizzax viloyati', nameRu: 'Джизакская область' },
    { code: 'SIR', nameUz: 'Sirdaryo viloyati', nameRu: 'Сырдарьинская область' },
    { code: 'QR', nameUz: 'Qoraqalpog\'iston Respublikasi', nameRu: 'Республика Каракалпакстан' },
  ];

  for (let i = 0; i < regions.length; i++) {
    await prisma.dictionaryItem.upsert({
      where: { category_code: { category: 'regions', code: regions[i].code } },
      update: {},
      create: {
        category: 'regions',
        code: regions[i].code,
        nameUz: regions[i].nameUz,
        nameRu: regions[i].nameRu,
        sortOrder: i + 1,
      },
    });
  }

  const specializations = [
    { code: 'CIVIL', nameUz: 'Fuqarolik nizolari', nameRu: 'Гражданские споры' },
    { code: 'FAMILY', nameUz: 'Oilaviy nizolar', nameRu: 'Семейные споры' },
    { code: 'LABOR', nameUz: 'Mehnat nizolari', nameRu: 'Трудовые споры' },
    { code: 'ECONOMIC', nameUz: 'Iqtisodiy va tadbirkorlik nizolari', nameRu: 'Экономические споры' },
    { code: 'INTELLECTUAL', nameUz: 'Intellektual mulk nizolari', nameRu: 'Споры интеллектуальной собственности' },
    { code: 'BANKING', nameUz: 'Bank va moliya nizolari', nameRu: 'Банковские и финансовые споры' },
  ];

  for (let i = 0; i < specializations.length; i++) {
    await prisma.dictionaryItem.upsert({
      where: { category_code: { category: 'specializations', code: specializations[i].code } },
      update: {},
      create: {
        category: 'specializations',
        code: specializations[i].code,
        nameUz: specializations[i].nameUz,
        nameRu: specializations[i].nameRu,
        sortOrder: i + 1,
      },
    });
  }

  // 6. Xabar shablonlari (FT-BIL-02 / BIL-02)
  console.log('Seeding notification templates...');
  const templates = [
    {
      code: 'APPLICATION_STATUS',
      name: 'Ariza holati haqida bildirishnoma',
      category: 'APPLICATION',
      titleUz: 'Ariza holati yangilandi',
      titleRu: 'Статус заявления обновлен',
      bodyUz: 'Hurmatli {{fullName}}, sizning {{caseNumber}}-sonli arizangiz holati: {{statusName}}.',
      bodyRu: 'Уважаемый(ая) {{fullName}}, статус вашего заявления №{{caseNumber}}: {{statusName}}.',
      smsTextUz: 'Ariza {{caseNumber}} holati: {{statusName}}. platforma.adliya.uz',
      smsTextRu: 'Статус заявления {{caseNumber}}: {{statusName}}. platforma.adliya.uz',
      availableVariables: ['fullName', 'caseNumber', 'statusName'],
    },
    {
      code: 'EXAM_INVITATION',
      name: 'Imtihonga taklifnoma',
      category: 'EXAM',
      titleUz: 'Mediatorlik bo\'yicha imtihonga taklifnoma',
      titleRu: 'Приглашение на квалификационный экзамен',
      bodyUz: 'Hurmatli {{fullName}}, siz {{examDate}} kuni soat {{examTime}} da Yuristlar malakasini oshirish markazida bo\'lib o\'tadigan imtihonga taklif etilasiz.',
      bodyRu: 'Уважаемый(ая) {{fullName}}, вы приглашены на квалификационный экзамен {{examDate}} в {{examTime}}.',
      smsTextUz: 'Imtihonga taklif: {{examDate}} kuni soat {{examTime}} da. platforma.adliya.uz',
      availableVariables: ['fullName', 'examDate', 'examTime', 'examLocation'],
    },
    {
      code: 'EXAM_RESULT',
      name: 'Imtihon natijasi haqida xabarnoma',
      category: 'EXAM',
      titleUz: 'Imtihon natijalari e\'lon qilindi',
      titleRu: 'Результаты квалификационного экзамена',
      bodyUz: 'Hurmatli {{fullName}}, sizning imtihon natijangiz: {{score}} ball ({{resultStatus}}).',
      bodyRu: 'Уважаемый(ая) {{fullName}}, ваш результат: {{score}} баллов ({{resultStatus}}).',
      smsTextUz: 'Imtihon natijangiz: {{score}} ball ({{resultStatus}}). platforma.adliya.uz',
      availableVariables: ['fullName', 'score', 'resultStatus'],
    },
    {
      code: 'CONTRACT_STATUS',
      name: 'Shartnoma va kelishuv holati',
      category: 'CONTRACT',
      titleUz: 'Kelishuv / Shartnoma imzolandi',
      titleRu: 'Соглашение / Договор подписан',
      bodyUz: 'Hurmatli {{fullName}}, {{caseNumber}}-sonli nizo bo\'yicha mediatsiya kelishuvi barcha tomonlar tomonidan imzolandi.',
      bodyRu: 'Уважаемый(ая) {{fullName}}, медиативное соглашение по спору №{{caseNumber}} подписано.',
      smsTextUz: 'Nizo {{caseNumber}} bo\'yicha kelishuv imzolandi. platforma.adliya.uz',
      availableVariables: ['fullName', 'caseNumber', 'contractDate'],
    },
    {
      code: 'REPORT_SUBMISSION_DEADLINE',
      name: 'Hisobot topshirish muddati haqida ogohlantirish',
      category: 'REPORT',
      titleUz: 'Davriy hisobot topshirish muddati yaqinlashmoqda',
      titleRu: 'Приближается срок сдачи отчета',
      bodyUz: 'Hurmatli {{fullName}}, {{period}} davri uchun mediatorlik faoliyati hisobotini {{deadline}} sanasiga qadar topshirishingiz so\'raladi.',
      bodyRu: 'Уважаемый(ая) {{fullName}}, просим сдать отчет за {{period}} до {{deadline}}.',
      smsTextUz: 'Eslatma: Hisobot topshirish muddati {{deadline}} gacha. platforma.adliya.uz',
      availableVariables: ['fullName', 'period', 'deadline'],
    },
    {
      code: 'QUALIFICATION_UPGRADE_REMINDER',
      name: 'Malaka oshirish muddati (1 oy oldin ogohlantirish)',
      category: 'QUALIFICATION',
      titleUz: 'Malaka oshirish muddati yaqinlashmoqda',
      titleRu: 'Напоминание о повышении квалификации',
      bodyUz: 'Hurmatli mediator {{fullName}}, sizning mediatorlik sertifikatingiz muddati 1 oydan so\'ng ({{certificateExpiryDate}}) tugaydi. Navbatdagi malaka oshirish kursidan o\'tishingiz zarur.',
      bodyRu: 'Уважаемый(ая) {{fullName}}, срок сертификата истекает {{certificateExpiryDate}}.',
      smsTextUz: 'Diqqat: Malaka oshirish muddati {{certificateExpiryDate}} gacha. platforma.adliya.uz',
      availableVariables: ['fullName', 'certificateExpiryDate'],
    },
    {
      code: 'OBLIGATION_EXECUTION_DEADLINE',
      name: 'Majburiyatni bajarish muddati haqida eslatma',
      category: 'OBLIGATION',
      titleUz: 'Kelishuv majburiyatini bajarish muddati yaqinlashmoqda',
      titleRu: 'Срок исполнения обязательства истекает',
      bodyUz: 'Hurmatli {{fullName}}, {{caseNumber}}-sonli mediatsiya kelishuvi bo\'yicha belgilangan majburiyatni bajarish muddati: {{obligationDeadline}}.',
      bodyRu: 'Уважаемый(ая) {{fullName}}, срок обязательства по соглашению №{{caseNumber}}: {{obligationDeadline}}.',
      smsTextUz: 'Eslatma: Kelishuv majburiyati muddati: {{obligationDeadline}}. platforma.adliya.uz',
      availableVariables: ['fullName', 'caseNumber', 'obligationDeadline'],
    },
    {
      code: 'CALENDAR_EVENT',
      name: 'Kalendar tadbiri haqida eslatma',
      category: 'CALENDAR',
      titleUz: 'Mediatsiya uchrashuvi / Kalendar tadbiri',
      titleRu: 'Календарное событие / Встреча медиации',
      bodyUz: 'Hurmatli {{fullName}}, sizning {{eventTitle}} tadbiringiz {{eventDate}} kuni soat {{eventTime}} ga belgilangan.',
      bodyRu: 'Уважаемый(ая) {{fullName}}, ваше мероприятие {{eventTitle}} назначено на {{eventDate}} в {{eventTime}}.',
      smsTextUz: 'Tadbir: {{eventTitle}} {{eventDate}} soat {{eventTime}} da. platforma.adliya.uz',
      availableVariables: ['fullName', 'eventTitle', 'eventDate', 'eventTime'],
    },
  ];

  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: { code: t.code },
      update: t,
      create: t,
    });
  }

  // 7. Markaziy taymer sozlamalari (FT-BIL-05 / BIL-03)
  console.log('Seeding central timer settings...');
  const timers = [
    {
      key: 'CASE_REGISTRATION_TIMEOUT',
      name: 'Arizani ro\'yxatga olish muddati',
      description: 'Ariza kelib tushgandan so\'ng qabul qilish yoki rad etish muddati',
      durationValue: 3,
      durationUnit: 'DAYS' as const,
      targetModule: 'MK',
    },
    {
      key: 'MEDIATOR_ASSIGNMENT_TIMEOUT',
      name: 'Mediator tanlash yoki tayinlash muddati',
      description: 'Tomonlar mediator tanlashi yoki adliya tomonidan tayinlanishi muddati',
      durationValue: 5,
      durationUnit: 'DAYS' as const,
      targetModule: 'MTS',
    },
    {
      key: 'MEDIATION_PROCESS_MAX_DURATION',
      name: 'Mediatsiya jarayonining maksimal muddati',
      description: 'Mediatsiya tartib-taomilini amalga oshirishning qonuniy maksimal muddati',
      durationValue: 30,
      durationUnit: 'DAYS' as const,
      targetModule: 'MTS',
    },
    {
      key: 'AGREEMENT_EXECUTION_CONFIRMATION',
      name: 'Kelishuv ijrosini tasdiqlash muddati',
      description: 'Kelishuv shartlari bajarilganligini tomonlar tasdiqlashi muddati',
      durationValue: 10,
      durationUnit: 'DAYS' as const,
      targetModule: 'MON',
    },
    {
      key: 'QUALIFICATION_UPGRADE_ALERT_DAYS',
      name: 'Malaka oshirish muddati eslatmasi (1 oy oldin)',
      description: 'Mediatorlik sertifikati amal qilish muddati tugashidan oldin ogohlantirish',
      durationValue: 30,
      durationUnit: 'DAYS' as const,
      targetModule: 'REG',
    },
    {
      key: 'REPORT_SUBMISSION_INTERVAL_MONTHS',
      name: 'Davriy hisobot topshirish oralig\'i',
      description: 'Mediatorlar faoliyati bo\'yicha davriy hisobot davri',
      durationValue: 6,
      durationUnit: 'MONTHS' as const,
      targetModule: 'HIS',
    },
    {
      key: 'SESSION_INACTIVITY_TIMEOUT_MINUTES',
      name: 'Seans faolsizlik muddati',
      description: 'Foydalanuvchi hech qanday amal bajarmasa seansni yopish vaqti',
      durationValue: 30,
      durationUnit: 'MINUTES' as const,
      targetModule: 'AUTH',
    },
  ];

  for (const tm of timers) {
    await prisma.timerSetting.upsert({
      where: { key: tm.key },
      update: tm,
      create: tm,
    });
  }

  // 8. Namunaviy dastlabki bildirishnoma (FT-BIL-04)
  const talabgor = await prisma.user.findUnique({ where: { username: 'talabgor_nodir' } });
  if (talabgor) {
    await prisma.notification.upsert({
      where: { idempotencyKey: 'seed_init_notif_nodir' },
      update: {},
      create: {
        userId: talabgor.id,
        channel: 'CABINET',
        templateCode: 'APPLICATION_STATUS',
        title: 'Platformaga xush kelibsiz!',
        content: 'Hurmatli Jamshid Nodirov, «Nizolarni muqobil hal etish» elektron platformasida shaxsiy kabinetingiz faollashtirildi.',
        status: 'DELIVERED',
        isRead: false,
        sentAt: new Date(),
        idempotencyKey: 'seed_init_notif_nodir',
      },
    });
  }

  console.log('✅ Database seeded successfully with all modules (ADM, AUTH, BIL)!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
