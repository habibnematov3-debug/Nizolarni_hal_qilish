import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen,
  BriefcaseBusiness, Building2, CalendarDays, Check, CheckCheck, ChevronDown,
  ChevronRight, CircleHelp, ClipboardList, FileCheck2, FileClock, FilePlus2,
  FileText, Filter, Fingerprint, Gavel, GraduationCap, Handshake, Landmark,
  LayoutDashboard, LogIn, MapPin, Menu, MessageSquare, Newspaper, Pencil, Phone, Search,
  Settings, ShieldCheck, Sparkles, Star, Trash2, User, UserRound, Users, Video, X,
} from 'lucide-react'
import { apiGet, apiGetPublic, apiPost, getAccessToken, uploadPrivateDocument } from './api'
import { ApplicationDraft, categoryDetailsLabel, CourtClaimsWorkspace, MediatorApplicationForm, MediationDraft, MediationRequestForm, MkApplicationWorkspace, MtsWorkspace } from './workflows'
import { BusinessSpecialistDirectory, PublicRegistryDirectory, StaffRegistryWorkspace } from './RegistryDirectory'
import { ReportsWorkspace } from './ReportsWorkspace'
import { ExamWorkspace } from './ExamWorkspace'
import { ContractsWorkspace } from './ContractsWorkspace'
import { CalendarWorkspace, MediatorApplicationsWorkspace, MessagesWorkspace, ProfileWorkspace, TrainingWorkspace } from './MediatorCabinetWorkspaces'
import { NotificationsWorkspace } from './NotificationsWorkspace'
import { ContentWorkspace } from './ContentWorkspace'
import { DocumentExchangeWorkspace } from './DocumentExchangeWorkspace'
import { CitizenProfileWorkspace, ObligationMonitoringWorkspace } from './CitizenWorkspace'
import { BusinessWorkspace } from './BusinessWorkspace'
import { BusinessPaymentsWorkspace } from './BusinessPaymentsWorkspace'

type RoleKey = 'CITIZEN' | 'BUSINESS' | 'APPLICANT' | 'MEDIATOR' | 'REGIONAL' | 'MINISTRY' | 'COMMISSION' | 'JUDGE' | 'ARBITRATOR' | 'ADMIN' | 'OPERATOR'
type PortalRecord = { id: string; title: string; status: string; detail?: string; region?: string; createdAt?: string; data?: Record<string, unknown> }
type Role = { key: RoleKey; title: string; summary: string; icon: typeof UserRound }
type Metric = [string, number, string, typeof UserRound]
type CabinetGroup = { title: string; summary: string; roles: RoleKey[] }

const roles: Role[] = [
  { key: 'CITIZEN', title: 'Fuqaro', summary: 'JSHSHIR/OneID orqali: nizo arizalari, mediator tanlash va ishlaringiz', icon: UserRound },
  { key: 'BUSINESS', title: 'Tadbirkor / yuridik shaxs', summary: 'STIR/E-IMZO orqali: tashkilot nomidan nizolar va shartnomalar', icon: BriefcaseBusiness },
  { key: 'APPLICANT', title: 'Mediator talabgori', summary: 'Mediator maqomiga ariza, malaka imtihoni va natijalar', icon: FileCheck2 },
  { key: 'MEDIATOR', title: 'Mediator', summary: 'Malaka, yozishmalar, hisobot, portfolio va mediatsiya', icon: Handshake },
  { key: 'JUDGE', title: 'Hakamlik sudyasi', summary: 'Shaxsiy kabinet va hakamlik muhokamasi shartnomalari', icon: Gavel },
  { key: 'ARBITRATOR', title: 'Arbitr', summary: 'Reyestr, arbitraj shartnomalari va masofaviy xizmatlar', icon: Landmark },
  { key: 'COMMISSION', title: 'Malaka komissiyasi', summary: 'Nomzodlar va elektron imtihon byulleteni', icon: GraduationCap },
  { key: 'REGIONAL', title: 'Hududiy adliya organi', summary: 'Hududiy reyestr va hisobotlarni ko‘rib chiqish', icon: Building2 },
  { key: 'MINISTRY', title: 'Adliya vazirligi xodimi', summary: 'Respublika miqyosida tahlil va boshqaruv', icon: Landmark },
  { key: 'ADMIN', title: 'Administrator', summary: 'Uzluksiz ishlash va zaxira, rollar, klassifikatorlar, audit/xavfsizlik va SI topshiriqlarini tasdiqlash', icon: Settings },
  { key: 'OPERATOR', title: 'Operator', summary: 'Cheklangan foydalanuvchi ko‘magi va murojaatlar bilan ishlash', icon: CircleHelp },
]

const cabinetGroups: CabinetGroup[] = [
  { title: 'Fuqaro / yuridik shaxs kabineti', summary: 'Jismoniy va yuridik shaxslar uchun umumiy xizmatlar', roles: ['CITIZEN', 'BUSINESS'] },
  { title: 'Mutaxassislar kabineti', summary: 'Mediatsiya, hakamlik va arbitraj rollari', roles: ['APPLICANT', 'MEDIATOR', 'JUDGE', 'ARBITRATOR'] },
  { title: 'Adliya organlari kabineti', summary: 'Komissiya, hududiy organ va vazirlik vakolatlari', roles: ['COMMISSION', 'REGIONAL', 'MINISTRY'] },
  { title: 'Administrator kabineti', summary: 'Tizim barqarorligi, zaxiralash, huquqlar, audit va konfiguratsiya nazorati', roles: ['ADMIN', 'OPERATOR'] },
]

function normalizeRoleKey(value: string | null): RoleKey | null {
  if (value === 'PARTY') return 'CITIZEN'
  return roles.some((item) => item.key === value) ? value as RoleKey : null
}

function cabinetGroupTitle(role: RoleKey | null): string {
  return cabinetGroups.find((group) => role && group.roles.includes(role))?.title || 'Shaxsiy kabinet'
}

const backendRoleToCabinetRole: Record<string, RoleKey> = {
  TALABGOR: 'CITIZEN',
  MEDIATOR_APPLICANT: 'APPLICANT',
  CITIZEN: 'CITIZEN',
  BUSINESS: 'BUSINESS',
  MEDIATOR: 'MEDIATOR',
  ARBITRATION_JUDGE: 'JUDGE',
  ARBITRATOR: 'ARBITRATOR',
  COMMISSION: 'COMMISSION',
  REGIONAL_STAFF: 'REGIONAL',
  MINISTRY_STAFF: 'MINISTRY',
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
}

function readDemoRoles(): RoleKey[] {
  try {
    const saved = JSON.parse(localStorage.getItem('nizolar.demo.roles') || 'null')
    if (Array.isArray(saved)) {
      const valid = saved.map((item) => normalizeRoleKey(String(item))).filter((item): item is RoleKey => Boolean(item))
      if (valid.length) return [...new Set(valid)]
    }
  } catch { /* Migrate the previous single-role demo setting below. */ }
  const legacyRole = normalizeRoleKey(localStorage.getItem('nizolar.demo.role'))
  return legacyRole ? [legacyRole] : []
}

const registrySeed = [
  { id: 'm1', name: 'Dilnoza Karimova', specialty: 'Oilaviy va fuqarolik nizolari', region: 'Toshkent shahri', experience: '8 yil', rating: '4.9', status: 'Faol', initials: 'DK' },
  { id: 'm2', name: 'Jasur Raximov', specialty: 'Tadbirkorlik va shartnoma nizolari', region: 'Samarqand viloyati', experience: '11 yil', rating: '4.8', status: 'Faol', initials: 'JR' },
  { id: 'm3', name: 'Madina Usmonova', specialty: 'Mehnat va fuqarolik nizolari', region: 'Buxoro viloyati', experience: '6 yil', rating: '4.7', status: 'Faol', initials: 'MU' },
  { id: 'm4', name: 'Azizbek Tursunov', specialty: 'Oilaviy nizolar', region: 'Farg‘ona viloyati', experience: '9 yil', rating: '4.9', status: 'Faol', initials: 'AT' },
  { id: 'm5', name: 'Shahnoza Ismoilova', specialty: 'Tijorat va korporativ nizolar', region: 'Toshkent shahri', experience: '13 yil', rating: '5.0', status: 'Faol', initials: 'SI' },
]
const judgesSeed = [
  { id: 'j1', name: 'Otabek Yusupov', specialty: 'Hakamlik sudi raisi', region: 'Toshkent shahri', experience: '15 yil', rating: '4.9', status: 'Faol', initials: 'OY' },
  { id: 'j2', name: 'Zuhra Axmedova', specialty: 'Hakamlik sudyasi', region: 'Samarqand viloyati', experience: '12 yil', rating: '4.8', status: 'Faol', initials: 'ZA' },
]
const arbitratorsSeed = [
  { id: 'a1', name: 'Kamoliddin Saidov', specialty: 'Xalqaro tijorat arbitraji', region: 'Toshkent shahri', experience: '14 yil', rating: '4.9', status: 'Faol', initials: 'KS' },
  { id: 'a2', name: 'Nargiza Aliyeva', specialty: 'Investitsiya va savdo arbitraji', region: 'Toshkent shahri', experience: '10 yil', rating: '4.8', status: 'Faol', initials: 'NA' },
]
const publicRegions = [
  ['Qoraqalpog‘iston Respublikasi', 'Qoraqalpog‘iston'], ['Andijon viloyati', 'Andijon'], ['Buxoro viloyati', 'Buxoro'],
  ['Farg‘ona viloyati', 'Farg‘ona'], ['Jizzax viloyati', 'Jizzax'], ['Xorazm viloyati', 'Xorazm'],
  ['Namangan viloyati', 'Namangan'], ['Navoiy viloyati', 'Navoiy'], ['Qashqadaryo viloyati', 'Qashqadaryo'],
  ['Samarqand viloyati', 'Samarqand'], ['Surxondaryo viloyati', 'Surxondaryo'], ['Sirdaryo viloyati', 'Sirdaryo'],
  ['Toshkent shahri', 'Toshkent sh.'], ['Toshkent viloyati', 'Toshkent vil.'],
] as const
const publicFaqFallbacks = [
  { question: 'Mediatsiya nima?', answer: 'Mediatsiya — taraflarning ixtiyoriy roziligi asosida nizoni mediator ko‘magida o‘zaro maqbul qarorga kelib hal etish usuli.' },
  { question: 'Mediatorni qanday topaman?', answer: 'Reyestrdan mediator, hakamlik sudyasi yoki arbitrni ism, ixtisoslik va hudud bo‘yicha qidiring. Profil orqali tanlangan mutaxassisga murojaat yuborishingiz mumkin.' },
  { question: 'Mediatsiyani onlayn o‘tkazish mumkinmi?', answer: 'Platforma loyihasida taraflar bilan videokonferensaloqa orqali uchrashish, sana va vaqtni kelishish imkoniyati ko‘zda tutilgan.' },
  { question: 'Mediativ kelishuv bajarilmasa nima bo‘ladi?', answer: 'Qonunga ko‘ra kelishuv taraflar uchun majburiy va avvalo ixtiyoriy bajariladi. Ixtiyoriy bajarilmasa, taraflar uni majburiy ijroga qaratish uchun sudga murojaat qilishi mumkin.' },
]
type PublicContentItem = { id: string; titleUz: string; summaryUz?: string | null; bodyUz?: string | null; fileUrl?: string | null; videoUrl?: string | null; publishedAt?: string | null }
type PublicContentList = { items: PublicContentItem[] }
type PublicMapPoint = { id: string; fullName: string; type: string; region: string; phone?: string | null; address?: string | null; specialization: string[]; latitude: number; longitude: number }
type PublicMediatorCard = { id: string; fullName: string; region: string; specialization: string[]; registryNumber?: string | null; rating?: { score?: number | string } | null }
type PublicRatingItem = { profile: PublicMediatorCard; rating: { score?: number | string; periodYear?: number } | null }
type PublicRatingResponse = { items: PublicRatingItem[]; periodYear: number }
type PublicRatingMethodology = { status?: string; description?: string; reportComplianceWeight?: number; resolutionRateWeight?: number; agreementExecutionWeight?: number; updatedAt?: string | null }
type PublicRegistryStatistics = {
  mediators?: number
  applicants?: number
  activeMediatorDossiers?: number
  byRegion: Record<string, number>
  publicSpecialistsTotal?: number
  registryByType?: Partial<Record<'MEDIATOR' | 'ARBITRATION_JUDGE' | 'ARBITRATOR', number>>
  mediationCasesTotal?: number
  mediationCasesSettled?: number
  mandatoryMediationCases?: number
  generatedAt?: string
}

const initialCases: PortalRecord[] = []
const initialApplications: PortalRecord[] = []
const initialReports: PortalRecord[] = [
  { id: 'HIS-2026-Q3', title: '2026-yil III chorak hisoboti', status: 'Hududiy ko‘rib chiqishda', detail: 'Mediatsiya ishlari: 24 · Yakunlangan: 18', region: 'Toshkent shahri', createdAt: '10.10.2026' },
]
const navByRole: Record<RoleKey, string[]> = {
  CITIZEN: ['Umumiy ko‘rsatkich', 'Mediatorlar reyestri', 'Mediatsiyalarim', 'Onlayn uchrashuvlar', 'Sud da’volari', 'Kelishuvlar ijrosi', 'To‘lovlar', 'Mediator bo‘lish', 'Shartnomalar', 'Shaxsiy ma’lumotlar', 'Xabarnomalar'],
  BUSINESS: ['Umumiy ko‘rsatkich', 'Mediatorlar reyestri', 'Mediatsiyalarim', 'Onlayn uchrashuvlar', 'Sud da’volari', 'Kelishuvlar ijrosi', 'To‘lovlar', 'Shartnomalar', 'Tashkilot profili', 'Shaxsiy ma’lumotlar', 'Xabarnomalar'],
  APPLICANT: ['Umumiy ko‘rsatkich', 'Mediator arizam', 'Imtihon', 'Shartnomalar', 'Onlayn uchrashuvlar', 'Xabarnomalar'],
  MEDIATOR: ['Umumiy ko‘rsatkich', 'Profil va portfolio', 'Mediatsiyalar', 'Onlayn uchrashuvlar', 'Yozishmalar', 'Hujjat almashinuvi', 'Hisobotlar', 'Malaka oshirish', 'Arizalar', 'Shartnomalar', 'Xabarnomalar', 'E’lonlar'],
  REGIONAL: ['Umumiy ko‘rsatkich', 'Mediatorlar reyestri', 'Talabgor arizalari', 'Hujjat almashinuvi', 'Hisobotlar', 'Malaka oshirish', 'Kontent'],
  MINISTRY: ['Umumiy ko‘rsatkich', 'Mediatorlar reyestri', 'Hujjat almashinuvi', 'Hisobotlar tahlili', 'Statistika', 'Malaka oshirish', 'Kontent'],
  COMMISSION: ['Umumiy ko‘rsatkich', 'Nomzodlar', 'Imtihonlar', 'Elektron byulleten', 'Bayonnomalar'],
  JUDGE: ['Umumiy ko‘rsatkich', 'Hakamlik ishlari', 'Shartnomalar', 'Kalendar', 'Hujjatlar', 'Xabarnomalar'],
  ARBITRATOR: ['Umumiy ko‘rsatkich', 'Arbitraj ishlari', 'Shartnomalar', 'Kalendar', 'Hujjatlar', 'Xabarnomalar'],
  ADMIN: ['Umumiy ko‘rsatkich', 'Tashkilotlar', 'Foydalanuvchilar va rollar', 'Spravochniklar', 'Audit jurnali', 'Tizim sozlamalari', 'Kontent'],
  OPERATOR: ['Umumiy ko‘rsatkich', 'Foydalanuvchilar bilan ishlash', 'Yordam so‘rovlari'],
}
const mediationSteps = ['Yangi murojaat', 'Mediator tanlash', 'Kelishuv imzolash', 'Uchrashuv belgilash', 'Mediatsiya sessiyasi', 'Kelishuv monitoringi', 'Yakunlandi']
const applicationSteps = ['Yangi yuborildi', 'Ko‘rib chiqilmoqda', 'Imtihonga ruxsat', 'To‘lov kutilmoqda', 'Imtihonga chaqirildi', 'Imtihon topshirildi', 'Komissiya bahosi', 'Reyestrga kiritildi']
const demoNotice = { title: 'Platformadagi yangiliklar', text: 'Mediatorlar uchun hisobot topshirish muddati va malaka oshirish kurslariga ariza qabul qilish boshlandi. E’lon bilan tanishganingizdan so‘ng kabinet bo‘limlari ochiladi.' }

function loadRecords(key: string, initial: PortalRecord[]): PortalRecord[] {
  try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) as PortalRecord[] : initial }
  catch { return initial }
}

export default function App() {
  const [assignedRoles, setAssignedRoles] = useState<RoleKey[]>(readDemoRoles)
  const [role, setRole] = useState<RoleKey | null>(() => {
    const savedRole = normalizeRoleKey(localStorage.getItem('nizolar.demo.role'))
    const availableRoles = readDemoRoles()
    return savedRole && availableRoles.includes(savedRole) ? savedRole : availableRoles[0] || null
  })
  const [publicPage, setPublicPage] = useState('Bosh sahifa')
  const [showLogin, setShowLogin] = useState(false)
  const [loginMethod, setLoginMethod] = useState('')
  const [chooseRole, setChooseRole] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [activePage, setActivePage] = useState(() => localStorage.getItem('nizolar.demo.role') === 'ADMIN' ? 'Tashkilotlar' : 'Umumiy ko‘rsatkich')
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('Barcha hududlar')
  const [registryKind, setRegistryKind] = useState('Mediatorlar')
  const [modal, setModal] = useState('')
  const [toast, setToast] = useState('')
  const [cases, setCases] = useState(() => loadRecords('nizolar.demo.cases', initialCases))
  const [applications, setApplications] = useState(() => loadRecords('nizolar.demo.applications', initialApplications))
  const [reports, setReports] = useState(() => loadRecords('nizolar.demo.reports', initialReports))
  const [genericItems, setGenericItems] = useState(() => loadRecords('nizolar.demo.items', []))
  const [announcementsAccepted, setAnnouncementsAccepted] = useState(() => localStorage.getItem('nizolar.demo.notice.read') === 'yes')
  const [pendingAnnouncements, setPendingAnnouncements] = useState<PublicContentItem[]>([])
  const [announcementError, setAnnouncementError] = useState('')
  const [announcementReload, setAnnouncementReload] = useState(0)
  const [formName, setFormName] = useState('')
  const [formDetail, setFormDetail] = useState('')
  const [selectedMediator, setSelectedMediator] = useState('')
  const [selectedMediatorRegistryId, setSelectedMediatorRegistryId] = useState('')
  const [pendingPublicMediation, setPendingPublicMediation] = useState(false)
  const [courtCaseNumber, setCourtCaseNumber] = useState('')
  const [announcementGate, setAnnouncementGate] = useState(false)

  useEffect(() => { localStorage.setItem('nizolar.demo.cases', JSON.stringify(cases)) }, [cases])
  useEffect(() => { localStorage.setItem('nizolar.demo.applications', JSON.stringify(applications)) }, [applications])
  useEffect(() => { localStorage.setItem('nizolar.demo.reports', JSON.stringify(reports)) }, [reports])
  useEffect(() => { localStorage.setItem('nizolar.demo.items', JSON.stringify(genericItems)) }, [genericItems])
  useEffect(() => { if (role) localStorage.setItem('nizolar.demo.role', role); else localStorage.removeItem('nizolar.demo.role') }, [role])
  useEffect(() => { if (role && assignedRoles.length) localStorage.setItem('nizolar.demo.roles', JSON.stringify(assignedRoles)); else localStorage.removeItem('nizolar.demo.roles') }, [assignedRoles, role])
  useEffect(() => {
    if (!getAccessToken()) return
    let active = true
    apiGet<{ roles?: string[]; primaryRole?: string }>('/auth/me').then((profile) => {
      if (!active) return
      const verifiedRoles = [...new Set((profile.roles || []).map((name) => backendRoleToCabinetRole[name]).filter((name): name is RoleKey => Boolean(name)))]
      if (!verifiedRoles.length) return
      const savedActiveRole = normalizeRoleKey(localStorage.getItem('nizolar.demo.role'))
      const serverPrimaryRole = profile.primaryRole ? backendRoleToCabinetRole[profile.primaryRole] : undefined
      const activeRole = savedActiveRole && verifiedRoles.includes(savedActiveRole)
        ? savedActiveRole
        : serverPrimaryRole && verifiedRoles.includes(serverPrimaryRole) ? serverPrimaryRole
          : verifiedRoles.includes('ADMIN') ? 'ADMIN'
            : verifiedRoles.includes('CITIZEN') ? 'CITIZEN' : verifiedRoles[0]
      setAssignedRoles(verifiedRoles)
      setRole(activeRole)
      setActivePage(activeRole === 'ADMIN' ? 'Tashkilotlar' : navByRole[activeRole][0])
    }).catch(() => { /* A stale demo token must not block the public/demo cabinet. */ })
    return () => { active = false }
  }, [])
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(t) }, [toast])
  useEffect(() => {
    if (role !== 'MEDIATOR' || !getAccessToken()) { setPendingAnnouncements([]); return }
    let active = true
    setAnnouncementsAccepted(false)
    setAnnouncementError('')
    apiGet<PublicContentItem[]>('/public/announcements/pending')
      .then((items) => {
        if (!active) return
        setPendingAnnouncements(items || [])
        setAnnouncementsAccepted(!(items || []).length)
        if (!(items || []).length) setAnnouncementGate(false)
      })
      .catch((cause) => { if (active) setAnnouncementError(cause instanceof Error ? cause.message : 'E’lonlarni yuklab bo‘lmadi.') })
    return () => { active = false }
  }, [role, announcementReload])
  useEffect(() => { if (!modal && !showLogin && !chooseRole && !announcementGate) return; const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') { setModal(''); setShowLogin(false); setChooseRole(false); setPendingPublicMediation(false) } }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn) }, [modal, showLogin, chooseRole, announcementGate])

  const currentRole = roles.find((item) => item.key === role)
  const registryRows = useMemo(() => registrySeed.filter((item) => {
    const q = query.trim().toLocaleLowerCase('uz')
    return (!q || [item.name, item.specialty, item.region].join(' ').toLocaleLowerCase('uz').includes(q)) && (region === 'Barcha hududlar' || item.region === region)
  }), [query, region])

  const goHome = () => { setRole(null); setAssignedRoles([]); setPublicPage('Bosh sahifa'); setActivePage('Umumiy ko‘rsatkich'); setChooseRole(false); setShowLogin(false); setLoginMethod(''); setAnnouncementGate(false); setPendingPublicMediation(false) }
  const openLogin = () => { setLoginMethod(''); setShowLogin(true) }
  const closeLogin = () => { setShowLogin(false); setLoginMethod(''); setPendingPublicMediation(false) }
  const startPublicMediation = (mediatorName: string) => {
    setSelectedMediator(mediatorName)
    setSelectedMediatorRegistryId('')
    if (getAccessToken()) {
      setModal('mediatsiya')
      return
    }
    setPendingPublicMediation(true)
    openLogin()
  }
  const activateRole = (key: RoleKey) => {
    setRole(key); setActivePage(key === 'ADMIN' ? 'Tashkilotlar' : navByRole[key][0]); setChooseRole(false); setShowLogin(false); setMobileNav(false)
    setAnnouncementGate(false)
    if (key === 'MEDIATOR' && (getAccessToken() || !announcementsAccepted)) setAnnouncementGate(true)
  }
  const startRoles = (keys: RoleKey[]) => {
    if (!keys.length) return
    const unique = [...new Set(keys)]
    setAssignedRoles(unique)
    const defaultRole = unique.includes('CITIZEN') ? 'CITIZEN' : unique.includes('BUSINESS') ? 'BUSINESS' : unique[0]
    activateRole(defaultRole)
    if (pendingPublicMediation) {
      setPendingPublicMediation(false)
      if (unique.includes('CITIZEN') || unique.includes('BUSINESS')) setModal('mediatsiya')
      else setToast('Mediatsiyaga murojaat yuborish uchun fuqaro yoki yuridik shaxs kabinetiga kiring.')
    }
  }
  const acknowledgeAnnouncements = async () => {
    if (getAccessToken() && pendingAnnouncements.length) {
      try {
        await Promise.all(pendingAnnouncements.map((item) => apiPost(`/public/announcements/${item.id}/acknowledge`, {})))
        setPendingAnnouncements([])
      } catch (cause) { setAnnouncementError(cause instanceof Error ? cause.message : 'E’lon bilan tanishganlikni saqlab bo‘lmadi.'); return }
    } else localStorage.setItem('nizolar.demo.notice.read', 'yes')
    setAnnouncementsAccepted(true); setAnnouncementGate(false); setToast('E’lon bilan tanishilgan deb belgilandi')
  }
  const signOut = () => { goHome(); setToast('Demo kabinetdan chiqdingiz') }

  const showPublicRegistry = () => { setRole(null); setPublicPage('Mediatorlar reyestri'); setShowLogin(false) }
  const createCase = (title: string, detail = '') => {
    const item = { id: `MED-2026-${String(Date.now()).slice(-4)}`, title, status: mediationSteps[0], detail: detail || 'Demo rejimida yaratilgan murojaat', region: 'Toshkent shahri', createdAt: new Date().toLocaleDateString('uz-UZ') }
    setCases((items) => [item, ...items]); setModal(''); setFormName(''); setFormDetail(''); setToast('Mediatsiya murojaati yaratildi')
  }
  const submitMediation = async (draft: MediationDraft) => {
    const token = getAccessToken()
    if (token) {
      const uploadedIds: string[] = []
      try {
        for (const file of draft.attachments) {
          const uploaded = await uploadPrivateDocument(file, 'Mediatsiya murojaati: tasdiqlovchi hujjat')
          uploadedIds.push(uploaded.id)
        }
        const categoryDetails = [
          draft.categoryDetails.trim() ? `${categoryDetailsLabel(draft.disputeCategory)}: ${draft.categoryDetails.trim()}` : '',
          draft.claimAmount.trim() ? `Talab summasi: ${draft.claimAmount.trim()} so‘m` : '',
        ].filter(Boolean).join('\n')
        const created = await apiPost<{ id: string; status: string; disputeSubject: string; region: string }>('/cabinet/mts/mediations', {
          type: draft.type,
          disputeCategory: draft.disputeCategory,
          documentLanguage: draft.documentLanguage,
          businessOrganizationId: draft.businessOrganizationId || undefined,
          preferredMediatorRegistryId: draft.preferredMediatorRegistryId || undefined,
          disputeSubject: [draft.disputeSubject.trim(), categoryDetails].filter(Boolean).join('\n\n'),
          courtCaseNumber: draft.courtCaseNumber || undefined,
          respondentName: draft.respondentName,
          respondentPhone: draft.respondentPhone,
          respondentPinfl: draft.respondentPinfl || undefined,
          respondentType: draft.respondentType,
          respondentTin: draft.respondentTin || undefined,
          respondentEmail: draft.respondentEmail || undefined,
          region: draft.region,
          privacyAccepted: draft.privacyAccepted,
          attachmentIds: uploadedIds,
        })
        const item = { id: created.id, title: created.disputeSubject.slice(0, 80), status: mediationStatusLabel(created.status), detail: `${draft.respondentName} · rozilik kutilmoqda${uploadedIds.length ? ` · ${uploadedIds.length} ta hujjat ilova qilindi` : ''}`, region: created.region, createdAt: new Date().toLocaleDateString('uz-UZ') }
        setCases((items) => [item, ...items])
        setToast('Murojaat serverga yuborildi; respondent roziligi kutilmoqda')
      } catch (error) {
        await Promise.allSettled(uploadedIds.map((id) => fetch(`${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')}/platform/files/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })))
        throw error
      }
    } else {
      const category = { FAMILY: 'Oilaviy nizo', CIVIL: 'Fuqarolik va shartnomaviy nizo', LABOR: 'Mehnat nizosi', ECONOMIC: 'Iqtisodiy va tadbirkorlik nizosi', INTELLECTUAL: 'Intellektual mulk nizosi', BANKING: 'Bank va moliya nizosi', INVESTMENT: 'Investitsiya nizosi', DIGITAL: 'Raqamli texnologiyalar nizosi', CROSS_BORDER: 'Xalqaro tijorat nizosi' }[draft.disputeCategory] || 'Mediatsiya murojaati'
      const item = { id: `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, title: category, status: 'Rozilik kutilmoqda', detail: 'Demo murojaati · shaxsiy ma’lumotlar brauzer xotirasiga saqlanmadi', region: 'Demo', createdAt: new Date().toLocaleDateString('uz-UZ') }
      setCases((items) => [item, ...items])
      setToast(`Demo murojaati saqlandi. Rasmiy yuborish uchun OneID orqali kiring; demo rejimida ${draft.attachments.length ? 'hujjatlar yuklanmadi' : 'ma’lumotlar serverga yuborilmadi'}.`)
    }
    setModal(''); setSelectedMediator(''); setSelectedMediatorRegistryId('')
  }
  const createApplication = (title: string, detail = '') => {
    const item = { id: `ARZ-2026-${String(Date.now()).slice(-4)}`, title, status: applicationSteps[0], detail: detail || 'Adliya organi ko‘rib chiqishi uchun yuborildi', region: 'Toshkent shahri', createdAt: new Date().toLocaleDateString('uz-UZ') }
    setApplications((items) => [item, ...items]); setModal(''); setFormName(''); setFormDetail(''); setToast('Ariza yuborildi')
  }
  const submitMediatorApplication = async (draft: ApplicationDraft) => {
    if (getAccessToken()) {
      const uploadedIds: string[] = []
      try {
        const diploma = await uploadPrivateDocument(draft.diplomaFile!, 'Mediator arizasi: diplom')
        uploadedIds.push(diploma.id)
        const course = draft.courseCertificate ? await uploadPrivateDocument(draft.courseCertificate, 'Mediator arizasi: maxsus kurs sertifikati') : undefined
        if (course) uploadedIds.push(course.id)
        const professionProof = draft.professionProof ? await uploadPrivateDocument(draft.professionProof, 'Mediator arizasi: notarius/advokat maqomi') : undefined
        if (professionProof) uploadedIds.push(professionProof.id)
        const passport = draft.passportFile ? await uploadPrivateDocument(draft.passportFile, 'Mediator arizasi: pasport nusxasi') : undefined
        if (passport) uploadedIds.push(passport.id)
        const created = await apiPost<{ id: string; status: string }>('/cabinet/mk/applications', {
          phone: draft.phone,
          email: draft.email,
          address: draft.address,
          education: draft.education,
          profession: draft.profession,
          diplomaFileId: diploma.id,
          passportFileId: passport?.id,
          courseCertificateId: course?.id,
          professionProofFileId: professionProof?.id,
        })
        setApplications((items) => [{ id: created.id, title: 'Mediator maqomini olish', status: applicationStatusLabel(created.status), detail: 'Adliya organi ko‘rib chiqishi uchun yuborildi', region: 'Hududiy tekshiruv', createdAt: new Date().toLocaleDateString('uz-UZ') }, ...items])
        setToast('Mediator arizasi serverga yuborildi')
      } catch (error) {
        await Promise.allSettled(uploadedIds.map((id) => fetch(`${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')}/platform/files/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getAccessToken()}` } })))
        throw error
      }
    } else {
      const item = { id: `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, title: 'Mediator maqomini olish', status: 'Yangi yuborildi', detail: 'Demo ariza · shaxsiy ma’lumot va fayl mazmuni saqlanmadi', region: 'Demo', createdAt: new Date().toLocaleDateString('uz-UZ') }
      setApplications((items) => [item, ...items])
      setToast('Demo ariza saqlandi. Hujjatlar rasmiy serverga yuborilmadi.')
    }
    setAssignedRoles((items) => [...new Set<RoleKey>([...items, 'APPLICANT'])])
    setRole('APPLICANT')
    setActivePage(navByRole.APPLICANT[0])
    setModal('')
  }
  const createReport = (title: string, detail = '') => {
    const item = { id: `HIS-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`, title, status: 'Qoralama', detail: detail || 'Yangi hisobot qoralamasi', region: 'Toshkent shahri', createdAt: new Date().toLocaleDateString('uz-UZ') }
    setReports((items) => [item, ...items]); setModal(''); setFormName(''); setFormDetail(''); setToast('Hisobot qoralamasi yaratildi')
  }
  const saveGeneric = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const item = { id: `DOC-${String(Date.now()).slice(-5)}`, title: formName || modal, status: 'Yangi', detail: formDetail || 'Demo ma’lumot', createdAt: new Date().toLocaleDateString('uz-UZ') }
    setGenericItems((items) => [item, ...items]); setModal(''); setFormName(''); setFormDetail(''); setToast('Ma’lumot saqlandi')
  }

  const advanceCase = (id: string) => setCases((items) => items.map((item) => {
    if (item.id !== id) return item
    const at = mediationSteps.indexOf(item.status)
    const next = mediationSteps[Math.min(at + 1, mediationSteps.length - 1)]
    setToast(next === 'Yakunlandi' ? 'Mediatsiya yakunlandi' : `Jarayon bosqichi: ${next}`)
    return { ...item, status: next }
  }))
  const advanceApplication = (id: string) => setApplications((items) => items.map((item) => {
    if (item.id !== id) return item
    const at = applicationSteps.indexOf(item.status)
    const next = applicationSteps[Math.min(at + 1, applicationSteps.length - 1)]
    setToast(`Ariza holati yangilandi: ${next}`)
    return { ...item, status: next }
  }))
  const advanceReport = (id: string) => setReports((items) => items.map((item) => {
    if (item.id !== id) return item
    const sequence = ['Qoralama', 'Hududiy ko‘rib chiqishda', 'Vazirlikka yuborildi', 'Ko‘rib chiqildi']
    const at = sequence.indexOf(item.status)
    const next = sequence[Math.min(at + 1, sequence.length - 1)]
    setToast(`Hisobot bosqichi: ${next}`)
    return { ...item, status: next }
  }))

  if (!role) return <>
    <PublicSite page={publicPage} setPage={setPublicPage} onLogin={openLogin} onRegistry={showPublicRegistry} registryRows={registryRows} query={query} setQuery={setQuery} region={region} setRegion={setRegion} registryKind={registryKind} setRegistryKind={setRegistryKind} onContact={startPublicMediation} onToast={setToast} />
    {showLogin && <ModalShell onClose={closeLogin}><div className="bg-slate-950 px-7 py-6 text-white sm:px-8"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Xavfsiz identifikatsiya</p><h2 className="mt-2 text-2xl font-semibold">Tizimga kirish usuli</h2><button onClick={closeLogin} className="absolute right-5 top-5 rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label="Yopish"><X size={20} /></button></div><div className="space-y-3 p-6 sm:p-8">
      {[['OneID', 'Yagona identifikatsiya tizimi orqali', Fingerprint], ['Elektron raqamli imzo', 'ERI kaliti orqali xavfsiz kirish', ShieldCheck], ['Mobil ID / Face ID', 'Mobil qurilma orqali tasdiqlash', UserRound]].map(([name, caption, Icon]) => <button key={String(name)} onClick={() => setLoginMethod(String(name))} className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${loginMethod === name ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'}`}><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm"><Icon size={21} /></span><span className="flex-1"><strong className="block text-sm font-semibold text-slate-900">{String(name)}</strong><span className="mt-1 block text-xs text-slate-500">{String(caption)}</span></span><ArrowRight size={17} className="text-emerald-500" /></button>)}
      {loginMethod && <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4"><p className="text-sm font-semibold text-slate-900">{loginMethod} integratsiyasi</p><p className="mt-1 text-xs leading-5 text-slate-600">Tashqi ulanish keyingi bosqichda ulanadi. Hozir ekranlarni ko‘rish uchun demo kabinetni tanlang.</p><button onClick={() => { setShowLogin(false); setChooseRole(true) }} className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">Demo rejimida davom etish<ArrowRight size={15} /></button></div>}
      {!loginMethod && <p className="pt-1 text-center text-xs text-slate-400">Autentifikatsiya provayderlari loyiha integratsiyasi doirasida ulanadi.</p>}
    </div></ModalShell>}
    {chooseRole && <RolePicker initialRoles={assignedRoles.length ? assignedRoles : ['CITIZEN']} onClose={() => { setChooseRole(false); setPendingPublicMediation(false) }} onChoose={startRoles} />}
    {modal === 'mediatsiya' && <MediationRequestForm initialMediator={selectedMediator} initialMediatorRegistryId={selectedMediatorRegistryId} onClose={() => { setModal(''); setSelectedMediator(''); setSelectedMediatorRegistryId('') }} onSubmit={submitMediation} />}
    {toast && <Toast text={toast} />}
  </>

  const nav = navByRole[role]
  const restricted = role === 'MEDIATOR' && !announcementsAccepted
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[264px] flex-col ${role === 'ADMIN' ? 'bg-slate-900' : 'bg-slate-950'} text-white transition-transform md:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 px-5 py-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300 text-slate-950"><Handshake size={22} /></div><div><p className="text-sm font-semibold">Nizolarni hal etish</p><p className="mt-1 text-[10px] uppercase tracking-[.18em] text-slate-400">Elektron platforma</p></div><button onClick={() => setMobileNav(false)} className="ml-auto p-2 text-slate-400 md:hidden" aria-label="Menyuni yopish"><X size={18} /></button></div>
      <div className="mx-5 border-t border-white/10"/><div className="mx-4 mt-5 rounded-xl bg-white/[.06] p-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400"/><span className="text-xs text-slate-300">{cabinetGroupTitle(role)}</span></div><p className="mt-2 text-sm font-semibold">Bitta foydalanuvchi kabineti</p><p className="mt-1 text-[11px] leading-4 text-slate-400">{assignedRoles.length} ta rol biriktirilgan · faol rol: {currentRole?.title}</p></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Kabinet bo‘limlari">{nav.map((item, index) => { const Icon = navIcon(item); const active = activePage === item; return <button key={item} onClick={() => { setActivePage(item); setMobileNav(false) }} aria-current={active ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition ${active ? role === 'ADMIN' ? 'bg-blue-500/20 text-blue-100 shadow-[inset_3px_0_0_#60a5fa]' : 'bg-emerald-300/15 text-emerald-200 shadow-[inset_3px_0_0_#6ee7b7]' : 'text-slate-400 hover:bg-white/[.06] hover:text-white'}`}><Icon size={17}/><span>{item}</span>{index === nav.length - 1 && <ChevronRight className="ml-auto" size={14}/>}</button> })}</nav>
      <div className="border-t border-white/10 p-4"><button onClick={goHome} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[.06]"><ArrowLeft size={17}/>Ochiq sahifaga qaytish</button><button onClick={signOut} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/[.06] hover:text-white"><LogIn size={17}/>Demo kabinetdan chiqish</button></div>
    </aside>
    <div className="md:pl-[264px]">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><button onClick={() => setMobileNav(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" aria-label="Menyuni ochish"><Menu size={20}/></button>{role === 'ADMIN' ? <label className="relative hidden max-w-sm flex-1 sm:block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Dashboard bo‘ylab qidirish" placeholder="Qidirish..." className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"/></label> : <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{activePage}</p><p className="hidden text-xs text-slate-400 sm:block">{currentRole?.title} · bitta kabinet</p></div>}</div><div className="flex items-center gap-3">{role !== 'ADMIN' && <button onClick={() => setActivePage(nav.includes('Xabarnomalar') ? 'Xabarnomalar' : nav[nav.length - 1])} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Xabarnomalar"><Bell size={18}/><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"/></button>}<span className="hidden h-8 w-px bg-slate-200 sm:block"/><div className="flex items-center gap-2.5"><div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${role === 'ADMIN' ? 'bg-blue-600' : 'bg-slate-950'}`}>{role === 'ADMIN' ? 'A' : currentRole?.title.slice(0,1)}</div><div className={assignedRoles.length > 1 ? 'min-w-0' : 'hidden sm:block'}><p className="hidden text-xs font-semibold sm:block">Demo foydalanuvchi</p>{assignedRoles.length > 1 ? <select aria-label="Faol rolni almashtirish" value={role} onChange={(event) => activateRole(event.target.value as RoleKey)} className="max-w-[130px] border-0 bg-transparent p-0 pr-5 text-[11px] text-slate-500 outline-none focus:ring-0 sm:max-w-52">{assignedRoles.map((assignedRole) => <option key={assignedRole} value={assignedRole}>{roles.find((item) => item.key === assignedRole)?.title || assignedRole}</option>)}</select> : <p className="text-[11px] text-slate-400">{currentRole?.title}</p>}</div></div>{role === 'ADMIN' && <button onClick={signOut} aria-label="Chiqish" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><LogIn size={18}/></button>}<ChevronDown size={15} className="text-slate-400"/></div></header>
      <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
        {restricted ? <section className="mx-auto mt-12 max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Newspaper size={25}/></div><p className="mt-5 text-xs font-semibold uppercase tracking-[.16em] text-emerald-700">Tanishish talab qilinadi</p><h1 className="mt-2 text-2xl font-semibold">{pendingAnnouncements[0]?.titleUz || demoNotice.title}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{pendingAnnouncements[0]?.bodyUz || pendingAnnouncements[0]?.summaryUz || demoNotice.text}</p>{pendingAnnouncements.slice(1).map((item) => <article key={item.id} className="mt-3 rounded-lg border border-slate-200 p-3 text-left"><h2 className="text-sm font-semibold">{item.titleUz}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{item.bodyUz || item.summaryUz}</p></article>)}{announcementError && <p role="alert" className="mt-3 text-xs text-red-700">{announcementError}</p>}{announcementError && getAccessToken() && <button onClick={() => setAnnouncementReload((value) => value + 1)} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold">E’lonlarni qayta yuklash</button>}<button disabled={Boolean(announcementError && getAccessToken())} onClick={() => void acknowledgeAnnouncements()} className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"><CheckCheck size={17}/>Tanishdim</button></section> : <WorkspaceContent role={role} page={activePage} cases={cases} applications={applications} reports={reports} genericItems={genericItems} onOpenModal={(key) => { setFormName(''); setFormDetail(''); setModal(key) }} onNavigatePage={setActivePage} onAdvanceCase={advanceCase} onAdvanceApplication={advanceApplication} onAdvanceReport={advanceReport} onToast={setToast} onPublicRegistry={() => setActivePage(nav.includes('Mediatorlar reyestri') ? 'Mediatorlar reyestri' : nav[1])} onSelectSpecialist={(person) => { if (person.type !== 'MEDIATOR') return; setSelectedMediator(person.fullName); setSelectedMediatorRegistryId(person.id); setModal('mediatsiya') }} onStartCourtClaimMediation={(caseNumber) => { setCourtCaseNumber(caseNumber); setModal('mediatsiya') }} />}
      </main>
    </div>
    {mobileNav && <button aria-label="Menyuni yopish" onClick={() => setMobileNav(false)} className="fixed inset-0 z-20 bg-slate-950/40 md:hidden"/>}
    {modal === 'mediatsiya' && <MediationRequestForm businessMode={role === 'BUSINESS'} initialMediator={selectedMediator} initialMediatorRegistryId={selectedMediatorRegistryId} initialCourtCaseNumber={courtCaseNumber} onClose={() => { setModal(''); setSelectedMediator(''); setSelectedMediatorRegistryId(''); setCourtCaseNumber('') }} onSubmit={submitMediation} />}
    {modal === 'ariza' && ['APPLICANT', 'CITIZEN', 'BUSINESS'].includes(role) && <MediatorApplicationForm onClose={() => setModal('')} onSubmit={submitMediatorApplication} />}
    {modal && modal !== 'mediatsiya' && !(modal === 'ariza' && ['APPLICANT', 'CITIZEN', 'BUSINESS'].includes(role)) && <FormModal title={modalTitle(modal)} description="Demo rejimida ma’lumot kiritish." name={formName} setName={setFormName} detail={formDetail} setDetail={setFormDetail} submitLabel={modalAction(modal)} onClose={() => setModal('')} onSubmit={(event) => { event.preventDefault(); if (modal.includes('ariza') && !modal.includes('malaka') || modal.includes('talabgor')) createApplication(formName || 'Mediator maqomini olish', formDetail); else if (modal.includes('hisobot')) createReport(formName || 'Faoliyat hisoboti', formDetail); else if (modal.includes('murojaat') || modal.includes('mediatsiya')) createCase(formName || 'Onlayn mediatsiya', formDetail); else saveGeneric(event) }} />}
    {announcementGate && <div className="sr-only" aria-live="polite">Mediator kabinetini ochish uchun e’lon bilan tanishing.</div>}
    {toast && <Toast text={toast} />}
  </div>
}

function PublicSite({ page, setPage, onLogin, onRegistry, registryRows, query, setQuery, region, setRegion, registryKind, setRegistryKind, onContact, onToast }: { page: string; setPage: (page: string) => void; onLogin: () => void; onRegistry: () => void; registryRows: typeof registrySeed; query: string; setQuery: (value: string) => void; region: string; setRegion: (value: string) => void; registryKind: string; setRegistryKind: (value: string) => void; onContact: (name: string) => void; onToast: (text: string) => void }) {
  const links = ['Bosh sahifa', 'Mediatorlar reyestri', 'Hakamlik va arbitraj', 'Reyting', 'Statistika', 'Hududlar', 'Qonunchilik', 'Yo‘riqnomalar']
  return <div className="min-h-screen overflow-hidden bg-[#eef3f6] text-slate-950">
    <header className="relative z-10 border-b border-slate-200/70 bg-white px-3 backdrop-blur-lg sm:px-4"><div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center justify-between gap-2 sm:gap-5"><button onClick={() => setPage('Bosh sahifa')} className="flex min-w-0 shrink items-center gap-2.5 text-left sm:gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-900 text-white"><Handshake size={25}/></span><span className="min-w-0"><strong className="block truncate text-[11px] font-bold uppercase leading-4 tracking-tight sm:text-sm">“Nizolarni muqobil hal etish”</strong><span className="text-[9px] uppercase tracking-wide text-slate-500 sm:text-[10px]">Yagona elektron platformasi</span></span></button><nav className="hidden items-center gap-1 xl:flex">{links.map((link) => <button key={link} onClick={() => link === 'Mediatorlar reyestri' ? onRegistry() : setPage(link)} className={`whitespace-nowrap rounded-full px-3 py-2 text-[13px] transition ${page === link ? 'text-blue-900 font-semibold underline decoration-2 underline-offset-8' : 'text-slate-600 hover:text-blue-900'}`}>{link}</button>)}</nav><div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2"><a href="tel:1008" aria-label="Ishonch telefoni: 1008" title="Ishonch telefoni: 1008" className="hidden h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-blue-900 lg:inline-flex xl:hidden 2xl:inline-flex"><Phone size={14}/><span>1008</span></a><button onClick={() => onToast('Til sozlamasi: O‘zbekcha')} aria-label="Tilni tanlash" className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-blue-900"><span className="sm:hidden">UZ</span><span className="hidden sm:inline">O‘zbekcha</span><ChevronDown size={14}/></button><button onClick={onLogin} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-blue-900 py-1.5 pl-1.5 pr-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-950 sm:gap-2 sm:py-2 sm:pl-2 sm:pr-4 sm:text-sm"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15 text-white sm:h-9 sm:w-9"><LogIn size={17}/></span><span className="hidden sm:inline">Tizimga kirish</span></button></div></div><nav className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto pb-3 xl:hidden">{links.map((link) => <button key={link} onClick={() => link === 'Mediatorlar reyestri' ? onRegistry() : setPage(link)} className={`whitespace-nowrap rounded-sm px-3 py-1.5 text-xs ${page === link ? 'bg-blue-50 font-semibold text-blue-900' : 'text-slate-600'}`}>{link}</button>)}</nav></header>
    {page === 'Bosh sahifa' ? <>
      <section className="relative isolate overflow-hidden bg-[#082f5f] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(rgba(147,197,253,.2) 1px, transparent 1px)', backgroundSize: '22px 22px' }}/>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#12477d]/80 via-transparent to-[#061b36]/80"/>
        <div className="relative mx-auto grid max-w-[1420px] items-center gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.1fr_.9fr] md:gap-12 md:py-20 lg:px-10 lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200/20 bg-white/10 px-4 py-2 text-xs font-semibold text-sky-100"><Sparkles size={15} className="text-amber-400"/>O‘zbekiston Respublikasi Adliya vazirligi platformasi</div>
            <h1 className="max-w-3xl text-[2.65rem] font-bold leading-[1.04] tracking-tight sm:text-5xl lg:text-[3.65rem]">Nizolarni <span className="text-sky-300">tinch</span> va o‘zaro manfaatli hal eting</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-blue-100 sm:text-lg">Mediatsiya, hakamlik va arbitraj mutaxassislarini toping. Nizoni sudgacha kelishuv bilan hal etish yo‘lini tanlang.</p>
            <div className="mt-8 flex flex-wrap gap-3"><button onClick={() => onContact('')} className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-300"><Handshake size={18}/>Mediatsiyaga murojaat qilish<ArrowRight size={16}/></button><button onClick={onRegistry} className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"><Search size={17}/>Reyestrni ko‘rish</button></div>
          </div>
          <RegistrySearchBox query={query} setQuery={setQuery} region={region} setRegion={setRegion} kind={registryKind} setKind={setRegistryKind} onSearch={onRegistry}/>
        </div>
      </section>
      <PublicHomeSections onRegistry={onRegistry} setRegion={setRegion} setRegistryKind={setRegistryKind} onContact={onContact}/>
      <PublicFooter onLogin={onLogin} setPage={setPage}/>
    </> : <PublicInfoPage page={page} registryKind={registryKind} setRegistryKind={setRegistryKind} query={query} setQuery={setQuery} region={region} setRegion={setRegion} onRegistry={onRegistry} onLogin={onLogin} onToast={onToast} onContact={onContact}/>}
  </div>
}

function RegistrySearchBox({ query, setQuery, region, setRegion, kind, setKind, onSearch }: { query: string; setQuery: (v: string) => void; region: string; setRegion: (v: string) => void; kind: string; setKind: (v: string) => void; onSearch: () => void }) {
  return <aside className="w-full rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl shadow-slate-950/20 backdrop-blur-md sm:p-7">
    <h2 className="mb-1 flex items-center gap-2.5 text-lg font-bold text-white"><Search size={21} className="text-amber-400"/>Mutaxassisni tez topish</h2>
    <div className="mb-5 mt-4 flex max-w-full gap-1 overflow-x-auto border-b border-white/15">{['Mediatorlar','Hakamlik sudyalari','Arbitrlar'].map((tab)=><button key={tab} onClick={()=>setKind(tab)} className={`shrink-0 border-b-2 px-3 py-2.5 text-xs font-semibold transition sm:px-4 ${kind===tab?'border-amber-400 text-white':'border-transparent text-blue-100/75 hover:text-white'}`}>{tab}</button>)}</div>
    <div className="space-y-4">
      <label className="block text-xs font-semibold text-blue-50">F.I.Sh. yoki kalit so‘z<input aria-label="Mutaxassis nomi yoki ixtisosligi" value={query} onChange={(e)=>setQuery(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&onSearch()} placeholder="Masalan: Karimova, tijorat, oila..." className="mt-2 h-12 w-full rounded-xl border border-white/80 bg-white px-4 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-300/20"/></label>
      <label className="block text-xs font-semibold text-blue-50">Hududni tanlang<span className="relative mt-2 block"><select aria-label="Hududni tanlang" value={region} onChange={(e)=>setRegion(e.target.value)} className="h-12 w-full appearance-none rounded-xl border border-white/80 bg-white px-4 pr-10 text-sm font-normal text-slate-900 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-300/20"><option value="Barcha hududlar">Barcha hududlar (O‘zbekiston)</option>{['Toshkent shahri','Samarqand viloyati','Buxoro viloyati','Farg‘ona viloyati'].map((r)=><option key={r}>{r}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-700"/></span></label>
      <button onClick={onSearch} className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#0875cf] px-5 text-sm font-bold text-white shadow-md shadow-blue-950/20 transition hover:bg-[#0b83e3]"><Search size={18}/>Reyestrdan qidirish<ArrowRight size={16}/></button>
    </div>
  </aside>
}

function PublicHomeSections({ onRegistry, setRegion, setRegistryKind, onContact }: { onRegistry: () => void; setRegion: (region: string) => void; setRegistryKind: (kind: string) => void; onContact: (name: string) => void }) {
  const [content, setContent] = useState<Record<string, PublicContentItem[]>>({ news: [], announcements: [], legal_framework: [], templates: [], manuals: [], video_manuals: [], faq: [], mandatory_mediation: [] })
  const [contentErrors, setContentErrors] = useState<Record<string, boolean>>({})
  const [mapPoints, setMapPoints] = useState<PublicMapPoint[]>([])
  const [publicSpecialists, setPublicSpecialists] = useState<Record<'MEDIATOR' | 'ARBITRATION_JUDGE' | 'ARBITRATOR', PublicRatingItem[]>>({ MEDIATOR: [], ARBITRATION_JUDGE: [], ARBITRATOR: [] })
  const [leadingType, setLeadingType] = useState<'MEDIATOR' | 'ARBITRATION_JUDGE' | 'ARBITRATOR'>('MEDIATOR')
  const [statistics, setStatistics] = useState<PublicRegistryStatistics | null>(null)
  const [statisticsUnavailable, setStatisticsUnavailable] = useState(false)
  const [ratingErrors, setRatingErrors] = useState<Partial<Record<'MEDIATOR' | 'ARBITRATION_JUDGE' | 'ARBITRATOR', boolean>>>({})
  const [ratingMethodology, setRatingMethodology] = useState<PublicRatingMethodology | null>(null)
  const [ratingPeriod, setRatingPeriod] = useState<number | null>(null)
  const [regionTotals, setRegionTotals] = useState<Record<string, number>>({})
  const [selectedMapPoint, setSelectedMapPoint] = useState<PublicMapPoint | null>(null)
  const [contentLoaded, setContentLoaded] = useState(false)
  useEffect(() => {
    let active = true
    const types = ['news', 'announcements', 'legal_framework', 'templates', 'manuals', 'video_manuals', 'faq', 'mandatory_mediation']
    Promise.allSettled(types.map((type) => apiGetPublic<PublicContentList>(`/public/content/${type}?limit=4`))).then((results) => {
      if (!active) return
      const next: Record<string, PublicContentItem[]> = {}
      const errors: Record<string, boolean> = {}
      results.forEach((result, index) => { next[types[index]] = result.status === 'fulfilled' ? result.value.items : []; errors[types[index]] = result.status === 'rejected' })
      setContent((current) => ({ ...current, ...next }))
      setContentErrors(errors)
      setContentLoaded(true)
    })
    apiGetPublic<PublicMapPoint[]>('/public/mediators/map?type=MEDIATOR')
      .then((points) => { if (active) setMapPoints(points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))) })
      .catch(() => { if (active) setMapPoints([]) })
    Promise.allSettled([
      apiGetPublic<PublicRatingResponse>('/public/ratings?type=MEDIATOR&limit=3'),
      apiGetPublic<PublicRatingResponse>('/public/ratings?type=ARBITRATION_JUDGE&limit=3'),
      apiGetPublic<PublicRatingResponse>('/public/ratings?type=ARBITRATOR&limit=3'),
      apiGetPublic<PublicRegistryStatistics>('/public/statistics'),
      apiGetPublic<PublicRatingMethodology>('/public/ratings/methodology'),
    ]).then(([mediators, judges, arbitrators, publicStats, methodology]) => {
      if (!active) return
      setPublicSpecialists({
        MEDIATOR: mediators.status === 'fulfilled' ? mediators.value.items || [] : [],
        ARBITRATION_JUDGE: judges.status === 'fulfilled' ? judges.value.items || [] : [],
        ARBITRATOR: arbitrators.status === 'fulfilled' ? arbitrators.value.items || [] : [],
      })
      setRatingErrors({ MEDIATOR: mediators.status === 'rejected', ARBITRATION_JUDGE: judges.status === 'rejected', ARBITRATOR: arbitrators.status === 'rejected' })
      const period = [mediators, judges, arbitrators].find((result) => result.status === 'fulfilled')
      if (period?.status === 'fulfilled') setRatingPeriod(period.value.periodYear)
      if (publicStats.status === 'fulfilled') {
        setStatistics(publicStats.value)
        setRegionTotals(publicStats.value.byRegion || {})
      } else setStatisticsUnavailable(true)
      if (methodology.status === 'fulfilled') setRatingMethodology(methodology.value)
    })
    return () => { active = false }
  }, [])

  const publicSpecialistsTotal = statistics?.publicSpecialistsTotal ?? (statistics?.registryByType ? Object.values(statistics.registryByType).reduce<number>((sum, value) => sum + (value || 0), 0) : null)
  const coveredRegions = Object.keys(regionTotals).length
  const statisticsUpdatedAt = statistics?.generatedAt && !Number.isNaN(Date.parse(statistics.generatedAt))
    ? new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(statistics.generatedAt))
    : null
  const leadingSpecialists = publicSpecialists[leadingType].filter((item) => item.rating?.score != null).slice(0, 3)
  const registryLabel = { MEDIATOR: 'Mediatorlar', ARBITRATION_JUDGE: 'Hakamlik sudyalari', ARBITRATOR: 'Arbitrlar' }[leadingType]
  const faqs = content.faq.length ? content.faq.map((item) => ({ question: item.titleUz, answer: item.bodyUz || item.summaryUz || '' })) : publicFaqFallbacks
  const materials = [...content.templates, ...content.manuals, ...content.video_manuals]
  const latestUpdates = [...content.news, ...content.announcements].sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()).slice(0, 3)

  return <>
    <section className="relative z-10 mx-auto -mt-7 max-w-[1420px] px-5 sm:px-8 lg:px-10">
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
        {[[statistics ? String(publicSpecialistsTotal ?? '—') : '—', 'Faol mutaxassislar', 'Ochiq reyestr bo‘yicha', 'text-blue-800'], [statistics ? String(statistics.mediationCasesTotal ?? '—') : '—', 'Mediatsiya murojaatlari', 'Umumiy soni', 'text-emerald-600'], [statistics ? String(statistics.mediationCasesSettled ?? '—') : '—', 'Yakunlangan mediatsiyalar', 'Kelishuv bilan yakunlangan', 'text-amber-500'], [statistics ? String(coveredRegions) : '—', 'Hudud qamrovi', 'Faol mediatorlar mavjud hududlar', 'text-violet-600']].map(([value, label, detail, color]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-4 text-center"><p className={`text-3xl font-bold tracking-tight ${color}`}>{value}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p><p className="mt-1 text-[11px] text-slate-400">{detail}</p></div>)}
      </div>
      <p className="mt-2 text-right text-[11px] text-slate-400">{statisticsUpdatedAt ? `Ko‘rsatkichlar hisoblangan vaqt: ${statisticsUpdatedAt}` : statisticsUnavailable ? 'Statistika ma’lumoti vaqtincha mavjud emas' : 'Statistika ma’lumoti yuklanmoqda'}</p>
    </section>

    <section className="bg-slate-50 px-5 pb-10 pt-12 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1420px]">
        <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Muqobil hal etish yo‘llari</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Nizo turiga mos xizmatni tanlang</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Nizo va taraflarning ehtiyojiga qarab mediatsiya, hakamlik yoki arbitraj tartibi bilan tanishing.</p></div>
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Handshake size={21}/></span><h3 className="mt-4 text-base font-bold text-slate-900">Mediatsiya</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">Taraflar mediator ko‘magida nizoni kelishuv asosida hal qilish uchun murojaat yuboradi.</p><button onClick={() => onContact('')} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-800 hover:text-blue-950">Murojaat boshlash<ArrowRight size={15}/></button></article>
          <article id="mandatory-mediation" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><FileCheck2 size={21}/></span><h3 className="mt-4 text-base font-bold text-slate-900">Majburiy sudgacha mediatsiya</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">Qonunchilikda belgilangan holatlarda sudgacha mediatsiya tartibi va tegishli toifalar bilan tanishing.</p><a href="#mandatory-guidance" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-800 hover:text-blue-950">Toifalar va yo‘riqnoma<ArrowRight size={15}/></a></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-800"><Gavel size={21}/></span><h3 className="mt-4 text-base font-bold text-slate-900">Hakamlik va arbitraj</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">Hakamlik muhokamasi va arbitraj bo‘yicha tartib, mutaxassislar hamda hujjat namunalari.</p><button onClick={() => { setRegistryKind('Hakamlik sudyalari'); onRegistry() }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-800 hover:text-blue-950">Mutaxassislarni topish<ArrowRight size={15}/></button></article>
        </div>
      </div>
    </section>

    <section id="mandatory-guidance" className="scroll-mt-24 bg-white px-5 py-12 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1420px]"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-amber-700">Sudgacha tartib</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Majburiy mediatsiya toifalari</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Toifalar va talablar vakolatli organ tasdiqlagan, nashr qilingan ma’lumotlar asosida ko‘rsatiladi.</p></div></div>
        {content.mandatory_mediation.length ? <div className="grid gap-3 md:grid-cols-2">{content.mandatory_mediation.slice(0, 6).map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5"><h3 className="text-sm font-bold text-slate-900">{item.titleUz}</h3>{item.summaryUz && <p className="mt-2 text-sm leading-6 text-slate-600">{item.summaryUz}</p>}{item.bodyUz && <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-500">{item.bodyUz}</p>}{item.fileUrl && <a href={item.fileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-800 hover:underline">Tegishli hujjatni ochish<ArrowUpRight size={14}/></a>}</article>)}</div> : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5"><p className="text-sm font-semibold text-slate-800">{contentErrors.mandatory_mediation ? 'Majburiy mediatsiya ma’lumotini yuklab bo‘lmadi' : 'Toifalar hali e’lon qilinmagan'}</p><p className="mt-1 text-sm leading-6 text-slate-500">{contentErrors.mandatory_mediation ? 'Keyinroq qayta urinib ko‘ring.' : 'Vakolatli organ tasdiqlagan ma’lumotlar nashr qilingach, toifalar va yo‘riqnomalar shu yerda ko‘rinadi. Muayyan nizoga tatbiq etilishini amaldagi qonunchilik bo‘yicha tekshiring.'}</p></div>}
      </div>
    </section>

    <section className="bg-slate-50 px-5 py-12 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1420px]"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Jarayon</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Platformadan foydalanish tartibi</h2></div><ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['1', 'Tizimga kiring', 'OneID yoki mavjud identifikatsiya usuli orqali shaxsni tasdiqlang.'], ['2', 'Nizo yo‘lini tanlang', 'Mediatsiya, sudgacha mediatsiya yoki hakamlik/arbitraj bo‘limini tanlang.'], ['3', 'Murojaatni yuboring', 'Nizo haqida zarur ma’lumotni kiriting va mutaxassisni tanlang.'], ['4', 'Jarayonni kuzating', 'Kabinetda xabarnomalar, uchrashuvlar va hujjatlar bilan ishlang.']].map(([number, title, detail]) => <li key={number} className="rounded-xl border border-slate-200 bg-white p-5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-900 text-sm font-bold text-white">{number}</span><h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></li>)}</ol></div></section>

    <section className="bg-slate-50 px-5 pb-12 pt-16 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1420px] rounded-3xl bg-gradient-to-br from-[#101b31] to-[#082f5f] p-5 text-white shadow-xl shadow-slate-900/10 sm:p-8 lg:p-10">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-amber-400">Interaktiv xarita</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Hududlar bo‘yicha mediatorlar</h2><p className="mt-2 text-sm text-blue-100/70">Hududni tanlab, reyestrdagi mutaxassislarni ko‘ring.</p></div><button onClick={onRegistry} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white transition hover:bg-white/15 sm:self-auto"><MapPin size={15} className="text-amber-400"/>To‘liq reyestr<ArrowRight size={14}/></button></div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_.8fr]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#dcebf0]">
            <svg viewBox="0 0 1000 600" role="img" aria-label="Mediatorlar manzillari ko‘rsatilgan O‘zbekiston xaritasi" className="block h-[300px] w-full sm:h-[420px]">
              <defs><linearGradient id="mapWater" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#e9f3f4"/><stop offset="1" stopColor="#c7dfe7"/></linearGradient></defs>
              <rect width="1000" height="600" fill="url(#mapWater)"/>
              <path d="M94 241 L142 179 L218 159 L278 184 L351 144 L420 162 L477 127 L559 158 L631 145 L701 180 L776 170 L844 206 L817 247 L880 273 L843 315 L882 354 L829 377 L806 425 L757 417 L725 455 L676 448 L647 483 L592 467 L551 442 L489 451 L433 431 L389 452 L343 423 L297 428 L260 399 L208 403 L172 376 L129 367 L151 330 L112 306 L135 275 Z" fill="#f3ead6" stroke="#ffffff" strokeWidth="8" strokeLinejoin="round"/>
              <path d="M235 202 L267 257 L238 310 L279 356 M351 161 L368 222 L336 272 L365 328 L344 419 M477 139 L468 206 L503 259 L479 318 L513 376 L490 447 M620 154 L598 215 L638 259 L612 312 L659 370 L644 465 M751 181 L728 240 L768 286 L733 343 L790 397" fill="none" stroke="#d7c9ad" strokeWidth="4" strokeDasharray="8 7"/>
              {mapPoints.map((point) => {
                const x = 94 + ((point.longitude - 55.5) / 19) * 790
                const y = 127 + ((46.5 - point.latitude) / 10) * 350
                const selected = selectedMapPoint?.id === point.id
                return <g key={point.id} role="button" tabIndex={0} aria-label={`${point.fullName}, ${point.region}`} onClick={() => setSelectedMapPoint(point)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedMapPoint(point) }} className="cursor-pointer"><circle cx={x} cy={y} r={selected ? 17 : 12} fill="#0b4d78" fillOpacity=".18"/><circle cx={x} cy={y} r={selected ? 9 : 7} fill={selected ? '#f59e0b' : '#0875cf'} stroke="#ffffff" strokeWidth="4"/><title>{point.fullName} · {point.region}</title></g>
              })}
              <text x="62" y="555" fill="#425d67" fontSize="20" fontWeight="600">Mediatorlar manzili koordinatalar asosida</text>
            </svg>
          </div>
          <div className="flex min-h-[300px] flex-col rounded-2xl border border-white/10 bg-white/[.07] p-4 sm:p-5">
            {selectedMapPoint ? <><p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Tanlangan mediator</p><h3 className="mt-3 text-lg font-bold text-white">{selectedMapPoint.fullName}</h3><p className="mt-1 text-sm text-blue-100/75">{selectedMapPoint.region}</p><p className="mt-3 text-xs leading-5 text-blue-100/70">{selectedMapPoint.address || 'Manzil qo‘shilmagan'}</p>{selectedMapPoint.phone && <a className="mt-2 text-xs text-amber-200 hover:underline" href={`tel:${selectedMapPoint.phone}`}>{selectedMapPoint.phone}</a>}{selectedMapPoint.specialization?.length > 0 && <p className="mt-3 text-xs leading-5 text-blue-100/70">Ixtisoslik: {selectedMapPoint.specialization.join(', ')}</p>}<a className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-amber-300 hover:text-amber-200" href={`https://www.openstreetmap.org/?mlat=${selectedMapPoint.latitude}&mlon=${selectedMapPoint.longitude}#map=12/${selectedMapPoint.latitude}/${selectedMapPoint.longitude}`} target="_blank" rel="noreferrer">Xaritada ochish<ArrowUpRight size={15}/></a></> : <><p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Mediatorlar xaritasi</p><h3 className="mt-3 text-lg font-bold text-white">{mapPoints.length ? `${mapPoints.length} ta manzil` : 'Koordinatalar kiritilmagan'}</h3><p className="mt-2 text-sm leading-6 text-blue-100/70">Xaritadagi belgini tanlab, mediatorning hududi va manzilini ko‘ring. Reyestr yozuviga koordinata kiritilgach, belgi xaritada avtomatik chiqadi.</p><div className="mt-4 grid grid-cols-2 gap-2">{publicRegions.map(([regionName, shortName]) => <button key={regionName} onClick={() => { setRegion(regionName); onRegistry() }} className="rounded-lg border border-white/10 bg-white/[.06] px-3 py-2 text-left text-xs font-semibold text-slate-100 hover:bg-white/10">{shortName}<span className="ml-2 text-amber-300">{mapPoints.filter((point) => point.region.toLocaleLowerCase('uz').includes(shortName.toLocaleLowerCase('uz'))).length}</span></button>)}</div></>}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-blue-100/50">Xarita nuqtalari ochiq reyestrdagi faol mediatorlar koordinatalaridan olinadi.</p>
      </div>
    </section>

    <section className="bg-slate-50 px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1420px]">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Ochiq reyting</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Mutaxassislar reytingi</h2><p className="mt-2 text-sm text-slate-500">Reyestrdagi mediator, hakamlik sudyasi va arbitrlar reytingi.</p></div><button onClick={() => { setRegistryKind(registryLabel); onRegistry() }} className="inline-flex items-center gap-2 self-start text-sm font-semibold text-blue-800 hover:text-blue-950">Reyestrni ochish<ArrowRight size={16}/></button></div>
        <div className="mb-5 flex flex-wrap gap-2">{([['MEDIATOR', 'Mediatorlar'], ['ARBITRATION_JUDGE', 'Hakamlik sudyalari'], ['ARBITRATOR', 'Arbitrlar']] as const).map(([type, label]) => <button key={type} onClick={() => setLeadingType(type)} aria-pressed={leadingType === type} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${leadingType === type ? 'bg-blue-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}>{label}</button>)}</div>
        <div className="grid gap-4 md:grid-cols-3">{leadingSpecialists.map(({ profile: person, rating }) => <article key={person.id} className="flex min-h-52 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-900">{person.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('')}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{person.fullName}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12}/>{person.region}</p><p className="mt-1 text-[10px] text-slate-400">Reyting davri: {rating?.periodYear || ratingPeriod || '—'}</p></div><span className="flex items-center gap-1 text-sm font-bold text-slate-800"><Star size={14} className="fill-amber-400 text-amber-400"/>{Number(rating?.score).toFixed(1)}</span></div><div className="mt-5 flex flex-wrap gap-2">{(person.specialization || []).slice(0, 2).map((specialty) => <span key={specialty} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">{specialty}</span>)}</div><div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-xs text-slate-500">Reyestr № {person.registryNumber || '—'}</span><button onClick={() => { if (leadingType === 'MEDIATOR') onContact(person.fullName); else { setRegistryKind(registryLabel); onRegistry() } }} className="rounded-lg bg-blue-800 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-900">{leadingType === 'MEDIATOR' ? 'Mediatsiyaga murojaat' : 'Reyestrda ko‘rish'}</button></div></article>)}</div>
        {!leadingSpecialists.length && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">{ratingErrors[leadingType] ? `${registryLabel} reytingini yuklab bo‘lmadi.` : `${registryLabel} bo‘yicha reyting shakllanmagan.`}</p>}
        <details className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3"><summary className="cursor-pointer text-sm font-semibold text-slate-800">Reyting metodikasi</summary><div className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500"><p>{ratingMethodology?.description || 'Reyting metodikasi yuklanmoqda.'}</p>{ratingMethodology && <p className="mt-2">Mezonlar: hisobot intizomi {ratingMethodology.reportComplianceWeight ?? '—'}%, nizolarni yakunlash {ratingMethodology.resolutionRateWeight ?? '—'}%, kelishuv ijrosi {ratingMethodology.agreementExecutionWeight ?? '—'}%. Yangilangan: {ratingMethodology.updatedAt ? formatPublicDate(ratingMethodology.updatedAt) : 'tasdiqlanishi kutilmoqda'}.</p>}</div></details>
      </div>
    </section>

    <section className="bg-slate-50 px-5 py-12 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-[1420px] gap-8 lg:grid-cols-[1.55fr_1fr]">
        <div><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">So‘nggi xabarlar</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Yangiliklar va e’lonlar</h2></div>
          <div className="space-y-3">{latestUpdates.length ? latestUpdates.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800"><Newspaper size={18}/></span><div className="min-w-0"><p className="text-[11px] font-medium text-blue-700">{formatPublicDate(item.publishedAt)}</p><h3 className="mt-1 text-sm font-bold text-slate-900">{item.titleUz}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.summaryUz || item.bodyUz}</p></div></div></article>) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6"><p className="text-sm font-semibold text-slate-800">{contentLoaded ? contentErrors.news && contentErrors.announcements ? 'Yangiliklar va e’lonlarni yuklab bo‘lmadi' : 'Hozircha yangiliklar joylanmagan' : 'Yangiliklar yuklanmoqda'}</p><p className="mt-1 text-xs leading-5 text-slate-500">Nashr qilingan yangiliklar va e’lonlar shu bo‘limda ko‘rinadi.</p></div>}</div>
        </div>
        <div><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Rasmiy manbalar</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Huquqiy baza</h2></div>
          <div className="space-y-3"><a href="https://www.lex.uz/mact/-3805227" target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"><span><span className="block text-sm font-bold text-slate-900">“Mediatsiya to‘g‘risida”gi Qonun</span><span className="mt-1 block text-xs text-slate-500">O‘RQ-482 · LexUZ</span></span><ArrowUpRight size={17} className="shrink-0 text-blue-700"/></a>{content.legal_framework.slice(0, 3).map((item) => <a key={item.id} href={item.fileUrl || '#legal-framework'} target={item.fileUrl ? '_blank' : undefined} rel={item.fileUrl ? 'noreferrer' : undefined} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{item.titleUz}</span><span className="mt-1 block truncate text-xs text-slate-500">{item.summaryUz || 'Huquqiy hujjat'}</span></span><ArrowUpRight size={17} className="shrink-0 text-blue-700"/></a>)}</div>
        </div>
      </div>
    </section>

    <section className="bg-slate-50 px-5 py-12 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl"><div className="mb-7 text-center"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Yordam</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Ko‘p beriladigan savollar</h2></div><div className="space-y-3">{faqs.slice(0, 6).map((faq, index) => <details key={`${faq.question}-${index}`} className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 open:shadow-sm"><summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-semibold text-slate-800"><CircleHelp size={18} className="shrink-0 text-blue-700"/><span className="flex-1">{faq.question}</span><ChevronDown size={17} className="shrink-0 text-slate-400 transition group-open:rotate-180"/></summary><p className="ml-8 mt-3 max-w-3xl text-sm leading-6 text-slate-600">{faq.answer}</p></details>)}</div><p className="mt-4 text-center text-[11px] text-slate-400">Huquqiy ma’lumot: <a className="font-medium text-blue-700 hover:underline" href="https://www.lex.uz/mact/-3805227" target="_blank" rel="noreferrer">“Mediatsiya to‘g‘risida”gi Qonun</a>.</p></div>
    </section>

    {materials.length > 0 && <section className="bg-slate-50 px-5 pb-14 pt-4 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1420px]"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Foydali materiallar</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Namunalar va qo‘llanmalar</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{materials.slice(0, 6).map((item) => <a key={item.id} href={item.fileUrl || '#materials'} target={item.fileUrl ? '_blank' : undefined} rel={item.fileUrl ? 'noreferrer' : undefined} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 hover:border-blue-300"><FileText size={18} className="shrink-0 text-blue-700"/>{item.titleUz}<ArrowUpRight size={15} className="ml-auto shrink-0 text-slate-400"/></a>)}</div></div></section>}
  </>
}

function formatPublicDate(value?: string | null) {
  if (!value) return 'Yangilik'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Yangilik' : new Intl.DateTimeFormat('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

const publicLegalMaterialTypes = ['legal_framework', 'templates']
const publicGuideMaterialTypes = ['manuals', 'video_manuals']

function PublicMaterialsPage({ title, types }: { title: string; types: string[] }) {
  const [items, setItems] = useState<PublicContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    Promise.allSettled(types.map((type) => apiGetPublic<PublicContentList>(`/public/content/${type}?limit=30`))).then((results) => {
      if (!active) return
      setItems(results.flatMap((result) => result.status === 'fulfilled' ? result.value.items || [] : []).sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()))
      setFailed(results.every((result) => result.status === 'rejected'))
      setLoading(false)
    })
    return () => { active = false }
  }, [types])
  return <section className="min-h-[calc(100vh-130px)] bg-slate-50 px-5 py-10 sm:px-10"><div className="mx-auto max-w-5xl"><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Ochiq ma’lumotlar</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">Nashr qilingan rasmiy materiallar va foydalanish bo‘yicha yo‘riqnomalar.</p>{loading ? <p className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Materiallar yuklanmoqda…</p> : failed ? <p role="alert" className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">Materiallarni yuklab bo‘lmadi. Keyinroq qayta urinib ko‘ring.</p> : items.length ? <div className="mt-8 space-y-3">{items.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold text-slate-900">{item.titleUz}</h2>{item.summaryUz && <p className="mt-2 text-sm text-slate-600">{item.summaryUz}</p>}{item.bodyUz && <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-500">{item.bodyUz}</p>}<div className="mt-3 flex flex-wrap gap-4">{item.fileUrl && <a href={item.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-800 hover:underline">Hujjatni ochish</a>}{item.videoUrl && <a href={item.videoUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-800 hover:underline">Videoni ko‘rish</a>}</div></article>)}</div> : <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Bu bo‘limda hozircha nashr qilingan material yo‘q.</p>}</div></section>
}

function PublicStatisticsPage() {
  const [statistics, setStatistics] = useState<PublicRegistryStatistics | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    apiGetPublic<PublicRegistryStatistics>('/public/statistics').then((result) => { if (active) setStatistics(result) }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [])
  const typeLabels = { MEDIATOR: 'Mediatorlar', ARBITRATION_JUDGE: 'Hakamlik sudyalari', ARBITRATOR: 'Arbitrlar' }
  const registryByType = statistics?.registryByType || {}
  return <section className="min-h-[calc(100vh-130px)] bg-slate-50 px-5 py-10 sm:px-10"><div className="mx-auto max-w-5xl"><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Ochiq ma’lumotlar</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Statistika</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">Shaxssizlantirilgan reyestr va mediatsiya ko‘rsatkichlari.</p>{failed ? <p role="alert" className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">Statistika ma’lumotini yuklab bo‘lmadi. Keyinroq qayta urinib ko‘ring.</p> : !statistics ? <p className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Ko‘rsatkichlar yuklanmoqda…</p> : <><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[statistics.publicSpecialistsTotal ?? '—', 'Faol mutaxassislar'], [statistics.mediationCasesTotal ?? '—', 'Mediatsiya murojaatlari'], [statistics.mediationCasesSettled ?? '—', 'Yakunlangan mediatsiyalar'], [statistics.mandatoryMediationCases ?? '—', 'Majburiy mediatsiya ishlari']].map(([value, label]) => <article key={String(label)} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-3xl font-bold text-blue-900">{value}</p><p className="mt-2 text-xs font-semibold uppercase text-slate-500">{label}</p></article>)}</div><div className="mt-6 grid gap-5 md:grid-cols-2"><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold text-slate-900">Mutaxassislar turi bo‘yicha</h2><dl className="mt-4 space-y-3">{(Object.entries(typeLabels) as [keyof typeof typeLabels, string][]).map(([type, label]) => <div key={type} className="flex justify-between border-b border-slate-100 pb-2 text-sm"><dt className="text-slate-600">{label}</dt><dd className="font-semibold text-slate-900">{registryByType[type] ?? 0}</dd></div>)}</dl></section><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold text-slate-900">Mediatorlar hududlar bo‘yicha</h2><dl className="mt-4 max-h-64 space-y-3 overflow-auto">{Object.entries(statistics.byRegion || {}).sort((a, b) => b[1] - a[1]).map(([regionName, count]) => <div key={regionName} className="flex justify-between border-b border-slate-100 pb-2 text-sm"><dt className="text-slate-600">{regionName}</dt><dd className="font-semibold text-slate-900">{count}</dd></div>)}{!Object.keys(statistics.byRegion || {}).length && <p className="text-sm text-slate-500">Hududiy ma’lumot topilmadi.</p>}</dl></section></div><p className="mt-4 text-right text-[11px] text-slate-400">Hisoblangan vaqt: {statistics.generatedAt ? formatPublicDate(statistics.generatedAt) : '—'}</p></>}</div></section>
}

function PublicRatingsPage({ setRegistryKind, onRegistry, onContact }: { setRegistryKind: (kind: string) => void; onRegistry: () => void; onContact: (name: string) => void }) {
  const [type, setType] = useState<'MEDIATOR' | 'ARBITRATION_JUDGE' | 'ARBITRATOR'>('MEDIATOR')
  const [data, setData] = useState<PublicRatingResponse | null>(null)
  const [methodology, setMethodology] = useState<PublicRatingMethodology | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const labels = { MEDIATOR: 'Mediatorlar', ARBITRATION_JUDGE: 'Hakamlik sudyalari', ARBITRATOR: 'Arbitrlar' }
  useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)
    apiGetPublic<PublicRatingResponse>(`/public/ratings?type=${type}&limit=100`)
      .then((result) => { if (active) setData(result) })
      .catch(() => { if (active) { setData(null); setFailed(true) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [type])
  useEffect(() => {
    let active = true
    apiGetPublic<PublicRatingMethodology>('/public/ratings/methodology').then((result) => { if (active) setMethodology(result) }).catch(() => { if (active) setMethodology(null) })
    return () => { active = false }
  }, [])
  return <section className="min-h-[calc(100vh-130px)] bg-slate-50 px-5 py-10 sm:px-10"><div className="mx-auto max-w-6xl"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Ochiq ma’lumotlar</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Mutaxassislar reytingi</h1><p className="mt-3 text-sm leading-6 text-slate-500">Ochiq profillar bo‘yicha amaldagi davr reytingi va uni hisoblash metodikasi.</p></div><span className="text-xs text-slate-500">Reyting davri: {data?.periodYear || '—'}</span></div><div className="mt-7 flex flex-wrap gap-2" role="tablist" aria-label="Mutaxassis turi">{(Object.entries(labels) as [keyof typeof labels, string][]).map(([key, label]) => <button key={key} role="tab" aria-selected={type === key} onClick={() => setType(key)} className={`rounded-full px-4 py-2 text-xs font-semibold ${type === key ? 'bg-blue-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{label}</button>)}</div>{failed ? <p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Reytingni yuklab bo‘lmadi. Keyinroq qayta urinib ko‘ring.</p> : loading ? <p className="mt-5 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Reyting yuklanmoqda…</p> : data?.items.length ? <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">{data.items.map(({ profile, rating }) => <article key={profile.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-slate-900">{profile.fullName}</h2><p className="mt-1 text-xs text-slate-500">{profile.region} · {profile.specialization?.join(', ') || 'Ixtisoslik ko‘rsatilmagan'} · Reyestr № {profile.registryNumber || '—'}</p></div><div className="flex items-center gap-3"><span className="text-xs font-semibold text-slate-700">{rating ? `★ ${Number(rating.score).toFixed(1)}` : 'Reyting shakllanmagan'}</span><button onClick={() => { if (type === 'MEDIATOR') onContact(profile.fullName); else { setRegistryKind(labels[type]); onRegistry() } }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-slate-50">{type === 'MEDIATOR' ? 'Murojaat qilish' : 'Reyestrda ko‘rish'}</button></div></article>)}</div> : <p className="mt-5 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">{labels[type]} bo‘yicha reyting profillari topilmadi.</p>}<details className="mt-5 rounded-xl border border-slate-200 bg-white px-5 py-4"><summary className="cursor-pointer text-sm font-semibold text-slate-800">Reyting metodikasi</summary><div className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500"><p>{methodology?.description || 'Metodika ma’lumoti mavjud emas.'}</p>{methodology && <p className="mt-2">Holati: {methodology.status === 'DRAFT' ? 'Dastlabki loyiha, tasdiqlanishi kutilmoqda' : methodology.status || '—'}. Mezonlar vazni: hisobot intizomi {methodology.reportComplianceWeight ?? '—'}%, nizolarni yakunlash {methodology.resolutionRateWeight ?? '—'}%, kelishuv ijrosi {methodology.agreementExecutionWeight ?? '—'}%.</p>}</div></details></div></section>
}

function PublicInfoPage({ page, registryKind, setRegistryKind, query, setQuery, region, setRegion, onRegistry, onLogin, onToast, onContact }: { page: string; registryKind: string; setRegistryKind: (value: string) => void; query: string; setQuery: (value: string) => void; region: string; setRegion: (value: string) => void; onRegistry: () => void; onLogin: () => void; onToast: (text: string) => void; onContact: (name: string) => void }) {
  if (page === 'Mediatorlar reyestri') return <PublicRegistryDirectory registryKind={registryKind} setRegistryKind={setRegistryKind} query={query} setQuery={setQuery} region={region} setRegion={setRegion} onLogin={onLogin} onContact={onContact}/>
  if (page === 'Statistika') return <PublicStatisticsPage />
  if (page === 'Reyting') return <PublicRatingsPage setRegistryKind={setRegistryKind} onRegistry={onRegistry} onContact={onContact} />
  if (page === 'Qonunchilik') return <PublicMaterialsPage title="Qonunchilik va hujjat namunalari" types={publicLegalMaterialTypes} />
  if (page === 'Yo‘riqnomalar') return <PublicMaterialsPage title="Qo‘llanmalar va video yo‘riqnomalar" types={publicGuideMaterialTypes} />
  const source = registryKind === 'Hakamlik sudyalari' ? judgesSeed : registryKind === 'Arbitrlar' ? arbitratorsSeed : registrySeed
  const results = source.filter((item) => [item.name, item.specialty, item.region].join(' ').toLocaleLowerCase('uz').includes(query.toLocaleLowerCase('uz')) && (region === 'Barcha hududlar' || item.region === region))
  if (page === 'Mediatorlar reyestri') return <section className="min-h-[calc(100vh-130px)] bg-slate-50 px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl"><button onClick={onRegistry} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={16}/>Bosh sahifa</button><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Ochiq ma’lumotlar</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">{registryKind}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Reyestr mutaxassislarini ism, ixtisoslik va hudud bo‘yicha toping.</p></div><button onClick={onLogin} className="inline-flex h-11 items-center gap-2 rounded-md bg-blue-800 px-5 text-sm font-semibold text-white hover:bg-blue-900">Kabinetga kirish<LogIn size={16}/></button></div><div className="mt-7 flex gap-2">{['Mediatorlar','Hakamlik sudyalari','Arbitrlar'].map(kind=><button key={kind} onClick={()=>setRegistryKind(kind)} className={`rounded-none border-b-2 px-4 py-2 text-xs font-semibold ${registryKind===kind?'border-blue-800 text-blue-900':'border-transparent text-slate-600'}`}>{kind}</button>)}</div><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_240px]"><label className="relative"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="F.I.Sh., hudud yoki ixtisoslik" className="h-12 w-full rounded-md border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"/></label><select value={region} onChange={(e)=>setRegion(e.target.value)} className="h-12 rounded-md border border-slate-300 bg-white px-4 text-sm outline-none"><option>Barcha hududlar</option>{['Toshkent shahri','Samarqand viloyati','Buxoro viloyati','Farg‘ona viloyati'].map((r)=><option key={r}>{r}</option>)}</select></div><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{results.map((person)=><article key={person.id} className="border border-slate-200 bg-white p-5"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-sm bg-slate-100 text-sm font-semibold text-slate-800">{person.initials}</span><div><h2 className="font-semibold">{person.name}</h2><span className="mt-1 inline-flex items-center gap-1 rounded-sm bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"><span className="h-1.5 w-1.5 rounded-full bg-slate-500"/>{person.status}</span></div></div><span className="inline-flex items-center gap-1 text-xs font-semibold"><Star size={14} className="fill-amber-400 text-amber-400"/>{person.rating}</span></div><p className="mt-5 text-sm font-medium text-slate-700">{person.specialty}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><MapPin size={13}/>{person.region}</span><span>{person.experience} tajriba</span></div><div className="mt-5 flex gap-2 border-t border-slate-100 pt-4"><button onClick={()=>onToast(`${person.name} profili ochildi`)} className="flex-1 rounded-md border border-slate-300 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Profilni ko‘rish</button><button onClick={()=>onContact(person.name)} className="flex-1 rounded-md bg-blue-800 py-2 text-xs font-semibold text-white hover:bg-blue-900">Murojaat qilish</button></div></article>)}</div>{results.length===0&&<EmptyState title="Mutaxassis topilmadi" detail="Qidiruv so‘zini o‘zgartirib ko‘ring."/>}<div className="mt-7 border border-slate-200 bg-white p-5 text-slate-900"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="font-semibold">Xaritada ko‘rish</p><p className="mt-1 text-xs text-slate-500">Hududingizdagi reyestr mutaxassislarini xarita ko‘rinishida izlang.</p></div><button onClick={()=>onToast('Xarita demo ko‘rinishi — geolokatsiya integratsiyasi keyin ulanadi')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-blue-800 hover:bg-slate-50"><MapPin size={15}/>Xaritani ochish</button></div></div></div></section>
  const descriptions: Record<string,string> = { 'Hakamlik va arbitraj':'Hakamlik sudi va arbitraj tartib-taomillari, elektron hujjatlar va mutaxassislar reyestri haqida.', 'Reyting':'Mutaxassislar faoliyati bo‘yicha ochiq reyting ko‘rsatkichlari. Reyting mezonlari tasdiqlangach hisob-kitob ulanadi.', 'Statistika':'Platformadagi mediatsiya murojaatlari va yakunlangan jarayonlar bo‘yicha umumiy ko‘rsatkichlar.', 'Hududlar':'Hududlar kesimida mediatorlar va muqobil nizolarni hal etish xizmatlari.', 'Qonunchilik':'Mediatsiya va nizolarni muqobil hal etishga oid normativ-huquqiy hujjatlar, namunalar va yo‘riqnomalar.' }
  return <div className="min-h-[calc(100vh-130px)] bg-slate-50 px-5 py-10 sm:px-10"><div className="mx-auto max-w-5xl"><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Ochiq platforma</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{page}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{descriptions[page] || 'Platforma xizmatlari va foydali ma’lumotlar.'}</p><div className="mt-9 grid gap-4 sm:grid-cols-3">{[['Mediatorlar reyestri',Users],['Onlayn mediatsiya',Video],['Huquqiy ma’lumotlar',BookOpen]].map(([title,Icon])=><button key={String(title)} onClick={String(title)==='Mediatorlar reyestri'?onRegistry:onLogin} className="border border-slate-200 bg-white p-5 text-left transition hover:border-blue-300 hover:bg-slate-50"><Icon size={22} className="text-blue-800"/><strong className="mt-4 block text-sm">{String(title)}</strong><span className="mt-2 block text-xs leading-5 text-slate-500">Kerakli xizmatga o‘tish va ma’lumot bilan tanishish.</span><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold">Ochish<ArrowRight size={14}/></span></button>)}</div><div className="mt-8 border border-slate-200 bg-white p-6"><h2 className="font-semibold">Xizmatlar haqida</h2><p className="mt-2 text-sm leading-6 text-slate-500">Interfeys demo rejimida ishlaydi. OneID, ERI, billing, SMS, sud va videokonferensiya bilan ulanishlar integratsiya hujjatlari taqdim etilgach ulanadi.</p><button onClick={onLogin} className="mt-4 rounded-md bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900">Kabinetga kirish</button></div></div></div>
}

function PublicFooter({ onLogin, setPage }: { onLogin: () => void; setPage: (p: string) => void }) {
  return <footer className="bg-slate-950 px-5 py-10 text-white md:px-10"><div className="mx-auto grid max-w-[1420px] gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"><div><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-slate-950"><Handshake size={22}/></span><strong className="text-sm">Nizolarni muqobil hal etish</strong></div><p className="mt-4 max-w-sm text-xs leading-5 text-slate-400">Fuqarolar va tashkilotlar uchun nizolarni tinch yo‘l bilan hal etishning yagona elektron platformasi.</p></div>{[['Platforma','Bosh sahifa','Mediatorlar reyestri','Statistika'],['Foydali ma’lumotlar','Qonunchilik','Hududlar','Reyting'],['Kabinetlar','Tizimga kirish','Administrator','Mediator']].map(([title,...items])=><div key={title}><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p><div className="mt-3 space-y-2">{items.map((item)=><button key={item} onClick={item==='Tizimga kirish'||item==='Administrator'||item==='Mediator'?onLogin:()=>setPage(item)} className="block text-left text-sm text-slate-300 hover:text-white">{item}</button>)}</div></div>)}</div><div className="mx-auto mt-8 max-w-[1420px] border-t border-white/10 pt-5 text-xs text-slate-500">© 2026 Nizolarni muqobil hal etish elektron platformasi</div></footer>
}

function RolePicker({ initialRoles, onClose, onChoose }: { initialRoles: RoleKey[]; onClose: () => void; onChoose: (roles: RoleKey[]) => void }) {
  const currentGroup = cabinetGroups.find((group) => initialRoles.some((role) => group.roles.includes(role)))
  return <ModalShell onClose={onClose}>
    <div className="bg-slate-950 px-7 py-6 text-white sm:px-8">
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-emerald-300">Demo ko‘rinishi</p>
      <h2 className="mt-2 text-2xl font-semibold">Kabinet turini tanlang</h2>
      <p className="mt-1 text-sm text-slate-400">To‘rtta kabinetdan biriga kiring. Rolni kabinet ichidagi yuqori o‘ng menyudan tanlaysiz.</p>
      <button onClick={onClose} className="absolute right-5 top-5 rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label="Yopish"><X size={20}/></button>
    </div>
    <div className="max-h-[68vh] overflow-y-auto p-5 sm:p-7">
      <div className="grid gap-3 sm:grid-cols-2">
        {cabinetGroups.map((group) => {
          const firstRole = roles.find((item) => item.key === group.roles[0])!
          const Icon = firstRole.icon
          const isCurrentGroup = currentGroup?.title === group.title
          return <button key={group.title} type="button" onClick={() => onChoose(group.roles)} className={`flex min-h-24 items-center gap-3 rounded-xl border p-4 text-left transition ${isCurrentGroup ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'}`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon size={20}/></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm font-semibold text-slate-900">{group.title}</strong><span className="mt-1 block text-xs leading-4 text-slate-500">{group.summary}</span><span className="mt-1.5 block text-[11px] font-medium text-slate-400">Ichida {group.roles.length} ta rol mavjud</span></span>
            <ArrowRight size={17} className="shrink-0 text-slate-400"/>
          </button>
        })}
      </div>
    </div>
    <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row">
      <p className="w-full text-center text-[11px] leading-4 text-slate-400">Demo tanlovi interfeysni ko‘rsatadi. Kabinetga kirgach, faqat shu kabinet rollari yuqori o‘ngdagi menyuda chiqadi; haqiqiy tizimda rollar tasdiqlangan vakolatdan olinadi.</p>
    </div>
  </ModalShell>
}

type Organization = { id: string; name: string; type: string; parent: string; region: string; active: boolean }
function OrganizationsAdmin({ onToast }: { onToast: (text: string) => void }) {
  const [rows, setRows] = useState<Organization[]>(() => {
    try { const saved = localStorage.getItem('nizolar.demo.organizations'); return saved ? JSON.parse(saved) as Organization[] : [
      { id: 'ORG-001', name: 'Adliya vazirligi', type: 'Vazirlik', parent: '—', region: 'Toshkent shahri', active: true },
      { id: 'ORG-002', name: 'Toshkent shahar adliya boshqarmasi', type: 'Hududiy boshqarma', parent: 'Adliya vazirligi', region: 'Toshkent shahri', active: true },
      { id: 'ORG-003', name: 'Samarqand viloyat adliya boshqarmasi', type: 'Hududiy boshqarma', parent: 'Adliya vazirligi', region: 'Samarqand viloyati', active: true },
      { id: 'ORG-004', name: 'Mediatorlar malakasini oshirish markazi', type: 'Ta’lim muassasasi', parent: 'Adliya vazirligi', region: 'Toshkent shahri', active: false },
    ] } catch { return [] }
  })
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('Barchasi')
  const [editing, setEditing] = useState<Organization | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'Hududiy boshqarma', parent: 'Adliya vazirligi', region: 'Toshkent shahri', active: true })
  useEffect(() => { localStorage.setItem('nizolar.demo.organizations', JSON.stringify(rows)) }, [rows])
  const visible = rows.filter(row => (!query || [row.name,row.type,row.parent,row.region].join(' ').toLocaleLowerCase('uz').includes(query.toLocaleLowerCase('uz'))) && (statusFilter === 'Barchasi' || (statusFilter === 'Faol') === row.active))
  const openForm = (row?: Organization) => { setEditing(row ?? null); setFormOpen(true); setForm(row ? { name: row.name, type: row.type, parent: row.parent, region: row.region, active: row.active } : { name: '', type: 'Hududiy boshqarma', parent: 'Adliya vazirligi', region: 'Toshkent shahri', active: true }) }
  const closeForm = () => { setFormOpen(false); setEditing(null) }
  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (editing) { setRows(items => items.map(row => row.id === editing.id ? { ...row, ...form } : row)); onToast('Tashkilot ma’lumotlari yangilandi') } else { setRows(items => [{ id: `ORG-${String(Date.now()).slice(-4)}`, ...form }, ...items]); onToast('Tashkilot qo‘shildi') } closeForm() }
  const remove = (row: Organization) => { setRows(items => items.filter(item => item.id !== row.id)); onToast(`${row.name} ro‘yxatdan o‘chirildi`) }
  return <>
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tashkilotlar</h1><p className="mt-1 text-sm text-slate-500">Platformaga ulangan tashkilotlar va ularning holati.</p></div><button onClick={() => openForm()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"><span className="text-lg leading-none">+</span> Qo‘shish</button></div>
    <div className="mb-5 grid gap-4 sm:grid-cols-3">{[['Jami tashkilotlar', rows.length], ['Faol', rows.filter(row=>row.active).length], ['Faolsiz', rows.filter(row=>!row.active).length]].map(([label,value])=><div key={String(label)} className="rounded-xl bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p></div>)}</div>
    <section className="overflow-hidden rounded-xl bg-white shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center"><div><h2 className="text-sm font-semibold text-slate-900">Tashkilotlar ro‘yxati</h2><p className="mt-1 text-xs text-slate-500">{visible.length} ta tashkilot</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={event=>setQuery(event.target.value)} aria-label="Tashkilotlarni qidirish" placeholder="Tashkilotni qidirish" className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400 sm:w-64"/></label><select value={statusFilter} onChange={event=>setStatusFilter(event.target.value)} aria-label="Holat bo‘yicha filtr" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-blue-400"><option>Barchasi</option><option>Faol</option><option>Faolsiz</option></select></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50"><tr>{['Nomi','Turi','Yuqori tashkilot','Hudud','Holati','Amallar'].map(column=><th key={column} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{column}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visible.map(row=><tr key={row.id} className="transition-colors hover:bg-slate-50"><td className="px-5 py-4"><p className="text-sm font-medium text-slate-900">{row.name}</p><p className="mt-0.5 text-xs text-slate-400">{row.id}</p></td><td className="px-5 py-4 text-sm text-slate-600">{row.type}</td><td className="px-5 py-4 text-sm text-slate-600">{row.parent}</td><td className="px-5 py-4 text-sm text-slate-600">{row.region}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${row.active?'bg-green-100 text-green-700':'bg-slate-100 text-slate-600'}`}>{row.active?'Faol':'Faolsiz'}</span></td><td className="px-5 py-4"><div className="flex items-center gap-1"><button onClick={()=>openForm(row)} aria-label={`${row.name} tahrirlash`} className="rounded-md p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"><Pencil size={16}/></button><button onClick={()=>remove(row)} aria-label={`${row.name} o‘chirish`} className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{visible.length===0&&<EmptyState title="Tashkilot topilmadi" detail="Qidiruv so‘zi yoki holat filtrini o‘zgartiring."/>}</div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><span>{rows.length} ta tashkilotdan {visible.length} tasi ko‘rsatilmoqda</span><span>Demo ma’lumotlar</span></div>
    </section>
    {formOpen && <ModalShell onClose={closeForm}><div className="border-b border-slate-100 px-6 py-5"><button onClick={closeForm} aria-label="Yopish" className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button><h2 className="text-lg font-semibold">{editing?'Tashkilotni tahrirlash':'Tashkilot qo‘shish'}</h2><p className="mt-1 text-sm text-slate-500">Tashkilot ma’lumotlarini kiriting.</p></div><form onSubmit={save} className="space-y-4 p-6"><label className="block text-xs font-semibold text-slate-600">Tashkilot nomi<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="form-control mt-1.5" placeholder="Masalan, Toshkent shahar adliya boshqarmasi"/></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-600">Turi<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="form-control mt-1.5"><option>Vazirlik</option><option>Hududiy boshqarma</option><option>Ta’lim muassasasi</option><option>Komissiya</option><option>Boshqa</option></select></label><label className="block text-xs font-semibold text-slate-600">Hudud<select value={form.region} onChange={e=>setForm({...form,region:e.target.value})} className="form-control mt-1.5">{['Toshkent shahri','Toshkent viloyati','Samarqand viloyati','Buxoro viloyati','Farg‘ona viloyati','Qoraqalpog‘iston Respublikasi'].map(region=><option key={region}>{region}</option>)}</select></label></div><label className="block text-xs font-semibold text-slate-600">Yuqori tashkilot<input value={form.parent} onChange={e=>setForm({...form,parent:e.target.value})} className="form-control mt-1.5"/></label><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"/> Faol tashkilot</label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={closeForm} className="h-10 rounded-lg border border-slate-200 px-4 text-sm">Bekor qilish</button><button type="submit" className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">Saqlash</button></div></form></ModalShell>}
  </>
}

function WorkspaceContent({ role, page, cases, applications, reports, genericItems, onOpenModal, onNavigatePage, onAdvanceCase, onAdvanceApplication, onAdvanceReport, onToast, onPublicRegistry, onSelectSpecialist, onStartCourtClaimMediation }: { role: RoleKey; page: string; cases: PortalRecord[]; applications: PortalRecord[]; reports: PortalRecord[]; genericItems: PortalRecord[]; onOpenModal: (key: string) => void; onNavigatePage: (page: string) => void; onAdvanceCase: (id: string) => void; onAdvanceApplication: (id: string) => void; onAdvanceReport: (id: string) => void; onToast: (text: string) => void; onPublicRegistry: () => void; onSelectSpecialist: (person: { id: string; fullName: string; type: string }) => void; onStartCourtClaimMediation: (courtCaseNumber: string) => void }) {
  if (role === 'ADMIN' && page === 'Tashkilotlar') return <OrganizationsAdmin onToast={onToast}/>
  if (page === 'Umumiy ko‘rsatkich') return <Overview role={role} cases={cases} applications={applications} reports={reports} onOpenModal={onOpenModal} onNavigatePage={onNavigatePage} onPublicRegistry={onPublicRegistry}/>
  if (page === 'Mediatorlar reyestri') return <section><PageHeading eyebrow="Ochiq va ichki reyestr" title={page} description="Reyestr ma’lumotlarini ko‘ring, qidiring va profilga o‘ting."/><RegistryInside role={role} onToast={onToast} onSelectSpecialist={onSelectSpecialist}/></section>
  if (['CITIZEN', 'BUSINESS'].includes(role) && page === 'Sud da’volari') return <CourtClaimsWorkspace onStartMediation={onStartCourtClaimMediation}/>
  if (['CITIZEN', 'BUSINESS'].includes(role) && page === 'Shaxsiy ma’lumotlar') return <CitizenProfileWorkspace onToast={onToast}/>
  if (['CITIZEN', 'BUSINESS'].includes(role) && page === 'To‘lovlar') return <BusinessPaymentsWorkspace/>
  if (role === 'BUSINESS' && page === 'Tashkilot profili') return <BusinessWorkspace onToast={onToast}/>
  if (['CITIZEN', 'BUSINESS'].includes(role) && page === 'Kelishuvlar ijrosi') return <ObligationMonitoringWorkspace onToast={onToast}/>
  if (/bildirish|xabarnoma/i.test(page)) return <NotificationsWorkspace onToast={onToast}/>
  if (page === 'Hujjat almashinuvi') return <DocumentExchangeWorkspace role={role} onToast={onToast}/>
  if (['APPLICANT', 'CITIZEN', 'BUSINESS'].includes(role) && /ariza|talabgor|mediator bo‘lish/i.test(page)) return <MkApplicationWorkspace role={role} demoItems={applications} onCreate={()=>onOpenModal('ariza')}/>
  if (role === 'COMMISSION' && ['Nomzodlar', 'Imtihonlar', 'Elektron byulleten', 'Bayonnomalar'].includes(page)) return <ExamPage role={role} page={page} onToast={onToast}/>
  if (role === 'MEDIATOR' && page === 'Arizalar') return <MediatorApplicationsWorkspace onToast={onToast}/>
  if (page === 'Onlayn uchrashuvlar' || /mediatsiya|tashkilot nizolari/i.test(page)) return <MtsWorkspace role={role} demoItems={cases} onCreate={()=>onOpenModal('mediatsiya')} onToast={onToast}/>
  if (/arbitraj ishlari|hakamlik ishlari/i.test(page)) return <RecordPage title={page} subtitle="Nizolar va mediatsiya jarayonlari bosqichma-bosqich boshqariladi." items={cases} actionLabel="Yangi murojaat" onCreate={()=>onOpenModal('mediatsiya')} onAdvance={onAdvanceCase} actionText="Jarayonni davom ettirish" progressSteps={mediationSteps} onToast={onToast}/>
  if (/ariza|talabgor|nomzodlar/i.test(page)) return <RecordPage title={page} subtitle="Mediator maqomiga ariza yuborish va ko‘rib chiqish bosqichlari." items={applications} actionLabel={role==='APPLICANT'?'Ariza yuborish':'Ariza qo‘shish'} onCreate={()=>onOpenModal('ariza')} onAdvance={onAdvanceApplication} actionText={role==='APPLICANT'?'Keyingi bosqich':'Ko‘rib chiqish'} progressSteps={applicationSteps} onToast={onToast}/>
  if (/hisobot|statistika/i.test(page)) return <ReportsPage title={page} items={reports} onCreate={()=>onOpenModal('hisobot')} onAdvance={onAdvanceReport} role={role}/>
  if (page === 'Imtihon' || page === 'Imtihonlar' || page === 'Elektron byulleten' || page === 'Bayonnomalar') return <ExamPage role={role} page={page} onToast={onToast}/>
  if (/portfolio|profil/i.test(page)) return <ProfileWorkspace onToast={onToast}/>
  if (/reyestrdan chiqish|malaka oshirish/i.test(page)) return <TrainingWorkspace role={role} onToast={onToast}/>
  if (/shartnoma|hujjat/i.test(page)) return <ContractsWorkspace role={role} onToast={onToast}/>
  if (/yozishma/i.test(page)) return <MessagesWorkspace onToast={onToast}/>
  if (/kalendar/i.test(page)) return <CalendarWorkspace onToast={onToast}/>
  if (/kontent|e’lon/i.test(page)) return <ContentWorkspace role={role} onToast={onToast}/>
  if (/tashkilot|foydalanuvchi|spravochnik|audit|sozlam/i.test(page)) return <GenericModule title={page} description="Ma’muriy boshqaruv bo‘limi. O‘zgarishlar demo holatda saqlanadi." icon={Settings} items={genericItems} onCreate={()=>onOpenModal(page.toLowerCase())} onToast={onToast} action={page==='Audit jurnali'?'Tafsilotlar':'Tahrirlash'}/>
  return <GenericModule title={page} description="Ushbu bo‘limdagi amallar demo rejimida ishlaydi." icon={LayoutDashboard} items={genericItems} onCreate={()=>onOpenModal(page.toLowerCase())} onToast={onToast} action="Batafsil"/>
}

function Overview({ role, cases, applications, reports, onOpenModal, onNavigatePage, onPublicRegistry }: { role: RoleKey; cases: PortalRecord[]; applications: PortalRecord[]; reports: PortalRecord[]; onOpenModal: (key: string) => void; onNavigatePage: (page: string) => void; onPublicRegistry: () => void }) {
  const roleTitle = roles.find(r=>r.key===role)?.title || 'Kabinet'
  const isMediationClient = role === 'CITIZEN' || role === 'BUSINESS'
  const stats: Metric[] = role==='MEDIATOR' ? [['Ochiq ishlar',cases.filter(x=>x.status!=='Yakunlandi').length,'faol jarayon',Handshake],['Yakunlangan',cases.filter(x=>x.status==='Yakunlandi').length,'muvaffaqiyatli ishlar',Check],['Xabarnomalar',2,'yangi xabarlar',Bell]] : role==='APPLICANT' ? [['Mediatorlik arizalari',applications.length,'ko‘rib chiqilayotgan arizalar',FileCheck2],['Imtihon bosqichi',applications.filter(x=>/imtihon/i.test(x.status)).length,'malaka imtihoniga oid',GraduationCap],['Xabarnomalar',2,'ariza va imtihon xabarlari',Bell]] : role==='COMMISSION' ? [['Arizalar',applications.length,'jarayonlarda',FileCheck2],['Imtihon bosqichi',applications.filter(x=>/imtihon/i.test(x.status)).length,'ko‘rib chiqish kerak',GraduationCap],['Reyestr',registrySeed.length,'demo mutaxassis',Users]] : isMediationClient ? [['Faol mediatsiyalar',cases.filter(x=>x.status!=='Yakunlandi').length,'siz yuborgan murojaatlar',Handshake],['Mediatorlar reyestri',registrySeed.length,'mutaxassislar',Users],['Shartnomalar',0,'imzolash va ko‘rish',FileText]] : [['Reyestr mutaxassislari',registrySeed.length,'ochiq reyestr',Users],['Faol mediatsiyalar',cases.filter(x=>x.status!=='Yakunlandi').length,'joriy jarayon',Handshake],['Hisobotlar',reports.length,'hisobotlar oqimi',ClipboardList]]
  const shortcuts: [string, string, typeof UserRound, () => void][] = isMediationClient
    ? [['Mediatorni tanlash','Ochiq reyestrdan qidiring',Users,onPublicRegistry],['Mediatsiya boshlash','Fuqaro yoki tashkilot nomidan murojaat',Handshake,()=>onOpenModal('mediatsiya')],['Mediatsiyalarim','Murojaat holatini kuzatish',FileClock,()=>onNavigatePage('Mediatsiyalarim')],['Shartnomalar','Mediatsiya hujjatlarini ko‘rish',FileText,()=>onNavigatePage('Shartnomalar')]]
    : role === 'APPLICANT'
      ? [['Mediatorlik arizasini yuborish','Maqom olish uchun hujjatlar',FileCheck2,()=>onOpenModal('ariza')],['Ariza holati','Ko‘rib chiqish bosqichlarini ko‘rish',FileClock,()=>onNavigatePage('Mediator arizam')],['Malaka imtihoni','Imtihon sanasi va natijasi',GraduationCap,()=>onNavigatePage('Imtihon')],['Shartnomalar','Mediatsiya bo‘yicha hujjatlar',FileText,()=>onNavigatePage('Shartnomalar')]]
      : role === 'MEDIATOR'
        ? [['Mediatsiyalarim','Biriktirilgan ishlar',Handshake,()=>onNavigatePage('Mediatsiyalar')],['Profil va portfolio','Kasbiy ma’lumotlar',User,()=>onNavigatePage('Profil va portfolio')]]
        : []
  const primaryAction = isMediationClient ? { label: 'Yangi mediatsiya murojaati', modal: 'mediatsiya', icon: Handshake } : role === 'APPLICANT' ? { label: 'Mediator maqomiga ariza', modal: 'ariza', icon: FileCheck2 } : null
  const PrimaryActionIcon = primaryAction?.icon
  const activity = role === 'APPLICANT' ? applications.slice(0, 3) : isMediationClient ? cases.slice(0, 3) : [...cases.slice(0, 2), ...applications.slice(0, 1)]
  return <><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><PageHeading eyebrow="Shaxsiy kabinet" title="Xush kelibsiz" description={`${roleTitle} uchun ish maydoni va asosiy ko‘rsatkichlar.`}/><div className="flex flex-wrap gap-2">{primaryAction && PrimaryActionIcon && <button onClick={()=>onOpenModal(primaryAction.modal)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"><PrimaryActionIcon size={16}/>{primaryAction.label}</button>}{['MEDIATOR','REGIONAL','MINISTRY'].includes(role) && <button onClick={()=>onOpenModal('hisobot')} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ClipboardList size={16}/>Hisobot</button>}</div></div><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{stats.map(([label,value,detail,Icon])=><div key={String(label)} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{String(label)}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{String(value).padStart(2,'0')}</p></div><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Icon size={20}/></span></div><p className="mt-3 text-xs text-slate-400">{String(detail)}</p></div>)}</section><div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_.8fr]"><section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-center justify-between"><div><h2 className="font-semibold">{role === 'APPLICANT' ? 'Mediatorlik arizalarim' : isMediationClient ? 'Mediatsiya murojaatlarim' : 'So‘nggi faoliyat'}</h2><p className="mt-1 text-xs text-slate-400">{role === 'APPLICANT' ? 'Mediator maqomi va imtihon bosqichlari' : isMediationClient ? 'Siz yuborgan murojaatlarning holati' : 'Mediatsiya va ariza jarayonlari'}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Demo ma’lumot</span></div><div className="mt-4 divide-y divide-slate-100">{activity.map((item)=><div key={item.id} className="flex items-start gap-3 py-4"><span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><FileClock size={17}/></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.id} · {item.status}</p></div><span className="text-[11px] text-slate-400">{item.createdAt}</span></div>)}</div></section><section className="rounded-2xl bg-slate-950 p-5 text-white"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Tezkor amallar</p><p className="mt-1 text-xs text-slate-400">{role === 'APPLICANT' ? 'Mediator maqomi uchun ariza va imtihon' : isMediationClient ? 'Murojaat va mediator tanlash' : 'Kabinet amallari'}</p></div><Sparkles size={18} className="text-emerald-300"/></div><div className="mt-4 space-y-2">{shortcuts.map(([title,sub,Icon,action])=><button key={title} onClick={action} className="flex w-full items-center gap-3 rounded-xl bg-white/[.07] p-3 text-left transition hover:bg-white/[.12]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-300/15 text-emerald-200"><Icon size={17}/></span><span className="flex-1"><strong className="block text-xs font-semibold">{title}</strong><span className="mt-1 block text-[11px] text-slate-400">{sub}</span></span><ArrowUpRight size={15} className="text-slate-400"/></button>)}</div>{shortcuts.length===0 && <p className="mt-4 rounded-xl bg-white/[.07] p-3 text-xs leading-5 text-slate-300">Bu kabinetda tezkor amallar yo‘q. Kerakli bo‘limni chap menyudan tanlang.</p>}</section></div><div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4"><CircleHelp size={18} className="mt-0.5 shrink-0 text-blue-700"/><p className="text-xs leading-5 text-blue-900">Demo rejimida kiritilgan o‘zgarishlar faqat ushbu brauzerda saqlanadi. Davlat tizimlari, billing, SMS, OneID va ERI integratsiyalari ulanmagan.</p></div></>
}

function RecordPage({ title, subtitle, items, actionLabel, onCreate, onAdvance, actionText, progressSteps, onToast }: { title: string; subtitle: string; items: PortalRecord[]; actionLabel: string; onCreate: () => void; onAdvance: (id: string) => void; actionText: string; progressSteps: string[]; onToast: (text: string) => void }) {
  const [filter, setFilter] = useState('Barchasi')
  const visible = items.filter(i=>filter==='Barchasi'||i.status===filter)
  const finalStep = progressSteps[progressSteps.length - 1]
  return <><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><PageHeading eyebrow="Jarayonlar" title={title} description={subtitle}/><button onClick={onCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"><FilePlus2 size={16}/>{actionLabel}</button></div><div className="mb-4 flex flex-wrap gap-2">{['Barchasi',...Array.from(new Set(items.map(i=>i.status)))].map(status=><button key={status} onClick={()=>setFilter(status)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter===status?'bg-slate-950 text-white':'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'}`}>{status}</button>)}</div><section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70"><div className="divide-y divide-slate-100">{visible.map((item)=><article key={item.id} className="p-5 transition hover:bg-slate-50/70"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Handshake size={19}/></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.title}</h2><StatusPill status={item.status}/></div><p className="mt-1 text-xs text-slate-500">{item.id} · {item.region || 'Hudud ko‘rsatilmagan'} · {item.createdAt}</p><p className="mt-2 text-sm text-slate-600">{item.detail}</p></div></div><button onClick={()=>item.status===finalStep?onToast('Jarayon yakunlangan'):onAdvance(item.id)} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-emerald-200 hover:bg-emerald-50">{item.status===finalStep?'Tafsilotlar':actionText}<ArrowRight size={14}/></button></div><div className="mt-4 flex items-center overflow-x-auto pb-1">{progressSteps.map((step,index)=>{const active=progressSteps.indexOf(item.status)>=index; return <div key={step} className="flex min-w-max items-center"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${active?'bg-emerald-600 text-white':'bg-slate-100 text-slate-400'}`}>{active?<Check size={13}/>:index+1}</span><span className={`ml-1.5 mr-2 text-[10px] ${active?'font-medium text-slate-700':'text-slate-400'}`}>{step}</span>{index<progressSteps.length-1&&<span className={`mr-2 h-px w-5 ${active?'bg-emerald-400':'bg-slate-200'}`}/>}</div>})}</div></article>)}</div>{visible.length===0&&<EmptyState title="Jarayon topilmadi" detail="Filtrni o‘zgartiring yoki yangi yozuv qo‘shing."/>}<div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">{visible.length} ta yozuv · holat bosqichini tugma orqali yangilash mumkin</div></section></>
}

function ReportsPage({ title, items, onCreate, onAdvance, role }: { title: string; items: PortalRecord[]; onCreate: () => void; onAdvance: (id: string) => void; role: RoleKey }) {
  return <ReportsWorkspace title={title} items={items} onCreate={onCreate} onAdvance={onAdvance} role={role}/>
}

function ExamPage({ role, page, onToast }: { role: RoleKey; page: string; onToast: (text: string) => void }) {
  return <ExamWorkspace role={role} page={page} onToast={onToast}/>
}

function ProfilePage({ onToast, onCreate }: { onToast: (text: string) => void; onCreate: () => void }) {
  return <><PageHeading eyebrow="Mutaxassis profili" title="Profil va portfolio" description="Ochiq reyestrda ko‘rsatiladigan ma’lumotlar va kasbiy tajriba."/><div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-center gap-4"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-semibold text-emerald-900">DF</span><div><h2 className="text-lg font-semibold">Demo Foydalanuvchi</h2><p className="mt-1 text-sm text-slate-500">Faol mediator · Toshkent shahri</p></div></div><div className="mt-6 space-y-3 text-sm"><InfoRow label="Ixtisoslik" value="Fuqarolik va shartnomaviy nizolar"/><InfoRow label="Tajriba" value="8 yil"/><InfoRow label="Reyestr holati" value="Faol"/></div><button onClick={()=>onToast('Profil ma’lumotlarini tahrirlash formasi ochildi')} className="mt-5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Profilni tahrirlash</button></section><section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Kasbiy portfolio</h2><p className="mt-1 text-xs text-slate-500">Mutaxassislik, tajriba va yutuqlar</p></div><button onClick={onCreate} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">+ Qo‘shish</button></div><div className="mt-4 space-y-3">{[['Mediatsiya bo‘yicha malaka guvohnomasi','2022'],['Fuqarolik nizolari bo‘yicha tajriba','8 yil'],['Malaka oshirish kursi','2025']].map(([title,year])=><div key={title} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-700"><FileCheck2 size={17}/></span><span className="flex-1"><strong className="block text-xs">{title}</strong><span className="mt-1 block text-[11px] text-slate-500">{year}</span></span><Check size={16} className="text-emerald-600"/></div>)}</div></section></div></>
}

function TrainingPage({ onCreate, onToast }: { onCreate: () => void; onToast: (text: string) => void }) {
  return <><div className="mb-6 flex justify-between gap-4"><PageHeading eyebrow="Kasbiy rivojlanish" title="Malaka oshirish" description="O‘quv kurslari, ariza, shartnoma va sertifikatlar."/><button onClick={onCreate} className="h-10 shrink-0 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">Ariza berish</button></div><div className="grid gap-4 lg:grid-cols-2">{[['Mediatsiyada muzokara olib borish','72 soat · Yuristlar malakasini oshirish markazi','Qabul davom etmoqda'],['Elektron mediatsiya amaliyoti','36 soat · TDYU','Rejalashtirilgan']].map(([title,sub,status])=><article key={title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><GraduationCap size={20}/></span><StatusPill status={status}/></div><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-500">{sub}</p><button onClick={()=>onToast('Kursga ariza demo rejimida yuborildi')} className="mt-5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold hover:bg-slate-50">Kurs haqida</button></article>)}</div><section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><h2 className="font-semibold">Sertifikatlarim</h2><div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-4"><FileCheck2 size={20} className="text-emerald-700"/><div className="flex-1"><p className="text-sm font-medium">Mediator malaka sertifikati</p><p className="mt-1 text-xs text-slate-500">Demo · 2025</p></div><button onClick={()=>onToast('Sertifikat demo hujjati ochildi')} className="text-xs font-semibold text-blue-700">Ko‘rish</button></div></section></>
}

function CalendarPage({ onToast, onCreate }: { onToast: (text: string) => void; onCreate: () => void }) {
  return <><div className="mb-6 flex justify-between"><PageHeading eyebrow="Uchrashuvlar" title="Kalendar" description="Mediatsiya uchrashuvlari va muhim muddatlar."/><button onClick={onCreate} className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">Uchrashuv belgilash</button></div><div className="grid gap-5 lg:grid-cols-[1fr_320px]"><section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-center justify-between"><h2 className="font-semibold">2026-yil oktyabr</h2><div className="flex gap-2"><button onClick={()=>onToast('Oldingi oy')} className="rounded-lg border px-2 py-1"><ArrowLeft size={15}/></button><button onClick={()=>onToast('Keyingi oy')} className="rounded-lg border px-2 py-1"><ArrowRight size={15}/></button></div></div><div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">{['Du','Se','Ch','Pa','Ju','Sh','Ya'].map(x=><span key={x} className="py-2 font-semibold text-slate-400">{x}</span>)}{Array.from({length:35},(_,i)=><button key={i} onClick={()=>onToast(`${i+1} oktyabr sanasi tanlandi`)} className={`relative h-10 rounded-lg text-sm ${i===22?'bg-slate-950 font-semibold text-white':i===17||i===29?'bg-emerald-50 font-semibold text-emerald-800':'text-slate-600 hover:bg-slate-100'}`}>{i<3?'':i-2}{(i===17||i===22||i===29)&&<span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${i===22?'bg-white':'bg-emerald-500'}`}/>}</button>)}</div></section><section className="rounded-2xl bg-slate-950 p-5 text-white"><h2 className="font-semibold">Yaqin uchrashuvlar</h2><div className="mt-4 space-y-3">{[['Bugun · 14:00','Shartnoma nizosi','Onlayn mediatsiya'],['29-oktyabr · 10:30','Oilaviy nizo','Toshkent shahri']].map(([date,title,sub])=><div key={date} className="rounded-xl bg-white/[.08] p-3"><span className="text-[11px] text-emerald-200">{date}</span><p className="mt-1 text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-slate-400">{sub}</p></div>)}</div></section></div></>
}

function GenericModule({ title, description, icon: Icon, items, onCreate, onToast, action }: { title: string; description: string; icon: typeof FileText; items: PortalRecord[]; onCreate: () => void; onToast: (text: string) => void; action: string }) {
  return <><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><PageHeading eyebrow="Platforma bo‘limi" title={title} description={description}/><button onClick={onCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"><FilePlus2 size={16}/>{title.includes('Bildirish')||title.includes('Xabarnoma')?'Barchasini o‘qish':'Yangi qo‘shish'}</button></div><div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><p className="text-xs text-slate-500">Jami yozuvlar</p><p className="mt-2 text-2xl font-semibold">{items.length}</p></div><div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><p className="text-xs text-slate-500">Faol</p><p className="mt-2 text-2xl font-semibold">{items.filter(i=>!i.status.includes('o‘qilgan')).length}</p></div><div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><p className="text-xs text-slate-500">Yangilangan</p><p className="mt-2 text-2xl font-semibold">Bugun</p></div></div><section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70"><div className="flex items-center gap-3 border-b border-slate-100 p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Icon size={19}/></span><div><h2 className="text-sm font-semibold">{title} ro‘yxati</h2><p className="mt-1 text-xs text-slate-400">Yozuvlarni ko‘rish va amallarni bajarish</p></div></div>{items.length===0?<EmptyState title="Hozircha ma’lumot yo‘q" detail="Yangi yozuv qo‘shish orqali demo oqimini ko‘ring."/>:<div className="divide-y divide-slate-100">{items.map(item=><div key={item.id} className="flex items-center gap-3 p-4 sm:p-5"><span className="hidden h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 sm:flex"><Icon size={17}/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-1 truncate text-xs text-slate-500">{item.id} · {item.detail}</p></div><StatusPill status={item.status}/><button onClick={()=>onToast(`${item.title}: tafsilotlar ochildi`)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50">{action}</button></div>)}</div>}</section></>
}

function RegistryInside({ role, onToast, onSelectSpecialist }: { role: RoleKey; onToast: (text: string) => void; onSelectSpecialist: (person: { id: string; fullName: string; type: string }) => void }) {
  if (role === 'CITIZEN' || role === 'BUSINESS') return <BusinessSpecialistDirectory businessMode={role === 'BUSINESS'} onSelectSpecialist={onSelectSpecialist}/>
  return <StaffRegistryWorkspace demoRows={registrySeed} onToast={onToast}/>
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-700">{eyebrow}</p><h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[28px]">{title}</h1><p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p></div> }
function InfoRow({label,value}:{label:string;value:string}) { return <div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><span className="text-slate-500">{label}</span><span className="text-right font-medium">{value}</span></div> }
function StatusPill({status}:{status:string}) { const green=/Faol|Yakun|imzol|Ko‘rib chiqildi|Kiritildi/i.test(status); const amber=/kutil|jarayon|yubor|belgil|ruxsat|qoralama/i.test(status); return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-medium ${green?'bg-emerald-50 text-emerald-700':amber?'bg-amber-50 text-amber-700':'bg-slate-100 text-slate-600'}`}>{status}</span> }
function EmptyState({title,detail}:{title:string;detail:string}) { return <div className="px-6 py-14 text-center"><Search className="mx-auto mb-3 text-slate-300" size={27}/><p className="text-sm font-semibold text-slate-700">{title}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div> }
function Toast({text}:{text:string}) { return <div role="status" className="fixed bottom-5 right-5 z-[70] flex max-w-[calc(100vw-40px)] items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-xl"><Check size={17} className="shrink-0 text-emerald-300"/>{text}</div> }
function ModalShell({children,onClose}:{children:React.ReactNode;onClose:()=>void}) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section role="dialog" aria-modal="true" className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">{children}</section></div> }
function FormModal({title,description,name,setName,detail,setDetail,submitLabel,onClose,onSubmit}:{title:string;description:string;name:string;setName:(v:string)=>void;detail:string;setDetail:(v:string)=>void;submitLabel:string;onClose:()=>void;onSubmit:(e:FormEvent<HTMLFormElement>)=>void}) { return <ModalShell onClose={onClose}><div className="border-b border-slate-100 px-6 py-5"><button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Yopish"><X size={18}/></button><h2 className="pr-8 text-lg font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div><form onSubmit={onSubmit} className="space-y-4 p-6"><label className="block text-xs font-semibold text-slate-600">Nomi yoki mavzu<input required maxLength={160} value={name} onChange={e=>setName(e.target.value)} className="form-control mt-1.5" placeholder="Qisqa nom kiriting"/></label><label className="block text-xs font-semibold text-slate-600">Izoh va tafsilotlar<textarea value={detail} onChange={e=>setDetail(e.target.value)} maxLength={1000} className="mt-1.5 min-h-28 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" placeholder="Kerakli ma’lumotlarni yozing"/></label><div className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">Demo: bu amal tashqi tizimga yuborilmaydi, faqat brauzerda saqlanadi.</div><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium">Bekor qilish</button><button type="submit" className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">{submitLabel}</button></div></form></ModalShell> }
function navIcon(label:string) { if(/Umumiy/.test(label))return LayoutDashboard;if(/reyestr|nomzod|foydalanuvchi/i.test(label))return Users;if(/mediatsiya|ishlari|nizo/i.test(label))return Handshake;if(/kelishuv|ijro/i.test(label))return CheckCheck;if(/hisobot|statistika/i.test(label))return ClipboardList;if(/imtihon|komissiya|malaka/i.test(label))return GraduationCap;if(/shartnoma|hujjat/i.test(label))return FileText;if(/yozishma/i.test(label))return MessageSquare;if(/kalendar/i.test(label))return CalendarDays;if(/kontent|e’lon/i.test(label))return Newspaper;if(/audit/i.test(label))return FileClock;if(/sozlama|spravochnik/i.test(label))return Settings;if(/profil/i.test(label))return User;return BriefcaseBusiness }
function modalTitle(key:string) { if(/ariza|talabgor/.test(key))return 'Ariza yaratish';if(/hisobot/.test(key))return 'Hisobot yaratish';if(/mediatsiya|murojaat/.test(key))return 'Yangi mediatsiya murojaati';if(/uchrashuv/.test(key))return 'Uchrashuv belgilash';if(/e’lon/.test(key))return 'Yangi e’lon';if(/portfolio/.test(key))return 'Portfolio yozuvi';if(/malaka/.test(key))return 'Malaka oshirish arizasi';if(/shartnoma/.test(key))return 'Shartnoma yaratish';if(/yozishma/.test(key))return 'Yangi yozishma';return 'Yangi yozuv qo‘shish' }
function modalAction(key:string) { return /ariza/.test(key)?'Arizani yuborish':/hisobot/.test(key)?'Hisobotni saqlash':/mediatsiya|murojaat/.test(key)?'Murojaat yuborish':'Saqlash' }
function mediationStatusLabel(status: string) { return ({ AWAITING_CONSENT: 'Rozilik kutilmoqda', MEDIATOR_REQUESTED: 'Mediator tanlash', MEDIATOR_ASSIGNED: 'Mediator tayinlandi', AGREEMENT_PENDING_SIGNATURE: 'Kelishuv imzolanmoqda', SCHEDULED: 'Uchrashuv belgilangan', IN_SESSION: 'Mediatsiya sessiyasi', SETTLED: 'Kelishuv monitoringi', FAILED: 'Kelishuvga erishilmadi', CLOSED: 'Yopildi' } as Record<string, string>)[status] || status }
function applicationStatusLabel(status: string) { return ({ SUBMITTED: 'Yangi yuborildi', CHECKING: 'Tekshiruvda', ACCEPTED: 'Qabul qilindi', REJECTED: 'Rad etildi', INVITED: 'Imtihonga chaqirildi', PASSED: 'Imtihondan o‘tdi', FAILED: 'Imtihondan o‘tmadi', REGISTERED: 'Reyestrga kiritildi' } as Record<string, string>)[status] || status }
