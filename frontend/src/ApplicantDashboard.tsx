import { useEffect, useMemo, useState } from 'react'
import {
  Bell, BookOpen, Check, ChevronDown, ChevronRight, Circle,
  ClipboardCheck, FileCheck2, FileClock, FileText, GraduationCap, Handshake,
  LogIn, Menu, QrCode, X,
} from 'lucide-react'
import { apiGet, getAccessToken } from './api'
import { applicantPageTitle, applicantRoleTitle, applicantText, type ApplicantLanguage } from './applicantLocale'

type ApplicantApplication = {
  id: string
  applicationNumber?: string | null
  title?: string
  status: string
  submittedAt?: string | null
  createdAt?: string | null
  phone?: string | null
  email?: string | null
  profession?: string | null
  rejectionReason?: string | null
  autoCheckResult?: { status?: string } | null
  exams?: { id: string; scheduledAt?: string | null; venue?: string | null; status?: string }[]
  detail?: string
}
type DemoApplication = { id: string; title: string; status: string; detail?: string; createdAt?: string }
type LearningState = { enrolled?: string[]; attended?: string[]; examSubmitted?: boolean; examScore?: number | null }
type NavGroup = { title: string; items: { label: string; icon: typeof Circle }[] }

const applicantGroups: NavGroup[] = [
  { title: 'ASOSIY', items: [{ label: 'Umumiy ko‘rsatkich', icon: ClipboardCheck }] },
  { title: 'MEDIATOR MAQOMI', items: [
    { label: 'Mediator arizam', icon: FileText },
    { label: 'O‘quv kurslari', icon: BookOpen },
    { label: 'Malaka imtihoni', icon: GraduationCap },
    { label: 'Malaka guvohnomasi', icon: QrCode },
  ] },
  { title: 'BOSHQA', items: [{ label: 'Xabarnomalar', icon: Bell }] },
]

export function ApplicantSidebar({ language, activePage, mobileOpen, onNavigate, onClose, onPublic, onSignOut }: {
  language: ApplicantLanguage
  activePage: string
  mobileOpen: boolean
  onNavigate: (page: string) => void
  onClose: () => void
  onPublic: () => void
  onSignOut: () => void
}) {
  return <>
    {mobileOpen && <button aria-label={applicantText(language, 'Menyuni yopish', 'Закрыть меню')} onClick={onClose} className="fixed inset-0 z-20 bg-slate-950/45 md:hidden"/>}
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[264px] flex-col bg-slate-950 text-white transition-transform duration-200 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 px-5 py-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-300 text-slate-950"><Handshake size={22}/></span>
        <span className="min-w-0"><span className="block text-sm font-semibold">Nizolarni hal etish</span><span className="mt-1 block text-[10px] uppercase tracking-[.18em] text-slate-400">Elektron platforma</span></span>
        <button onClick={onClose} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-white/10 md:hidden" aria-label={applicantText(language, 'Menyuni yopish', 'Закрыть меню')}><X size={18}/></button>
      </div>
      <div className="mx-5 border-t border-white/10"/>
      <div className="mx-4 mt-5 rounded-xl bg-white/[.06] p-3">
        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400"/><span className="text-xs text-slate-300">{applicantText(language, 'Mediator talabgori kabineti', 'Кабинет кандидата в медиаторы')}</span></div>
        <p className="mt-2 text-sm font-semibold">{applicantText(language, 'Malaka yo‘li', 'Путь к квалификации')}</p>
        <p className="mt-1 text-[11px] leading-4 text-slate-400">{applicantText(language, 'Ariza, kurs, imtihon va guvohnoma', 'Заявление, курсы, экзамен и сертификат')}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label={applicantText(language, 'Mediator talabgori bo‘limlari', 'Разделы кабинета кандидата в медиаторы')}>
        {applicantGroups.map((group) => <div className="mb-5" key={group.title}>
          <p className="mb-2 px-3 text-[10px] font-semibold tracking-[.16em] text-slate-500">{applicantText(language, group.title, ({ ASOSIY: 'ОСНОВНОЕ', 'MEDIATOR MAQOMI': 'СТАТУС МЕДИАТОРА', BOSHQA: 'ПРОЧЕЕ' } as Record<string, string>)[group.title] || group.title)}</p>
          <div className="space-y-1">{group.items.map(({ label, icon: Icon }) => {
            const active = activePage === label
            return <button key={label} onClick={() => { onNavigate(label); onClose() }} aria-current={active ? 'page' : undefined} className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${active ? 'bg-emerald-300/15 text-emerald-200 shadow-[inset_3px_0_0_#6ee7b7]' : 'text-slate-400 hover:bg-white/[.06] hover:text-white'}`}><Icon size={17}/><span>{applicantPageTitle(language, label)}</span>{active && <ChevronRight className="ml-auto" size={14}/>}</button>
          })}</div>
        </div>)}
      </nav>
      <div className="border-t border-white/10 p-4">
        <button onClick={onPublic} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"><ChevronRight className="rotate-180" size={17}/>{applicantText(language, 'Ochiq sahifaga qaytish', 'На главную страницу')}</button>
        <button onClick={onSignOut} className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/[.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"><LogIn size={17}/>{applicantText(language, 'Kabinetdan chiqish', 'Выйти из кабинета')}</button>
      </div>
    </aside>
  </>
}

export function ApplicantHeader({ language, onLanguageChange, activePage, activeRole, userName, assignedRoles, onNavigate, onSignOut, onSwitchRole, onOpenMenu }: {
  language: ApplicantLanguage
  onLanguageChange: (language: ApplicantLanguage) => void
  activePage: string
  activeRole: string
  userName: string
  assignedRoles: { key: string; label: string }[]
  onNavigate: (page: string) => void
  onSignOut: () => void
  onSwitchRole: (key: string) => void
  onOpenMenu: () => void
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const displayName = userName.trim() || applicantText(language, 'Foydalanuvchi', 'Пользователь')
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('uz') || 'M'
  const roleTitle = applicantRoleTitle(language, activeRole, 'Mediator talabgori')
  return <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
    <div className="flex min-w-0 items-center gap-3">
      <button onClick={onOpenMenu} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:hidden" aria-label={applicantText(language, 'Menyuni ochish', 'Открыть меню')}><Menu size={20}/></button>
      <button onClick={() => onNavigate('Umumiy ko‘rsatkich')} className="flex min-w-0 items-center gap-2.5 text-left">
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 sm:flex"><Handshake size={21}/></span>
        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{applicantText(language, 'Nizolarni hal etish', 'Разрешение споров')}</span><span className="hidden text-[10px] uppercase tracking-[.15em] text-slate-400 sm:block">{applicantText(language, 'Elektron platforma', 'Электронная платформа')}</span></span>
      </button>
      <span className="hidden h-8 w-px bg-slate-200 lg:block"/>
      <div className="hidden min-w-0 lg:block"><p className="truncate text-xs font-medium text-slate-700">{applicantPageTitle(language, activePage)}</p><p className="text-[11px] text-slate-400">{roleTitle}</p></div>
    </div>
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <button type="button" onClick={() => onLanguageChange(language === 'uz' ? 'ru' : 'uz')} aria-label={applicantText(language, 'Rus tiliga o‘tish', 'Переключить на узбекский язык')} title={applicantText(language, 'Rus tiliga o‘tish', 'Переключить на узбекский язык')} className="flex h-9 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
        <LanguageFlag language={language}/>
      </button>
      <button onClick={() => onNavigate('Xabarnomalar')} aria-label={applicantText(language, 'Xabarnomalar', 'Уведомления')} title={applicantText(language, 'Xabarnomalar', 'Уведомления')} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><Bell size={18}/></button>
      <span className="hidden h-8 w-px bg-slate-200 sm:block"/>
      {!getAccessToken() && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">{applicantText(language, 'Demo', 'Демо')}</span>}
      <div className="relative">
        <div className="flex min-h-10 items-center gap-2 rounded-xl px-1.5 sm:gap-2.5 sm:px-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">{initials}</span>
          <span className="hidden min-w-0 sm:block"><span className="block max-w-40 truncate text-xs font-semibold text-slate-800">{displayName}</span>
            {assignedRoles.length > 1 ? <select aria-label={applicantText(language, 'Faol rolni almashtirish', 'Сменить роль')} value={activeRole} onChange={(event) => onSwitchRole(event.target.value)} className="mt-0.5 block w-full max-w-40 cursor-pointer border-0 bg-transparent p-0 pr-5 text-[11px] text-slate-500 outline-none focus:rounded-sm focus:ring-1 focus:ring-blue-500">{assignedRoles.map((item) => <option key={item.key} value={item.key}>{applicantRoleTitle(language, item.key, item.label)}</option>)}</select> : <span className="block text-[11px] text-slate-500">{roleTitle}</span>}
          </span>
          <button aria-label={applicantText(language, 'Profil menyusi', 'Меню профиля')} aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)} className="flex h-9 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><ChevronDown size={15} className={`transition-transform ${profileOpen ? 'rotate-180' : ''}`}/></button>
        </div>
        {profileOpen && <>
          <button aria-label={applicantText(language, 'Menyuni yopish', 'Закрыть меню')} className="fixed inset-0 z-30 cursor-default" onClick={() => setProfileOpen(false)}/>
          <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
            <div className="border-b border-slate-100 px-3 py-2"><p className="truncate text-sm font-semibold text-slate-900">{displayName}</p><p className="mt-0.5 text-xs text-slate-500">{roleTitle}</p></div>
            <button role="menuitem" onClick={() => { onNavigate('Mediator arizam'); setProfileOpen(false) }} className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-slate-700 hover:bg-slate-50"><FileText size={16}/>{applicantText(language, 'Ariza va profil ma’lumotlari', 'Заявление и данные профиля')}</button>
            {assignedRoles.length > 1 && <div className="mt-2 border-t border-slate-100 px-2 pt-2 sm:hidden">
              <p className="px-2 pb-1 text-[11px] font-medium text-slate-500">{applicantText(language, 'Kabinetni almashtirish', 'Сменить кабинет')}</p>
              <div className="space-y-0.5">{assignedRoles.map((item) => {
                const active = item.key === activeRole
                return <button key={item.key} type="button" role="menuitemradio" aria-checked={active} disabled={active} onClick={() => { onSwitchRole(item.key); setProfileOpen(false) }} className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${active ? 'bg-emerald-50 font-semibold text-emerald-900' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <span>{applicantRoleTitle(language, item.key, item.label)}</span>{active && <Check size={16} className="shrink-0 text-emerald-700"/>}
                </button>
              })}</div>
            </div>}
            <button role="menuitem" onClick={() => { setProfileOpen(false); onSignOut() }} className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-slate-700 hover:bg-slate-50"><LogIn size={16}/>{applicantText(language, 'Kabinetdan chiqish', 'Выйти из кабинета')}</button>
          </div>
        </>}
      </div>
    </div>
  </header>
}

export function LanguageFlag({ language }: { language: ApplicantLanguage }) {
  if (language === 'ru') return <svg aria-hidden="true" viewBox="0 0 30 20" className="h-4 w-6 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-black/10"><rect width="30" height="6.67" fill="#fff"/><rect y="6.67" width="30" height="6.66" fill="#2563eb"/><rect y="13.33" width="30" height="6.67" fill="#dc2626"/></svg>
  return <svg aria-hidden="true" viewBox="0 0 30 20" className="h-4 w-6 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-black/10"><rect width="30" height="6" fill="#1e9bd7"/><rect y="6" width="30" height="1" fill="#ce1126"/><rect y="7" width="30" height="6" fill="#fff"/><rect y="13" width="30" height="1" fill="#ce1126"/><rect y="14" width="30" height="6" fill="#1eb53a"/><circle cx="5.7" cy="3.2" r="1.65" fill="#fff"/><circle cx="6.35" cy="2.75" r="1.35" fill="#1e9bd7"/><g fill="#fff"><circle cx="10.1" cy="1.75" r=".45"/><circle cx="12.1" cy="1.75" r=".45"/><circle cx="14.1" cy="1.75" r=".45"/><circle cx="16.1" cy="1.75" r=".45"/><circle cx="18.1" cy="1.75" r=".45"/><circle cx="20.1" cy="1.75" r=".45"/><circle cx="10.1" cy="3.2" r=".45"/><circle cx="12.1" cy="3.2" r=".45"/><circle cx="14.1" cy="3.2" r=".45"/><circle cx="16.1" cy="3.2" r=".45"/><circle cx="18.1" cy="3.2" r=".45"/><circle cx="20.1" cy="3.2" r=".45"/></g></svg>
}

export function ApplicantDashboard({ language, userName, demoApplications, onNavigate, onCreateApplication }: {
  language: ApplicantLanguage
  userName: string
  demoApplications: DemoApplication[]
  onNavigate: (page: string) => void
  onCreateApplication: () => void
}) {
  const authenticated = Boolean(getAccessToken())
  const [remoteApplications, setRemoteApplications] = useState<ApplicantApplication[] | null>(null)
  const [applicationsLoading, setApplicationsLoading] = useState(authenticated)
  const [applicationsError, setApplicationsError] = useState('')
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const [notificationError, setNotificationError] = useState(false)
  const [learning, setLearning] = useState<LearningState | null>(() => {
    if (getAccessToken()) return null
    try { return JSON.parse(localStorage.getItem('nizolar.demo.applicant.learning') || '{}') as LearningState }
    catch { return {} }
  })
  const [detail, setDetail] = useState<ApplicantApplication | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    if (!authenticated) {
      setApplicationsLoading(false)
      setRemoteApplications(null)
      setUnreadCount(null)
      try { setLearning(JSON.parse(localStorage.getItem('nizolar.demo.applicant.learning') || '{}') as LearningState) }
      catch { setLearning({}) }
      return
    }
    let live = true
    apiGet<ApplicantApplication[]>('/cabinet/mk/applications')
      .then((items) => { if (live) setRemoteApplications(items || []) })
      .catch((cause) => { if (live) setApplicationsError(cause instanceof Error ? cause.message : 'Arizalarni yuklab bo‘lmadi.') })
      .finally(() => { if (live) setApplicationsLoading(false) })
    apiGet<{ unreadCount?: number }>('/cabinet/notifications?page=1&limit=1')
      .then((result) => { if (live && typeof result.unreadCount === 'number') setUnreadCount(result.unreadCount) })
      .catch(() => { if (live) setNotificationError(true) })
    return () => { live = false }
  }, [authenticated])

  const applications = useMemo<ApplicantApplication[]>(() => authenticated
    ? (remoteApplications || [])
    : demoApplications.map((item) => ({ ...item, submittedAt: item.createdAt, applicationNumber: item.id })),
  [authenticated, remoteApplications, demoApplications])
  const currentApplication = applications[0]
  const status = normalizeStatus(currentApplication?.status || '')
  const examCount = applications.reduce((sum, application) => sum + (application.exams?.length || 0), 0)
  const progressUnknown = authenticated && (applicationsLoading || Boolean(applicationsError))
  const stageIndex = progressUnknown ? -1 : getStageIndex(status, learning, authenticated)
  const nextAction = applicationsLoading
    ? { title: applicantText(language, 'Ariza ma’lumotlari yuklanmoqda', 'Загрузка сведений о заявлении'), description: applicantText(language, 'Mavjud arizalar tekshirilgach, keyingi amal ko‘rsatiladi.', 'Следующее действие появится после загрузки заявлений.'), icon: FileClock, page: 'Mediator arizam', action: 'navigate' as const }
    : applicationsError
    ? { title: applicantText(language, 'Ariza holatini tekshiring', 'Проверьте статус заявления'), description: applicantText(language, 'Ariza ma’lumotlari vaqtincha olinmadi. Arizalar sahifasida qayta tekshirib ko‘ring.', 'Не удалось получить сведения о заявлении. Повторите попытку в разделе заявлений.'), icon: FileClock, page: 'Mediator arizam', action: 'navigate' as const }
    : getNextAction(status, Boolean(currentApplication), learning, authenticated, language)
  const NextActionIcon = nextAction.icon
  const stageNames = language === 'ru'
    ? ['Заявление подано', 'Учебные курсы', 'Квалификационный экзамен', 'Квалификационное свидетельство']
    : ['Ariza yuborildi', 'O‘quv kurslari', 'Malaka imtihoni', 'Malaka guvohnomasi']
  const examSchedule = applications.flatMap((application) => application.exams || []).find((exam) => exam.scheduledAt)?.scheduledAt
  const stats: { label: string; value: string; detail: string; icon: typeof Circle; page: string }[] = [
    { label: applicantText(language, 'Mediator arizalari', 'Заявления на статус медиатора'), value: applicationsLoading ? '…' : applicationsError ? '—' : String(applications.length), detail: applicationsError ? applicantText(language, 'Ma’lumot yuklanmadi', 'Данные не загружены') : applicantText(language, 'Yuborilgan arizalar', 'Поданные заявления'), icon: FileCheck2, page: 'Mediator arizam' },
    { label: applicantText(language, 'O‘quv kurslari', 'Учебные курсы'), value: authenticated ? '—' : String(learning?.enrolled?.length || 0), detail: authenticated ? applicantText(language, 'Server ma’lumoti mavjud emas', 'Данные сервера недоступны') : applicantText(language, 'Demo kabinetdagi ro‘yxatdan o‘tishlar', 'Записи на курсы в демо-кабинете'), icon: BookOpen, page: 'O‘quv kurslari' },
    { label: applicantText(language, 'Imtihon bosqichi', 'Экзамены'), value: applicationsLoading ? '…' : applicationsError ? '—' : authenticated ? String(examCount) : learning?.examSubmitted ? '1' : '0', detail: applicationsError ? applicantText(language, 'Ma’lumot yuklanmadi', 'Данные не загружены') : authenticated ? applicantText(language, 'Tayinlangan imtihonlar', 'Назначенные экзамены') : applicantText(language, 'Demo topshirilgan imtihonlar', 'Экзамены в демо-режиме'), icon: GraduationCap, page: 'Malaka imtihoni' },
    { label: applicantText(language, 'Xabarnomalar', 'Уведомления'), value: unreadCount === null ? '—' : String(unreadCount), detail: notificationError ? applicantText(language, 'Ma’lumot yuklanmadi', 'Данные не загружены') : applicantText(language, 'O‘qilmagan xabarlar', 'Непрочитанные сообщения'), icon: Bell, page: 'Xabarnomalar' },
  ]

  const openDetails = async (application: ApplicantApplication) => {
    setDetailError('')
    setDetail(application)
    if (!authenticated) return
    setDetailLoading(true)
    try { setDetail(await apiGet<ApplicantApplication>(`/cabinet/mk/applications/${encodeURIComponent(application.id)}`)) }
    catch (cause) { setDetailError(cause instanceof Error ? cause.message : 'Ariza tafsilotlarini yuklab bo‘lmadi.') }
    finally { setDetailLoading(false) }
  }

  useEffect(() => {
    if (!detail) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setDetail(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [detail])

  return <section>
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-700">{applicantText(language, 'SHAXSIY KABINET · MEDIATOR TALABGORI', 'ЛИЧНЫЙ КАБИНЕТ · КАНДИДАТ В МЕДИАТОРЫ')}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{applicantText(language, 'Xush kelibsiz!', 'Добро пожаловать!')}</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{userName.trim() ? `${userName.trim()}, ` : ''}{applicantText(language, 'mediator bo‘lish yo‘lidagi har bir qadam sizni maqsadingizga yaqinlashtiradi.', 'каждый шаг на пути к статусу медиатора приближает вас к цели.')}</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={onCreateApplication} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"><FileText size={17}/>{applicantText(language, 'Ariza topshirish', 'Подать заявление')}</button><button onClick={() => onNavigate('Mediator arizam')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><FileClock size={17}/>{applicantText(language, 'Arizalarim', 'Мои заявления')}</button></div>
    </div>

    <section aria-labelledby="qualification-progress" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{applicantText(language, 'MALAKA YO‘LI', 'ПУТЬ К КВАЛИФИКАЦИИ')}</p><h2 id="qualification-progress" className="mt-1.5 text-lg font-semibold text-slate-950">{applicantText(language, 'Mediator malakasiga erishish bosqichlari', 'Этапы получения квалификации медиатора')}</h2></div><div className="text-left sm:text-right"><p className="text-xs text-slate-500">{applicantText(language, 'Joriy bosqich', 'Текущий этап')}</p><p className="mt-1 text-sm font-semibold text-slate-900">{progressUnknown ? applicantText(language, 'Ma’lumot aniqlanmagan', 'Данные не определены') : stageIndex === 4 ? applicantText(language, 'Yakunlangan', 'Завершено') : `${stageIndex + 1} / 4 · ${stageNames[stageIndex]}`}</p></div></div>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={applicantText(language, 'Malaka bosqichlari', 'Этапы квалификации')}>{stageNames.map((name, index) => {
        const complete = !progressUnknown && (stageIndex === 4 || (stageIndex >= 0 && index < stageIndex))
        const rejected = status === 'REJECTED' && index === 0
        const current = !progressUnknown && stageIndex === index && !rejected
        return <li key={name} aria-current={current ? 'step' : undefined} className={`relative min-h-[88px] rounded-xl border p-4 ${current ? 'border-emerald-300 bg-emerald-50/70' : complete ? 'border-emerald-100 bg-white' : 'border-slate-200 bg-slate-50/70'}`}>
          <div className="flex items-start gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${complete ? 'bg-emerald-600 text-white' : current ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300' : rejected ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-500'}`}>{complete ? <Check size={16}/> : rejected ? <X size={16}/> : <span className="text-xs font-semibold">{index + 1}</span>}</span><span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{name}</span><span className={`mt-1 block text-xs ${rejected ? 'text-red-700' : complete ? 'text-emerald-700' : current ? 'text-emerald-800' : 'text-slate-500'}`}>{progressUnknown ? applicationsLoading ? applicantText(language, 'Yuklanmoqda…', 'Загрузка…') : applicantText(language, 'Ma’lumot mavjud emas', 'Нет данных') : rejected ? applicantText(language, 'Rad etildi', 'Отклонено') : complete ? applicantText(language, 'Bajarildi', 'Выполнено') : current ? currentStageStatus(status, learning, authenticated, language) : applicantText(language, 'Kutilmoqda', 'Ожидается')}</span>
            {index === 0 && currentApplication?.submittedAt && <time className="mt-1 block text-[11px] text-slate-400" dateTime={currentApplication.submittedAt}>{formatDate(currentApplication.submittedAt, language)}</time>}
            {index === 2 && examSchedule && <time className="mt-1 block text-[11px] text-slate-400" dateTime={examSchedule}>{formatDate(examSchedule, language)}</time>}
          </span></div>
        </li>
      })}</ol>
      {applicationsError && <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{applicationsError}</p>}
      {!authenticated && <p className="mt-4 text-[11px] text-slate-400">{applicantText(language, 'Demo ma’lumotlari ushbu brauzerda saqlanadi. Rasmiy ariza holati tizimga kirgach ko‘rsatiladi.', 'Демо-данные сохраняются в этом браузере. Официальный статус заявления появится после входа в систему.')}</p>}
    </section>

    <section aria-label={applicantText(language, 'Asosiy ko‘rsatkichlar', 'Основные показатели')} className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, detail: caption, icon: Icon, page }) => <button key={label} onClick={() => onNavigate(page)} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:p-5">
      <div className="flex items-start justify-between gap-3"><span><span className="block text-xs font-medium text-slate-500">{label}</span><span className="mt-2 block text-3xl font-semibold tracking-tight text-slate-950">{value}</span></span><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Icon size={19}/></span></div><span className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500"><span>{caption}</span><ChevronRight size={14} className="shrink-0 text-slate-400 group-hover:text-emerald-700"/></span>
    </button>)}</section>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,.8fr)]">
      <section aria-labelledby="applications-title" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="applications-title" className="text-base font-semibold text-slate-950">{applicantText(language, 'Mening arizalarim', 'Мои заявления')}</h2><p className="mt-1 text-xs text-slate-500">{applicantText(language, 'Mediator maqomi uchun yuborilgan arizalar tarixi', 'История заявлений на получение статуса медиатора')}</p></div><button onClick={() => onNavigate('Mediator arizam')} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{applicantText(language, 'Barchasini ko‘rish', 'Посмотреть все')}<ChevronRight size={14}/></button></div>
        {applicationsLoading ? <div className="py-12 text-center text-sm text-slate-500" role="status">{applicantText(language, 'Arizalar yuklanmoqda…', 'Загрузка заявлений…')}</div> : applicationsError ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{applicantText(language, 'Arizalar ro‘yxatini yuklab bo‘lmadi. “Mediator arizam” bo‘limida qayta tekshirishingiz mumkin.', 'Не удалось загрузить заявления. Попробуйте проверить их в разделе «Моё заявление».')}</div> : applications.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm"><FileText size={20}/></span><p className="mt-3 text-sm font-semibold text-slate-800">{applicantText(language, 'Hozircha ariza topilmadi', 'Заявлений пока нет')}</p><p className="mt-1 text-xs text-slate-500">{applicantText(language, 'Mediator maqomiga ariza topshirganingizdan so‘ng u shu yerda ko‘rinadi.', 'Поданное заявление появится здесь.')}</p><button onClick={onCreateApplication} className="mt-4 min-h-10 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-slate-800">{applicantText(language, 'Ariza topshirish', 'Подать заявление')}</button></div> : <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100"><table className="w-full min-w-[680px] border-collapse text-left"><thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-4 py-3">{applicantText(language, 'Ariza raqami', 'Номер заявления')}</th><th scope="col" className="px-4 py-3">{applicantText(language, 'Bosqich', 'Этап')}</th><th scope="col" className="px-4 py-3">{applicantText(language, 'Holati', 'Статус')}</th><th scope="col" className="px-4 py-3">{applicantText(language, 'Yuborilgan sana', 'Дата подачи')}</th><th scope="col" className="px-4 py-3"><span className="sr-only">{applicantText(language, 'Amal', 'Действие')}</span></th></tr></thead><tbody className="divide-y divide-slate-100">{applications.map((application) => <tr key={application.id} className="hover:bg-slate-50/70">
          <td className="px-4 py-3.5"><button onClick={() => void openDetails(application)} className="text-left text-xs font-semibold text-slate-900 hover:text-emerald-800 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{application.applicationNumber || application.id}</button></td>
          <td className="px-4 py-3.5 text-xs text-slate-600">{statusStage(application.status, language)}</td>
          <td className="px-4 py-3.5"><StatusBadge status={application.status} language={language}/></td>
          <td className="px-4 py-3.5 text-xs text-slate-500">{application.submittedAt || application.createdAt ? formatDate(application.submittedAt || application.createdAt, language) : '—'}</td>
          <td className="px-4 py-3.5 text-right"><button onClick={() => void openDetails(application)} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{applicantText(language, 'Tafsilotlar', 'Подробнее')}</button></td>
        </tr>)}</tbody></table></div>}
      </section>

      <section aria-labelledby="next-action-title" className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-300">{applicantText(language, 'NAVBATDAGI QADAM', 'СЛЕДУЮЩИЙ ШАГ')}</p><h2 id="next-action-title" className="mt-2 text-lg font-semibold">{applicantText(language, 'Keyingi bajariladigan vazifa', 'Следующее действие')}</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-emerald-300"><NextActionIcon size={19}/></span></div>
        <p className="mt-5 text-base font-semibold">{nextAction.title}</p><p className="mt-2 text-sm leading-6 text-slate-300">{nextAction.description}</p>
        <button onClick={nextAction.action === 'create' ? onCreateApplication : () => onNavigate(nextAction.page)} className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-300 px-4 text-sm font-semibold text-slate-950 hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">{applicantText(language, 'Batafsil', 'Подробнее')}<ChevronRight size={16}/></button>
      </section>
    </div>

    {detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="application-detail-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">{applicantText(language, 'Mediator talabgori arizasi', 'Заявление кандидата в медиаторы')}</p><h2 id="application-detail-title" className="mt-1 text-lg font-semibold text-slate-950">{detail.applicationNumber || detail.id}</h2></div><button onClick={() => setDetail(null)} aria-label={applicantText(language, 'Tafsilotlarni yopish', 'Закрыть подробности')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><X size={18}/></button></div>
        <div className="space-y-4 p-5 sm:p-6">{detailLoading && <p role="status" className="text-sm text-slate-500">{applicantText(language, 'Ariza tafsilotlari yuklanmoqda…', 'Загрузка сведений о заявлении…')}</p>}{detailError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{detailError}</p>}
          <div className="flex flex-wrap items-center gap-3"><StatusBadge status={detail.status} language={language}/><span className="text-xs text-slate-500">{statusStage(detail.status, language)}</span></div>
          <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><DetailField label={applicantText(language, 'Yuborilgan sana', 'Дата подачи')} value={formatDate(detail.submittedAt || detail.createdAt, language)}/><DetailField label={applicantText(language, 'Telefon', 'Телефон')} value={detail.phone || applicantText(language, 'Ko‘rsatilmagan', 'Не указано')}/><DetailField label={applicantText(language, 'Elektron pochta', 'Электронная почта')} value={detail.email || applicantText(language, 'Ko‘rsatilmagan', 'Не указано')}/><DetailField label={applicantText(language, 'Mutaxassislik', 'Специальность')} value={detail.profession || applicantText(language, 'Ko‘rsatilmagan', 'Не указано')}/></dl>
          {detail.rejectionReason && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong>{applicantText(language, 'Rad etish sababi:', 'Причина отказа:')}</strong> {detail.rejectionReason}</p>}
          {detail.autoCheckResult?.status && <p className="text-sm text-slate-600">{applicantText(language, 'Davlat reyestri tekshiruvi:', 'Проверка государственных реестров:')} <strong>{detail.autoCheckResult.status}</strong></p>}
          {detail.exams?.length ? <div><h3 className="text-sm font-semibold text-slate-900">{applicantText(language, 'Imtihonlar', 'Экзамены')}</h3><div className="mt-2 space-y-2">{detail.exams.map((exam) => <article key={exam.id} className="rounded-xl border border-slate-200 p-3"><p className="text-sm font-medium">{exam.scheduledAt ? formatDate(exam.scheduledAt, language) : applicantText(language, 'Sana belgilanmagan', 'Дата не назначена')}</p><p className="mt-1 text-xs text-slate-500">{exam.venue || applicantText(language, 'Manzil belgilanmagan', 'Место не указано')}{exam.status ? ` · ${statusLabel(exam.status, language)}` : ''}</p></article>)}</div></div> : null}
          {detail.detail && <p className="text-sm leading-6 text-slate-600">{detail.detail}</p>}
        </div>
      </section>
    </div>}
  </section>
}

function DetailField({ label, value }: { label: string; value: string }) { return <div><dt className="text-[11px] text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{value}</dd></div> }

function StatusBadge({ status, language }: { status: string; language: ApplicantLanguage }) {
  const normalized = normalizeStatus(status)
  const tone = normalized === 'REJECTED' || normalized === 'FAILED' || /rad etildi|o‘tmadi/i.test(status) ? 'bg-red-50 text-red-700 ring-red-100'
    : ['PASSED', 'REGISTERED'].includes(normalized) || /bajarildi|ro‘yxatga kiritildi|o‘tdi/i.test(status) ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
      : ['ACCEPTED', 'INVITED', 'CHECKING', 'EXAM_REVIEW'].includes(normalized) || /jarayon|ko‘rib chiqil/i.test(status) ? 'bg-amber-50 text-amber-800 ring-amber-100'
        : 'bg-slate-100 text-slate-700 ring-slate-200'
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${tone}`}>{statusLabel(normalized, language)}</span>
}

function getStageIndex(status: string, learning: LearningState | null, authenticated: boolean) {
  if (status === 'REGISTERED') return 4
  if (status === 'PASSED') return 3
  if (status === 'INVITED' || status === 'FAILED' || status === 'EXAM_REVIEW') return 2
  if (status === 'ACCEPTED') return !authenticated && (learning?.attended?.length || 0) > 0 ? 2 : 1
  if (status === 'SUBMITTED' || status === 'CHECKING' || status === 'REJECTED') return 0
  if (!authenticated && learning?.examSubmitted) return 3
  if (!authenticated && (learning?.attended?.length || 0) > 0) return 2
  if (!authenticated && (learning?.enrolled?.length || 0) > 0) return 1
  return 0
}

function currentStageStatus(status: string, learning: LearningState | null, authenticated: boolean, language: ApplicantLanguage) {
  if (status === 'REJECTED') return applicantText(language, 'Ariza bo‘yicha qarorni ko‘rib chiqing', 'Ознакомьтесь с решением по заявлению')
  if (!authenticated && learning?.examSubmitted && !status) return applicantText(language, 'Demo imtihoni topshirilgan', 'Демо-экзамен сдан')
  if (!authenticated && learning?.attended?.length && !status) return applicantText(language, 'Kurs ishtiroki qayd etilgan', 'Участие в курсе отмечено')
  if (status === 'SUBMITTED') return applicantText(language, 'Ko‘rib chiqish kutilmoqda', 'Ожидает рассмотрения')
  if (status === 'CHECKING') return applicantText(language, 'Ko‘rib chiqilmoqda', 'На рассмотрении')
  if (status === 'ACCEPTED') return applicantText(language, 'O‘qishni davom ettiring', 'Продолжите обучение')
  if (status === 'INVITED') return applicantText(language, 'Imtihonga taklif yuborilgan', 'Приглашение на экзамен отправлено')
  if (status === 'FAILED') return applicantText(language, 'Imtihon natijasini ko‘rib chiqing', 'Ознакомьтесь с результатом экзамена')
  if (status === 'EXAM_REVIEW') return applicantText(language, 'Komissiya bahosi kutilmoqda', 'Ожидается оценка комиссии')
  if (status === 'PASSED') return applicantText(language, 'Komissiya qarori kutilmoqda', 'Ожидается решение комиссии')
  if (status === 'REGISTERED') return applicantText(language, 'Bajarildi', 'Выполнено')
  return applicantText(language, 'Boshlash uchun tanlang', 'Выберите, чтобы начать')
}

function getNextAction(status: string, hasApplication: boolean, learning: LearningState | null, authenticated: boolean, language: ApplicantLanguage) {
  if (!hasApplication && (authenticated || !learning?.examSubmitted)) return { title: applicantText(language, 'Mediator bo‘lish uchun ariza yuboring', 'Подайте заявление на получение статуса медиатора'), description: applicantText(language, 'Ariza va talab qilinadigan hujjatlarni yuborib, malaka yo‘lini boshlang.', 'Подайте заявление и необходимые документы, чтобы начать путь к квалификации.'), icon: FileText, page: 'Mediator arizam', action: 'create' as const }
  if (status === 'REJECTED') return { title: applicantText(language, 'Ariza bo‘yicha qaror bilan tanishing', 'Ознакомьтесь с решением по заявлению'), description: applicantText(language, 'Ariza tafsilotlarini ochib, rad etish sababi va keyingi yo‘l-yo‘riqni ko‘ring.', 'Откройте сведения о заявлении, чтобы узнать причину отказа и дальнейшие рекомендации.'), icon: FileClock, page: 'Mediator arizam', action: 'navigate' as const }
  if (status === 'SUBMITTED' || status === 'CHECKING') return { title: applicantText(language, 'Ariza holatini kuzating', 'Проверьте статус заявления'), description: applicantText(language, 'Ariza ko‘rib chiqilmoqda. Tafsilotlar sahifasida yuborilgan ma’lumotlar holatini tekshiring.', 'Заявление рассматривается. Проверьте его статус и сведения в разделе подробностей.'), icon: FileClock, page: 'Mediator arizam', action: 'navigate' as const }
  if (status === 'ACCEPTED' || (!authenticated && (learning?.enrolled?.length || 0) > 0 && !(learning?.attended?.length || 0))) return { title: applicantText(language, 'O‘quv kurslarida ishtirok eting', 'Пройдите учебные курсы'), description: applicantText(language, 'Kurs va vebinarlarni ko‘rib, mavjud malaka oshirish bosqichini davom ettiring.', 'Откройте курсы и вебинары, чтобы продолжить повышение квалификации.'), icon: BookOpen, page: 'O‘quv kurslari', action: 'navigate' as const }
  if (status === 'FAILED') return { title: applicantText(language, 'Imtihon natijasini ko‘rib chiqing', 'Ознакомьтесь с результатом экзамена'), description: applicantText(language, 'Imtihon bo‘limida natija va mavjud ko‘rsatmalar bilan tanishing.', 'Проверьте результат экзамена и доступные рекомендации.'), icon: GraduationCap, page: 'Malaka imtihoni', action: 'navigate' as const }
  if (status === 'EXAM_REVIEW') return { title: applicantText(language, 'Imtihon natijalarini tekshiring', 'Проверьте результаты экзамена'), description: applicantText(language, 'Imtihon topshirilgach, yakuniy baho va komissiya qarori mavjud bo‘lganda shu bo‘limda ko‘rinadi.', 'Итоговая оценка и решение комиссии появятся в этом разделе после проверки экзамена.'), icon: GraduationCap, page: 'Malaka imtihoni', action: 'navigate' as const }
  if (status === 'INVITED' || (!authenticated && (learning?.attended?.length || 0) > 0 && !learning?.examSubmitted)) return { title: applicantText(language, 'Malaka imtihoni ma’lumotlarini tekshiring', 'Проверьте сведения о квалификационном экзамене'), description: applicantText(language, 'Imtihon topshirish bo‘limida mavjud savollar yoki tayinlangan imtihon ma’lumotlarini ko‘ring.', 'Откройте раздел экзамена, чтобы посмотреть вопросы или сведения о назначенном экзамене.'), icon: GraduationCap, page: 'Malaka imtihoni', action: 'navigate' as const }
  if (status === 'PASSED' || status === 'REGISTERED' || (!authenticated && learning?.examSubmitted)) return { title: applicantText(language, 'Malaka guvohnomasi holatini ko‘ring', 'Проверьте статус квалификационного свидетельства'), description: applicantText(language, 'Komissiya qarori va QR-kodli guvohnoma mavjud bo‘lsa, u shu bo‘limda ko‘rinadi.', 'Решение комиссии и QR-свидетельство будут доступны в этом разделе.'), icon: QrCode, page: 'Malaka guvohnomasi', action: 'navigate' as const }
  return { title: applicantText(language, 'Arizangiz holatini ko‘ring', 'Проверьте статус заявления'), description: applicantText(language, 'Ariza va malaka bosqichlari bo‘yicha mavjud ma’lumotlarni oching.', 'Откройте сведения о заявлении и этапах квалификации.'), icon: FileCheck2, page: 'Mediator arizam', action: 'navigate' as const }
}

function statusStage(status: string, language: ApplicantLanguage) {
  const value = normalizeStatus(status)
  if (value === 'REGISTERED') return applicantText(language, 'Mediatorlar reyestri', 'Реестр медиаторов')
  if (value === 'PASSED') return applicantText(language, 'Malaka guvohnomasi', 'Квалификационное свидетельство')
  if (value === 'INVITED' || value === 'EXAM_REVIEW' || value === 'FAILED') return applicantText(language, 'Malaka imtihoni', 'Квалификационный экзамен')
  if (value === 'ACCEPTED') return applicantText(language, 'O‘quv kurslari', 'Учебные курсы')
  if (value === 'REJECTED' || value === 'SUBMITTED' || value === 'CHECKING') return applicantText(language, 'Arizani ko‘rib chiqish', 'Рассмотрение заявления')
  return applicantText(language, 'Mediator maqomiga ariza', 'Заявление на статус медиатора')
}

function statusLabel(status: string, language: ApplicantLanguage) {
  if (language === 'ru') {
    const labels: Record<string, string> = {
      SUBMITTED: 'Ожидает рассмотрения', CHECKING: 'На рассмотрении', ACCEPTED: 'Принято', REJECTED: 'Отклонено',
      INVITED: 'Приглашение на экзамен', EXAM_REVIEW: 'Ожидается результат', PASSED: 'Экзамен сдан', FAILED: 'Экзамен не сдан', REGISTERED: 'Внесён в реестр',
    }
    return labels[status.toUpperCase()] || status || 'Статус не указан'
  }
  const labels: Record<string, string> = {
    SUBMITTED: 'Kutilmoqda', CHECKING: 'Jarayonda', ACCEPTED: 'Qabul qilindi', REJECTED: 'Rad etildi',
    INVITED: 'Imtihonga taklif', EXAM_REVIEW: 'Natija kutilmoqda', PASSED: 'Imtihondan o‘tdi', FAILED: 'Imtihondan o‘tmadi', REGISTERED: 'Reyestrga kiritildi',
  }
  return labels[status.toUpperCase()] || status || 'Holat mavjud emas'
}

function normalizeStatus(status: string) {
  const value = status.trim().toLocaleLowerCase('uz').replace(/[’‘`]/g, "'")
  if (['submitted', 'yangi yuborildi', 'yangi yuborilgan'].includes(value)) return 'SUBMITTED'
  if (['checking', 'ko\'rib chiqilmoqda', 'tekshiruvda'].includes(value)) return 'CHECKING'
  if (['accepted', 'qabul qilindi'].includes(value)) return 'ACCEPTED'
  if (['rejected', 'rad etildi'].includes(value)) return 'REJECTED'
  if (['invited', 'imtihonga chaqirildi', 'imtihonga ruxsat', 'to\'lov kutilmoqda'].includes(value)) return 'INVITED'
  if (['exam_submitted', 'imtihon topshirildi', 'komissiya bahosi'].includes(value)) return 'EXAM_REVIEW'
  if (['passed', 'imtihondan o\'tdi'].includes(value)) return 'PASSED'
  if (['failed', 'imtihondan o\'tmadi'].includes(value)) return 'FAILED'
  if (['registered', 'reyestrga kiritildi'].includes(value)) return 'REGISTERED'
  return status.toUpperCase()
}

function formatDate(value?: string | null, language: ApplicantLanguage = 'uz') {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'uz-UZ', { dateStyle: 'medium' }).format(date)
}
