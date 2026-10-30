export type ApplicantLanguage = 'uz' | 'ru'

export function applicantText(language: ApplicantLanguage, uzbek: string, russian: string) {
  return language === 'ru' ? russian : uzbek
}

export function applicantRoleTitle(language: ApplicantLanguage, role: string, fallback: string) {
  if (language !== 'ru') return fallback
  const titles: Record<string, string> = {
    APPLICANT: 'Кандидат в медиаторы',
    MEDIATOR: 'Медиатор',
    JUDGE: 'Арбитражный судья',
    ARBITRATOR: 'Арбитр',
    CITIZEN: 'Физическое лицо',
    BUSINESS: 'Юридическое лицо',
    REGIONAL: 'Территориальный орган юстиции',
    MINISTRY: 'Министерство юстиции',
    COMMISSION: 'Квалификационная комиссия',
    ADMIN: 'Администратор',
  }
  return titles[role] || fallback
}

export function applicantPageTitle(language: ApplicantLanguage, page: string) {
  if (language !== 'ru') return page
  const titles: Record<string, string> = {
    'Umumiy ko‘rsatkich': 'Общий обзор',
    'Mediator arizam': 'Моё заявление',
    'O‘quv kurslari': 'Учебные курсы',
    'Malaka imtihoni': 'Квалификационный экзамен',
    'Malaka guvohnomasi': 'Квалификационное свидетельство',
    'Xabarnomalar': 'Уведомления',
  }
  return titles[page] || page
}
