import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, FileCheck2, FileText,
  Gavel, Globe2, Languages, MapPin, QrCode, Scale, ShieldCheck, Star, Upload, UserRound, Video,
} from 'lucide-react'

type SpecialistRole = 'JUDGE' | 'ARBITRATOR'
type Proceeding = {
  id: string
  title: string
  claimant: string
  respondent: string
  filedAt: string
  status: 'Taklif kutilmoqda' | 'Ish yurituvda' | 'Rad etildi' | 'Yakunlandi'
  rejectionReason?: string
  hearingAt?: string
  evidence: string[]
  decision?: string
  signed?: boolean
  registrationNumber?: string
  executionStatus?: 'Kutilmoqda' | 'Ixtiyoriy ijro etildi' | 'Ijro varaqasi so‘ralgan'
}

const label = (role: SpecialistRole) => role === 'JUDGE' ? 'Hakamlik sudi' : 'Arbitraj'
const emptyCase = (role: SpecialistRole, suffix: string): Proceeding => ({
  id: `${role === 'JUDGE' ? 'HAK' : 'ARB'}-${suffix}`,
  title: role === 'JUDGE' ? 'Yetkazib berish shartnomasi bo‘yicha nizo' : 'Investitsiya kelishuvi bo‘yicha nizo',
  claimant: role === 'JUDGE' ? '“Zarafshon Savdo” MChJ' : 'Orient Capital Ltd.',
  respondent: role === 'JUDGE' ? '“Baraka Ta’minot” MChJ' : '“Navro‘z Invest” AJ',
  filedAt: '2026-10-21',
  status: 'Taklif kutilmoqda',
  evidence: [],
})
const seed = (role: SpecialistRole): Proceeding[] => [emptyCase(role, '26041'), { ...emptyCase(role, '26038'), title: role === 'JUDGE' ? 'Qurilish pudrati bo‘yicha da’vo' : 'Transchegaraviy tijorat nizosi', claimant: '“Taraqqiyot Qurilish” MChJ', respondent: '“Bunyodkor Loyiha” MChJ', filedAt: '2026-10-18', status: 'Ish yurituvda', hearingAt: '2026-10-31T10:00', evidence: ['Da’vo arizasi.pdf', 'Shartnoma.pdf'] }]
const keyFor = (role: SpecialistRole) => `nizolar.demo.proceedings.${role}`

export function SpecialistProceedingsWorkspace({ role, page, onToast }: { role: SpecialistRole; page: string; onToast: (message: string) => void }) {
  const demoMode = !localStorage.getItem('nizolar.auth.accessToken')
  const [items, setItems] = useState<Proceeding[]>(() => {
    try { const value = localStorage.getItem(keyFor(role)); return value ? JSON.parse(value) as Proceeding[] : seed(role) }
    catch { return seed(role) }
  })
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`nizolar.demo.specialist-profile.${role}`) || 'null') as { specialty: string; region: string; language: string } | null || { specialty: role === 'JUDGE' ? 'Tijorat va shartnomaviy nizolar' : 'Xalqaro tijorat arbitraji', region: 'Toshkent shahri', language: 'O‘zbek, rus, ingliz' } }
    catch { return { specialty: role === 'JUDGE' ? 'Tijorat va shartnomaviy nizolar' : 'Xalqaro tijorat arbitraji', region: 'Toshkent shahri', language: 'O‘zbek, rus, ingliz' } }
  })
  const [rejecting, setRejecting] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [hearingDates, setHearingDates] = useState<Record<string, string>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [profileEditing, setProfileEditing] = useState(false)
  const [filter, setFilter] = useState('Barchasi')

  useEffect(() => { localStorage.setItem(keyFor(role), JSON.stringify(items)) }, [items, role])
  useEffect(() => { localStorage.setItem(`nizolar.demo.specialist-profile.${role}`, JSON.stringify(profile)) }, [profile, role])

  const offered = useMemo(() => items.filter((item) => filter === 'Barchasi' || item.status === filter), [items, filter])
  const update = (id: string, change: Partial<Proceeding>) => setItems((rows) => rows.map((row) => row.id === id ? { ...row, ...change } : row))
  const accept = (item: Proceeding) => { update(item.id, { status: 'Ish yurituvda' }); onToast(`${item.id} ishi ish yurituviga qabul qilindi.`) }
  const reject = (event: FormEvent, item: Proceeding) => {
    event.preventDefault()
    if (!rejectionReason.trim()) return
    update(item.id, { status: 'Rad etildi', rejectionReason: rejectionReason.trim() })
    setRejecting(''); setRejectionReason(''); onToast(`${item.id} bo‘yicha asosli rad javobi saqlandi.`)
  }
  const schedule = (event: FormEvent, item: Proceeding) => {
    event.preventDefault()
    const hearingAt = hearingDates[item.id]
    if (!hearingAt) return
    update(item.id, { hearingAt })
    onToast('Eshituv sanasi belgilandi. Bildirishnoma demo rejimida qayd etildi.')
  }
  const attachEvidence = (item: Proceeding, files: FileList | null) => {
    if (!files?.length) return
    update(item.id, { evidence: [...item.evidence, ...Array.from(files).map((file) => file.name)] })
    onToast('Dalil nomi ish materiallariga qo‘shildi. Demo rejimida faylning o‘zi yuklanmadi.')
  }
  const saveDecision = (item: Proceeding) => {
    const decision = (drafts[item.id] || item.decision || '').trim()
    if (decision.length < 10) { onToast('Qaror loyihasini saqlash uchun kamida 10 ta belgi kiriting.'); return }
    update(item.id, { decision, signed: false, status: 'Yakunlandi', executionStatus: 'Kutilmoqda' })
    onToast('Qaror loyihasi saqlandi. Imzolash va rasmiy ro‘yxatga olish provayderi ulanmagan.')
  }
  const registerDecision = (item: Proceeding) => {
    if (!item.decision) { onToast('Avval qaror loyihasini saqlang.'); return }
    if (!item.signed) { onToast('Rasmiy ro‘yxatga olishdan oldin E-IMZO orqali imzolash kerak.'); return }
    if (!item.registrationNumber) {
      update(item.id, { registrationNumber: `ADR-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}` })
      onToast('Demo ro‘yxat raqami yaratildi. QR-kod va rasmiy reyestr xizmati ulanmagan.')
    }
  }

  const isProfile = /reyestr|profil/i.test(page)
  const isHearing = /eshituv|kalendar/i.test(page)
  const isDecision = /qaror|hujjat/i.test(page)
  const isExecution = /ijro/i.test(page)
  const isRating = /reyting|statistika/i.test(page)
  const title = isProfile ? 'Reyestr va profil' : isHearing ? `${label(role)} eshituvlari` : isDecision ? 'Qarorlar va hujjatlar' : isExecution ? 'Ijro monitoringi' : isRating ? 'Reyting va statistika' : `${label(role)} da’volari`
  const metrics: [string, number, typeof Gavel][] = [[role === 'JUDGE' ? 'Hakamlik ishlari' : 'Arbitraj ishlari', items.length, Gavel], ['Ish yurituvda', items.filter((item) => item.status === 'Ish yurituvda').length, Clock3], ['Yakunlangan qarorlar', items.filter((item) => item.decision).length, FileCheck2], ['Ijro kutilmoqda', items.filter((item) => item.executionStatus === 'Kutilmoqda').length, CheckCircle2]]

  return <section>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Mutaxassis kabineti · {label(role)}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1><p className="mt-1.5 max-w-2xl text-sm text-slate-500">{isProfile ? 'Reyestrdagi ixtisoslashuv, faoliyat hududi va ish yuritish tillari.' : isHearing ? 'Masofaviy eshituvlarni rejalashtiring va ish materiallarini boshqaring.' : isDecision ? 'Qaror loyihalarini tayyorlash va ularning rasmiylashtirish holatini kuzatish.' : isExecution ? 'Ixtiyoriy ijro holati va ijro varaqasi bo‘yicha keyingi amal.' : isRating ? 'Ko‘rib chiqilgan ishlar va qarorlar ijrosi bo‘yicha ko‘rsatkichlar.' : 'Sizga yo‘naltirilgan da’volarni ko‘rib chiqing, qabul qiling yoki asosli ravishda rad eting.'}</p></div>{!isProfile && !isRating && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500">{items.length} ta ish</span>}</div>
    {demoMode && <div className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><ShieldCheck className="mt-0.5 shrink-0" size={17}/><p>Demo ko‘rinish: ishlar va bosqichlar ushbu brauzerda saqlanadi. Hakamlik/arbitraj da’volari, E-IMZO, QR-ro‘yxat, videokonferensiya va ijro tizimi integratsiyalari server tomonda ulanmagan.</p></div>}

    {isProfile ? <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><UserRound size={21}/></span><div><h2 className="font-semibold">Mutaxassis profili</h2><p className="mt-1 text-xs text-slate-500">Reyestr holati · Faol</p></div></div><div className="mt-5 space-y-3"><ProfileRow icon={Gavel} label="Reyestr maqomi" value={label(role)}/><ProfileRow icon={Scale} label="Ixtisoslashuv" value={profile.specialty}/><ProfileRow icon={MapPin} label="Faoliyat hududi" value={profile.region}/><ProfileRow icon={Languages} label="Ish yuritish tillari" value={profile.language}/><ProfileRow icon={Globe2} label="Chet ellik mutaxassis" value={role === 'ARBITRATOR' ? 'Reyestr shartlari qo‘llanadi' : '—'}/></div><button onClick={() => setProfileEditing((value) => !value)} className="mt-5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">{profileEditing ? 'Tahrirni yopish' : 'Profil ma’lumotlarini tahrirlash'}</button>{profileEditing && <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); setProfileEditing(false); onToast('Profil ma’lumotlari demo kabinetda saqlandi.') }}><Field label="Ixtisoslashuv"><input value={profile.specialty} onChange={(event) => setProfile((value) => ({ ...value, specialty: event.target.value }))} className="form-control"/></Field><Field label="Faoliyat hududi"><input value={profile.region} onChange={(event) => setProfile((value) => ({ ...value, region: event.target.value }))} className="form-control"/></Field><Field label="Ish yuritish tillari"><input value={profile.language} onChange={(event) => setProfile((value) => ({ ...value, language: event.target.value }))} className="form-control"/></Field><button className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">Saqlash</button></form>}</article><article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-center gap-2"><FileCheck2 className="text-emerald-700" size={19}/><h2 className="font-semibold">Malaka guvohnomasi</h2></div><p className="mt-1 text-xs text-slate-500">Amal qilish muddati va malaka bo‘yicha ma’lumot</p><div className="mt-4 rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Elektron malaka guvohnomasi</p><p className="mt-1 text-xs text-slate-500">Reyestrdagi mutaxassis profili bilan bog‘langan</p></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800">Amalda</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><ProfileRow icon={Clock3} label="Keyingi muddat" value="Tizimdagi guvohnomaga qarang"/><ProfileRow icon={QrCode} label="Tekshirish" value="QR-kodli elektron hujjat"/></div></div><p className="mt-4 text-xs leading-5 text-slate-500">Muddati tugashiga yaqin ogohlantirishlar Xabarnomalar bo‘limida ko‘rinadi.</p></article></div>
      : isRating ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([name, value, Icon]) => <article key={String(name)} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{String(name)}</p><Icon size={19} className="text-emerald-700"/></div><p className="mt-3 text-3xl font-semibold">{String(value).padStart(2, '0')}</p><p className="mt-2 text-xs text-slate-400">Demo kabinet ko‘rsatkichi</p></article>)}<article className="rounded-2xl bg-slate-950 p-5 text-white sm:col-span-2 xl:col-span-4"><div className="flex items-center gap-2"><Star size={18} className="text-amber-300"/><h2 className="font-semibold">Ochiq reyting</h2></div><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Reyting ishlar soni, natijalar va ijro ko‘rsatkichlari asosida yuritiladi. Rasmiy reytingni umumiy reyestrdagi profilingiz orqali ko‘ring.</p></article></div>
      : isExecution ? <div className="space-y-3">{items.filter((item) => item.decision).map((item) => <article key={item.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{item.title}</h2><p className="mt-1 text-xs text-slate-500">{item.id} · {item.registrationNumber || 'Ro‘yxat raqami kutilmoqda'}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">{item.executionStatus || 'Kutilmoqda'}</span></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => { update(item.id, { executionStatus: 'Ixtiyoriy ijro etildi' }); onToast('Ijro holati qayd etildi.') }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Ixtiyoriy ijro etildi</button><button onClick={() => { update(item.id, { executionStatus: 'Ijro varaqasi so‘ralgan' }); onToast('Ijro varaqasi arizasi demo oqimida tayyorlandi; yuborish integratsiyasi ulanmagan.') }} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Ijro varaqasi so‘rash</button></div></article>)}{!items.some((item) => item.decision) && <Empty text="Monitoring uchun rasmiylashtirilgan qaror yo‘q."/>}</div>
      : <><div className="mb-4 flex flex-wrap gap-2">{['Barchasi', 'Taklif kutilmoqda', 'Ish yurituvda', 'Rad etildi', 'Yakunlandi'].map((status) => <button key={status} onClick={() => setFilter(status)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === status ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{status}</button>)}</div><div className="space-y-3">{offered.map((item) => <article key={item.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">{role === 'JUDGE' ? <Gavel size={18}/> : <Scale size={18}/>}</span><h2 className="font-semibold">{item.title}</h2><Status status={item.status}/></div><p className="mt-3 text-sm text-slate-600">Da’vogar: {item.claimant} <span className="mx-1 text-slate-300">·</span> Javobgar: {item.respondent}</p><p className="mt-1 text-xs text-slate-400">Ish № {item.id} · Kelib tushgan {new Date(item.filedAt).toLocaleDateString('uz-UZ')}</p></div>{item.status === 'Taklif kutilmoqda' && <div className="flex shrink-0 gap-2"><button onClick={() => accept(item)} className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white"><Check size={14}/>Qabul qilish</button><button onClick={() => setRejecting(rejecting === item.id ? '' : item.id)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold">Rad etish</button></div>}</div>
        {rejecting === item.id && <form onSubmit={(event) => reject(event, item)} className="mt-4 flex flex-col gap-2 sm:flex-row"><input required value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className="form-control" placeholder="Rad etishning asosli sababi"/><button className="h-10 shrink-0 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white">Sabab bilan yuborish</button></form>}{item.rejectionReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800">Rad etish sababi: {item.rejectionReason}</p>}
        {(item.status === 'Ish yurituvda' || (isDecision && Boolean(item.decision))) && <><div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[1fr_auto]"><form onSubmit={(event) => schedule(event, item)} className="flex flex-col gap-2 sm:flex-row"><label className="flex-1 text-xs font-semibold text-slate-600">Eshituv sanasi va vaqti<input required type="datetime-local" value={hearingDates[item.id] || item.hearingAt || ''} onChange={(event) => setHearingDates((values) => ({ ...values, [item.id]: event.target.value }))} className="form-control mt-1"/></label><button className="mt-5 h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold">Sanani belgilash</button></form><button onClick={() => onToast('Videokonferensiya provayderi ulanmagan. Belgilangan sessiya ma’lumotini kalendarda ko‘rishingiz mumkin.')} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-900 px-3 text-xs font-semibold text-white"><Video size={15}/>Eshituvga qo‘shilish</button></div><div className="mt-3 flex flex-wrap items-center gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"><Upload size={14}/>Dalil / hujjat biriktirish<input type="file" multiple className="sr-only" onChange={(event) => attachEvidence(item, event.target.files)}/></label><span className="text-xs text-slate-500">{item.evidence.length ? item.evidence.join(' · ') : 'Biriktirilgan dalillar yo‘q'}</span></div><label className="mt-4 block text-xs font-semibold text-slate-600">{role === 'JUDGE' ? 'Hakamlik sudi qarori' : 'Arbitraj qarori'} loyihasi<textarea value={drafts[item.id] ?? item.decision ?? ''} onChange={(event) => setDrafts((values) => ({ ...values, [item.id]: event.target.value }))} maxLength={12000} rows={4} className="form-control mt-1" placeholder="Qaror loyihasini kiriting"/></label><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => saveDecision(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Qaror loyihasini saqlash</button>{item.decision && <button onClick={() => { update(item.id, { signed: true }); onToast('Demo imzolash qayd etildi; E-IMZO bilan yuridik imzo qo‘yilmadi.') }} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">E-IMZO imzolash</button>}{item.decision && <button onClick={() => registerDecision(item)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Ro‘yxatga olish</button>}{item.registrationNumber && <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-900"><QrCode size={15}/>№ {item.registrationNumber} · QR ro‘yxati demo</span>}</div></>}</article>)}{!offered.length && <div className="rounded-xl bg-white p-10 text-center text-sm text-slate-500">Bu filtrda ishlar yo‘q.</div>}</div></>}
  </section>
}

function ProfileRow({ icon: Icon, label: name, value }: { icon: typeof UserRound; label: string; value: string }) { return <div className="flex items-start gap-2 border-b border-slate-100 pb-3 text-sm"><Icon size={15} className="mt-0.5 shrink-0 text-slate-400"/><span className="w-36 shrink-0 text-slate-500">{name}</span><span className="text-right font-medium text-slate-800">{value}</span></div> }
function Field({ label: name, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-slate-600">{name}<span className="mt-1 block">{children}</span></label> }
function Status({ status }: { status: Proceeding['status'] }) { const colors = status === 'Ish yurituvda' ? 'bg-emerald-50 text-emerald-700' : status === 'Taklif kutilmoqda' ? 'bg-amber-50 text-amber-800' : status === 'Rad etildi' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${colors}`}>{status}</span> }
function Empty({ text }: { text: string }) { return <div className="rounded-xl bg-white p-10 text-center text-sm text-slate-500">{text}</div> }
