import { useEffect, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, Bell, Building2, CalendarDays,
  CheckCheck, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Clock3,
  FileClock, FileText, Handshake, Landmark, LogIn, Phone, UserRound,
  Users, WalletCards, type LucideIcon,
} from 'lucide-react'
import { apiGet, getAccessToken } from './api'
import { LanguageFlag } from './ApplicantDashboard'
import { type ApplicantLanguage, applicantText } from './applicantLocale'

export type ClientRole = 'CITIZEN' | 'BUSINESS'

type ServiceItem = {
  label: string
  description: string
  icon: LucideIcon
  page?: string
  action?: 'mediation'
  href?: string
}

type ServiceGroup = { title: string; description: string; icon: LucideIcon; items: ServiceItem[] }

function clientServiceGroups(role: ClientRole): ServiceGroup[] {
  const mediationItems: ServiceItem[] = [
    { label: 'Yangi mediatsiya', description: 'Nizo bo‘yicha murojaat yuboring', icon: Handshake, action: 'mediation' },
    { label: 'Mediatorlar reyestri', description: 'Mutaxassislarni toping', icon: Users, page: 'Mediatorlar reyestri' },
    { label: 'Mediatsiyalarim', description: 'Murojaatlar holatini kuzating', icon: ClipboardList, page: 'Mediatsiyalarim' },
    { label: 'Onlayn uchrashuvlar', description: 'Uchrashuv va sessiyalarni ko‘ring', icon: CalendarDays, page: 'Onlayn uchrashuvlar' },
    ...(role === 'CITIZEN' ? [{ label: 'Mediator bo‘lish', description: 'Mediator maqomiga ariza bering', icon: FileClock, page: 'Mediator bo‘lish' } as ServiceItem] : []),
  ]

  return [
    { title: 'Nizolar va mediatsiya', description: 'Murojaat va mediatorlar', icon: Handshake, items: mediationItems },
    { title: 'Huquqiy jarayonlar', description: 'Sud va kelishuv ijrosi', icon: Landmark, items: [
      { label: 'Sud da’volari', description: 'Sudga oid murojaatlarni ko‘ring', icon: Landmark, page: 'Sud da’volari' },
      { label: 'Kelishuvlar ijrosi', description: 'Kelishuv majburiyatlarini kuzating', icon: CheckCheck, page: 'Kelishuvlar ijrosi' },
    ] },
    { title: 'Hujjatlar va to‘lovlar', description: 'Shartnomalar va hisob-kitoblar', icon: WalletCards, items: [
      { label: 'Shartnomalar', description: 'Mediatsiya hujjatlarini ko‘ring', icon: FileText, page: 'Shartnomalar' },
      { label: 'To‘lovlar', description: 'To‘lov ma’lumotlariga o‘ting', icon: WalletCards, page: 'To‘lovlar' },
    ] },
    { title: 'Shaxsiy kabinet', description: 'Profil va xabarnomalar', icon: UserRound, items: [
      ...(role === 'BUSINESS' ? [{ label: 'Tashkilot profili', description: 'Tashkilot rekvizitlari va vakil hujjatlari', icon: Building2, page: 'Tashkilot profili' } as ServiceItem] : []),
      { label: 'Shaxsiy ma’lumotlar', description: 'Aloqa va profil ma’lumotlari', icon: UserRound, page: 'Shaxsiy ma’lumotlar' },
      { label: 'Xabarnomalar', description: 'Yangi xabarlarni ko‘ring', icon: Bell, page: 'Xabarnomalar' },
    ] },
    { title: 'Yordam va qo‘llab-quvvatlash', description: 'Mavjud aloqa kanali', icon: CircleHelp, items: [
      { label: 'Ishonch telefoni', description: '1008 raqamiga qo‘ng‘iroq qiling', icon: Phone, href: 'tel:1008' },
    ] },
  ]
}

type ClientRoleOption = { key: string; label: string }

export function ClientCabinetHeader({
  role, activePage, userName, assignedRoles, language, onLanguageChange, onNavigate, onOpenPublic, onSignOut, onSwitchRole, onStartMediation,
}: {
  role: ClientRole
  activePage: string
  userName: string
  assignedRoles: ClientRoleOption[]
  language: ApplicantLanguage
  onLanguageChange: (language: ApplicantLanguage) => void
  onNavigate: (page: string) => void
  onOpenPublic: () => void
  onSignOut: () => void
  onSwitchRole: (role: string) => void
  onStartMediation: () => void
}) {
  const groups = clientServiceGroups(role)
  const accountType = role === 'BUSINESS' ? 'Yuridik shaxs' : 'Jismoniy shaxs'
  const initials = userName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('uz') || 'F'

  const navigateFromMenu = (event: React.MouseEvent<HTMLButtonElement>, page: string) => {
    setMenuClosed(event)
    onNavigate(page)
  }
  const actionFromMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuClosed(event)
    onStartMediation()
  }

  return <header className="client-header sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
    <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={() => onNavigate('Umumiy ko‘rsatkich')} className="flex min-w-0 items-center gap-3 rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600" aria-label="Kabinet bosh sahifasi">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300 text-slate-950"><Handshake size={23}/></span>
          <span className="hidden min-w-0 sm:block"><strong className="block truncate text-sm font-bold text-slate-950">Nizolarni hal etish</strong><span className="mt-0.5 block text-[10px] uppercase tracking-[.16em] text-slate-500">Elektron platforma</span></span>
        </button>
        <span className="hidden h-9 w-px bg-slate-200 md:block"/>
        <details className="client-service-menu relative">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 [&::-webkit-details-marker]:hidden">
            <ClipboardList size={17} className="text-emerald-700"/><span className="hidden sm:inline">Xizmatlar</span><span className="sm:hidden">Bo‘limlar</span><ChevronDown size={15} className="text-slate-400"/>
          </summary>
          <div className="client-services-popover fixed left-3 right-3 top-[76px] z-40 max-h-[calc(100vh-92px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5 lg:absolute lg:left-0 lg:right-auto lg:top-[calc(100%+14px)] lg:w-[min(92vw,720px)]">
            <div className="mb-4 border-b border-slate-100 pb-3"><h2 className="text-sm font-bold text-slate-900">Xizmatlar</h2><p className="mt-1 text-xs text-slate-500">Kerakli bo‘limni tanlang</p></div>
            <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
              {[groups.slice(0, 3), groups.slice(3)].map((column, columnIndex) => <div key={columnIndex} className="space-y-5">{column.map((group) => <section key={group.title} className="min-w-0">
                <div className="mb-2 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800"><group.icon size={16}/></span><div><h3 className="text-xs font-bold text-slate-900">{group.title}</h3><p className="mt-0.5 text-[10px] text-slate-500">{group.description}</p></div></div>
                <div className="space-y-1">{group.items.map((item) => item.href
                  ? <a key={item.label} href={item.href} className="flex min-h-9 items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><item.icon size={15} className="shrink-0 text-slate-500"/><span>{item.label}</span><ArrowUpRight size={13} className="ml-auto shrink-0 text-slate-400"/></a>
                  : <button key={item.label} type="button" onClick={(event) => item.action === 'mediation' ? actionFromMenu(event) : navigateFromMenu(event, item.page || 'Umumiy ko‘rsatkich')} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><item.icon size={15} className="shrink-0 text-slate-500"/><span>{item.label}</span><ArrowUpRight size={13} className="ml-auto shrink-0 text-slate-400"/></button>)}</div>
              </section>)}</div>)}
            </div>
          </div>
        </details>
        <span className="hidden truncate border-l border-slate-200 pl-3 text-xs text-slate-500 lg:block">{activePage}</span>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {assignedRoles.length > 1 && <label className="hidden items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 md:flex"><span className="text-[10px] text-slate-500">Faol kabinet</span><select aria-label="Faol kabinetni almashtirish" value={role} onChange={(event) => onSwitchRole(event.target.value)} className="max-w-40 border-0 bg-transparent p-0 pr-5 text-xs font-semibold text-slate-700 outline-none focus:ring-0">{assignedRoles.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>}
        <button type="button" onClick={() => onLanguageChange(language === 'uz' ? 'ru' : 'uz')} aria-label={applicantText(language, 'Rus tiliga o‘tish', 'Переключить на узбекский язык')} title={applicantText(language, 'Rus tiliga o‘tish', 'Переключить на узбекский язык')} className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><LanguageFlag language={language}/></button>
        <button type="button" onClick={() => onNavigate('Xabarnomalar')} aria-label="Xabarnomalarni ochish" className={`relative flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${activePage === 'Xabarnomalar' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600'}`}><Bell size={18}/></button>
        <details className="client-profile-menu relative">
          <summary className="flex max-w-[190px] cursor-pointer list-none items-center gap-2 rounded-xl p-1.5 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 [&::-webkit-details-marker]:hidden sm:gap-2.5 sm:px-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">{initials}</span>
            <span className="hidden min-w-0 sm:block"><strong className="block max-w-28 truncate text-xs font-semibold text-slate-900">{userName}</strong><span className="mt-0.5 block text-[10px] text-slate-500">{accountType}</span></span><ChevronDown size={14} className="hidden text-slate-400 sm:block"/>
          </summary>
          <div className="absolute right-0 top-[calc(100%+12px)] z-40 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
            <div className="border-b border-slate-100 px-3 py-2.5"><p className="truncate text-sm font-semibold text-slate-900">{userName}</p><p className="mt-1 text-xs text-slate-500">{accountType}</p></div>
            {assignedRoles.length > 1 && <label className="block px-3 py-2 text-[11px] font-medium text-slate-500 md:hidden">Faol kabinet<select aria-label="Faol kabinetni almashtirish" value={role} onChange={(event) => onSwitchRole(event.target.value)} className="form-control mt-1.5 h-9 text-xs">{assignedRoles.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>}
            <MenuAction icon={UserRound} label="Shaxsiy ma’lumotlar" onClick={(event) => navigateFromMenu(event, 'Shaxsiy ma’lumotlar')}/>
            {role === 'BUSINESS' && <MenuAction icon={Building2} label="Tashkilot profili" onClick={(event) => navigateFromMenu(event, 'Tashkilot profili')}/>}
            <MenuAction icon={ArrowUpRight} label="Ochiq sahifaga qaytish" onClick={(event) => { setMenuClosed(event); onOpenPublic() }}/>
            <MenuAction icon={LogIn} label="Kabinetdan chiqish" onClick={(event) => { setMenuClosed(event); onSignOut() }} danger/>
          </div>
        </details>
      </div>
    </div>
  </header>
}

function MenuAction({ icon: Icon, label, onClick, danger = false }: { icon: LucideIcon; label: string; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-medium hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${danger ? 'text-rose-700' : 'text-slate-700'}`}><Icon size={15}/>{label}</button>
}

function setMenuClosed(event: React.MouseEvent<HTMLElement>) {
  event.currentTarget.closest('details')?.removeAttribute('open')
}

type DashboardCase = {
  id: string
  title: string
  status: string
  region?: string
  createdAt?: string
  disputeSubject?: string
}

const remoteStatusLabels: Record<string, string> = {
  AWAITING_CONSENT: 'Rozilik kutilmoqda',
  MEDIATOR_REQUESTED: 'Mediator tanlash',
  MEDIATOR_ASSIGNED: 'Mediator tayinlandi',
  AGREEMENT_PENDING_SIGNATURE: 'Kelishuv imzolanmoqda',
  SCHEDULED: 'Uchrashuv belgilangan',
  IN_SESSION: 'Mediatsiya sessiyasi',
  SETTLED: 'Kelishuv monitoringi',
  FAILED: 'Kelishuvga erishilmadi',
  CLOSED: 'Yopildi',
}

export function ClientBusinessDashboard({ role, userName, demoCases, onNavigate, onStartMediation }: {
  role: ClientRole
  userName: string
  demoCases: DashboardCase[]
  onNavigate: (page: string) => void
  onStartMediation: () => void
}) {
  const [items, setItems] = useState<DashboardCase[]>(demoCases)
  const [loading, setLoading] = useState(Boolean(getAccessToken()))
  const [error, setError] = useState('')
  const demoMode = !getAccessToken()
  const groups = clientServiceGroups(role)

  useEffect(() => {
    if (!getAccessToken()) {
      setItems(demoCases)
      setLoading(false)
      setError('')
      return
    }
    let active = true
    setLoading(true)
    setError('')
    apiGet<Array<DashboardCase & { disputeSubject?: string }>>('/cabinet/mts/mediations')
      .then((rows) => {
        if (!active) return
        setItems((rows || []).map((item) => ({ ...item, title: item.disputeSubject || item.title || 'Mediatsiya murojaati' })))
      })
      .catch((cause) => { if (active) { setItems([]); setError(cause instanceof Error ? cause.message : 'Murojaatlarni yuklab bo‘lmadi.') } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [role, demoCases.length])

  const activeCount = items.filter((item) => !isTerminalStatus(item.status)).length
  const pendingCount = items.filter((item) => isPendingStatus(item.status)).length
  const completedCount = items.filter((item) => isAgreementCompleted(item.status)).length
  const stats = [
    { label: 'Faol murojaatlar', value: activeCount, detail: 'Jarayonda bo‘lgan mediatsiyalar', icon: ClipboardList, tone: 'emerald' },
    { label: 'Javob kutilmoqda', value: pendingCount, detail: 'Taraf roziligi yoki mediator javobi', icon: Clock3, tone: 'amber' },
    { label: 'Yakunlangan kelishuvlar', value: completedCount, detail: 'Muvaffaqiyatli yakunlangan ishlar', icon: CheckCheck, tone: 'blue' },
  ] as const

  const shortcuts: ServiceItem[] = [
    { label: 'Mediatorlar reyestri', description: 'Mutaxassisni ixtisoslik va hudud bo‘yicha toping', icon: Users, page: 'Mediatorlar reyestri' },
    { label: 'Yangi mediatsiya', description: 'Nizo bo‘yicha murojaat yuboring', icon: Handshake, action: 'mediation' },
    { label: 'Shartnomalar', description: 'Kelishuv va hujjatlarni ko‘ring', icon: FileText, page: 'Shartnomalar' },
    { label: 'To‘lovlar', description: 'To‘lov ma’lumotlariga o‘ting', icon: WalletCards, page: 'To‘lovlar' },
  ]

  const activate = (item: ServiceItem) => item.action === 'mediation' ? onStartMediation() : onNavigate(item.page || 'Umumiy ko‘rsatkich')

  return <div className="client-dashboard space-y-8 sm:space-y-10">
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-5 py-7 text-white shadow-lg shadow-slate-900/10 sm:px-8 sm:py-9 lg:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl"/>
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="max-w-2xl"><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-emerald-300">{role === 'BUSINESS' ? 'Yuridik shaxs kabineti' : 'Shaxsiy kabinet'}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Xush kelibsiz, {greetingName(userName)}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Nizongizni kelishuv orqali hal qilish uchun kerakli xizmatlar va murojaatlaringiz bir joyda.</p></div>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={onStartMediation} className="inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-emerald-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Handshake size={18}/>Yangi mediatsiya<ArrowRight size={16}/></button><button type="button" onClick={() => onNavigate('Mediatorlar reyestri')} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[.06] px-5 text-sm font-semibold text-white transition hover:bg-white/[.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"><Users size={17}/>Mediator tanlash</button></div>
      </div>
    </section>

    <section aria-label="Mediatsiya ko‘rsatkichlari" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{loading || error ? '—' : value}</p></div><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone === 'emerald' ? 'bg-emerald-50 text-emerald-800' : tone === 'amber' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'}`}><Icon size={20}/></span></div><p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
      </article>)}
    </section>

    <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
      <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="text-lg font-semibold text-slate-950">Mediatsiya murojaatlarim</h2><p className="mt-1 text-sm text-slate-500">Yuborgan murojaatlaringiz va ularning holati</p></div><button type="button" onClick={() => onNavigate('Mediatsiyalarim')} className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 sm:self-auto">Barchasini ko‘rish<ArrowRight size={15}/></button></div>
        {error && <div role="alert" className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:mx-6">{error}</div>}
        {loading ? <div className="p-8 text-center text-sm text-slate-500">Murojaatlar yuklanmoqda…</div> : items.length ? <div className="divide-y divide-slate-100">{items.slice(0, 4).map((item) => <button type="button" key={item.id} onClick={() => onNavigate('Mediatsiyalarim')} className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-600 sm:px-6">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><FileClock size={18}/></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{item.title || item.disputeSubject || 'Mediatsiya murojaati'}</strong><StatusBadge status={formatStatus(item.status)}/></span><span className="mt-1.5 block text-xs text-slate-500">№ {item.id}{item.region ? ` · ${item.region}` : ''}</span><span className="mt-1.5 block text-[11px] text-slate-400">Yuborilgan: {formatDate(item.createdAt)}</span></span><ChevronRight size={17} className="mt-2 shrink-0 text-slate-400"/>
        </button>)}</div> : <div className="px-6 py-10 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800"><Handshake size={21}/></span><h3 className="mt-4 text-sm font-semibold text-slate-900">Hozircha murojaatlar yo‘q</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">Birinchi mediatsiya murojaatingizni yuboring. Jarayon holati shu yerda ko‘rinadi.</p><button type="button" onClick={onStartMediation} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-slate-800"><Handshake size={15}/>Yangi mediatsiya</button></div>}
        {demoMode && <p className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500 sm:px-6">Demo ma’lumotlar ushbu brauzerda saqlanadi.</p>}
      </article>

      <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Tezkor amallar</h2><p className="mt-1 text-sm text-slate-500">Ko‘p ishlatiladigan xizmatlar</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><ArrowUpRight size={18}/></span></div><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{shortcuts.map((item) => <button type="button" key={item.label} onClick={() => activate(item)} className="group flex min-h-[68px] items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800 shadow-sm ring-1 ring-slate-100"><item.icon size={18}/></span><span className="min-w-0 flex-1"><strong className="block text-xs font-semibold text-slate-900">{item.label}</strong><span className="mt-1 block text-[11px] leading-4 text-slate-500">{item.description}</span></span><ArrowUpRight size={15} className="shrink-0 text-slate-400 transition group-hover:text-emerald-800"/></button>)}</div></article>
    </section>

    <section aria-labelledby="client-services-heading">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-800">Kabinet navigatsiyasi</p><h2 id="client-services-heading" className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Barcha xizmatlar</h2></div><p className="max-w-xl text-sm leading-5 text-slate-500">Kerakli xizmatni mavzusi bo‘yicha tanlang.</p></div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{groups.map((group) => <article key={group.title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><group.icon size={19}/></span><div><h3 className="text-sm font-semibold text-slate-950">{group.title}</h3><p className="mt-0.5 text-xs text-slate-500">{group.description}</p></div></div>
        <div className="mt-4 space-y-1">{group.items.map((item) => item.href
          ? <a key={item.label} href={item.href} className="group flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"><item.icon size={16} className="shrink-0 text-slate-500"/><span className="min-w-0 flex-1"><strong className="block text-xs font-semibold text-slate-800">{item.label}</strong><span className="mt-0.5 block text-[10px] text-slate-500">{item.description}</span></span><ArrowUpRight size={14} className="text-slate-400 group-hover:text-emerald-800"/></a>
          : <button type="button" key={item.label} onClick={() => activate(item)} className="group flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"><item.icon size={16} className="shrink-0 text-slate-500"/><span className="min-w-0 flex-1"><strong className="block text-xs font-semibold text-slate-800">{item.label}</strong><span className="mt-0.5 block text-[10px] text-slate-500">{item.description}</span></span><ArrowUpRight size={14} className="text-slate-400 group-hover:text-emerald-800"/></button>)}</div>
      </article>)}</div>
    </section>
    {demoMode && <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4"><CircleHelp size={18} className="mt-0.5 shrink-0 text-blue-700"/><p className="text-xs leading-5 text-blue-900">Demo rejimida kiritilgan o‘zgarishlar faqat ushbu brauzerda saqlanadi. Davlat tizimlari, billing, SMS, OneID va ERI integratsiyalari ulanmagan.</p></div>}
  </div>
}

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLocaleLowerCase('uz')
  const style = /rad et|muvaffaqiyatsiz|erishilmadi|yopildi/.test(lower) ? 'bg-rose-50 text-rose-700' : /yakun|monitoring|imzol|belgilangan|tayinlandi/.test(lower) ? 'bg-emerald-50 text-emerald-800' : /kutil|tanlash|tekshiril/.test(lower) ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700'
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${style}`}>{status}</span>
}

function formatStatus(status: string) { return remoteStatusLabels[status] || status || 'Holat ko‘rsatilmagan' }
function formatDate(value?: string) {
  if (!value) return 'Sana ko‘rsatilmagan'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'medium' }).format(date)
}
function firstName(name: string) { return name.trim().split(/\s+/)[0] || 'foydalanuvchi' }
function isPendingStatus(status: string) { return ['AWAITING_CONSENT', 'MEDIATOR_REQUESTED'].includes(status) || /rozilik kutilmoqda|mediator tanlash|javob kutilmoqda/i.test(status) }
function isAgreementCompleted(status: string) { return status === 'SETTLED' || /kelishuv monitoringi|yakunlandi/i.test(status) }
function isTerminalStatus(status: string) { return ['FAILED', 'CLOSED'].includes(status) || /yakunlandi|erishilmadi|yopildi/i.test(status) }
function greetingName(name: string) { return name === 'Demo foydalanuvchi' ? name : firstName(name) }
