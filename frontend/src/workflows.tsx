import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, Check, FileText, RefreshCw, ShieldCheck, Upload, Video, X } from 'lucide-react'
import { apiGet, apiGetPublic, apiPost, getAccessToken } from './api'

const regions = [
  'Qoraqalpog‘iston Respublikasi', 'Andijon viloyati', 'Buxoro viloyati', 'Jizzax viloyati',
  'Qashqadaryo viloyati', 'Navoiy viloyati', 'Namangan viloyati', 'Samarqand viloyati',
  'Surxondaryo viloyati', 'Sirdaryo viloyati', 'Toshkent viloyati', 'Farg‘ona viloyati',
  'Xorazm viloyati', 'Toshkent shahri',
]
const categories = [
  ['FAMILY', 'Oilaviy nizo'], ['CIVIL', 'Fuqarolik va shartnomaviy nizo'], ['LABOR', 'Mehnat nizosi'],
  ['ECONOMIC', 'Iqtisodiy va tadbirkorlik nizosi'], ['INTELLECTUAL', 'Intellektual mulk nizosi'], ['BANKING', 'Bank va moliya nizosi'],
]

export type MediationDraft = {
  type: 'ONLINE' | 'MANDATORY'
  disputeCategory: string
  disputeSubject: string
  courtCaseNumber: string
  claimantName: string
  claimantPinfl: string
  claimantPhone: string
  respondentName: string
  respondentPinfl: string
  respondentPhone: string
  respondentEmail: string
  region: string
  privacyAccepted: boolean
}

export function MediationRequestForm({ initialMediator, onClose, onSubmit }: {
  initialMediator?: string
  onClose: () => void
  onSubmit: (draft: MediationDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<MediationDraft>({
    type: 'ONLINE', disputeCategory: 'CIVIL', disputeSubject: '', courtCaseNumber: '',
    claimantName: '', claimantPinfl: '', claimantPhone: '', respondentName: '',
    respondentPinfl: '', respondentPhone: '', respondentEmail: '', region: '', privacyAccepted: false,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const authenticated = Boolean(getAccessToken())
  const isMandatory = draft.type === 'MANDATORY'
  const respondentPinflError = useMemo(() => draft.respondentPinfl && !/^\d{14}$/.test(draft.respondentPinfl) ? 'PINFL 14 ta raqamdan iborat bo‘lishi kerak.' : '', [draft.respondentPinfl])
  const update = <K extends keyof MediationDraft>(key: K, value: MediationDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    if (!authenticated) return
    let cancelled = false
    apiGet<{ fullName?: string | null; pinfl?: string | null; phone?: string | null }>('/cabinet/profile')
      .then((profile) => {
        if (cancelled) return
        setDraft((current) => ({ ...current, claimantName: profile.fullName || '', claimantPinfl: profile.pinfl || '', claimantPhone: profile.phone || '' }))
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Shaxsiy profilni yuklab bo‘lmadi.') })
    return () => { cancelled = true }
  }, [authenticated])

  const continueFromDispute = () => {
    if (draft.disputeSubject.trim().length < 10) { setError('Nizo mazmunini kamida 10 ta belgi bilan yozing.'); return }
    if (!draft.region) { setError('Hududni tanlang.'); return }
    if (isMandatory && !draft.courtCaseNumber.trim()) { setError('Majburiy mediatsiya uchun sud ishi raqamini kiriting.'); return }
    setError(''); setStep(2)
  }
  const continueFromParties = () => {
    if (!draft.claimantName.trim() || !/^\d{14}$/.test(draft.claimantPinfl) || !isUzPhone(draft.claimantPhone)) { setError('Ariza beruvchining F.I.Sh., 14 raqamli PINFL va +998 telefon raqamini tekshiring.'); return }
    if (!draft.respondentName.trim() || !isUzPhone(draft.respondentPhone)) { setError('Javobgar F.I.Sh. va +998 telefon raqamini kiriting.'); return }
    setError(''); setStep(3)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (draft.disputeSubject.trim().length < 10 || !draft.region || (isMandatory && !draft.courtCaseNumber.trim())) { setError('Nizo turi, mazmuni, hudud va majburiy holatda sud ishi raqamini to‘ldiring.'); setStep(1); return }
    if (!draft.claimantName.trim() || !/^\d{14}$/.test(draft.claimantPinfl) || !isUzPhone(draft.claimantPhone) || !draft.respondentName.trim() || !isUzPhone(draft.respondentPhone)) { setError('Ariza beruvchi va javobgar taraflarning ma’lumotlarini tekshiring.'); setStep(2); return }
    if (!draft.privacyAccepted) { setError('Shaxsiy ma’lumotlardan foydalanishga rozilikni belgilang.'); return }
    if (draft.respondentPinfl && !/^\d{14}$/.test(draft.respondentPinfl)) { setError('Javobgar PINFL raqamini tekshiring.'); return }
    setError('')
    setBusy(true)
    try { await onSubmit(draft) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Murojaatni yuborib bo‘lmadi.') }
    finally { setBusy(false) }
  }

  return <Dialog onClose={onClose} title="Yangi mediatsiya murojaati" description="Ma’lumotlar bosqichma-bosqich kiritiladi. Yulduzcha bilan belgilangan maydonlar majburiy.">
    <form onSubmit={submit} className="space-y-5 p-5 sm:p-7">
      <div className="grid grid-cols-3 gap-2" aria-label="Ariza bosqichlari">{['Nizo', 'Taraflar', 'Tekshirish'].map((label, index) => <div key={label} className={`rounded-lg px-3 py-2 text-center text-xs font-semibold ${step >= index + 1 ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}><span>{index + 1}. {label}</span></div>)}</div>
      {step === 1 && <div className="space-y-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4"><p className="text-sm font-semibold text-slate-900">Mediatsiya turi</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{[['ONLINE', 'Ixtiyoriy mediatsiya', 'Taraflar mediatorni o‘zaro tanlaydi.'], ['MANDATORY', 'Majburiy mediatsiya', 'Ish sudga taalluqli bo‘lsa; sud ishi raqami kerak.']].map(([value, title, text]) => <button type="button" key={value} onClick={() => update('type', value as MediationDraft['type'])} className={`rounded-lg border p-3 text-left ${draft.type === value ? 'border-emerald-500 bg-white ring-2 ring-emerald-100' : 'border-slate-200 bg-white/70'}`}><span className="flex items-center justify-between text-sm font-semibold">{title}{draft.type === value && <Check size={15} className="text-emerald-700"/>}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{text}</span></button>)}</div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nizo turi *"><select required value={draft.disputeCategory} onChange={(event) => update('disputeCategory', event.target.value)} className="field-control">{categories.map(([value, title]) => <option value={value} key={value}>{title}</option>)}</select></Field>
          <Field label="Hudud *"><select required value={draft.region} onChange={(event) => update('region', event.target.value)} className="field-control"><option value="">Hududni tanlang</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></Field>
        </div>
        {isMandatory && <Field label="Sud ishi raqami *"><input required maxLength={100} value={draft.courtCaseNumber} onChange={(event) => update('courtCaseNumber', event.target.value)} className="field-control" placeholder="Sud hujjatidagi ish raqami"/></Field>}
        <Field label="Nizo mavzusi va batafsil mazmuni *"><textarea required minLength={10} maxLength={3000} value={draft.disputeSubject} onChange={(event) => update('disputeSubject', event.target.value)} className="field-control min-h-28 resize-y" placeholder="Nizo mazmunini, talablarni va muhim sanalarni yozing"/></Field>
        {initialMediator && !getAccessToken() && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Demo reyestrdan tanlangan mediator: <strong>{initialMediator}</strong>. Rasmiy tizimda tanlov faol reyestrdan va ikki taraf roziligidan keyin qayd etiladi.</div>}
        {error && <ErrorNotice message={error}/>}<div className="flex justify-end border-t border-slate-100 pt-4"><button type="button" onClick={continueFromDispute} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Taraflar ma’lumotiga o‘tish</button></div>
      </div>}
      {step === 2 && <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-slate-200 p-4"><div><p className="text-sm font-semibold">Ariza beruvchi</p><p className="mt-1 text-xs text-slate-500">{authenticated ? 'Shaxsiy ma’lumotlar tasdiqlangan OneID profilidan olindi.' : 'Rasmiy tizimda bu ma’lumotlar OneID profilidan olinadi.'}</p></div><Field label="F.I.Sh. *"><input required maxLength={160} value={draft.claimantName} onChange={(event) => update('claimantName', event.target.value)} readOnly={authenticated} className="field-control read-only:bg-slate-50" autoComplete="name"/></Field><Field label="PINFL *"><input required inputMode="numeric" pattern="\d{14}" maxLength={14} value={draft.claimantPinfl} onChange={(event) => update('claimantPinfl', event.target.value.replace(/\D/g, ''))} readOnly={authenticated} className="field-control read-only:bg-slate-50" placeholder="14 ta raqam"/></Field><Field label="Telefon *"><input required type="tel" value={draft.claimantPhone} onChange={(event) => update('claimantPhone', event.target.value)} readOnly={authenticated} className="field-control read-only:bg-slate-50" placeholder="+998 90 123 45 67" autoComplete="tel"/></Field></section>
          <section className="space-y-3 rounded-xl border border-slate-200 p-4"><div><p className="text-sm font-semibold">Javobgar taraf</p><p className="mt-1 text-xs text-slate-500">Rozilik va xabarnoma uchun telefon raqami kerak.</p></div><Field label="F.I.Sh. yoki tashkilot nomi *"><input required maxLength={160} value={draft.respondentName} onChange={(event) => update('respondentName', event.target.value)} className="field-control"/></Field><Field label="Telefon *"><input required type="tel" value={draft.respondentPhone} onChange={(event) => update('respondentPhone', event.target.value)} className="field-control" placeholder="+998 90 123 45 67"/></Field><Field label="PINFL (jismoniy shaxs uchun)"><input inputMode="numeric" maxLength={14} value={draft.respondentPinfl} onChange={(event) => update('respondentPinfl', event.target.value.replace(/\D/g, ''))} className="field-control" placeholder="14 ta raqam" aria-invalid={Boolean(respondentPinflError)}/>{respondentPinflError && <span className="mt-1 block text-xs text-red-600">{respondentPinflError}</span>}</Field><Field label="Elektron pochta"><input type="email" maxLength={254} value={draft.respondentEmail} onChange={(event) => update('respondentEmail', event.target.value)} className="field-control" placeholder="ixtiyoriy"/></Field></section>
        </div>
        {error && <ErrorNotice message={error}/>}<div className="flex justify-between border-t border-slate-100 pt-4"><button type="button" onClick={() => { setError(''); setStep(1) }} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium">Orqaga</button><button type="button" onClick={continueFromParties} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Ma’lumotlarni tekshirish</button></div>
      </div>}
      {step === 3 && <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-semibold">Yuborishdan oldin tekshiring</h3><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><Summary label="Mediatsiya turi" value={isMandatory ? 'Majburiy' : 'Ixtiyoriy'}/><Summary label="Nizo turi" value={categories.find(([id]) => id === draft.disputeCategory)?.[1] || draft.disputeCategory}/><Summary label="Hudud" value={draft.region}/><Summary label="Sud ishi raqami" value={draft.courtCaseNumber || 'Ko‘rsatilmagan'}/><Summary label="Ariza beruvchi" value={`${draft.claimantName} · ${draft.claimantPhone}`}/><Summary label="Javobgar" value={`${draft.respondentName} · ${draft.respondentPhone}`}/><Summary label="Nizo mazmuni" value={draft.disputeSubject}/></dl></div>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-5"><input required type="checkbox" checked={draft.privacyAccepted} onChange={(event) => update('privacyAccepted', event.target.checked)} className="mt-1 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"/><span>Ko‘rsatilgan ma’lumotlar to‘g‘riligini tasdiqlayman va mediatsiya murojaatini ko‘rib chiqish uchun shaxsiy ma’lumotlardan foydalanishga roziman.</span></label>
        <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900"><ShieldCheck size={16} className="mt-0.5 shrink-0"/>Ikki tarafning roziligi olinmaguncha mediator belgilanmaydi. Demo kabinetda yuborilgan ariza faqat brauzerda saqlanadi.</p>
        {error && <ErrorNotice message={error}/>}
        <div className="flex justify-between border-t border-slate-100 pt-4"><button type="button" onClick={() => setStep(2)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium">Orqaga</button><button disabled={busy} type="submit" className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{busy ? 'Yuborilmoqda…' : 'Murojaatni yuborish'}</button></div>
      </div>}
      {error && step !== 3 && <ErrorNotice message={error}/>}
    </form>
  </Dialog>
}

export type ApplicationDraft = {
  fullName: string
  pinfl: string
  passportNumber: string
  passportGivenDate: string
  passportExpireDate: string
  phone: string
  email: string
  address: string
  profession: 'MEDIATOR' | 'NOTARY' | 'ADVOCATE'
  education: string
  diplomaFile: File | null
  passportFile: File | null
  courseCertificate: File | null
  professionProof: File | null
}

export function MediatorApplicationForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (draft: ApplicationDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<ApplicationDraft>({ fullName: '', pinfl: '', passportNumber: '', passportGivenDate: '', passportExpireDate: '', phone: '', email: '', address: '', profession: 'MEDIATOR', education: '', diplomaFile: null, passportFile: null, courseCertificate: null, professionProof: null })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const courseRequired = draft.profession === 'MEDIATOR'
  const professionProofRequired = draft.profession !== 'MEDIATOR'
  const update = <K extends keyof ApplicationDraft>(key: K, value: ApplicationDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  useEffect(() => {
    if (!getAccessToken()) return
    apiGet<{ fullName: string; pinfl?: string | null; passportSeriesNumber?: string | null; passportGivenDate?: string | null; passportExpireDate?: string | null; phone?: string | null; email?: string | null; address?: string | null }>('/cabinet/profile')
      .then((profile) => setDraft((current) => ({ ...current, fullName: profile.fullName || '', pinfl: profile.pinfl || '', passportNumber: profile.passportSeriesNumber || '', passportGivenDate: profile.passportGivenDate || '', passportExpireDate: profile.passportExpireDate || '', phone: profile.phone || '', email: profile.email || '', address: profile.address || '' })))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Shaxsiy profilni yuklab bo‘lmadi.'))
  }, [])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^\d{14}$/.test(draft.pinfl)) { setError('PINFL 14 ta raqam bo‘lishi kerak.'); return }
    if (!draft.diplomaFile) { setError('Diplom faylini biriktiring.'); return }
    if (courseRequired && !draft.courseCertificate) { setError('Maxsus o‘quv kursi sertifikatini biriktiring.'); return }
    if (professionProofRequired && !draft.professionProof) { setError('Notarius yoki advokat maqomini tasdiqlovchi hujjatni biriktiring.'); return }
    setError(''); setBusy(true)
    try { await onSubmit(draft) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Arizani yuborib bo‘lmadi.') }
    finally { setBusy(false) }
  }
  return <Dialog onClose={onClose} title="Mediator maqomi uchun ariza" description="Hujjatlar va aloqa ma’lumotlarini to‘ldiring. Tekshiruvlar ariza yuborilgandan keyin davlat manbalarida bajariladi.">
    <form onSubmit={submit} className="space-y-5 p-5 sm:p-7">
      <section className="space-y-4 rounded-xl border border-slate-200 p-4"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-800"><ShieldCheck size={18}/></span><div><h3 className="text-sm font-semibold">Pasport va shaxsiy ma’lumot</h3><p className="mt-1 text-xs leading-5 text-slate-500">Production tizimida F.I.Sh., PINFL va pasport rekvizitlari OneID profilidan olinib tekshiriladi. Demo sinovi uchun quyidagi maydonlarni qo‘lda kiriting.</p></div></div><div className="grid gap-3 sm:grid-cols-2"><Field label="F.I.Sh. *"><input required maxLength={160} value={draft.fullName} onChange={(event) => update('fullName', event.target.value)} readOnly={Boolean(getAccessToken())} className="field-control read-only:bg-slate-50" autoComplete="name"/></Field><Field label="PINFL *"><input required inputMode="numeric" pattern="\d{14}" maxLength={14} value={draft.pinfl} onChange={(event) => update('pinfl', event.target.value.replace(/\D/g, ''))} readOnly={Boolean(getAccessToken())} className="field-control read-only:bg-slate-50"/></Field><Field label="Pasport seriyasi va raqami *"><input required maxLength={20} value={draft.passportNumber} onChange={(event) => update('passportNumber', event.target.value.toUpperCase())} readOnly={Boolean(getAccessToken())} className="field-control read-only:bg-slate-50" placeholder="AA1234567"/></Field><Field label="Pasport berilgan sana *"><input required type="date" value={draft.passportGivenDate} onChange={(event) => update('passportGivenDate', event.target.value)} readOnly={Boolean(getAccessToken())} className="field-control read-only:bg-slate-50"/></Field><Field label="Pasport amal qilish muddati *"><input required type="date" value={draft.passportExpireDate} onChange={(event) => update('passportExpireDate', event.target.value)} readOnly={Boolean(getAccessToken())} className="field-control read-only:bg-slate-50"/></Field><Field label="Yashash manzili *"><input required maxLength={1000} value={draft.address} onChange={(event) => update('address', event.target.value)} className="field-control"/></Field></div></section>
      <section className="space-y-4 rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-semibold">Aloqa va kasbiy ma’lumot</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Telefon *"><input required type="tel" value={draft.phone} onChange={(event) => update('phone', event.target.value)} className="field-control" placeholder="+998 90 123 45 67" autoComplete="tel"/></Field><Field label="Elektron pochta *"><input required type="email" maxLength={254} value={draft.email} onChange={(event) => update('email', event.target.value)} className="field-control" placeholder="name@example.uz" autoComplete="email"/></Field><Field label="Kasbiy maqom *"><select value={draft.profession} onChange={(event) => update('profession', event.target.value as ApplicationDraft['profession'])} className="field-control"><option value="MEDIATOR">Mediator nomzodi</option><option value="NOTARY">Amaldagi notarius</option><option value="ADVOCATE">Amaldagi advokat</option></select></Field><Field label="Ma’lumoti / diplom yo‘nalishi *"><input required maxLength={250} value={draft.education} onChange={(event) => update('education', event.target.value)} className="field-control" placeholder="Oliy yuridik ma’lumot"/></Field></div></section>
      <section className="space-y-3 rounded-xl border border-slate-200 p-4"><div><h3 className="text-sm font-semibold">Tasdiqlovchi hujjatlar</h3><p className="mt-1 text-xs text-slate-500">PDF, DOCX yoki JPG/PNG · har biri 10 MB gacha.</p></div><FileField label="Diplom nusxasi *" required file={draft.diplomaFile} onChange={(file) => update('diplomaFile', file)}/><FileField label="Pasport nusxasi (ixtiyoriy)" file={draft.passportFile} onChange={(file) => update('passportFile', file)}/>{courseRequired ? <FileField label="Mediatorlar maxsus kursi sertifikati *" required file={draft.courseCertificate} onChange={(file) => update('courseCertificate', file)}/> : <><FileField label="Notarius/advokat maqomini tasdiqlovchi hujjat *" required file={draft.professionProof} onChange={(file) => update('professionProof', file)}/><p className="rounded-lg bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">Maxsus kursdan ozod qilish maqomini hujjat bilan tasdiqlash va komissiya tekshiruvidan keyingina qo‘llash mumkin.</p></>}</section>
      <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertCircle size={16} className="mt-0.5 shrink-0"/><span>Sudlanganlik va muomala layoqati arizachining javobiga qarab emas, vakolatli davlat manbasi orqali tekshirilishi kerak. Hozir tashqi reyestr ulanmagan bo‘lsa ariza “tekshiruvda” qoladi.</span></div>
      {error && <ErrorNotice message={error}/>}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm">Bekor qilish</button><button disabled={busy} type="submit" className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Yuborilmoqda…' : 'Arizani yuborish'}</button></div>
    </form>
  </Dialog>
}

type MtsSession = { id: string; scheduledAt: string; durationMin: number; status: string }
type MtsParticipant = { side: 'CLAIMANT' | 'RESPONDENT'; userId: string | null; pinfl: string | null; fullName: string; consentStatus: string; signaturePkcs7: string | null }
type MtsCase = { id: string; type: 'ONLINE' | 'MANDATORY'; disputeCategory: string; disputeSubject: string; courtCaseNumber: string | null; region: string; status: string; mediatorId: string | null; agreementText: string | null; mediatorSignaturePkcs7: string | null; participants: MtsParticipant[]; sessions: MtsSession[] }
type PublicMediator = { id: string; fullName: string; region: string; specialization: string[] }

export function MtsWorkspace({ role, demoItems, onCreate, onToast }: { role: string; demoItems: { id: string; title: string; status: string; detail?: string; region?: string }[]; onCreate: () => void; onToast: (message: string) => void }) {
  const [cases, setCases] = useState<MtsCase[] | null>(null)
  const [profile, setProfile] = useState<{ id: string; pinfl?: string | null } | null>(null)
  const [mediators, setMediators] = useState<PublicMediator[]>([])
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [privacyChecks, setPrivacyChecks] = useState<Record<string, boolean>>({})
  const [schedule, setSchedule] = useState<Record<string, { at: string; duration: string }>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const isAuthenticated = Boolean(getAccessToken())
  const canCreate = ['CITIZEN', 'BUSINESS', 'APPLICANT'].includes(role)

  useEffect(() => {
    if (!getAccessToken()) { setCases(null); setProfile(null); return }
    let cancelled = false
    setLoading(true); setError('')
    Promise.all([apiGet<MtsCase[]>('/cabinet/mts/mediations'), apiGet<{ id: string; pinfl?: string | null }>('/cabinet/profile')])
      .then(([rows, user]) => { if (!cancelled) { setCases(rows); setProfile(user) } })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Mediatsiyalarni yuklab bo‘lmadi.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reload, demoItems.length])

  useEffect(() => {
    if (!getAccessToken()) return
    let cancelled = false
    apiGetPublic<{ items: PublicMediator[] }>('/public/mediators?type=MEDIATOR&limit=100')
      .then((result) => { if (!cancelled) setMediators(result.items || []) })
      .catch(() => { if (!cancelled) setMediators([]) })
    return () => { cancelled = true }
  }, [])

  const act = async (message: string, operation: () => Promise<unknown>) => {
    try { await operation(); setReload((current) => current + 1); onToast(message) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Amalni bajarib bo‘lmadi.') }
  }
  const ownParticipant = (item: MtsCase) => item.participants.find((participant) => participant.userId === profile?.id || Boolean(profile?.pinfl && participant.pinfl === profile.pinfl))

  return <section>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-700">Onlayn mediatsiya</p><h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[28px]">Mediatsiyalar</h1><p className="mt-1.5 max-w-2xl text-sm text-slate-500">Rozilik, mediator tanlovi, uchrashuv va videokonferensiya havolalari shu yerda boshqariladi.</p></div><div className="flex gap-2"><button onClick={() => setReload((current) => current + 1)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm"><RefreshCw size={15}/>Yangilash</button>{canCreate && <button onClick={onCreate} className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">+ Yangi murojaat</button>}</div></div>
    {error && <ErrorNotice message={error}/>}
    {!isAuthenticated && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">Demo kabinetda murojaat ma’lumotlari brauzerda saqlanadi. Rozilik qaydi, mediator tayinlash, rasmiy videokonferensiya va hujjatlar uchun OneID/ERI bilan tasdiqlangan API seansi kerak.</div>}
    {loading && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Mediatsiyalar yuklanmoqda…</div>}
    {!loading && isAuthenticated && cases?.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-10 text-center"><Video className="mx-auto text-slate-300" size={28}/><h2 className="mt-3 text-sm font-semibold">Hozircha mediatsiya yo‘q</h2><p className="mt-1 text-xs text-slate-500">Yangi murojaat yuborilganda javobgar roziligi va keyingi bosqichlar shu yerda ko‘rinadi.</p></div>}
    {!loading && !isAuthenticated && demoItems.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-10 text-center"><CalendarDays className="mx-auto text-slate-300" size={28}/><h2 className="mt-3 text-sm font-semibold">Hozircha murojaat yo‘q</h2><p className="mt-1 text-xs text-slate-500">Birinchi murojaatingizni yaratish uchun “Yangi murojaat” tugmasini bosing.</p></div>}
    {!loading && <div className="space-y-4">{(isAuthenticated ? (cases || []) : demoItems).map((item) => {
      const remote = isAuthenticated ? item as MtsCase : null
      const own = remote ? ownParticipant(remote) : undefined
      const allConsented = remote?.participants.length === 2 && remote.participants.every((participant) => participant.consentStatus === 'CONSENTED')
      const ownsMediation = Boolean(own && (own.userId === profile?.id || (profile?.pinfl && own.pinfl === profile.pinfl)))
      const isMediator = Boolean(remote && profile?.id && remote.mediatorId === profile.id)
      const ownSigned = isMediator ? Boolean(remote?.mediatorSignaturePkcs7) : Boolean(own?.signaturePkcs7)
      const title = remote ? remote.disputeSubject : (item as { title: string }).title
      const status = remote ? remote.type === 'MANDATORY' && remote.status === 'MEDIATOR_REQUESTED' && !remote.mediatorId ? 'Mos mediator tayinlanishi kutilmoqda' : mtsLabel(remote.status) : item.status
      const selectMediator = async () => act('Mediator tanlash so‘rovi yuborildi', () => apiPost(`/cabinet/mts/mediations/${remote!.id}/mediator`, { mediatorRegistryId: selected[remote!.id] }))
      return <article key={item.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-800">{remote?.type === 'MANDATORY' ? 'Majburiy mediatsiya' : remote ? 'Ixtiyoriy mediatsiya' : 'Demo murojaat'}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">{status}</span></div><h2 className="mt-3 text-base font-semibold">{title}</h2><p className="mt-1 text-xs text-slate-500">{item.id} · {remote?.region || item.region || 'Hudud ko‘rsatilmagan'}{remote?.courtCaseNumber ? ` · Sud ishi ${remote.courtCaseNumber}` : ''}</p><div className="mt-3 flex flex-wrap gap-2">{(remote?.participants || []).map((participant) => <span key={participant.side} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{participant.side === 'CLAIMANT' ? 'Ariza beruvchi' : 'Javobgar'}: {participant.fullName} · {participant.consentStatus === 'PENDING' ? 'rozilik kutilmoqda' : participant.consentStatus === 'CONSENTED' ? 'rozilik berdi' : 'rad etdi'}</span>)}</div></div>
        {remote && own?.consentStatus === 'PENDING' && remote.status === 'AWAITING_CONSENT' && <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between"><label className="flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={Boolean(privacyChecks[remote.id])} onChange={(event) => setPrivacyChecks((current) => ({ ...current, [remote.id]: event.target.checked }))} className="mt-1 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"/><span>Mediatsiyada qatnashish uchun shaxsiy ma’lumotlarim qayta ishlanishiga roziman.</span></label><div className="flex shrink-0 gap-2"><button disabled={!privacyChecks[remote.id]} onClick={() => act('Rozilik qayd etildi', () => apiPost(`/cabinet/mts/mediations/${remote.id}/consent`, { side: own.side, status: 'CONSENTED', privacyAccepted: true }))} className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Rozilik berish</button><button onClick={() => { if (window.confirm('Mediatsiyaga rozilik bermasangiz, ish yopiladi. Davom etasizmi?')) void act('Rozilik rad etildi va ish yopildi', () => apiPost(`/cabinet/mts/mediations/${remote.id}/consent`, { side: own.side, status: 'DECLINED' })) }} className="h-10 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700">Rad etish</button></div></div>}
      </div>
      {remote && remote.type === 'ONLINE' && allConsented && !remote.mediatorId && ownsMediation && <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row"><select value={selected[remote.id] || ''} onChange={(event) => setSelected((current) => ({ ...current, [remote.id]: event.target.value }))} className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Reyestrdan mediator tanlang</option>{mediators.map((mediator) => <option value={mediator.id} key={mediator.id}>{mediator.fullName} · {mediator.region}</option>)}</select><button disabled={!selected[remote.id]} onClick={selectMediator} className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40">Mediatorni tanlash</button></div>}
      {remote && isMediator && allConsented && !remote.mediatorSignaturePkcs7 && !remote.participants.some((participant) => participant.signaturePkcs7) && <AgreementEditor initialText={remote.agreementText || ''} onSave={(text) => act('Kelishuv loyihasi saqlandi', () => apiPost(`/cabinet/mts/mediations/${remote.id}/agreement`, { text }))}/>}
      {remote?.agreementText && remote.status === 'AGREEMENT_PENDING_SIGNATURE' && ((isMediator && !remote.mediatorSignaturePkcs7) || (ownsMediation && !ownSigned)) && <SignatureBox agreement={remote.agreementText} onSign={(pkcs7) => act('Elektron imzo tekshirishga yuborildi', () => apiPost(`/cabinet/mts/mediations/${remote.id}/agreement/sign`, { pkcs7 }))}/>}
      {remote && role === 'MEDIATOR' && remote.mediatorId === profile?.id && remote.status === 'SCHEDULED' && remote.sessions.length === 0 && <ScheduleMeeting caseId={remote.id} value={schedule[remote.id] || { at: '', duration: '60' }} onChange={(value) => setSchedule((current) => ({ ...current, [remote.id]: value }))} onSchedule={() => act('Videouchrashuv belgilandi', () => apiPost(`/cabinet/mts/mediations/${remote.id}/sessions`, { scheduledAt: new Date(schedule[remote.id]?.at || '').toISOString(), durationMin: Number(schedule[remote.id]?.duration || 60) }))}/>}
      {remote?.sessions?.length ? <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">{remote.sessions.map((session) => <div key={session.id} className="flex flex-col justify-between gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold">Videokonferensiya</p><p className="mt-1 text-xs text-slate-500">{new Date(session.scheduledAt).toLocaleString('uz-UZ')} · {session.durationMin} daqiqa · {mtsLabel(session.status)}</p></div><button onClick={() => act('Uchrashuv havolasi ochildi', async () => { const tab = window.open('', '_blank'); if (tab) tab.opener = null; const result = await apiPost<{ joinUrl: string }>(`/cabinet/mts/mediations/${remote.id}/sessions/${session.id}/join`, {}); if (tab) tab.location.href = result.joinUrl; else window.location.assign(result.joinUrl) })} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 text-xs font-semibold text-white"><Video size={15}/>Uchrashuvga qo‘shilish</button></div>)}</div> : null}
      {remote && isMediator && remote.status === 'IN_SESSION' && <ResultEditor onSubmit={(resultStatus, summary, agreementText) => act('Mediatsiya natijasi saqlandi', () => apiPost(`/cabinet/mts/mediations/${remote.id}/result`, { resultStatus, summary, agreementText: agreementText || remote.agreementText || undefined }))}/>}
      </article>
    })}</div>}
  </section>
}

type MkApplication = { id: string; status: string; submittedAt: string; rejectionReason?: string | null; phone: string; autoCheckResult?: { status?: string } | null }
export function MkApplicationWorkspace({ role, demoItems, onCreate }: { role: string; demoItems: { id: string; title: string; status: string; detail?: string; region?: string; createdAt?: string }[]; onCreate: () => void }) {
  const [remote, setRemote] = useState<MkApplication[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const authenticated = Boolean(getAccessToken())
  useEffect(() => {
    if (!getAccessToken()) { setRemote(null); return }
    let cancelled = false
    setLoading(true); setError('')
    apiGet<MkApplication[]>('/cabinet/mk/applications')
      .then((items) => { if (!cancelled) setRemote(items) })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Arizalarni yuklab bo‘lmadi.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [demoItems.length])

  return <section>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-700">Mediator-talabgor</p><h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[28px]">Mediator maqomiga arizalarim</h1><p className="mt-1.5 max-w-2xl text-sm text-slate-500">Hujjatlar, huquqiy tekshiruv va komissiya qarori bo‘yicha ariza holatini kuzating.</p></div><button onClick={onCreate} className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">+ Yangi ariza</button></div>
    {!authenticated && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">Demo arizalar faqat brauzerda saqlanadi va hujjat fayllari serverga yuklanmaydi. Rasmiy topshirish uchun OneID bilan tasdiqlangan API seansi kerak.</div>}
    {error && <ErrorNotice message={error}/>}
    {loading ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Arizalar yuklanmoqda…</div> : null}
    {!loading && authenticated && remote?.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-10 text-center"><FileText className="mx-auto text-slate-300" size={28}/><h2 className="mt-3 text-sm font-semibold">Hozircha mediator arizasi yo‘q</h2><p className="mt-1 text-xs text-slate-500">Diplom va zarur hujjatlarni biriktirib, arizani yuboring.</p></div>}
    {!loading && !authenticated && demoItems.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-10 text-center"><FileText className="mx-auto text-slate-300" size={28}/><h2 className="mt-3 text-sm font-semibold">Hozircha ariza yo‘q</h2><p className="mt-1 text-xs text-slate-500">Mediator maqomini olish arizasini yaratish uchun yuqoridagi tugmani bosing.</p></div>}
    {!loading && <div className="mt-4 space-y-3">{authenticated ? (remote || []).map((application) => <article key={application.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{application.id}</p><h2 className="mt-2 text-sm font-semibold">Mediator maqomini olish</h2><p className="mt-1 text-xs text-slate-500">Yuborilgan: {new Date(application.submittedAt).toLocaleString('uz-UZ')} · {application.phone}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{mkLabel(application.status)}</span></div>{application.autoCheckResult?.status && <p className="mt-3 text-xs text-slate-600">Davlat reyestri tekshiruvi: {application.autoCheckResult.status === 'IN_PROGRESS' ? 'tekshiruv kutilmoqda' : application.autoCheckResult.status}</p>}{application.rejectionReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">Rad etish sababi: {application.rejectionReason}</p>}</article>) : demoItems.map((application) => <article key={application.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{application.id}</p><h2 className="mt-2 text-sm font-semibold">{application.title}</h2><p className="mt-1 text-xs text-slate-500">{application.createdAt} · {application.detail}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{application.status}</span></div></article>)}</div>}
    {role !== 'APPLICANT' && <p className="mt-4 text-xs text-slate-500">Komissiya, hududiy organ va vazirlik ko‘rib chiqish amallari o‘z vakolatli kabinetlarida bajariladi.</p>}
  </section>
}

function mkLabel(value: string) { return ({ SUBMITTED: 'Yangi yuborildi · tekshiruv kutilmoqda', CHECKING: 'Tekshiruv va ko‘rib chiqishda', ACCEPTED: 'Qabul qilindi', REJECTED: 'Rad etildi', INVITED: 'Imtihonga chaqirildi', PASSED: 'Imtihondan o‘tdi', FAILED: 'Imtihondan o‘tmadi', REGISTERED: 'Reyestrga kiritildi' } as Record<string, string>)[value] || value }

function AgreementEditor({ initialText, onSave }: { initialText: string; onSave: (text: string) => void }) {
  const [text, setText] = useState(initialText)
  return <div className="mt-4 border-t border-slate-100 pt-4"><label className="block text-xs font-semibold text-slate-700">Kelishuv loyihasi *<textarea minLength={50} maxLength={10000} value={text} onChange={(event) => setText(event.target.value)} className="field-control mt-1 min-h-32 resize-y" placeholder="Taraflar kelishgan shartlar, majburiyatlar va bajarish muddatlarini kiriting"/></label><p className="mt-2 text-xs text-slate-500">Matn saqlangach, imzolovchilar uchun uning SHA-256 xeshi bo‘yicha ERI tekshiruvi qilinadi.</p><button disabled={text.trim().length < 50} onClick={() => onSave(text)} className="mt-3 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Kelishuv loyihasini saqlash</button></div>
}

function SignatureBox({ agreement, onSign }: { agreement: string; onSign: (pkcs7: string) => void }) {
  const [pkcs7, setPkcs7] = useState('')
  return <div className="mt-4 border-t border-slate-100 pt-4"><details className="rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">Kelishuv matnini ko‘rish</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{agreement}</p></details><label className="mt-3 block text-xs font-semibold text-slate-700">ERI PKCS#7 imzo qiymati<textarea value={pkcs7} onChange={(event) => setPkcs7(event.target.value)} maxLength={500000} className="field-control mt-1 min-h-24 font-mono text-xs" placeholder="E-IMZO orqali aynan ushbu kelishuv xeshiga olingan PKCS#7 qiymatini kiriting"/></label><button disabled={pkcs7.trim().length < 100} onClick={() => onSign(pkcs7.trim())} className="mt-3 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Imzoni tekshirishga yuborish</button></div>
}

function ResultEditor({ onSubmit }: { onSubmit: (status: 'SETTLED' | 'NOT_SETTLED', summary: string, agreementText: string) => void }) {
  const [status, setStatus] = useState<'SETTLED' | 'NOT_SETTLED'>('SETTLED')
  const [summary, setSummary] = useState('')
  const [agreement, setAgreement] = useState('')
  return <div className="mt-4 border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold">Sessiya natijasini qayd etish</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Natija<select value={status} onChange={(event) => setStatus(event.target.value as 'SETTLED' | 'NOT_SETTLED')} className="field-control mt-1"><option value="SETTLED">Kelishuvga erishildi</option><option value="NOT_SETTLED">Kelishuvga erishilmadi</option></select></label><label className="text-xs font-semibold text-slate-600">Qisqa xulosa<input required maxLength={10000} value={summary} onChange={(event) => setSummary(event.target.value)} className="field-control mt-1"/></label></div>{status === 'SETTLED' && <label className="mt-3 block text-xs font-semibold text-slate-600">Bajarish shartlari yoki qo‘shimcha kelishuv<textarea value={agreement} onChange={(event) => setAgreement(event.target.value)} className="field-control mt-1 min-h-20" placeholder="Oldindan imzolangan kelishuv ishlatiladi; o‘zgargan shartlar bo‘lsa kiriting"/></label>}<button disabled={summary.trim().length < 5} onClick={() => onSubmit(status, summary, agreement)} className="mt-3 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Natijani saqlash</button></div>
}

function ScheduleMeeting({ caseId, value, onChange, onSchedule }: { caseId: string; value: { at: string; duration: string }; onChange: (value: { at: string; duration: string }) => void; onSchedule: () => void }) {
  const minimum = new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)
  return <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_150px_auto]"><label className="text-xs font-semibold text-slate-600">Uchrashuv vaqti<input required type="datetime-local" min={minimum} value={value.at} onChange={(event) => onChange({ ...value, at: event.target.value })} className="field-control mt-1" aria-label={`Uchrashuv vaqti ${caseId}`}/></label><label className="text-xs font-semibold text-slate-600">Davomiyligi<select value={value.duration} onChange={(event) => onChange({ ...value, duration: event.target.value })} className="field-control mt-1">{[30, 60, 90, 120, 180].map((minutes) => <option key={minutes} value={minutes}>{minutes} daqiqa</option>)}</select></label><button disabled={!value.at} onClick={onSchedule} className="mt-5 h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40">Videouchrashuv yaratish</button></div>
}

function mtsLabel(value: string) { return ({ AWAITING_CONSENT: 'Rozilik kutilmoqda', MEDIATOR_REQUESTED: 'Mediator tanlash', MEDIATOR_ASSIGNED: 'Mediator tayinlandi', AGREEMENT_PENDING_SIGNATURE: 'Kelishuv imzolanmoqda', SCHEDULED: 'Rejalashtirildi', IN_SESSION: 'Sessiya davom etmoqda', SETTLED: 'Kelishuv monitoringi', FAILED: 'Yakunlanmadi', CLOSED: 'Yopildi', STARTED: 'Boshlangan', FINISHED: 'Yakunlangan', CANCELLED: 'Bekor qilingan' } as Record<string, string>)[value] || value }
function isUzPhone(value: string) { const digits = value.replace(/\D/g, ''); return digits.length === 9 || (digits.length === 12 && digits.startsWith('998')) }

function FileField({ label, required, file, onChange }: { label: string; required?: boolean; file: File | null; onChange: (file: File | null) => void }) {
  const [message, setMessage] = useState('')
  return <label className="block cursor-pointer rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 hover:border-blue-400 hover:bg-blue-50/40"><input className="sr-only" type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" required={required && !file} onChange={(event) => { const chosen = event.target.files?.[0] || null; if (chosen && chosen.size > 10 * 1024 * 1024) { setMessage('Fayl hajmi 10 MB dan oshmasligi kerak.'); event.target.value = ''; onChange(null); return } setMessage(''); onChange(chosen) }}/><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600"><Upload size={17}/></span><span className="min-w-0 flex-1"><strong className="block text-xs font-semibold text-slate-800">{label}</strong><span className="mt-1 block truncate text-xs text-slate-500">{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Tanlash uchun bosing'}</span></span>{file && <Check size={16} className="text-emerald-700"/>}</span>{message && <span className="mt-2 block text-xs text-red-600">{message}</span>}</label>
}

function Dialog({ children, title, description, onClose }: { children: React.ReactNode; title: string; description: string; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="workflow-title" className="relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><header className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><button type="button" onClick={onClose} aria-label="Yopish" className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button><h2 id="workflow-title" className="pr-10 text-lg font-semibold text-slate-950">{title}</h2><p className="mt-1 pr-7 text-xs leading-5 text-slate-500">{description}</p></header>{children}</section></div>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-slate-600">{label}{children}</label> }
function Summary({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{value}</dd></div> }
function ErrorNotice({ message }: { message: string }) { return <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-800"><AlertCircle size={16} className="mt-0.5 shrink-0"/>{message}</div> }

export function WorkflowFileIcon() { return <FileText size={17}/> }
