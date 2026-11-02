// Foydalanuvchi taqdim etgan Qashqadaryo reyestri faylining sinov uchun ko‘rinadigan nusxasi.
// Rasmiy backend ma’lumoti bo‘lmaganda ishlatiladi; tanlangan yozuvlar haqiqiy mediatorga biriktirilmaydi.
export type SampleMediatorEntry = {
  id: string
  type: 'MEDIATOR'
  fullName: string
  isSample: true
  region: string
  specialization: string[]
  languages: string[]
  certificateNumber: string | null
  status: 'ACTIVE'
}

export const qashqadaryoMediatorSamples: SampleMediatorEntry[] = [
  {
    "id": "qashqadaryo-sample-001",
    "type": "MEDIATOR",
    "fullName": "Эшимов Хоким Бобоярович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000010",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-002",
    "type": "MEDIATOR",
    "fullName": "Узаков Юлдаш Хужамкулович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000081",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-003",
    "type": "MEDIATOR",
    "fullName": "Худойбердиев Жўра Қўйсинович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000084",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-004",
    "type": "MEDIATOR",
    "fullName": "Розиков Нурали Тураевич",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000110",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-005",
    "type": "MEDIATOR",
    "fullName": "Зарипов Акмал Анварович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000113",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-006",
    "type": "MEDIATOR",
    "fullName": "Каримов Хамдам Хусанович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000038",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-007",
    "type": "MEDIATOR",
    "fullName": "Муминов Таштемир Халбаевич",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000150",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-008",
    "type": "MEDIATOR",
    "fullName": "Нафасова Камола Улашевна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000178",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-009",
    "type": "MEDIATOR",
    "fullName": "Хонқулов Рамизжон Равшанович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000199",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-010",
    "type": "MEDIATOR",
    "fullName": "Журабаева Гулрух     Жахонгир қизи",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000189",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-011",
    "type": "MEDIATOR",
    "fullName": "Бегимов Асрор Хуррамович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000202",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-012",
    "type": "MEDIATOR",
    "fullName": "Ишмуратова Гулсара Астановна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000205",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-013",
    "type": "MEDIATOR",
    "fullName": "Урунов Акмал Илхамович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлари"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000215",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-014",
    "type": "MEDIATOR",
    "fullName": "Паттаева Мухлиса  Иргашевна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000210",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-015",
    "type": "MEDIATOR",
    "fullName": "Кулдашев Хасан Тиллоевич",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000238",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-016",
    "type": "MEDIATOR",
    "fullName": "Аллаярова Фотимаой Чорияровна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000173",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-017",
    "type": "MEDIATOR",
    "fullName": "Сайфиев Хамза Убайдуллаевич",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000212",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-018",
    "type": "MEDIATOR",
    "fullName": "Хайруллоева Дилноза Адхамовна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000273",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-019",
    "type": "MEDIATOR",
    "fullName": "Жамолова Дилнавоз Амировна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000319",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-020",
    "type": "MEDIATOR",
    "fullName": "Исмаилова Насиба Нажмиддиновна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000310",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-021",
    "type": "MEDIATOR",
    "fullName": "Шовкатов Шухрат              Шовкат уғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000313",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-022",
    "type": "MEDIATOR",
    "fullName": "Турдиев Улуғбек Уктамович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000243",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-023",
    "type": "MEDIATOR",
    "fullName": "Пирматов Асрор Аскаралиевич",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000270",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-024",
    "type": "MEDIATOR",
    "fullName": "Кенжаева Матлуба Нурмахматовна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000282",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-026",
    "type": "MEDIATOR",
    "fullName": "Шодиев Ҳумоюн Шерқул ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000271",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-027",
    "type": "MEDIATOR",
    "fullName": "Ахроров Беҳзод Муминович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000278",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-028",
    "type": "MEDIATOR",
    "fullName": "Аллаярова Зухраой Чарияровна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000277",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-029",
    "type": "MEDIATOR",
    "fullName": "Ахмедова Мафтуна Алимхановна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000306",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-030",
    "type": "MEDIATOR",
    "fullName": "Худайбердиев Асамидин Абдурахманович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000274",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-031",
    "type": "MEDIATOR",
    "fullName": "Эшдавлатов Шерали Турсунович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000060",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-032",
    "type": "MEDIATOR",
    "fullName": "Жўраев Бехрўз Абдиқодир ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000083",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-033",
    "type": "MEDIATOR",
    "fullName": "Холманова Дилнора Рустамовна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000720",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-034",
    "type": "MEDIATOR",
    "fullName": "Ёдгоров Жонибек Ҳамроевич",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000901",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-035",
    "type": "MEDIATOR",
    "fullName": "Каримов Азамат Баходирович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000890",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-036",
    "type": "MEDIATOR",
    "fullName": "Мухаммадиев Сирожиддин Рашидович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000710",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-037",
    "type": "MEDIATOR",
    "fullName": "Хамраев Илёс Музаффарович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000719",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-038",
    "type": "MEDIATOR",
    "fullName": "Тураева Дилафруз Сезановна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000315",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-039",
    "type": "MEDIATOR",
    "fullName": "Санаев Киёмиддин Тухтаевич",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000715",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-040",
    "type": "MEDIATOR",
    "fullName": "Оқмаматова Гавҳар Ҳайитовна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000941",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-041",
    "type": "MEDIATOR",
    "fullName": "Қурбонова Гулхаё Бахриддин қизи",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000312",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-042",
    "type": "MEDIATOR",
    "fullName": "Ахматов Равшан Рустамович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000934",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-043",
    "type": "MEDIATOR",
    "fullName": "Жураев Акмалжон Ахмаджонович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000935",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-044",
    "type": "MEDIATOR",
    "fullName": "Жобборов Уткир Қаюмович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000863",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-045",
    "type": "MEDIATOR",
    "fullName": "Хамидов Фахриддин Абдурахмонович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000871",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-046",
    "type": "MEDIATOR",
    "fullName": "Меликова Дилфуза Неъматжоновна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000938",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-047",
    "type": "MEDIATOR",
    "fullName": "Хуррамов Камол Азаматович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000332",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-048",
    "type": "MEDIATOR",
    "fullName": "Муминова Дилбар Буриевна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000327",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-049",
    "type": "MEDIATOR",
    "fullName": "Курбонов Рашид Панжиевич",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001011",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-050",
    "type": "MEDIATOR",
    "fullName": "Турдиева Юлдузхон Улугбековна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000943",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-051",
    "type": "MEDIATOR",
    "fullName": "Маматов Мардон Суюнович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000937",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-052",
    "type": "MEDIATOR",
    "fullName": "Унгбаева Раъно Таштемировна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000944",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-053",
    "type": "MEDIATOR",
    "fullName": "Якубов Инъомжон Мустафоқулович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000288",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-054",
    "type": "MEDIATOR",
    "fullName": "Умбаров Мухаммад-Али Исматович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ва оила муносабатлардан келиб чиқадиган низолар"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000717",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-055",
    "type": "MEDIATOR",
    "fullName": "Исматов Таникул Астанович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000281",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-056",
    "type": "MEDIATOR",
    "fullName": "Ғаниева Чарос Насруллоевна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000086",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-057",
    "type": "MEDIATOR",
    "fullName": "Пулатов Мусурманкул Хамраевич",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 001212",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-058",
    "type": "MEDIATOR",
    "fullName": "Сатторов Шерзод Шовкат ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000438",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-059",
    "type": "MEDIATOR",
    "fullName": "Мўминов Асилбек Ҳусниддин ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "en"
    ],
    "certificateNumber": "MT № 000141",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-060",
    "type": "MEDIATOR",
    "fullName": "Мирзаев Шохрух Мухаммаджон ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001284",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-061",
    "type": "MEDIATOR",
    "fullName": "Алиқулов Дониёр Холбобоевич",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001311",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-062",
    "type": "MEDIATOR",
    "fullName": "Хамидова Шаҳзода Сайдилло қизи",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001366",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-063",
    "type": "MEDIATOR",
    "fullName": "Бойназарова Дилафруз Асадовна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001387",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-064",
    "type": "MEDIATOR",
    "fullName": "Эгамов Ислом Эсанович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001389",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-065",
    "type": "MEDIATOR",
    "fullName": "Остонова Гулбахор Илҳом қизи",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001496",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-066",
    "type": "MEDIATOR",
    "fullName": "Каримов Суюн",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 001523",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-067",
    "type": "MEDIATOR",
    "fullName": "Саидов Беҳзод Хамзаевич",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 001556",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-068",
    "type": "MEDIATOR",
    "fullName": "Ситдиқов Икром Ўктамжонович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001454",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-069",
    "type": "MEDIATOR",
    "fullName": "Мустафаев Умархон Махмудович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001495",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-070",
    "type": "MEDIATOR",
    "fullName": "Хўжаниёзов Муродилла Бобоқулович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001575",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-071",
    "type": "MEDIATOR",
    "fullName": "Мухаммадиева Моҳира Асқаровна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001625",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-072",
    "type": "MEDIATOR",
    "fullName": "Алланова Мадина Авазхоновна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001622",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-073",
    "type": "MEDIATOR",
    "fullName": "Пардаев Эшкобил Норматович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000124",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-074",
    "type": "MEDIATOR",
    "fullName": "Рахимов Козим Рахим ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru",
      "en"
    ],
    "certificateNumber": "MT № 000215",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-075",
    "type": "MEDIATOR",
    "fullName": "Қурбонов Сухробжон Шухрат ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000221",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-076",
    "type": "MEDIATOR",
    "fullName": "Аманова Муштари Абдурахим қизи",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001667",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-077",
    "type": "MEDIATOR",
    "fullName": "Рахимова Саодат Джурабаевна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 000866",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-078",
    "type": "MEDIATOR",
    "fullName": "Ярматов Кудрат Оралович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001682",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-079",
    "type": "MEDIATOR",
    "fullName": "Бойматов Абдуллоҳ Анвар ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 00172",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-080",
    "type": "MEDIATOR",
    "fullName": "Пардаева Мафтуна Қодировна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000288",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-081",
    "type": "MEDIATOR",
    "fullName": "Tуёв Фарход Намозович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001794",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-082",
    "type": "MEDIATOR",
    "fullName": "Гaипoв Aбдурауф Холматович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001767",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-083",
    "type": "MEDIATOR",
    "fullName": "Тўраев Жавлонбек Азамат ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru",
      "en"
    ],
    "certificateNumber": "MT № 000169",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-084",
    "type": "MEDIATOR",
    "fullName": "Тошпўлатов Фарход Бахтиёрович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001810",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-085",
    "type": "MEDIATOR",
    "fullName": "Ҳақбердиев Акбар Акрам ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001859",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-086",
    "type": "MEDIATOR",
    "fullName": "Абдураҳимов Абдуллахон Зубайдулло ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 001886",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-087",
    "type": "MEDIATOR",
    "fullName": "Бердиев Даврон Жумаевич",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 001902",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-088",
    "type": "MEDIATOR",
    "fullName": "Бобомуродова Барно Абдусодиқ қизи",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000314",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-089",
    "type": "MEDIATOR",
    "fullName": "Тошматов Сардорбек Бахриддин ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 000366",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-090",
    "type": "MEDIATOR",
    "fullName": "Эсанов Темурбек Нафас-ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 001995",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-091",
    "type": "MEDIATOR",
    "fullName": "Қиличев Нуржахон Саид ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru",
      "en"
    ],
    "certificateNumber": "MT № 002048",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-092",
    "type": "MEDIATOR",
    "fullName": "Шералиев Илхом Ғуломбоевич",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 002074",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-093",
    "type": "MEDIATOR",
    "fullName": "Рахимов Акмалжон Даминович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 002073",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-094",
    "type": "MEDIATOR",
    "fullName": "Содиқов Жасур Нуриддин ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru",
      "en"
    ],
    "certificateNumber": "MT № 002233",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-095",
    "type": "MEDIATOR",
    "fullName": "Қучқоров Давронбек Абдурауф ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 002229",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-096",
    "type": "MEDIATOR",
    "fullName": "Ўроқов Нурбек Сафар ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 002228",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-097",
    "type": "MEDIATOR",
    "fullName": "Сайфиев Санжар Салимович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 002306",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-098",
    "type": "MEDIATOR",
    "fullName": "Турдиев Акмал Юсупович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru"
    ],
    "certificateNumber": "MT № 002309",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-099",
    "type": "MEDIATOR",
    "fullName": "Асадов Акбар Шухрат ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 002288",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-100",
    "type": "MEDIATOR",
    "fullName": "Рахмонов Шамсиддин Куланович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 002304",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-101",
    "type": "MEDIATOR",
    "fullName": "Очилов Мухлис Бердиқулович",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 002300",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-102",
    "type": "MEDIATOR",
    "fullName": "Бахриев Маъруф Рамозон ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 002290",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-103",
    "type": "MEDIATOR",
    "fullName": "Янгибоев Шоҳруҳ Усар ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 002312",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-104",
    "type": "MEDIATOR",
    "fullName": "Менглиқулов Салохиддин Абдирахмон ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 002299",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-105",
    "type": "MEDIATOR",
    "fullName": "Авазов Баҳром Худойбердиевич",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 002289",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-106",
    "type": "MEDIATOR",
    "fullName": "Ташева Нодира Гулмуратовна",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 002308",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-107",
    "type": "MEDIATOR",
    "fullName": "Файзиева Дилноза Изатилло қизи",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 002294",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-108",
    "type": "MEDIATOR",
    "fullName": "Сирожов Маъруф Комилхон ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz"
    ],
    "certificateNumber": "MT № 002597",
    "status": "ACTIVE"
  },
  {
    "id": "qashqadaryo-sample-109",
    "type": "MEDIATOR",
    "fullName": "Абдувалиев Комилжон Ориф ўғли",
    "isSample": true,
    "region": "Qashqadaryo viloyati",
    "specialization": [
      "Фуқаролик ҳуқуқий муносабатлардан, шу жумладан тадбиркорлик фаолиятини амалга ошириш муносабати билан келиб чиқадиган низоларга, шунингдек якка меҳнат низоларига ва оилавий ҳуқуқий муносабатлардан келиб чиқадиган низолар бўйича"
    ],
    "languages": [
      "uz",
      "ru",
      "en"
    ],
    "certificateNumber": "MT № 002587",
    "status": "ACTIVE"
  }
]
