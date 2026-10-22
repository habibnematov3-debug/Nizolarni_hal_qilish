import { PrismaClient, OrganizationType, EntityStatus, UserStatus, ContentStatus } from '@prisma/client';
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
  ];

  for (const perm of permissionsList) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, module: perm.module },
      create: perm,
    });
  }

  // 3. Rollar (Roles)
  console.log('Creating roles and binding permissions...');
  const allPermissions = await prisma.permission.findMany();

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { displayName: 'Administrator', isSystem: true },
    create: {
      name: 'ADMIN',
      displayName: 'Administrator',
      description: 'Tizimning to\'liq vakolatli administratori',
      isSystem: true,
    },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: 'MINISTRY_STAFF' },
    update: { displayName: 'Vazirlik xodimi', isSystem: true },
    create: {
      name: 'MINISTRY_STAFF',
      displayName: 'Vazirlik xodimi',
      description: 'Adliya vazirligi mas\'ul xodimi (kontent, hisobotlar va monitoring)',
      isSystem: true,
    },
  });

  const mediatorRole = await prisma.role.upsert({
    where: { name: 'MEDIATOR' },
    update: { displayName: 'Mediator', isSystem: false },
    create: {
      name: 'MEDIATOR',
      displayName: 'Professional Mediator',
      description: 'Nizolarni muqobil hal etuvchi ro\'yxatdan o\'tgan mediator',
      isSystem: false,
    },
  });

  // Bind all permissions to ADMIN
  for (const p of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: p.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: p.id,
      },
    });
  }

  // Bind Content and View permissions to MINISTRY_STAFF
  const staffPermCodes = ['ORG_VIEW', 'USER_VIEW', 'DICT_VIEW', 'AUDIT_VIEW', 'CONTENT_VIEW', 'CONTENT_MANAGE', 'CONTENT_PUBLISH'];
  for (const p of allPermissions.filter((item) => staffPermCodes.includes(item.code))) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: staffRole.id,
          permissionId: p.id,
        },
      },
      update: {},
      create: {
        roleId: staffRole.id,
        permissionId: p.id,
      },
    });
  }

  // 4. Foydalanuvchilar (Users)
  console.log('Creating initial users...');
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const staffPasswordHash = await bcrypt.hash('Vazirlik@12345', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPasswordHash },
    create: {
      username: 'admin',
      fullName: 'Tizim Bosh Administratori',
      email: 'admin@adliya.uz',
      phone: '+998901234567',
      passwordHash: adminPasswordHash,
      organizationId: ministry.id,
      position: 'Bosh administrator',
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { username: 'vazirlik' },
    update: { passwordHash: staffPasswordHash },
    create: {
      username: 'vazirlik',
      fullName: 'Vazirlik Mas\'ul Xodimi',
      email: 'staff@adliya.uz',
      phone: '+998909876543',
      passwordHash: staffPasswordHash,
      organizationId: ministry.id,
      position: 'Bosh mutaxassis',
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: staffUser.id,
        roleId: staffRole.id,
      },
    },
    update: {},
    create: {
      userId: staffUser.id,
      roleId: staffRole.id,
    },
  });

  // 5. Spravochniklar (FT-ADM-05 / ADM-03)
  console.log('Seeding dictionaries...');

  // Regions (Hududlar)
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

  // Specializations (Ixtisosliklar)
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

  // Penalty types (Jazo turlari)
  const penaltyTypes = [
    { code: 'WARNING', nameUz: 'Ogohlantirish', nameRu: 'Предупреждение' },
    { code: 'SUSPENSION', nameUz: 'Faoliyatini vaqtincha to\'xtatish', nameRu: 'Приостановление деятельности' },
    { code: 'TERMINATION', nameUz: 'Reyestrdan chiqarish / Sertifikatni bekor qilish', nameRu: 'Исключение из реестра' },
  ];

  for (let i = 0; i < penaltyTypes.length; i++) {
    await prisma.dictionaryItem.upsert({
      where: { category_code: { category: 'penalty_types', code: penaltyTypes[i].code } },
      update: {},
      create: {
        category: 'penalty_types',
        code: penaltyTypes[i].code,
        nameUz: penaltyTypes[i].nameUz,
        nameRu: penaltyTypes[i].nameRu,
        sortOrder: i + 1,
      },
    });
  }

  // Case statuses (Holatlar)
  const caseStatuses = [
    { code: 'SUBMITTED', nameUz: 'Kelib tushgan', nameRu: 'Подано' },
    { code: 'REGISTERED', nameUz: 'Ro\'yxatga olingan', nameRu: 'Зарегистрировано' },
    { code: 'MEDIATOR_ASSIGNED', nameUz: 'Mediator biriktirilgan', nameRu: 'Медиатор назначен' },
    { code: 'IN_PROCESS', nameUz: 'Mediatsiya jarayonida', nameRu: 'В процессе медиации' },
    { code: 'AGREEMENT_REACHED', nameUz: 'Kelishuvga erishildi', nameRu: 'Соглашение достигнуто' },
    { code: 'REJECTED', nameUz: 'Rad etilgan', nameRu: 'Отклонено' },
    { code: 'CLOSED', nameUz: 'Yopilgan', nameRu: 'Закрыто' },
  ];

  for (let i = 0; i < caseStatuses.length; i++) {
    await prisma.dictionaryItem.upsert({
      where: { category_code: { category: 'case_statuses', code: caseStatuses[i].code } },
      update: {},
      create: {
        category: 'case_statuses',
        code: caseStatuses[i].code,
        nameUz: caseStatuses[i].nameUz,
        nameRu: caseStatuses[i].nameRu,
        sortOrder: i + 1,
      },
    });
  }

  // 6. Tizim sozlamalari (FT-ADM-07 / ADM-05)
  console.log('Seeding system settings...');
  await prisma.systemSetting.upsert({
    where: { key: 'timers' },
    update: {},
    create: {
      key: 'timers',
      group: 'TIMERS',
      description: 'Taymer muddatlari sozlamalari',
      value: {
        caseRegistrationDays: 3,
        mediatorAssignmentDays: 5,
        mediationProcessMaxDays: 30,
        agreementExecutionConfirmationDays: 10,
      },
      updatedBy: 'admin',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'fileLimits' },
    update: {},
    create: {
      key: 'fileLimits',
      group: 'FILE_LIMITS',
      description: 'Fayl hajmi va formati cheklovlari',
      value: {
        maxFileSizeMb: 25,
        allowedExtensions: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'zip'],
        maxFilesCount: 10,
      },
      updatedBy: 'admin',
    },
  });

  // 7. Namunaviy kontentlar (FT-ADM-04 / ADM-06)
  console.log('Seeding initial content...');
  await prisma.content.create({
    data: {
      type: 'news',
      titleUz: '«Nizolarni muqobil hal etish» elektron platformasi ishga tushirildi',
      titleRu: 'Запущена электронная платформа «Альтернативное разрешение споров»',
      summaryUz: 'Ushbu platforma orqali fuqarolar va tadbirkorlar o\'z nizolarini mediatorlar yordamida tez va oson hal etishlari mumkin.',
      bodyUz: '<p>O\'zbekiston Respublikasi Adliya vazirligi tomonidan nizolarni sudgacha hal etish mexanizmlarini raqamlashtirish maqsadida yangi yagona elektron platforma joriy etildi.</p>',
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date(),
      authorId: adminUser.id,
    },
  });

  await prisma.content.create({
    data: {
      type: 'legal_framework',
      titleUz: 'O\'zbekiston Respublikasining "Mediatsiya to\'g\'risida"gi Qonuni',
      titleRu: 'Закон Республики Узбекистан «О медиации»',
      summaryUz: 'Nizolarni muqobil hal etishning huquqiy asoslari va mediator faoliyati tartibi.',
      bodyUz: '<p>Ushbu Qonun nizolarni xolis jismoniy shaxs (mediator) ko\'magida hal etish bo\'yicha munosabatlarni tartibga soladi.</p>',
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date(),
      authorId: adminUser.id,
    },
  });

  await prisma.content.create({
    data: {
      type: 'faq',
      titleUz: 'Mediatsiya nima va uning qanday afzalliklari bor?',
      titleRu: 'Что такое медиация и каковы её преимущества?',
      summaryUz: 'Mediatsiya — tomonlarning kelishuvi asosida nizoni mustaqil va ixtiyoriy hal qilish jarayonidir.',
      bodyUz: '<p>Asosiy afzalliklar: maxfiylik, sudga qaraganda ancha kam xarajat, tezlik va tomonlar o\'rtasidagi munosabatlarning saqlab qolinishi.</p>',
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date(),
      authorId: adminUser.id,
    },
  });

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
