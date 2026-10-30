import { useEffect, useMemo, useState } from 'react'
import {
  Bell, BookOpen, Check, ChevronDown, ChevronRight, Circle,
  ClipboardCheck, FileCheck2, FileClock, FileText, GraduationCap, Handshake,
  LogIn, Menu, QrCode, X,
} from 'lucide-react'
import { apiGet, getAccessToken } from './api'

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

export function ApplicantSidebar({ activePage, mobileOpen, onNavigate, onClose, onPublic, onSignOut }: {
  activePage: string
  mobileOpen: boolean
  onNavigate: (page: string) => void
  onClose: () => void
  onPublic: () => void
  onSignOut: () => void
}) {
  return <>
    {mobileOpen && <button aria-label="Menyuni yopish" onClick={onClose} className="fixed inset-0 z-20 bg-slate-950/45 md:hidden"/>}
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[264px] flex-col bg-slate-950 text-white transition-transform duration-200 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 px-5 py-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-300 text-slate-950"><Handshake size={22}/></span>
        <span className="min-w-0"><span className="block text-sm font-semibold">Nizolarni hal etish</span><span className="mt-1 block text-[10px] uppercase tracking-[.18em] text-slate-400">Elektron platforma</span></span>
        <button onClick={onClose} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-white/10 md:hidden" aria-label="Menyuni yopish"><X size={18}/></button>
      </div>
      <div className="mx-5 border-t border-white/10"/>
      <div className="mx-4 mt-5 rounded-xl bg-white/[.06] p-3">
        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400"/><span className="text-xs text-slate-300">Mediator talabgori kabineti</span></div>
        <p className="mt-2 text-sm font-semibold">Malaka yo‘li</p>
        <p className="mt-1 text-[11px] leading-4 text-slate-400">Ariza, kurs, imtihon va guvohnoma</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Mediator talabgori bo‘limlari">
        {applicantGroups.map((group) => <div className="mb-5" key={group.title}>
          <p className="mb-2 px-3 text-[10px] font-semibold tracking-[.16em] text-slate-500">{group.title}</p>
          <div className="space-y-1">{group.items.map(({ label, icon: Icon }) => {
            const active = activePage === label
            return <button key={label} onClick={() => { onNavigate(label); onClose() }} aria-current={active ? 'page' : undefined} className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${active ? 'bg-emerald-300/15 text-emerald-200 shadow-[inset_3px_0_0_#6ee7b7]' : 'text-slate-400 hover:bg-white/[.06] hover:text-white'}`}><Icon size={17}/><span>{label}</span>{active && <ChevronRight className="ml-auto" size={14}/>}</button>
          })}</div>
        </div>)}
      </nav>
      <div className="border-t border-white/10 p-4">
        <button onClick={onPublic} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"><ChevronRight className="rotate-180" size={17}/>Ochiq sahifaga qaytish</button>
        <button onClick={onSignOut} className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/[.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"><LogIn size={17}/>Kabinetdan chiqish</button>
      </div>
    </aside>
  </>
}

export function ApplicantHeader({ activePage, userName, assignedRoles, onNavigate, onSignOut, onSwitchRole, onOpenMenu }: {
  activePage: string
  userName: string
  assignedRoles: { key: string; label: string }[]
  onNavigate: (page: string) => void
  onSignOut: () => void
  onSwitchRole: (key: string) => void
  onOpenMenu: () => void
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const displayName = userName.trim() || 'Foydalanuvchi'
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('uz') || 'M'
  return <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
    <div className="flex min-w-0 items-center gap-3">
      <button onClick={onOpenMenu} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:hidden" aria-label="Menyuni ochish"><Menu size={20}/></button>
      <button onClick={() => onNavigate('Umumiy ko‘rsatkich')} className="flex min-w-0 items-center gap-2.5 text-left">
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 sm:flex"><Handshake size={21}/></span>
        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">Nizolarni hal etish</span><span className="hidden text-[10px] uppercase tracking-[.15em] text-slate-400 sm:block">Elektron platforma</span></span>
      </button>
      <span className="hidden h-8 w-px bg-slate-200 lg:block"/>
      <div className="hidden min-w-0 lg:block"><p className="truncate text-xs font-medium text-slate-700">{activePage}</p><p className="text-[11px] text-slate-400">Mediator talabgori</p></div>
    </div>
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <button onClick={() => onNavigate('Xabarnomalar')} aria-label="Xabarnomalar" title="Xabarnomalar" className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><Bell size={18}/></button>
      <span className="hidden h-8 w-px bg-slate-200 sm:block"/>
      {!getAccessToken() && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">Demo</span>}
      <div className="relative">
        <button aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)} className="flex min-h-10 items-center gap-2 rounded-xl px-1.5 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:gap-2.5 sm:px-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">{initials}</span>
          <span className="hidden min-w-0 sm:block"><span className="block max-w-40 truncate text-xs font-semibold text-slate-800">{displayName}</span><span className="block text-[11px] text-slate-500">Mediator talabgori</span></span>
          <ChevronDown size={15} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`}/>
        </button>
        {profileOpen && <>
          <button aria-label="Menyuni yopish" className="fixed inset-0 z-30 cursor-default" onClick={() => setProfileOpen(false)}/>
          <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
            <div className="border-b border-slate-100 px-3 py-2"><p className="truncate text-sm font-semibold text-slate-900">{displayName}</p><p className="mt-0.5 text-xs text-slate-500">Mediator talabgori</p></div>
            <button role="menuitem" onClick={() => { onNavigate('Mediator arizam'); setProfileOpen(false) }} className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-slate-700 hover:bg-slate-50"><FileText size={16}/>Ariza va profil ma’lumotlari</button>
            {assignedRoles.length > 1 && <label className="block px-3 py-2 text-xs text-slate-500">Boshqa kabinet<select value="APPLICANT" onChange={(event) => { onSwitchRole(event.target.value); setProfileOpen(false) }} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">{assignedRoles.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>}
            <button role="menuitem" onClick={() => { setProfileOpen(false); onSignOut() }} className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-slate-700 hover:bg-slate-50"><LogIn size={16}/>Kabinetdan chiqish</button>
          </div>
        </>}
      </div>
    </div>
  </header>
}

export function ApplicantDashboard({ userName, demoApplications, onNavigate, onCreateApplication }: {
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
    ? { title: 'Ariza ma’lumotlari yuklanmoqda', description: 'Mavjud arizalar tekshirilgach, keyingi amal ko‘rsatiladi.', icon: FileClock, page: 'Mediator arizam', action: 'navigate' as const }
    : applicationsError
    ? { title: 'Ariza holatini tekshiring', description: 'Ariza ma’lumotlari vaqtincha olinmadi. Arizalar sahifasida qayta tekshirib ko‘ring.', icon: FileClock, page: 'Mediator arizam', action: 'navigate' as const }
    : getNextAction(status, Boolean(currentApplication), learning, authenticated)
  const NextActionIcon = nextAction.icon
  const stageNames = ['Ariza yuborildi', 'O‘quv kurslari', 'Malaka imtihoni', 'Malaka guvohnomasi']
  const examSchedule = applications.flatMap((application) => application.exams || []).find((exam) => exam.scheduledAt)?.scheduledAt
  const stats: { label: string; value: string; detail: string; icon: typeof Circle; page: string }[] = [
    { label: 'Mediator arizalari', value: applicationsLoading ? '…' : applicationsError ? '—' : String(applications.length), detail: applicationsError ? 'Ma’lumot yuklanmadi' : 'Yuborilgan arizalar', icon: FileCheck2, page: 'Mediator arizam' },
    { label: 'O‘quv kurslari', value: authenticated ? '—' : String(learning?.enrolled?.length || 0), detail: authenticated ? 'Server ma’lumoti mavjud emas' : 'Demo kabinetdagi ro‘yxatdan o‘tishlar', icon: BookOpen, page: 'O‘quv kurslari' },
    { label: 'Imtihon bosqichi', value: applicationsLoading ? '…' : applicationsError ? '—' : authenticated ? String(examCount) : learning?.examSubmitted ? '1' : '0', detail: applicationsError ? 'Ma’lumot yuklanmadi' : authenticated ? 'Tayinlangan imtihonlar' : 'Demo topshirilgan imtihonlar', icon: GraduationCap, page: 'Malaka imtihoni' },
    { label: 'Xabarnomalar', value: unreadCount === null ? '—' : String(unreadCount), detail: notificationError ? 'Ma’lumot yuklanmadi' : unreadCount === null ? 'O‘qilmagan xabarlar' : 'O‘qilmagan xabarlar', icon: Bell, page: 'Xabarnomalar' },
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
      <div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-700">SHAXSIY KABINET · MEDIATOR TALABGORI</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Xush kelibsiz!</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{userName.trim() ? `${userName.trim()}, ` : ''}mediator bo‘lish yo‘lidagi har bir qadam sizni maqsadingizga yaqinlashtiradi.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={onCreateApplication} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"><FileText size={17}/>Ariza topshirish</button><button onClick={() => onNavigate('Mediator arizam')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><FileClock size={17}/>Arizalarim</button></div>
    </div>

    <section aria-labelledby="qualification-progress" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">MALAKA YO‘LI</p><h2 id="qualification-progress" className="mt-1.5 text-lg font-semibold text-slate-950">Mediator malakasiga erishish bosqichlari</h2></div><div className="text-left sm:text-right"><p className="text-xs text-slate-500">Joriy bosqich</p><p className="mt-1 text-sm font-semibold text-slate-900">{progressUnknown ? 'Ma’lumot aniqlanmagan' : stageIndex === 4 ? 'Yakunlangan' : `${stageIndex + 1} / 4 · ${stageNames[stageIndex]}`}</p></div></div>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Malaka bosqichlari">{stageNames.map((name, index) => {
        const complete = !progressUnknown && (stageIndex === 4 || (stageIndex >= 0 && index < stageIndex))
        const rejected = status === 'REJECTED' && index === 0
        const current = !progressUnknown && stageIndex === index && !rejected
        return <li key={name} aria-current={current ? 'step' : undefined} className={`relative min-h-[88px] rounded-xl border p-4 ${current ? 'border-emerald-300 bg-emerald-50/70' : complete ? 'border-emerald-100 bg-white' : 'border-slate-200 bg-slate-50/70'}`}>
          <div className="flex items-start gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${complete ? 'bg-emerald-600 text-white' : current ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300' : rejected ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-500'}`}>{complete ? <Check size={16}/> : rejected ? <X size={16}/> : <span className="text-xs font-semibold">{index + 1}</span>}</span><span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{name}</span><span className={`mt-1 block text-xs ${rejected ? 'text-red-700' : complete ? 'text-emerald-700' : current ? 'text-emerald-800' : 'text-slate-500'}`}>{progressUnknown ? applicationsLoading ? 'Yuklanmoqda…' : 'Ma’lumot mavjud emas' : rejected ? 'Rad etildi' : complete ? 'Bajarildi' : current ? currentStageStatus(status, learning, authenticated) : 'Kutilmoqda'}</span>
            {index === 0 && currentApplication?.submittedAt && <time className="mt-1 block text-[11px] text-slate-400" dateTime={currentApplication.submittedAt}>{formatDate(currentApplication.submittedAt)}</time>}
            {index === 2 && examSchedule && <time className="mt-1 block text-[11px] text-slate-400" dateTime={examSchedule}>{formatDate(examSchedule)}</time>}
          </span></div>
        </li>
      })}</ol>
      {applicationsError && <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{applicationsError}</p>}
      {!authenticated && <p className="mt-4 text-[11px] text-slate-400">Demo ma’lumotlari ushbu brauzerda saqlanadi. Rasmiy ariza holati tizimga kirgach ko‘rsatiladi.</p>}
    </section>

    <section aria-label="Asosiy ko‘rsatkichlar" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, detail: caption, icon: Icon, page }) => <button key={label} onClick={() => onNavigate(page)} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:p-5">
      <div className="flex items-start justify-between gap-3"><span><span className="block text-xs font-medium text-slate-500">{label}</span><span className="mt-2 block text-3xl font-semibold tracking-tight text-slate-950">{value}</span></span><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Icon size={19}/></span></div><span className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500"><span>{caption}</span><ChevronRight size={14} className="shrink-0 text-slate-400 group-hover:text-emerald-700"/></span>
    </button>)}</section>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,.8fr)]">
      <section aria-labelledby="applications-title" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="applications-title" className="text-base font-semibold text-slate-950">Mening arizalarim</h2><p className="mt-1 text-xs text-slate-500">Mediator maqomi uchun yuborilgan arizalar tarixi</p></div><button onClick={() => onNavigate('Mediator arizam')} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Barchasini ko‘rish<ChevronRight size={14}/></button></div>
        {applicationsLoading ? <div className="py-12 text-center text-sm text-slate-500" role="status">Arizalar yuklanmoqda…</div> : applicationsError ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Arizalar ro‘yxatini yuklab bo‘lmadi. “Mediator arizam” bo‘limida qayta tekshirishingiz mumkin.</div> : applications.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm"><FileText size={20}/></span><p className="mt-3 text-sm font-semibold text-slate-800">Hozircha ariza topilmadi</p><p className="mt-1 text-xs text-slate-500">Mediator maqomiga ariza topshirganingizdan so‘ng u shu yerda ko‘rinadi.</p><button onClick={onCreateApplication} className="mt-4 min-h-10 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-slate-800">Ariza topshirish</button></div> : <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100"><table className="w-full min-w-[680px] border-collapse text-left"><thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-4 py-3">Ariza raqami</th><th scope="col" className="px-4 py-3">Bosqich</th><th scope="col" className="px-4 py-3">Holati</th><th scope="col" className="px-4 py-3">Yuborilgan sana</th><th scope="col" className="px-4 py-3"><span className="sr-only">Amal</span></th></tr></thead><tbody className="divide-y divide-slate-100">{applications.map((application) => <tr key={application.id} className="hover:bg-slate-50/70">
          <td className="px-4 py-3.5"><button onClick={() => void openDetails(application)} className="text-left text-xs font-semibold text-slate-900 hover:text-emerald-800 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{application.applicationNumber || application.id}</button></td>
          <td className="px-4 py-3.5 text-xs text-slate-600">{statusStage(application.status)}</td>
          <td className="px-4 py-3.5"><StatusBadge status={application.status}/></td>
          <td className="px-4 py-3.5 text-xs text-slate-500">{application.submittedAt || application.createdAt ? formatDate(application.submittedAt || application.createdAt) : '—'}</td>
          <td className="px-4 py-3.5 text-right"><button onClick={() => void openDetails(application)} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Tafsilotlar</button></td>
        </tr>)}</tbody></table></div>}
      </section>

      <section aria-labelledby="next-action-title" className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-300">NAVBATDAGI QADAM</p><h2 id="next-action-title" className="mt-2 text-lg font-semibold">Keyingi bajariladigan vazifa</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-emerald-300"><NextActionIcon size={19}/></span></div>
        <p className="mt-5 text-base font-semibold">{nextAction.title}</p><p className="mt-2 text-sm leading-6 text-slate-300">{nextAction.description}</p>
        <button onClick={nextAction.action === 'create' ? onCreateApplication : () => onNavigate(nextAction.page)} className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-300 px-4 text-sm font-semibold text-slate-950 hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">Batafsil<ChevronRight size={16}/></button>
      </section>
    </div>

    {detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="application-detail-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Mediator talabgori arizasi</p><h2 id="application-detail-title" className="mt-1 text-lg font-semibold text-slate-950">{detail.applicationNumber || detail.id}</h2></div><button onClick={() => setDetail(null)} aria-label="Tafsilotlarni yopish" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><X size={18}/></button></div>
        <div className="space-y-4 p-5 sm:p-6">{detailLoading && <p role="status" className="text-sm text-slate-500">Ariza tafsilotlari yuklanmoqda…</p>}{detailError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{detailError}</p>}
          <div className="flex flex-wrap items-center gap-3"><StatusBadge status={detail.status}/><span className="text-xs text-slate-500">{statusStage(detail.status)}</span></div>
          <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><DetailField label="Yuborilgan sana" value={formatDate(detail.submittedAt || detail.createdAt)}/><DetailField label="Telefon" value={detail.phone || 'Ko‘rsatilmagan'}/><DetailField label="Elektron pochta" value={detail.email || 'Ko‘rsatilmagan'}/><DetailField label="Mutaxassislik" value={detail.profession || 'Ko‘rsatilmagan'}/></dl>
          {detail.rejectionReason && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong>Rad etish sababi:</strong> {detail.rejectionReason}</p>}
          {detail.autoCheckResult?.status && <p className="text-sm text-slate-600">Davlat reyestri tekshiruvi: <strong>{detail.autoCheckResult.status}</strong></p>}
          {detail.exams?.length ? <div><h3 className="text-sm font-semibold text-slate-900">Imtihonlar</h3><div className="mt-2 space-y-2">{detail.exams.map((exam) => <article key={exam.id} className="rounded-xl border border-slate-200 p-3"><p className="text-sm font-medium">{exam.scheduledAt ? formatDate(exam.scheduledAt) : 'Sana belgilanmagan'}</p><p className="mt-1 text-xs text-slate-500">{exam.venue || 'Manzil belgilanmagan'}{exam.status ? ` · ${statusLabel(exam.status)}` : ''}</p></article>)}</div></div> : null}
          {detail.detail && <p className="text-sm leading-6 text-slate-600">{detail.detail}</p>}
        </div>
      </section>
    </div>}
  </section>
}

function DetailField({ label, value }: { label: string; value: string }) { return <div><dt className="text-[11px] text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{value}</dd></div> }

function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status)
  const tone = normalized === 'REJECTED' || normalized === 'FAILED' || /rad etildi|o‘tmadi/i.test(status) ? 'bg-red-50 text-red-700 ring-red-100'
    : ['PASSED', 'REGISTERED'].includes(normalized) || /bajarildi|ro‘yxatga kiritildi|o‘tdi/i.test(status) ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
      : ['ACCEPTED', 'INVITED', 'CHECKING', 'EXAM_REVIEW'].includes(normalized) || /jarayon|ko‘rib chiqil/i.test(status) ? 'bg-amber-50 text-amber-800 ring-amber-100'
        : 'bg-slate-100 text-slate-700 ring-slate-200'
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${tone}`}>{statusLabel(normalized)}</span>
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

function currentStageStatus(status: string, learning: LearningState | null, authenticated: boolean) {
  if (status === 'REJECTED') return 'Ariza bo‘yicha qarorni ko‘rib chiqing'
  if (!authenticated && learning?.examSubmitted && !status) return 'Demo imtihoni topshirilgan'
  if (!authenticated && learning?.attended?.length && !status) return 'Kurs ishtiroki qayd etilgan'
  if (status === 'SUBMITTED') return 'Ko‘rib chiqish kutilmoqda'
  if (status === 'CHECKING') return 'Ko‘rib chiqilmoqda'
  if (status === 'ACCEPTED') return 'O‘qishni davom ettiring'
  if (status === 'INVITED') return 'Imtihonga taklif yuborilgan'
  if (status === 'FAILED') return 'Imtihon natijasini ko‘rib chiqing'
  if (status === 'EXAM_REVIEW') return 'Komissiya bahosi kutilmoqda'
  if (status === 'PASSED') return 'Komissiya qarori kutilmoqda'
  if (status === 'REGISTERED') return 'Bajarildi'
  return 'Boshlash uchun tanlang'
}

function getNextAction(status: string, hasApplication: boolean, learning: LearningState | null, authenticated: boolean) {
  if (!hasApplication && (authenticated || !learning?.examSubmitted)) return { title: 'Mediator bo‘lish uchun ariza yuboring', description: 'Ariza va talab qilinadigan hujjatlarni yuborib, malaka yo‘lini boshlang.', icon: FileText, page: 'Mediator arizam', action: 'create' as const }
  if (status === 'REJECTED') return { title: 'Ariza bo‘yicha qaror bilan tanishing', description: 'Ariza tafsilotlarini ochib, rad etish sababi va keyingi yo‘l-yo‘riqni ko‘ring.', icon: FileClock, page: 'Mediator arizam', action: 'navigate' as const }
  if (status === 'SUBMITTED' || status === 'CHECKING') return { title: 'Ariza holatini kuzating', description: 'Ariza ko‘rib chiqilmoqda. Tafsilotlar sahifasida yuborilgan ma’lumotlar holatini tekshiring.', icon: FileClock, page: 'Mediator arizam', action: 'navigate' as const }
  if (status === 'ACCEPTED' || (!authenticated && (learning?.enrolled?.length || 0) > 0 && !(learning?.attended?.length || 0))) return { title: 'O‘quv kurslarida ishtirok eting', description: 'Kurs va vebinarlarni ko‘rib, mavjud malaka oshirish bosqichini davom ettiring.', icon: BookOpen, page: 'O‘quv kurslari', action: 'navigate' as const }
  if (status === 'FAILED') return { title: 'Imtihon natijasini ko‘rib chiqing', description: 'Imtihon bo‘limida natija va mavjud ko‘rsatmalar bilan tanishing.', icon: GraduationCap, page: 'Malaka imtihoni', action: 'navigate' as const }
  if (status === 'EXAM_REVIEW') return { title: 'Imtihon natijalarini tekshiring', description: 'Imtihon topshirilgach, yakuniy baho va komissiya qarori mavjud bo‘lganda shu bo‘limda ko‘rinadi.', icon: GraduationCap, page: 'Malaka imtihoni', action: 'navigate' as const }
  if (status === 'INVITED' || (!authenticated && (learning?.attended?.length || 0) > 0 && !learning?.examSubmitted)) return { title: 'Malaka imtihoni ma’lumotlarini tekshiring', description: 'Imtihon topshirish bo‘limida mavjud savollar yoki tayinlangan imtihon ma’lumotlarini ko‘ring.', icon: GraduationCap, page: 'Malaka imtihoni', action: 'navigate' as const }
  if (status === 'PASSED' || status === 'REGISTERED' || (!authenticated && learning?.examSubmitted)) return { title: 'Malaka guvohnomasi holatini ko‘ring', description: 'Komissiya qarori va QR-kodli guvohnoma mavjud bo‘lsa, u shu bo‘limda ko‘rinadi.', icon: QrCode, page: 'Malaka guvohnomasi', action: 'navigate' as const }
  return { title: 'Arizangiz holatini ko‘ring', description: 'Ariza va malaka bosqichlari bo‘yicha mavjud ma’lumotlarni oching.', icon: FileCheck2, page: 'Mediator arizam', action: 'navigate' as const }
}

function statusStage(status: string) {
  const value = normalizeStatus(status)
  if (value === 'REGISTERED') return 'Mediatorlar reyestri'
  if (value === 'PASSED') return 'Malaka guvohnomasi'
  if (value === 'INVITED' || value === 'EXAM_REVIEW' || value === 'FAILED') return 'Malaka imtihoni'
  if (value === 'ACCEPTED') return 'O‘quv kurslari'
  if (value === 'REJECTED' || value === 'SUBMITTED' || value === 'CHECKING') return 'Arizani ko‘rib chiqish'
  return 'Mediator maqomiga ariza'
}

function statusLabel(status: string) {
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

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'medium' }).format(date)
}
