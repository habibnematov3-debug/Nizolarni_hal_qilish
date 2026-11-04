import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, Check, FileText, RefreshCw, ShieldCheck, Star, Upload, Video, X } from 'lucide-react'
import { Alert, Button, Checkbox, FileInput, Group, Modal, MultiSelect, Paper, Select, Stack, Text, TextInput, ThemeIcon } from '@mantine/core'
import { apiGet, apiGetPublic, apiPatch, apiPost, getAccessToken } from './api'
import { DocumentExchangeWorkspace } from './DocumentExchangeWorkspace'
import { applicantText, type ApplicantLanguage } from './applicantLocale'

const regions = [
  'Qoraqalpog‘iston Respublikasi', 'Andijon viloyati', 'Buxoro viloyati', 'Jizzax viloyati',
  'Qashqadaryo viloyati', 'Navoiy viloyati', 'Namangan viloyati', 'Samarqand viloyati',
  'Surxondaryo viloyati', 'Sirdaryo viloyati', 'Toshkent viloyati', 'Farg‘ona viloyati',
  'Xorazm viloyati', 'Toshkent shahri',
]
const categories = [
  ['FAMILY', 'Oilaviy nizo'], ['CIVIL', 'Fuqarolik va shartnomaviy nizo'], ['LABOR', 'Mehnat nizosi'],
  ['ECONOMIC', 'Iqtisodiy va tadbirkorlik nizosi'], ['INTELLECTUAL', 'Intellektual mulk nizosi'], ['BANKING', 'Bank va moliya nizosi'],
  ['INVESTMENT', 'Investitsiya nizosi'], ['DIGITAL', 'Raqamli texnologiyalar nizosi'], ['CROSS_BORDER', 'Xalqaro / transchegaraviy tijorat nizosi'],
]

type CategoryField = { key: string; label: string; placeholder: string; type?: 'text' | 'date' }
const categoryFields: Record<string, CategoryField[]> = {
  FAMILY: [
    { key: 'familyRelation', label: 'Oilaviy munosabat turi', placeholder: 'Masalan, aliment, mol-mulk yoki farzand bilan bog‘liq masala' },
    { key: 'familyPeriod', label: 'Tegishli davr yoki sana', placeholder: 'Vaziyatga tegishli sana/davr' },
  ],
  CIVIL: [
    { key: 'contractNumber', label: 'Shartnoma raqami', placeholder: 'Masalan, SH-2026/15' },
    { key: 'contractDate', label: 'Shartnoma sanasi', placeholder: '', type: 'date' },
  ],
  LABOR: [
    { key: 'employer', label: 'Ish beruvchi', placeholder: 'Tashkilot nomi yoki ish beruvchining F.I.Sh.' },
    { key: 'position', label: 'Lavozim va mehnat munosabati', placeholder: 'Lavozim, ish boshlagan/tugatgan sana yoki mehnat shartnomasi raqami' },
  ],
  ECONOMIC: [
    { key: 'contractNumber', label: 'Shartnoma raqami', placeholder: 'Masalan, SH-2026/15' },
    { key: 'contractDate', label: 'Shartnoma sanasi', placeholder: '', type: 'date' },
    { key: 'invoiceDetails', label: 'Hisob-faktura yoki hisob-kitob rekvizitlari', placeholder: 'Raqami, sanasi va hisob-kitob davri' },
  ],
  INTELLECTUAL: [
    { key: 'ipObject', label: 'Intellektual mulk obyekti', placeholder: 'Asar, tovar belgisi, patent yoki boshqa obyekt' },
    { key: 'ipRegistration', label: 'Ro‘yxat/patent raqami (mavjud bo‘lsa)', placeholder: 'Ro‘yxatdan o‘tkazish yoki patent ma’lumoti' },
  ],
  BANKING: [
    { key: 'contractNumber', label: 'Shartnoma yoki kredit raqami', placeholder: 'Shartnoma raqami' },
    { key: 'contractDate', label: 'Shartnoma sanasi', placeholder: '', type: 'date' },
    { key: 'invoiceDetails', label: 'Hisob-kitob davri/rekvizitlari', placeholder: 'Qarz yoki hisob-kitob tafsilotlari' },
  ],
  INVESTMENT: [
    { key: 'contractNumber', label: 'Investitsiya shartnomasi raqami', placeholder: 'Shartnoma raqami' },
    { key: 'contractDate', label: 'Shartnoma sanasi', placeholder: '', type: 'date' },
    { key: 'investmentDetails', label: 'Investor va majburiyatlar', placeholder: 'Investor, investitsiya bosqichi va bajarilmagan majburiyatlar' },
  ],
  DIGITAL: [
    { key: 'digitalProduct', label: 'Raqamli mahsulot yoki xizmat', placeholder: 'IT xizmati, platforma, litsenziya yoki raqamli huquq' },
    { key: 'contractNumber', label: 'Shartnoma/litsenziya raqami (mavjud bo‘lsa)', placeholder: 'Shartnoma raqami' },
  ],
  CROSS_BORDER: [
    { key: 'contractNumber', label: 'Shartnoma raqami', placeholder: 'Shartnoma raqami' },
    { key: 'contractDate', label: 'Shartnoma sanasi', placeholder: '', type: 'date' },
    { key: 'countriesAndLanguage', label: 'Davlatlar va shartnoma tili', placeholder: 'Qaysi davlatlar va qaysi tilda tuzilgan' },
  ],
}

export function categoryAnswerDetails(category: string, answers: Record<string, string>) {
  return (categoryFields[category] || []).flatMap((field) => answers[field.key]?.trim() ? [`${field.label}: ${answers[field.key].trim()}`] : [])
}

export function categoryDetailsLabel(category: string) {
  return ({ FAMILY: 'Oilaviy nizo bo‘yicha qo‘shimcha ma’lumot', CIVIL: 'Shartnoma va talab bo‘yicha tafsilotlar', LABOR: 'Ish joyi va mehnat munosabatlari tafsilotlari', ECONOMIC: 'Tashkilot va xo‘jalik munosabatlari tafsilotlari', INTELLECTUAL: 'Intellektual mulk obyekti tafsilotlari', BANKING: 'Bank yoki moliyaviy shartnoma tafsilotlari', INVESTMENT: 'Investitsiya, investor va majburiyatlar tafsilotlari', DIGITAL: 'IT/xizmat shartnomasi va raqamli huquqlar tafsilotlari', CROSS_BORDER: 'Davlatlar, shartnoma tili va transchegaraviy talab tafsilotlari' } as Record<string, string>)[category] || 'Nizo bo‘yicha qo‘shimcha ma’lumot'
}

function categoryDetailsPlaceholder(category: string) {
  return ({ FAMILY: 'Masalan, oila a’zolari yoki farzandlar bilan bog‘liq holatlar', CIVIL: 'Shartnoma turi, tuzilgan sana va talab tafsilotlari', LABOR: 'Ish beruvchi, lavozim va mehnat munosabati', ECONOMIC: 'Shartnoma, hisob-kitob yoki korxona rekvizitlari', INTELLECTUAL: 'Asar, tovar belgisi yoki boshqa huquq obyekti', BANKING: 'Bank/qarz shartnomasi va hisob-kitoblar', INVESTMENT: 'Investitsiya shartnomasi, mablag‘ va taraf majburiyatlari', DIGITAL: 'Raqamli mahsulot, IT xizmat yoki litsenziya kelishuvi', CROSS_BORDER: 'Xorijiy taraf, davlat, shartnoma va qo‘llanadigan til' } as Record<string, string>)[category] || 'Tegishli tafsilotlarni kiriting'
}

export type MediationDraft = {
  type: 'ONLINE' | 'MANDATORY'
  disputeCategory: string
  documentLanguage: 'UZ' | 'RU' | 'EN'
  businessOrganizationId: string
  preferredMediatorRegistryId: string
  disputeSubject: string
  categoryDetails: string
  claimAmount: string
  categoryAnswers: Record<string, string>
  attachments: File[]
  courtCaseNumber: string
  claimantName: string
  claimantPinfl: string
  claimantPhone: string
  respondentName: string
  respondentPinfl: string
  respondentType: 'INDIVIDUAL' | 'BUSINESS'
  respondentTin: string
  respondentPhone: string
  respondentEmail: string
  region: string
  privacyAccepted: boolean
}

export function MediationRequestForm({ initialMediator, initialMediatorRegistryId, initialMediatorIsSample = false, initialCourtCaseNumber, businessMode = false, onClose, onSubmit }: {
  initialMediator?: string
  initialMediatorRegistryId?: string
  initialMediatorIsSample?: boolean
  initialCourtCaseNumber?: string
  businessMode?: boolean
  onClose: () => void
  onSubmit: (draft: MediationDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<MediationDraft>({
    type: initialCourtCaseNumber ? 'MANDATORY' : 'ONLINE', disputeCategory: 'CIVIL', documentLanguage: 'UZ', businessOrganizationId: '', preferredMediatorRegistryId: initialMediatorIsSample ? '' : initialMediatorRegistryId || '', disputeSubject: '', categoryDetails: '', claimAmount: '', categoryAnswers: {}, attachments: [], courtCaseNumber: initialCourtCaseNumber || '',
    claimantName: '', claimantPinfl: '', claimantPhone: '', respondentName: '',
    respondentPinfl: '', respondentType: 'INDIVIDUAL', respondentTin: '', respondentPhone: '', respondentEmail: '', region: '', privacyAccepted: false,
  })
  const [businessOrganizations, setBusinessOrganizations] = useState<Array<{ id: string; name: string; code?: string | null }>>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const authenticated = Boolean(getAccessToken())
  const isMandatory = draft.type === 'MANDATORY'
  const visibleCategories = businessMode ? categories.filter(([key]) => !['FAMILY', 'LABOR'].includes(key)) : categories.filter(([key]) => !['INVESTMENT', 'DIGITAL', 'CROSS_BORDER'].includes(key))
  const respondentPinflError = useMemo(() => draft.respondentPinfl && !/^\d{14}$/.test(draft.respondentPinfl) ? 'PINFL 14 ta raqamdan iborat bo‘lishi kerak.' : '', [draft.respondentPinfl])
  const update = <K extends keyof MediationDraft>(key: K, value: MediationDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    if (!authenticated) return
    let cancelled = false
    const profileRequest = apiGet<{ fullName?: string | null; pinfl?: string | null; phone?: string | null }>('/cabinet/profile')
    const organizationsRequest = businessMode ? apiGet<Array<{ id: string; name: string; code?: string | null }>>('/cabinet/business/organizations') : Promise.resolve([])
    Promise.all([profileRequest, organizationsRequest])
      .then(([profile, organizations]) => {
        if (cancelled) return
        setBusinessOrganizations(organizations)
        setDraft((current) => ({ ...current, claimantName: profile.fullName || '', claimantPinfl: profile.pinfl || '', claimantPhone: profile.phone || '', businessOrganizationId: current.businessOrganizationId || organizations[0]?.id || '' }))
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Shaxsiy profilni yuklab bo‘lmadi.') })
    return () => { cancelled = true }
  }, [authenticated, businessMode])

  const continueFromDispute = () => {
    if (draft.disputeSubject.trim().length < 10) { setError('Nizo mazmunini kamida 10 ta belgi bilan yozing.'); return }
    if (!draft.region) { setError('Hududni tanlang.'); return }
    if (isMandatory && !draft.courtCaseNumber.trim()) { setError('Majburiy mediatsiya uchun sud ishi raqamini kiriting.'); return }
    setError(''); setStep(2)
  }
  const continueFromParties = () => {
    if (!draft.claimantName.trim() || !/^\d{14}$/.test(draft.claimantPinfl) || !isUzPhone(draft.claimantPhone)) { setError('Ariza beruvchining F.I.Sh., 14 raqamli PINFL va +998 telefon raqamini tekshiring.'); return }
    if (businessMode && authenticated && !draft.businessOrganizationId) { setError('Ariza beruvchi tashkilotni E-IMZO bilan bog‘langan STIR profillaridan tanlang.'); return }
    if (!draft.respondentName.trim() || !isUzPhone(draft.respondentPhone) || (draft.respondentType === 'BUSINESS' && !/^\d{9}$/.test(draft.respondentTin))) { setError('Javobgar nomi, telefoni va yuridik shaxs bo‘lsa 9 raqamli STIRni tekshiring.'); return }
    setError(''); setStep(3)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (draft.disputeSubject.trim().length < 10 || !draft.region || (isMandatory && !draft.courtCaseNumber.trim())) { setError('Nizo turi, mazmuni, hudud va majburiy holatda sud ishi raqamini to‘ldiring.'); setStep(1); return }
    if (!draft.claimantName.trim() || !/^\d{14}$/.test(draft.claimantPinfl) || !isUzPhone(draft.claimantPhone) || !draft.respondentName.trim() || !isUzPhone(draft.respondentPhone) || (businessMode && authenticated && !draft.businessOrganizationId) || (draft.respondentType === 'BUSINESS' && !/^\d{9}$/.test(draft.respondentTin))) { setError('Ariza beruvchi va javobgar taraflarning ma’lumotlarini tekshiring.'); setStep(2); return }
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
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4"><p className="text-sm font-semibold text-slate-900">Mediatsiya turi</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{[['ONLINE', 'Ixtiyoriy mediatsiya', 'Taraflar mediatorni o‘zaro tanlaydi.'], ['MANDATORY', 'Majburiy mediatsiya', 'Ish sudga taalluqli bo‘lsa; sud ishi raqami kerak.']].map(([value, title, text]) => <button type="button" key={value} onClick={() => setDraft((current) => ({ ...current, type: value as MediationDraft['type'], preferredMediatorRegistryId: value === 'MANDATORY' ? '' : current.preferredMediatorRegistryId }))} className={`rounded-lg border p-3 text-left ${draft.type === value ? 'border-emerald-500 bg-white ring-2 ring-emerald-100' : 'border-slate-200 bg-white/70'}`}><span className="flex items-center justify-between text-sm font-semibold">{title}{draft.type === value && <Check size={15} className="text-emerald-700"/>}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{text}</span></button>)}</div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nizo turi *"><select required value={draft.disputeCategory} onChange={(event) => setDraft((current) => ({ ...current, disputeCategory: event.target.value, categoryDetails: '', claimAmount: '', categoryAnswers: {} }))} className="form-control">{visibleCategories.map(([value, title]) => <option value={value} key={value}>{title}</option>)}</select></Field>
          <Field label="Hudud *"><select required value={draft.region} onChange={(event) => update('region', event.target.value)} className="form-control"><option value="">Hududni tanlang</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></Field>
        </div>
        {businessMode && <Field label="Hujjat tili *"><select value={draft.documentLanguage} onChange={(event) => update('documentLanguage', event.target.value as MediationDraft['documentLanguage'])} className="form-control"><option value="UZ">O‘zbek tili</option><option value="RU">Русский</option><option value="EN">English</option></select></Field>}
        {isMandatory && <Field label="Sud ishi raqami *"><input required maxLength={100} value={draft.courtCaseNumber} onChange={(event) => update('courtCaseNumber', event.target.value)} className="form-control" placeholder="Sud hujjatidagi ish raqami"/></Field>}
        <Field label="Nizo mavzusi va batafsil mazmuni *"><textarea required minLength={10} maxLength={3000} value={draft.disputeSubject} onChange={(event) => update('disputeSubject', event.target.value)} className="form-control min-h-28 resize-y" placeholder="Nizo mazmunini, talablarni va muhim sanalarni yozing"/></Field>
        <Field label={categoryDetailsLabel(draft.disputeCategory)}><textarea maxLength={2000} value={draft.categoryDetails} onChange={(event) => update('categoryDetails', event.target.value)} className="form-control min-h-20 resize-y" placeholder={categoryDetailsPlaceholder(draft.disputeCategory)}/></Field>
        {(categoryFields[draft.disputeCategory] || []).map((field) => <Field key={field.key} label={`${field.label} (ixtiyoriy)`}><input type={field.type || 'text'} maxLength={300} value={draft.categoryAnswers[field.key] || ''} onChange={(event) => setDraft((current) => ({ ...current, categoryAnswers: { ...current.categoryAnswers, [field.key]: event.target.value } }))} className="form-control" placeholder={field.placeholder}/></Field>)}
        {['CIVIL', 'ECONOMIC', 'BANKING', 'INVESTMENT', 'DIGITAL', 'CROSS_BORDER'].includes(draft.disputeCategory) && <Field label="Talab summasi (ixtiyoriy, so‘m)"><input inputMode="decimal" maxLength={30} value={draft.claimAmount} onChange={(event) => update('claimAmount', event.target.value.replace(/[^\d., ]/g, ''))} className="form-control" placeholder="Masalan, 5 000 000"/></Field>}
        <FileListField label={businessMode ? 'Tijorat hujjatlari (shartnoma, hisob-faktura, solishtirma dalolatnoma, to‘lov topshiriqnomasi yoki pretenziya)' : 'Tasdiqlovchi hujjatlar (ixtiyoriy)'} files={draft.attachments} onChange={(files) => update('attachments', files)}/>
        {initialMediator && draft.type === 'ONLINE' && <div className={`rounded-lg px-3 py-2 text-sm ${initialMediatorIsSample ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}>{initialMediatorIsSample ? <>Namuna reyestrdan tanlandi: <strong>{initialMediator}</strong>. Tanlov murojaatga saqlanadi, lekin mediator kabinetiga tayinlash uchun mutaxassisning haqiqiy platforma hisobi reyestr yozuviga bog‘langan bo‘lishi kerak.</> : <>Tanlangan mediator: <strong>{initialMediator}</strong>. Rasmiy murojaatda tanlov saqlanadi va ikki taraf roziligidan keyin tayinlanadi.</>}</div>}
        {error && <ErrorNotice message={error}/>}<div className="flex justify-end border-t border-slate-100 pt-4"><button type="button" onClick={continueFromDispute} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Taraflar ma’lumotiga o‘tish</button></div>
      </div>}
      {step === 2 && <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-slate-200 p-4"><div><p className="text-sm font-semibold">{businessMode ? 'Yuridik shaxs — ariza beruvchi' : 'Ariza beruvchi'}</p><p className="mt-1 text-xs text-slate-500">{authenticated ? 'Vakilning shaxsiy ma’lumotlari tasdiqlangan profildan olindi.' : 'Demo rejimida vakil ma’lumotlarini kiriting.'}</p></div>
            {businessMode && <><Field label="Tashkilot va STIR *"><select required value={draft.businessOrganizationId} onChange={(event) => update('businessOrganizationId', event.target.value)} disabled={!businessOrganizations.length} className="form-control"><option value="">{businessOrganizations.length ? 'Tashkilotni tanlang' : 'Tasdiqlangan E-IMZO STIR profili topilmadi'}</option>{businessOrganizations.map((organization) => <option value={organization.id} key={organization.id}>{organization.name} · STIR {organization.code || '—'}</option>)}</select></Field>{!businessOrganizations.length && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Rasmiy murojaat yuborishda tashkilot nomi va STIR E-IMZO orqali tasdiqlangan bo‘lishi shart.</p>}</>}
            <Field label={businessMode ? 'Vakil F.I.Sh. *' : 'F.I.Sh. *'}><input required maxLength={160} value={draft.claimantName} onChange={(event) => update('claimantName', event.target.value)} readOnly={authenticated} className="form-control read-only:bg-slate-50" autoComplete="name"/></Field><Field label={businessMode ? 'Vakil PINFL *' : 'PINFL *'}><input required inputMode="numeric" pattern="\d{14}" maxLength={14} value={draft.claimantPinfl} onChange={(event) => update('claimantPinfl', event.target.value.replace(/\D/g, ''))} readOnly={authenticated} className="form-control read-only:bg-slate-50" placeholder="14 ta raqam"/></Field><Field label={businessMode ? 'Vakil telefoni *' : 'Telefon *'}><input required type="tel" value={draft.claimantPhone} onChange={(event) => update('claimantPhone', event.target.value)} readOnly={authenticated} className="form-control read-only:bg-slate-50" placeholder="+998 90 123 45 67" autoComplete="tel"/></Field></section>
          <section className="space-y-3 rounded-xl border border-slate-200 p-4"><div><p className="text-sm font-semibold">Javobgar taraf</p><p className="mt-1 text-xs text-slate-500">Rozilik va xabarnoma uchun aloqa ma’lumoti kerak.</p></div><Field label="Javobgar turi"><select value={draft.respondentType} onChange={(event) => update('respondentType', event.target.value as MediationDraft['respondentType'])} className="form-control"><option value="INDIVIDUAL">Jismoniy shaxs</option><option value="BUSINESS">Yuridik shaxs</option></select></Field><Field label={draft.respondentType === 'BUSINESS' ? 'Tashkilot nomi *' : 'F.I.Sh. *'}><input required maxLength={160} value={draft.respondentName} onChange={(event) => update('respondentName', event.target.value)} className="form-control"/></Field>{draft.respondentType === 'BUSINESS' ? <Field label="STIR *"><input required inputMode="numeric" pattern="\d{9}" maxLength={9} value={draft.respondentTin} onChange={(event) => update('respondentTin', event.target.value.replace(/\D/g, ''))} className="form-control" placeholder="9 ta raqam"/></Field> : <Field label="PINFL (ixtiyoriy)"><input inputMode="numeric" maxLength={14} value={draft.respondentPinfl} onChange={(event) => update('respondentPinfl', event.target.value.replace(/\D/g, ''))} className="form-control" placeholder="14 ta raqam" aria-invalid={Boolean(respondentPinflError)}/>{respondentPinflError && <span className="mt-1 block text-xs text-red-600">{respondentPinflError}</span>}</Field>}<Field label="Telefon *"><input required type="tel" value={draft.respondentPhone} onChange={(event) => update('respondentPhone', event.target.value)} className="form-control" placeholder="+998 90 123 45 67"/></Field><Field label="Elektron pochta"><input type="email" maxLength={254} value={draft.respondentEmail} onChange={(event) => update('respondentEmail', event.target.value)} className="form-control" placeholder="ixtiyoriy"/></Field></section>
        </div>
        {error && <ErrorNotice message={error}/>}<div className="flex justify-between border-t border-slate-100 pt-4"><button type="button" onClick={() => { setError(''); setStep(1) }} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium">Orqaga</button><button type="button" onClick={continueFromParties} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Ma’lumotlarni tekshirish</button></div>
      </div>}
      {step === 3 && <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-semibold">Yuborishdan oldin tekshiring</h3><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><Summary label="Mediatsiya turi" value={isMandatory ? 'Majburiy' : 'Ixtiyoriy'}/><Summary label="Nizo turi" value={categories.find(([id]) => id === draft.disputeCategory)?.[1] || draft.disputeCategory}/>{businessMode && <><Summary label="Hujjat tili" value={{ UZ: 'O‘zbek tili', RU: 'Русский', EN: 'English' }[draft.documentLanguage]}/><Summary label="Ariza beruvchi tashkilot" value={businessOrganizations.find((item) => item.id === draft.businessOrganizationId)?.name || 'Demo tashkilot'}/></>}<Summary label="Hudud" value={draft.region}/><Summary label="Sud ishi raqami" value={draft.courtCaseNumber || 'Ko‘rsatilmagan'}/><Summary label={businessMode ? 'Vakil' : 'Ariza beruvchi'} value={`${draft.claimantName} · ${draft.claimantPhone}`}/><Summary label="Javobgar" value={`${draft.respondentName} · ${draft.respondentPhone}${draft.respondentType === 'BUSINESS' ? ` · STIR ${draft.respondentTin}` : ''}`}/><Summary label="Nizo mazmuni" value={draft.disputeSubject}/>{categoryAnswerDetails(draft.disputeCategory, draft.categoryAnswers).map((answer) => <Summary key={answer} label={answer.split(':', 1)[0]} value={answer.slice(answer.indexOf(':') + 1).trim()}/>)}{draft.categoryDetails && <Summary label={categoryDetailsLabel(draft.disputeCategory)} value={draft.categoryDetails}/ >}{draft.claimAmount && <Summary label="Talab summasi" value={`${draft.claimAmount} so‘m`}/ >}{draft.attachments.length > 0 && <Summary label="Ilovalar" value={`${draft.attachments.length} ta hujjat`}/>}</dl></div>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-5"><input required type="checkbox" checked={draft.privacyAccepted} onChange={(event) => update('privacyAccepted', event.target.checked)} className="mt-1 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"/><span>Ko‘rsatilgan ma’lumotlar to‘g‘riligini tasdiqlayman va mediatsiya murojaatini ko‘rib chiqish uchun shaxsiy ma’lumotlardan foydalanishga roziman.</span></label>
        <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900"><ShieldCheck size={16} className="mt-0.5 shrink-0"/>{authenticated ? 'Yuborilgan hujjatlar kabinetga biriktiriladi. Sud/MIB, to‘lov va E-IMZO hujjat imzolash provayderlari ulanmaguncha tegishli amallar faol emas.' : 'Demo kabinetda ariza faqat brauzerda saqlanadi; rasmiy yuborish uchun OneID yoki E-IMZO orqali kiring.'}</p>
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
  passportIssuedBy: string
  birthDate: string
  practiceAddress: string
  powerOfAttorney: File | null
  phone: string
  email: string
  address: string
  region: string
  profession: 'MEDIATOR' | 'NOTARY' | 'ADVOCATE'
  education: string
  specialization: string[]
  languages: string[]
  workExperience: { startedAt: string; endedAt: string; isCurrent?: boolean; workplace: string; position: string }[]
  ethicsAccepted: boolean
  diplomaFile: File | null
  passportFile: File | null
  courseCertificate: File | null
  professionProof: File | null
}

export function MediatorApplicationForm({ language = 'uz', onClose, onSubmit }: { language?: ApplicantLanguage; onClose: () => void; onSubmit: (draft: ApplicationDraft) => Promise<void> }) {
  const t = (uz: string, ru: string) => applicantText(language, uz, ru)
  const [draft, setDraft] = useState<ApplicationDraft>({ fullName: '', pinfl: '', passportNumber: '', passportGivenDate: '', passportExpireDate: '', passportIssuedBy: '', birthDate: '', phone: '', email: '', address: '', practiceAddress: '', region: '', profession: 'MEDIATOR', education: '', specialization: [], languages: [], workExperience: [], ethicsAccepted: false, diplomaFile: null, passportFile: null, courseCertificate: null, professionProof: null, powerOfAttorney: null })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const courseRequired = draft.profession === 'MEDIATOR'
  const professionProofRequired = draft.profession !== 'MEDIATOR'
  const authenticated = Boolean(getAccessToken())
  const update = <K extends keyof ApplicationDraft>(key: K, value: ApplicationDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    if (!authenticated) return
    apiGet<{ fullName: string; pinfl?: string | null; passportSeriesNumber?: string | null; passportGivenDate?: string | null; passportExpireDate?: string | null; phone?: string | null; email?: string | null; address?: string | null }>('/cabinet/profile')
      .then((profile) => setDraft((current) => ({ ...current, fullName: profile.fullName || '', pinfl: profile.pinfl || '', passportNumber: profile.passportSeriesNumber || '', passportGivenDate: profile.passportGivenDate || '', passportExpireDate: profile.passportExpireDate || '', phone: profile.phone || '', email: profile.email || '', address: profile.address || '', birthDate: (profile as any).birthDate || '' })))
      .catch((cause) => setError(cause instanceof Error ? cause.message : t('Shaxsiy profilni yuklab bo‘lmadi.', 'Не удалось загрузить личный профиль.')))
  }, [authenticated])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^\d{14}$/.test(draft.pinfl)) { setError(t('PINFL 14 ta raqam bo‘lishi kerak.', 'ПИНФЛ должен состоять из 14 цифр.')); return }
    if (!draft.passportIssuedBy.trim()) { setError(t('Pasportni bergan organni kiriting.', 'Укажите орган, выдавший паспорт.')); return }
    if (!draft.practiceAddress.trim()) { setError(t('Faoliyat manzilini kiriting.', 'Укажите адрес осуществления деятельности.')); return }
    if (!draft.region) { setError(t('Hududni tanlang.', 'Выберите регион.')); return }
    if (!draft.specialization.length || !draft.languages.length) { setError(t('Ixtisoslashgan soha va ish tilini tanlang.', 'Выберите специализацию и язык работы.')); return }
    if (!draft.ethicsAccepted) { setError(t('Qonunchilik va kasb etikasi bilan tanishganingizni tasdiqlang.', 'Подтвердите ознакомление с законодательством и профессиональной этикой.')); return }
    if (draft.workExperience.some((item) => !item.startedAt || !item.workplace.trim() || !item.position.trim() || (!item.isCurrent && !item.endedAt) || (!item.isCurrent && item.endedAt < item.startedAt))) { setError(t('Ish tajribasi qatoridagi barcha maydonlarni to‘ldiring yoki qatorni olib tashlang.', 'Заполните все поля строки опыта работы или удалите её.')); return }
    if (professionProofRequired && !draft.professionProof) { setError(t('Notarius yoki advokat maqomini tasdiqlovchi hujjatni biriktiring.', 'Приложите документ, подтверждающий статус нотариуса или адвоката.')); return }
    setError('')
    setBusy(true)
    try { await onSubmit(draft) } catch (cause) { setError(cause instanceof Error ? cause.message : t('Arizani yuborib bo‘lmadi.', 'Не удалось отправить заявление.')) }
    finally { setBusy(false) }
  }

  const specializations = [['CIVIL', t('Fuqarolik nizolari', 'Гражданские споры')], ['FAMILY', t('Oilaviy nizolar', 'Семейные споры')], ['LABOR', t('Yakka mehnat nizolari', 'Индивидуальные трудовые споры')], ['BUSINESS', t('Tadbirkorlik nizolari', 'Предпринимательские споры')]]
  const workLanguages = [['uz', t('O‘zbek', 'Узбекский')], ['ru', t('Rus', 'Русский')], ['en', t('Ingliz', 'Английский')], ['kaa', t('Qoraqalpoq', 'Каракалпакский')], ['tg', t('Tojik', 'Таджикский')]]
  const sectionTitle = (title: string, description?: string) => <div><Text fw={600} c="dark.8">{title}</Text>{description && <Text size="sm" c="dimmed" mt={4}>{description}</Text>}</div>

  return <Modal
    opened
    onClose={onClose}
    title={t('Mediatorlar reyestriga kirish uchun ariza', 'Заявление о включении в реестр медиаторов')}
    centered
    size="xl"
    radius="lg"
    padding={0}
    overlayProps={{ backgroundOpacity: 0.56, blur: 3 }}
    closeButtonProps={{ 'aria-label': t('Yopish', 'Закрыть') }}
    styles={{
      content: { maxWidth: 960, maxHeight: 'calc(100dvh - 32px)' },
      header: { alignItems: 'flex-start', padding: '16px clamp(16px, 4vw, 24px) 12px' },
      title: { fontWeight: 700, fontSize: 18, lineHeight: 1.35 },
      body: { padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 100px)' },
    }}
  >
    <form onSubmit={submit} className="space-y-5 p-4 sm:p-6">
      <Text size="sm" c="dimmed" maw={780}>
        {t('Ariza hududiy adliya organiga yuboriladi. Davlat xizmati bepul; kerakli shaxsiy ma’lumotlar imkon qadar davlat manbalaridan olinadi.', 'Заявление направляется в территориальный орган юстиции. Государственная услуга бесплатна; необходимые личные данные по возможности запрашиваются из государственных источников.')}
      </Text>

      <Paper withBorder radius="lg" p="md" shadow="xs">
        <Stack gap="md">
          <Group align="flex-start" gap="sm">
            <ThemeIcon color="teal" variant="light" size={40} radius="md"><ShieldCheck size={19}/></ThemeIcon>
            {sectionTitle(t('Pasport va shaxsiy ma’lumot', 'Паспорт и личные данные'), t(
              authenticated
                ? 'Ma’lumotlar tasdiqlangan shaxsiy profilingizdan olindi.'
                : 'Production tizimida ma’lumotlar OneID profili orqali tekshiriladi. Demo sinovida ularni qo‘lda kiriting.',
              authenticated
                ? 'Данные получены из подтвержденного личного профиля.'
                : 'В рабочей системе данные проверяются по профилю OneID. Для демонстрации заполните их вручную.',
            ))}
          </Group>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="F.I.Sh." withAsterisk required maxLength={160} value={draft.fullName} onChange={(event) => update('fullName', event.currentTarget.value)} readOnly={authenticated} autoComplete="name"/>
            <TextInput label="PINFL" withAsterisk required inputMode="numeric" pattern="\d{14}" maxLength={14} value={draft.pinfl} onChange={(event) => update('pinfl', event.currentTarget.value.replace(/\D/g, ''))} readOnly={authenticated}/>
            <TextInput label={t('Pasport seriyasi va raqami', 'Серия и номер паспорта')} withAsterisk required maxLength={20} value={draft.passportNumber} onChange={(event) => update('passportNumber', event.currentTarget.value.toUpperCase())} readOnly={authenticated} placeholder="AA1234567"/>
            <TextInput label={t('Pasport berilgan sana', 'Дата выдачи паспорта')} withAsterisk required type="date" value={draft.passportGivenDate} onChange={(event) => update('passportGivenDate', event.currentTarget.value)} readOnly={authenticated}/>
            <TextInput label={t('Pasport amal qilish muddati', 'Срок действия паспорта')} withAsterisk required type="date" value={draft.passportExpireDate} onChange={(event) => update('passportExpireDate', event.currentTarget.value)} readOnly={authenticated}/>
            <TextInput label={t('Pasportni bergan organ', 'Орган, выдавший паспорт')} withAsterisk required maxLength={250} value={draft.passportIssuedBy} onChange={(event) => update('passportIssuedBy', event.currentTarget.value)} placeholder={t('Masalan, IIV Toshkent shahar boshqarmasi', 'Например, УВД г. Ташкент')}/>
            <TextInput label={t("Tug‘ilgan sana", 'Дата рождения')} type="date" value={draft.birthDate} onChange={(event) => update('birthDate', event.currentTarget.value)} readOnly={authenticated} description={authenticated ? t('Profildan olingan', 'Получено из профиля') : undefined}/>
            <TextInput label={t('Yashash manzili', 'Адрес проживания')} withAsterisk required maxLength={1000} value={draft.address} onChange={(event) => update('address', event.currentTarget.value)}/>
          </div>
        </Stack>
      </Paper>

      <Paper withBorder radius="lg" p="md" shadow="xs">
        <Stack gap="md">
          {sectionTitle(t('Aloqa va kasbiy ma’lumot', 'Контактные и профессиональные данные'))}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label={t('Telefon', 'Телефон')} withAsterisk required type="tel" value={draft.phone} onChange={(event) => update('phone', event.currentTarget.value)} placeholder="+998 90 123 45 67" autoComplete="tel"/>
            <TextInput label={t('Elektron pochta', 'Электронная почта')} type="email" maxLength={254} value={draft.email} onChange={(event) => update('email', event.currentTarget.value)} placeholder="name@example.uz" autoComplete="email"/>
            <TextInput label={t('Faoliyatni amalga oshirish manzili', 'Адрес осуществления деятельности')} withAsterisk required maxLength={1000} value={draft.practiceAddress} onChange={(event) => update('practiceAddress', event.currentTarget.value)} placeholder={t('Mediatsiya faoliyati olib boriladigan manzil', 'Адрес осуществления медиационной деятельности')}/>
            <Select label={t('Faoliyat hududi', 'Регион деятельности')} withAsterisk required placeholder={t('Hududni tanlang', 'Выберите регион')} data={regions.map((region) => ({ value: region, label: region }))} value={draft.region || null} onChange={(value) => update('region', value || '')}/>
            <Select label={t('Kasbiy maqom', 'Профессиональный статус')} withAsterisk data={[
              { value: 'MEDIATOR', label: t('Mediator talabgori', 'Кандидат в медиаторы') },
              { value: 'NOTARY', label: t('Amaldagi notarius', 'Действующий нотариус') },
              { value: 'ADVOCATE', label: t('Amaldagi advokat', 'Действующий адвокат') },
            ]} value={draft.profession} onChange={(value) => { if (value) update('profession', value as ApplicationDraft['profession']) }}/>
            <TextInput label={t('Ma’lumoti / diplom yo‘nalishi (mavjud bo‘lsa)', 'Образование / специальность по диплому (если есть)')} maxLength={250} value={draft.education} onChange={(event) => update('education', event.currentTarget.value)} placeholder={t('Ma’lumotingizni kiriting', 'Укажите образование')}/>
          </div>

          <MultiSelect
            label={t('Ixtisoslashgan mediatsiya sohalari', 'Специализации по медиации')}
            withAsterisk
            required
            data={specializations.map(([value, label]) => ({ value, label }))}
            value={draft.specialization}
            onChange={(value) => update('specialization', value)}
            placeholder={t('Bir yoki bir nechta sohani tanlang', 'Выберите одну или несколько специализаций')}
            searchable
            clearable
            hidePickedOptions
            comboboxProps={{ withinPortal: true }}
          />

          <MultiSelect
            label={t('Mediatsiya olib boriladigan tillar', 'Языки проведения медиации')}
            withAsterisk
            required
            data={workLanguages.map(([value, label]) => ({ value, label }))}
            value={draft.languages}
            onChange={(value) => update('languages', value)}
            placeholder={t('Bir yoki bir nechta tilni tanlang', 'Выберите один или несколько языков')}
            searchable
            clearable
            hidePickedOptions
            comboboxProps={{ withinPortal: true }}
          />
        </Stack>
      </Paper>

      <Paper withBorder radius="lg" p="md" shadow="xs">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            {sectionTitle(t('Ish staji', 'Трудовой стаж'), t('Ish joyi va lavozimni ko‘rsating; ma’lumot bo‘lmasa bo‘sh qoldiring.', 'Укажите место работы и должность; при отсутствии данных оставьте поля пустыми.'))}
            <Button type="button" variant="light" color="teal" size="sm" onClick={() => update('workExperience', [...draft.workExperience, { startedAt: '', endedAt: '', isCurrent: false, workplace: '', position: '' }])}>
              + {t('Ish joyi', 'Место работы')}
            </Button>
          </Group>
          {draft.workExperience.length === 0 && <Text size="sm" c="dimmed">{t('Ish tajribasi qatorlari qo‘shilmagan.', 'Строки опыта работы не добавлены.')}</Text>}
          {draft.workExperience.map((item, index) => <Paper key={index} withBorder radius="md" p="sm" bg="gray.0">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput type="date" label={t('Ishga kirgan sana', 'Дата начала')} value={item.startedAt} onChange={(event) => update('workExperience', draft.workExperience.map((row, rowIndex) => rowIndex === index ? { ...row, startedAt: event.currentTarget.value } : row))}/>
              {!item.isCurrent && <TextInput type="date" label={t('Ishdan ketgan sana', 'Дата окончания')} value={item.endedAt} onChange={(event) => update('workExperience', draft.workExperience.map((row, rowIndex) => rowIndex === index ? { ...row, endedAt: event.currentTarget.value } : row))}/>}
              <TextInput maxLength={250} label={t('Ish joyi', 'Место работы')} value={item.workplace} onChange={(event) => update('workExperience', draft.workExperience.map((row, rowIndex) => rowIndex === index ? { ...row, workplace: event.currentTarget.value } : row))}/>
              <TextInput maxLength={250} label={t('Lavozim', 'Должность')} value={item.position} onChange={(event) => update('workExperience', draft.workExperience.map((row, rowIndex) => rowIndex === index ? { ...row, position: event.currentTarget.value } : row))}/><Checkbox checked={Boolean(item.isCurrent)} label={t('Hozir ham shu joyda ishlayman', 'Работаю здесь сейчас')} onChange={(event) => update('workExperience', draft.workExperience.map((row, rowIndex) => rowIndex === index ? { ...row, isCurrent: event.currentTarget.checked, endedAt: '' } : row))}/>
            </div>
            <Button type="button" variant="subtle" color="red" size="xs" mt="xs" onClick={() => update('workExperience', draft.workExperience.filter((_, rowIndex) => rowIndex !== index))}>
              {t('Qatorni olib tashlash', 'Удалить строку')}
            </Button>
          </Paper>)}
        </Stack>
      </Paper>

      <Paper withBorder radius="lg" p="md" shadow="xs">
        <Stack gap="md">
          {sectionTitle(t('Tasdiqlovchi hujjatlar', 'Подтверждающие документы'), t('PDF, DOCX, JPG yoki PNG · har bir fayl 10 MB gacha.', 'PDF, DOCX, JPG или PNG · каждый файл до 10 МБ.'))}
          <FileField language={language} label={t('Diplom nusxasi (ixtiyoriy)', 'Копия диплома (необязательно)')} file={draft.diplomaFile} onChange={(file) => update('diplomaFile', file)}/>
          <FileField language={language} label={t('Pasport nusxasi (ixtiyoriy)', 'Копия паспорта (необязательно)')} file={draft.passportFile} onChange={(file) => update('passportFile', file)}/>
          {courseRequired
            ? <FileField language={language} label={t('Maxsus o‘quv kursi sertifikati (mavjud bo‘lsa)', 'Сертификат специального курса (если есть)')} file={draft.courseCertificate} onChange={(file) => update('courseCertificate', file)}/>
            : <FileField language={language} label={t('Notarius/advokat maqomini tasdiqlovchi hujjat', 'Документ, подтверждающий статус нотариуса/адвоката')} required file={draft.professionProof} onChange={(file) => update('professionProof', file)}/>}
          <FileField language={language} label={t('Notarial tasdiqlangan ishonchnoma nusxasi (vakil orqali murojaatda)', 'Нотариально заверенная доверенность (при подаче представителем)')} file={draft.powerOfAttorney} onChange={(file) => update('powerOfAttorney', file)}/>
          <Alert color="blue" variant="light">{t('Hozirgi kabinet arizani faqat o‘z nomidan yuboradi. Vakil nomidan ariza berish vakolatini tizim alohida tekshirmaydi.', 'Сейчас кабинет подает заявление только от собственного имени. Полномочия представителя система отдельно не проверяет.')}</Alert>
        </Stack>
      </Paper>

      <Paper withBorder radius="md" p="sm" bg="gray.0">
        <Checkbox checked={draft.ethicsAccepted} onChange={(event) => update('ethicsAccepted', event.currentTarget.checked)} label={t(
          'Mediatsiya to‘g‘risidagi qonunchilik hujjatlari talablari va mediatorning kasb etikasi qoidalari bilan tanishdim.',
          'Я ознакомлен(а) с требованиями законодательства о медиации и правилами профессиональной этики медиатора.',
        )}/>
      </Paper>

      <Alert variant="light" color="yellow" radius="md" icon={<AlertCircle size={18}/>}>
        {t(
          'Sudlanganlik va muomala layoqati arizachining javobiga qarab emas, vakolatli davlat manbasi orqali tekshirilishi kerak. Hozir tashqi reyestr ulanmagan bo‘lsa ariza “tekshiruvda” qoladi.',
          'Сведения о судимости и дееспособности должны проверяться по уполномоченным государственным источникам. Пока внешний реестр не подключён, заявление остаётся на проверке.',
        )}
      </Alert>

      {error && <ErrorNotice message={error}/>}
      <Group justify="flex-end" gap="sm" className="border-t border-slate-100 pt-4">
        <Button type="button" variant="default" onClick={onClose}>{t('Bekor qilish', 'Отмена')}</Button>
        <Button type="submit" color="dark" loading={busy}>{busy ? t('Yuborilmoqda…', 'Отправка…') : t('Arizani yuborish', 'Отправить заявление')}</Button>
      </Group>
    </form>
  </Modal>
}
type MtsSession = { id: string; scheduledAt: string; durationMin: number; status: string }
type MtsParticipant = { side: 'CLAIMANT' | 'RESPONDENT'; userId: string | null; pinfl: string | null; fullName: string; organizationTin?: string | null; representativeName?: string | null; consentStatus: string; signaturePkcs7: string | null }
type MtsCase = { id: string; type: 'ONLINE' | 'MANDATORY'; disputeCategory: string; disputeSubject: string; requestedMediatorRegistryId?: string | null; courtCaseNumber: string | null; region: string; status: string; mediatorId: string | null; agreementText: string | null; mediatorSignaturePkcs7: string | null; participants: MtsParticipant[]; sessions: MtsSession[]; feedbacks?: { id: string; score: number; comment?: string | null }[] }
type PublicMediator = { id: string; fullName: string; region: string; specialization: string[] }

export function MtsWorkspace({ role, demoItems, onCreate, onToast }: { role: string; demoItems: { id: string; title: string; status: string; detail?: string; region?: string }[]; onCreate: () => void; onToast: (message: string) => void }) {
  const [cases, setCases] = useState<MtsCase[] | null>(null)
  const [profile, setProfile] = useState<{ id: string; pinfl?: string | null; businessTins: string[] } | null>(null)
  const [mediators, setMediators] = useState<PublicMediator[]>([])
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [mediatorRegionFilter, setMediatorRegionFilter] = useState('')
  const [mediatorSpecialtyFilter, setMediatorSpecialtyFilter] = useState('')
  const [privacyChecks, setPrivacyChecks] = useState<Record<string, boolean>>({})
  const [schedule, setSchedule] = useState<Record<string, { at: string; duration: string }>>({})
  const [documentsOpen, setDocumentsOpen] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const isAuthenticated = Boolean(getAccessToken())
  const canCreate = ['CITIZEN', 'BUSINESS', 'TALABGOR'].includes(role)

  useEffect(() => {
    if (!getAccessToken()) { setCases(null); setProfile(null); return }
    let cancelled = false
    setLoading(true); setError('')
    const organizationsRequest = role === 'BUSINESS'
      ? apiGet<Array<{ code?: string | null }>>('/cabinet/business/organizations')
      : Promise.resolve([] as Array<{ code?: string | null }>)
    Promise.all([apiGet<MtsCase[]>('/cabinet/mts/mediations'), apiGet<{ id: string; pinfl?: string | null }>('/cabinet/profile'), organizationsRequest])
      .then(([rows, user, organizations]) => { if (!cancelled) { setCases(rows); setProfile({ ...user, businessTins: organizations.map((organization) => organization.code).filter((code): code is string => Boolean(code)) }) } })
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

  useEffect(() => {
    const timer = window.setInterval(() => setReload((current) => current + 1), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const act = async (message: string, operation: () => Promise<unknown>) => {
    try { await operation(); setReload((current) => current + 1); onToast(message) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Amalni bajarib bo‘lmadi.') }
  }
  const ownParticipant = (item: MtsCase) => item.participants.find((participant) => participant.userId === profile?.id || Boolean(profile?.pinfl && participant.pinfl === profile.pinfl) || Boolean(participant.organizationTin && profile?.businessTins.includes(participant.organizationTin)))
  const mediatorRegions = [...new Set(mediators.map((mediator) => mediator.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'uz'))
  const mediatorSpecialties = [...new Set(mediators.flatMap((mediator) => mediator.specialization || []).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'uz'))
  const filteredMediators = mediators.filter((mediator) => (!mediatorRegionFilter || mediator.region === mediatorRegionFilter) && (!mediatorSpecialtyFilter || mediator.specialization.includes(mediatorSpecialtyFilter)))

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
      const ownsMediation = Boolean(own)
      const isMediator = Boolean(remote && profile?.id && remote.mediatorId === profile.id)
      const ownSigned = isMediator ? Boolean(remote?.mediatorSignaturePkcs7) : Boolean(own?.signaturePkcs7)
      const title = remote ? remote.disputeSubject : (item as { title: string }).title
      const status = remote ? remote.type === 'MANDATORY' && remote.status === 'MEDIATOR_REQUESTED' && !remote.mediatorId ? 'Mos mediator tayinlanishi kutilmoqda' : mtsLabel(remote.status) : item.status
      const selectMediator = async () => act('Mediator tanlash so‘rovi yuborildi', () => apiPost(`/cabinet/mts/mediations/${remote!.id}/mediator`, { mediatorRegistryId: selected[remote!.id] }))
      return <article key={item.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-800">{remote?.type === 'MANDATORY' ? 'Majburiy mediatsiya' : remote ? 'Ixtiyoriy mediatsiya' : 'Demo murojaat'}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">{status}</span></div><h2 className="mt-3 text-base font-semibold">{title}</h2><p className="mt-1 text-xs text-slate-500">{item.id} · {remote?.region || item.region || 'Hudud ko‘rsatilmagan'}{remote?.courtCaseNumber ? ` · Sud ishi ${remote.courtCaseNumber}` : ''}</p><div className="mt-3 flex flex-wrap gap-2">{(remote?.participants || []).map((participant) => <span key={participant.side} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{participant.side === 'CLAIMANT' ? 'Ariza beruvchi' : 'Javobgar'}: {participant.fullName}{participant.organizationTin ? ` · STIR ${participant.organizationTin}` : ''}{participant.representativeName ? ` · Vakil ${participant.representativeName}` : ''} · {participant.consentStatus === 'PENDING' ? 'rozilik kutilmoqda' : participant.consentStatus === 'CONSENTED' ? 'rozilik berdi' : 'rad etdi'}</span>)}</div>{remote?.requestedMediatorRegistryId && !remote.mediatorId && <p className="mt-3 text-xs text-emerald-800">Tanlangan mediator: {mediators.find((mediator) => mediator.id === remote.requestedMediatorRegistryId)?.fullName || 'ikki taraf roziligidan so‘ng tayinlanadi'}</p>}</div>
        {remote && own?.consentStatus === 'PENDING' && remote.status === 'AWAITING_CONSENT' && <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between"><label className="flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={Boolean(privacyChecks[remote.id])} onChange={(event) => setPrivacyChecks((current) => ({ ...current, [remote.id]: event.target.checked }))} className="mt-1 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"/><span>Mediatsiyada qatnashish uchun shaxsiy ma’lumotlarim qayta ishlanishiga roziman.</span></label><div className="flex shrink-0 gap-2"><button disabled={!privacyChecks[remote.id]} onClick={() => act('Rozilik qayd etildi', () => apiPost(`/cabinet/mts/mediations/${remote.id}/consent`, { side: own.side, status: 'CONSENTED', privacyAccepted: true }))} className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Rozilik berish</button><button onClick={() => { if (window.confirm('Mediatsiyaga rozilik bermasangiz, ish yopiladi. Davom etasizmi?')) void act('Rozilik rad etildi va ish yopildi', () => apiPost(`/cabinet/mts/mediations/${remote.id}/consent`, { side: own.side, status: 'DECLINED' })) }} className="h-10 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700">Rad etish</button></div></div>}
      </div>
      {remote && remote.type === 'ONLINE' && allConsented && !remote.mediatorId && ownsMediation && <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap"><select aria-label="Mediatorni hudud bo‘yicha filtrlash" value={mediatorRegionFilter} onChange={(event) => setMediatorRegionFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Barcha hududlar</option>{mediatorRegions.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Mediatorni ixtisoslik bo‘yicha filtrlash" value={mediatorSpecialtyFilter} onChange={(event) => setMediatorSpecialtyFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Barcha ixtisosliklar</option>{mediatorSpecialties.map((item) => <option key={item}>{item}</option>)}</select><select value={selected[remote.id] || ''} onChange={(event) => setSelected((current) => ({ ...current, [remote.id]: event.target.value }))} className="h-10 min-w-56 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Reyestrdan mediator tanlang</option>{filteredMediators.map((mediator) => <option value={mediator.id} key={mediator.id}>{mediator.fullName} · {mediator.region}</option>)}</select><button disabled={!selected[remote.id] || !filteredMediators.some((mediator) => mediator.id === selected[remote.id])} onClick={selectMediator} className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40">Mediatorni tanlash</button></div>}
      {remote && isMediator && allConsented && !remote.mediatorSignaturePkcs7 && !remote.participants.some((participant) => participant.signaturePkcs7) && <AgreementEditor initialText={remote.agreementText || ''} onSave={(text) => act('Kelishuv loyihasi saqlandi', () => apiPost(`/cabinet/mts/mediations/${remote.id}/agreement`, { text }))}/>}
      {remote?.agreementText && remote.status === 'AGREEMENT_PENDING_SIGNATURE' && ((isMediator && !remote.mediatorSignaturePkcs7) || (ownsMediation && !ownSigned)) && <SignatureBox agreement={remote.agreementText} onSign={(pkcs7) => act('Elektron imzo tekshirishga yuborildi', () => apiPost(`/cabinet/mts/mediations/${remote.id}/agreement/sign`, { pkcs7 }))}/>}
      {remote && role === 'MEDIATOR' && remote.mediatorId === profile?.id && remote.status === 'SCHEDULED' && remote.sessions.length === 0 && <ScheduleMeeting caseId={remote.id} value={schedule[remote.id] || { at: '', duration: '60' }} onChange={(value) => setSchedule((current) => ({ ...current, [remote.id]: value }))} onSchedule={() => act('Videouchrashuv belgilandi', () => apiPost(`/cabinet/mts/mediations/${remote.id}/sessions`, { scheduledAt: new Date(schedule[remote.id]?.at || '').toISOString(), durationMin: Number(schedule[remote.id]?.duration || 60) }))}/>}
      {remote?.sessions?.length ? <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">{remote.sessions.map((session) => <div key={session.id} className="flex flex-col justify-between gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold">Videokonferensiya</p><p className="mt-1 text-xs text-slate-500">{new Date(session.scheduledAt).toLocaleString('uz-UZ')} · {session.durationMin} daqiqa · {mtsLabel(session.status)}</p></div><button onClick={() => act('Uchrashuv havolasi ochildi', async () => { const tab = window.open('', '_blank'); if (tab) tab.opener = null; const result = await apiPost<{ joinUrl: string }>(`/cabinet/mts/mediations/${remote.id}/sessions/${session.id}/join`, {}); if (tab) tab.location.href = result.joinUrl; else window.location.assign(result.joinUrl) })} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 text-xs font-semibold text-white"><Video size={15}/>Uchrashuvga qo‘shilish</button></div>)}</div> : null}
      {remote && isMediator && remote.status === 'IN_SESSION' && <ResultEditor participants={remote.participants} onSubmit={(resultStatus, summary, agreementText, obligations) => act('Mediatsiya natijasi va monitoring majburiyatlari saqlandi', () => apiPost(`/cabinet/mts/mediations/${remote.id}/result`, { resultStatus, summary, agreementText: agreementText || remote.agreementText || undefined, obligations }))}/>}
      {remote && ownsMediation && ['SETTLED', 'FAILED'].includes(remote.status) && !remote.feedbacks?.length && <FeedbackEditor onSubmit={(score, comment) => act('Mutaxassis faoliyati baholandi', () => apiPost(`/cabinet/mts/mediations/${remote.id}/rating`, { score, comment }))}/>}
      {remote?.feedbacks?.[0] && <p className="mt-3 flex items-center gap-2 text-xs text-emerald-800"><Star size={14} fill="currentColor"/>Sizning bahoyingiz: {remote.feedbacks[0].score}/5</p>}
       {remote && <div className="mt-4 border-t border-slate-100 pt-4"><button onClick={() => setDocumentsOpen((current) => ({ ...current, [remote.id]: !current[remote.id] }))} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><FileText size={15}/>{documentsOpen[remote.id] ? 'Hujjatlarni yopish' : 'Hujjatlar va yozishmalar'}</button>{documentsOpen[remote.id] && <div className="mt-4"><DocumentExchangeWorkspace role={role} mediationId={remote.id} onToast={onToast}/></div>}</div>}
      </article>
    })}</div>}
  </section>
}

type MkExamSummary = { id: string; scheduledAt: string; venue: string; streamUrl?: string | null; protocolFileId?: string | null; status: string }
type MkApplication = { id: string; status: string; submittedAt: string; rejectionReason?: string | null; correctionNote?: string | null; correctionDeadline?: string | null; phone: string; region?: string; education?: string; address?: string | null; autoCheckResult?: { status?: string } | null; exams?: MkExamSummary[] }
type CourtClaimItem = { id: string; courtCaseNumber: string; courtName: string; disputeSubject: string; courtOrderDate: string; status: string }

export function CourtClaimsWorkspace({ onStartMediation }: { onStartMediation: (courtCaseNumber: string) => void }) {
  const [claims, setClaims] = useState<CourtClaimItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!getAccessToken()) { setError('Sud da’volarini ko‘rish uchun shaxsiy kabinetga tasdiqlangan hisob bilan kiring.'); setLoading(false); return }
    apiGet<CourtClaimItem[]>('/cabinet/court-claims')
      .then(setClaims)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Sud da’volarini yuklab bo‘lmadi.'))
      .finally(() => setLoading(false))
  }, [])
  return <section><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Sud bilan integratsiya</p><h1 className="mt-2 text-2xl font-semibold">Sud da’volari</h1><p className="mt-1 text-sm text-slate-500">Sizga tegishli sud ishlari va mediatsiya orqali hal qilish takliflari.</p></div>{error && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}{loading && <p className="mt-5 text-sm text-slate-500">Da’volar yuklanmoqda…</p>}{!loading && !error && claims.length === 0 && <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Sizga tegishli sud da’volari topilmadi.</div>}<div className="mt-5 space-y-3">{claims.map((claim) => <article key={claim.id} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold text-blue-800">{claim.courtCaseNumber} · {claim.courtName}</p><h2 className="mt-2 text-sm font-semibold text-slate-900">{claim.disputeSubject}</h2><p className="mt-2 text-xs text-slate-500">Sud hujjati: {new Date(claim.courtOrderDate).toLocaleDateString('uz-UZ')} · {claim.status}</p></div><button onClick={() => onStartMediation(claim.courtCaseNumber)} className="h-10 shrink-0 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">Mediatsiya boshlash</button></div></article>)}</div></section>
}

export function MkApplicationWorkspace({ language = 'uz', role, demoItems, onCreate }: { language?: ApplicantLanguage; role: string; demoItems: { id: string; title: string; status: string; detail?: string; region?: string; createdAt?: string }[]; onCreate: () => void }) {
  const t = (uz: string, ru: string) => applicantText(language, uz, ru)
  const [remote, setRemote] = useState<MkApplication[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [correctionDrafts, setCorrectionDrafts] = useState<Record<string, { correctionResponse: string; region: string; education: string; address: string }>>({})
  const [correctionBusy, setCorrectionBusy] = useState('')
  const [success, setSuccess] = useState('')
  const authenticated = Boolean(getAccessToken())
  useEffect(() => {
    if (!getAccessToken()) { setRemote(null); return }
    let cancelled = false
    setLoading(true); setError('')
    apiGet<MkApplication[]>('/cabinet/mk/applications')
      .then((items) => { if (!cancelled) setRemote(items) })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : t('Arizalarni yuklab bo‘lmadi.', 'Не удалось загрузить заявления.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [demoItems.length])

  const resubmitCorrection = async (application: MkApplication) => {
    const draft = correctionDrafts[application.id] || { correctionResponse: '', region: application.region || '', education: application.education || '', address: application.address || '' }
    if (draft.correctionResponse.trim().length < 3) { setError(t('Tuzatishlar haqida qisqa izoh kiriting.', 'Добавьте краткое описание исправлений.')); return }
    setCorrectionBusy(application.id); setError('')
    try {
      await apiPatch(`/cabinet/mk/applications/${application.id}/corrections`, { correctionResponse: draft.correctionResponse.trim(), region: draft.region, education: draft.education, address: draft.address })
      const updated = await apiGet<MkApplication[]>('/cabinet/mk/applications')
      setRemote(updated)
      setCorrectionDrafts((current) => { const next = { ...current }; delete next[application.id]; return next })
      setSuccess(t('Tuzatilgan ariza qayta yuborildi.', 'Исправленное заявление отправлено повторно.'))
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('Arizani qayta yuborib bo‘lmadi.', 'Не удалось повторно отправить заявление.')) }
    finally { setCorrectionBusy('') }
  }

  return <section>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-700">{t('Mediator-talabgor', 'Кандидат в медиаторы')}</p><h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[28px]">{t('Mediator maqomiga arizalarim', 'Мои заявления на получение статуса медиатора')}</h1><p className="mt-1.5 max-w-2xl text-sm text-slate-500">{t('Hujjatlar, huquqiy tekshiruv va komissiya qarori bo‘yicha ariza holatini kuzating.', 'Отслеживайте статус заявления, проверку документов и решение комиссии.')}</p></div><button onClick={onCreate} className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">+ {t('Yangi ariza', 'Новое заявление')}</button></div>
    {!authenticated && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{t('Demo arizalar faqat brauzerda saqlanadi va hujjat fayllari serverga yuklanmaydi. Rasmiy topshirish uchun OneID bilan tasdiqlangan API seansi kerak.', 'Демо-заявления сохраняются только в браузере, а файлы документов не загружаются на сервер. Для официальной подачи требуется подтверждённая через OneID сессия API.')}</div>}
    {error && <ErrorNotice message={error}/>}
    {loading ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{t('Arizalar yuklanmoqda…', 'Загрузка заявлений…')}</div> : null}
    {!loading && authenticated && remote?.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-10 text-center"><FileText className="mx-auto text-slate-300" size={28}/><h2 className="mt-3 text-sm font-semibold">{t('Hozircha mediator arizasi yo‘q', 'Заявлений на статус медиатора пока нет')}</h2><p className="mt-1 text-xs text-slate-500">{t('Diplom va zarur hujjatlarni biriktirib, arizani yuboring.', 'Приложите диплом и необходимые документы, чтобы отправить заявление.')}</p></div>}
    {!loading && !authenticated && demoItems.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-10 text-center"><FileText className="mx-auto text-slate-300" size={28}/><h2 className="mt-3 text-sm font-semibold">{t('Hozircha ariza yo‘q', 'Заявлений пока нет')}</h2><p className="mt-1 text-xs text-slate-500">{t('Mediator maqomini olish arizasini yaratish uchun yuqoridagi tugmani bosing.', 'Чтобы подать заявление на статус медиатора, нажмите кнопку выше.')}</p></div>}
    {!loading && <div className="mt-4 space-y-3">{authenticated ? (remote || []).map((application) => <article key={application.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{application.id}</p><h2 className="mt-2 text-sm font-semibold">{t('Mediator maqomini olish', 'Получение статуса медиатора')}</h2><p className="mt-1 text-xs text-slate-500">{t('Yuborilgan:', 'Подано:')} {new Date(application.submittedAt).toLocaleString(language === 'ru' ? 'ru-RU' : 'uz-UZ')} · {application.phone}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{mkLabel(application.status, language)}</span></div>{success && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}{application.status === 'CORRECTION_REQUESTED' && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4"><p className="text-sm font-semibold text-amber-950">{t('Tuzatish talabi', 'Требование об исправлении')}</p><p className="mt-1 text-sm text-amber-900">{application.correctionNote || t('Arizaga tuzatish kiritish so‘raldi.', 'Попросили исправить заявление.')}</p>{application.correctionDeadline && <p className="mt-1 text-xs text-amber-800">{t('Muddat:', 'Срок:')} {new Date(application.correctionDeadline).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'uz-UZ')}</p>}<div className="mt-3 grid gap-2 sm:grid-cols-2"><input value={(correctionDrafts[application.id] || { correctionResponse: '', region: application.region || '', education: application.education || '', address: application.address || '' }).region} onChange={(event) => setCorrectionDrafts((current) => ({ ...current, [application.id]: { ...(current[application.id] || { correctionResponse: '', region: application.region || '', education: application.education || '', address: application.address || '' }), region: event.target.value } }))} disabled className="form-control disabled:bg-slate-100" placeholder={t('Faoliyat hududi', 'Регион деятельности')}/><input value={(correctionDrafts[application.id] || { correctionResponse: '', region: application.region || '', education: application.education || '', address: application.address || '' }).education} onChange={(event) => setCorrectionDrafts((current) => ({ ...current, [application.id]: { ...(current[application.id] || { correctionResponse: '', region: application.region || '', education: application.education || '', address: application.address || '' }), education: event.target.value } }))} className="form-control" placeholder={t('Ma’lumoti', 'Образование')}/><input value={(correctionDrafts[application.id] || { correctionResponse: '', region: application.region || '', education: application.education || '', address: application.address || '' }).address} onChange={(event) => setCorrectionDrafts((current) => ({ ...current, [application.id]: { ...(current[application.id] || { correctionResponse: '', region: application.region || '', education: application.education || '', address: application.address || '' }), address: event.target.value } }))} className="form-control sm:col-span-2" placeholder={t('Manzil', 'Адрес')}/><textarea value={(correctionDrafts[application.id] || { correctionResponse: '', region: application.region || '', education: application.education || '', address: application.address || '' }).correctionResponse} onChange={(event) => setCorrectionDrafts((current) => ({ ...current, [application.id]: { ...(current[application.id] || { correctionResponse: '', region: application.region || '', education: application.education || '', address: application.address || '' }), correctionResponse: event.target.value } }))} className="form-control min-h-20 sm:col-span-2" placeholder={t('Tuzatishlar bo‘yicha izoh', 'Комментарий об исправлениях')}/><button onClick={() => void resubmitCorrection(application)} disabled={correctionBusy === application.id} className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{correctionBusy === application.id ? t('Yuborilmoqda…', 'Отправка…') : t('Tuzatib, qayta yuborish', 'Исправить и отправить')}</button></div></div>}{application.autoCheckResult?.status && <p className="mt-3 text-xs text-slate-600">{t('Davlat reyestri tekshiruvi:', 'Проверка государственных реестров:')} {application.autoCheckResult.status === 'IN_PROGRESS' ? t('tekshiruv kutilmoqda', 'ожидается проверка') : application.autoCheckResult.status}</p>}{application.rejectionReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{t('Rad etish sababi:', 'Причина отказа:')} {application.rejectionReason}</p>}{application.exams?.map((exam) => <div key={exam.id} className="mt-4 flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-900">{t('Malaka imtihoni', 'Квалификационный экзамен')} · {new Date(exam.scheduledAt).toLocaleString(language === 'ru' ? 'ru-RU' : 'uz-UZ')}</p><p className="mt-1 text-xs text-slate-600">{exam.venue} · {mkLabel(exam.status, language)}</p></div><div className="flex flex-wrap gap-2">{exam.streamUrl && <a href={exam.streamUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-800 px-3 text-xs font-semibold text-white"><Video size={14}/>{t('Jonli translyatsiya', 'Прямая трансляция')}</a>}{exam.protocolFileId && <button onClick={() => void downloadExamProtocol(exam.id).catch((cause) => window.alert(cause instanceof Error ? cause.message : t('Bayonnomani yuklab bo‘lmadi.', 'Не удалось скачать протокол.')))} className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-900"><FileText size={14}/>{t('Bayonnomani yuklab olish', 'Скачать протокол')}</button>}</div></div>)}</article>) : demoItems.map((application) => <article key={application.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{application.id}</p><h2 className="mt-2 text-sm font-semibold">{language === 'ru' && application.title === 'Mediator maqomini olish' ? 'Получение статуса медиатора' : application.title}</h2><p className="mt-1 text-xs text-slate-500">{application.createdAt} · {application.detail}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{mkLabel(application.status, language)}</span></div></article>)}</div>}
    {role !== 'APPLICANT' && <p className="mt-4 text-xs text-slate-500">Komissiya, hududiy organ va vazirlik ko‘rib chiqish amallari o‘z vakolatli kabinetlarida bajariladi.</p>}
  </section>
}

function mkLabel(value: string, language: ApplicantLanguage = 'uz') {
  const uz: Record<string, string> = { SUBMITTED: 'Yangi yuborildi · hududiy tekshiruv kutilmoqda', CHECKING: 'Hududiy tekshiruvda', CORRECTION_REQUESTED: 'Tuzatish kutilmoqda', FORWARDED: 'Malaka komissiyasiga yuborildi', ACCEPTED: 'Qabul qilindi', REJECTED: 'Rad etildi', INVITED: 'Imtihonga chaqirildi', PASSED: 'Imtihondan o‘tdi · reyestrga kiritish kutilmoqda', FAILED: 'Imtihondan o‘tmadi', EXEMPT_PENDING_REGISTRATION: 'Imtihondan ozod · reyestrga kiritish kutilmoqda', REGISTERED: 'Reyestrga kiritildi' }
  const ru: Record<string, string> = { SUBMITTED: 'Отправлено · ожидает проверки', CHECKING: 'На региональной проверке', CORRECTION_REQUESTED: 'Ожидает исправлений', FORWARDED: 'Передано квалификационной комиссии', ACCEPTED: 'Принято', REJECTED: 'Отклонено', INVITED: 'Приглашение на экзамен', PASSED: 'Экзамен сдан · ожидает внесения в реестр', FAILED: 'Экзамен не сдан', EXEMPT_PENDING_REGISTRATION: 'Освобождён от экзамена · ожидает внесения в реестр', REGISTERED: 'Внесено в реестр' }
  const key = value.toUpperCase()
  if ((language === 'ru' ? ru : uz)[key]) return (language === 'ru' ? ru : uz)[key]
  if (language === 'ru') {
    const normalized = value.toLocaleLowerCase('uz').replace(/[’‘`]/g, "'")
    if (/ko'rib chiq|tekshiruvda|jarayonda/.test(normalized)) return 'На рассмотрении'
    if (/kutilmoqda|yuborildi|yangi/.test(normalized)) return 'Ожидает рассмотрения'
    if (/qabul qilindi|tasdiqlandi/.test(normalized)) return 'Принято'
    if (/rad etildi|bekor qilindi/.test(normalized)) return 'Отклонено'
  }
  return value
}

function FeedbackEditor({ onSubmit }: { onSubmit: (score: number, comment: string) => void }) {
  const [score, setScore] = useState(5)
  const [comment, setComment] = useState('')
  return <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/50 p-4"><h3 className="text-sm font-semibold text-slate-900">Mutaxassis faoliyatini baholang</h3><p className="mt-1 text-xs text-slate-500">Baholash ushbu yakunlangan ish bo‘yicha bir marta yuboriladi.</p><div className="mt-3 flex gap-1" role="group" aria-label="1 dan 5 gacha baho">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} ball`} aria-pressed={score === value} onClick={() => setScore(value)} className={`rounded-md p-1.5 ${value <= score ? 'text-amber-500' : 'text-slate-300'}`}><Star size={20} fill="currentColor"/></button>)}</div><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} className="form-control mt-3 min-h-16" placeholder="Izoh (ixtiyoriy)"/><button type="button" onClick={() => onSubmit(score, comment.trim())} className="mt-3 h-9 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white">Bahoni yuborish</button></div>
}

function AgreementEditor({ initialText, onSave }: { initialText: string; onSave: (text: string) => void }) {
  const [text, setText] = useState(initialText)
  return <div className="mt-4 border-t border-slate-100 pt-4"><label className="block text-xs font-semibold text-slate-700">Kelishuv loyihasi *<textarea minLength={50} maxLength={10000} value={text} onChange={(event) => setText(event.target.value)} className="form-control mt-1 min-h-32 resize-y" placeholder="Taraflar kelishgan shartlar, majburiyatlar va bajarish muddatlarini kiriting"/></label><p className="mt-2 text-xs text-slate-500">Matn saqlangach, imzolovchilar uchun uning SHA-256 xeshi bo‘yicha ERI tekshiruvi qilinadi.</p><button disabled={text.trim().length < 50} onClick={() => onSave(text)} className="mt-3 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Kelishuv loyihasini saqlash</button></div>
}

function SignatureBox({ agreement, onSign }: { agreement: string; onSign: (pkcs7: string) => void }) {
  const [pkcs7, setPkcs7] = useState('')
  return <div className="mt-4 border-t border-slate-100 pt-4"><details className="rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">Kelishuv matnini ko‘rish</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{agreement}</p></details><label className="mt-3 block text-xs font-semibold text-slate-700">ERI PKCS#7 imzo qiymati<textarea value={pkcs7} onChange={(event) => setPkcs7(event.target.value)} maxLength={500000} className="form-control mt-1 min-h-24 font-mono text-xs" placeholder="E-IMZO orqali aynan ushbu kelishuv xeshiga olingan PKCS#7 qiymatini kiriting"/></label><button disabled={pkcs7.trim().length < 100} onClick={() => onSign(pkcs7.trim())} className="mt-3 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Imzoni tekshirishga yuborish</button></div>
}

function ResultEditor({ participants, onSubmit }: { participants: MtsParticipant[]; onSubmit: (status: 'SETTLED' | 'NOT_SETTLED', summary: string, agreementText: string, obligations?: { side: 'CLAIMANT' | 'RESPONDENT'; description: string; dueDate: string }[]) => void }) {
  const [status, setStatus] = useState<'SETTLED' | 'NOT_SETTLED'>('SETTLED')
  const [summary, setSummary] = useState('')
  const [agreement, setAgreement] = useState('')
  const [trackObligation, setTrackObligation] = useState(false)
  const [obligation, setObligation] = useState({ side: 'CLAIMANT' as 'CLAIMANT' | 'RESPONDENT', description: '', dueDate: '' })
  const [error, setError] = useState('')
  return <div className="mt-4 border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold">Sessiya natijasini qayd etish</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Natija<select value={status} onChange={(event) => setStatus(event.target.value as 'SETTLED' | 'NOT_SETTLED')} className="form-control mt-1"><option value="SETTLED">Kelishuvga erishildi</option><option value="NOT_SETTLED">Kelishuvga erishilmadi</option></select></label><label className="text-xs font-semibold text-slate-600">Qisqa xulosa<input required maxLength={10000} value={summary} onChange={(event) => setSummary(event.target.value)} className="form-control mt-1"/></label></div>{status === 'SETTLED' && <><label className="mt-3 block text-xs font-semibold text-slate-600">Bajarish shartlari yoki qo‘shimcha kelishuv<textarea value={agreement} onChange={(event) => setAgreement(event.target.value)} className="form-control mt-1 min-h-20" placeholder="Kelishuv matni yoki bajarish shartlari"/></label><label className="mt-3 flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={trackObligation} onChange={(event) => setTrackObligation(event.target.checked)} className="mt-0.5 rounded border-slate-300"/><span>Kelishuv majburiyatini muddat bilan monitoringga qo‘shish</span></label>{trackObligation && <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3"><label className="text-xs font-semibold text-slate-600">Mas’ul taraf<select value={obligation.side} onChange={(event) => setObligation((current) => ({ ...current, side: event.target.value as 'CLAIMANT' | 'RESPONDENT' }))} className="form-control mt-1">{participants.map((participant) => <option key={participant.side} value={participant.side}>{participant.fullName}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Bajarish muddati<input type="date" min={new Date().toISOString().slice(0, 10)} value={obligation.dueDate} onChange={(event) => setObligation((current) => ({ ...current, dueDate: event.target.value }))} className="form-control mt-1"/></label><label className="text-xs font-semibold text-slate-600">Majburiyat<input maxLength={2000} value={obligation.description} onChange={(event) => setObligation((current) => ({ ...current, description: event.target.value }))} className="form-control mt-1" placeholder="Masalan, to‘lovni amalga oshirish"/></label></div>}</>}{error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}<button disabled={summary.trim().length < 5} onClick={() => { if (trackObligation && (!obligation.description.trim() || !obligation.dueDate)) { setError('Monitoring uchun majburiyat tavsifi va muddati kerak.'); return } setError(''); onSubmit(status, summary, agreement, trackObligation ? [{ ...obligation, dueDate: new Date(`${obligation.dueDate}T23:59:59`).toISOString() }] : undefined) }} className="mt-3 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Natijani saqlash</button></div>
}

function ScheduleMeeting({ caseId, value, onChange, onSchedule }: { caseId: string; value: { at: string; duration: string }; onChange: (value: { at: string; duration: string }) => void; onSchedule: () => void }) {
  const minimum = new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)
  return <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_150px_auto]"><label className="text-xs font-semibold text-slate-600">Uchrashuv vaqti<input required type="datetime-local" min={minimum} value={value.at} onChange={(event) => onChange({ ...value, at: event.target.value })} className="form-control mt-1" aria-label={`Uchrashuv vaqti ${caseId}`}/></label><label className="text-xs font-semibold text-slate-600">Davomiyligi<select value={value.duration} onChange={(event) => onChange({ ...value, duration: event.target.value })} className="form-control mt-1">{[30, 60, 90, 120, 180].map((minutes) => <option key={minutes} value={minutes}>{minutes} daqiqa</option>)}</select></label><button disabled={!value.at} onClick={onSchedule} className="mt-5 h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40">Videouchrashuv yaratish</button></div>
}

function mtsLabel(value: string) { return ({ AWAITING_CONSENT: 'Rozilik kutilmoqda', MEDIATOR_REQUESTED: 'Mediator tanlash', MEDIATOR_ASSIGNED: 'Mediator tayinlandi', AGREEMENT_PENDING_SIGNATURE: 'Kelishuv imzolanmoqda', SCHEDULED: 'Rejalashtirildi', IN_SESSION: 'Sessiya davom etmoqda', SETTLED: 'Kelishuv monitoringi', FAILED: 'Yakunlanmadi', CLOSED: 'Yopildi', STARTED: 'Boshlangan', FINISHED: 'Yakunlangan', CANCELLED: 'Bekor qilingan' } as Record<string, string>)[value] || value }
function isUzPhone(value: string) { const digits = value.replace(/\D/g, ''); return digits.length === 9 || (digits.length === 12 && digits.startsWith('998')) }
async function downloadExamProtocol(examId: string) {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const response = await fetch(`${apiBase}/cabinet/mk/exams/${encodeURIComponent(examId)}/protocol`, { headers: { Authorization: `Bearer ${getAccessToken()}` } })
  if (!response.ok) throw new Error('Imtihon bayonnomasini yuklab bo‘lmadi.')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = `imtihon-bayonnomasi-${examId}.pdf`; link.click()
  URL.revokeObjectURL(url)
}

function FileListField({ label, files, onChange }: { label: string; files: File[]; onChange: (files: File[]) => void }) {
  const [message, setMessage] = useState('')
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-slate-800">{label}</p><p className="mt-1 text-xs text-slate-500">PDF, DOCX, JPG yoki PNG · ko‘pi bilan 10 ta, har biri 10 MB gacha.</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><Upload size={14}/>Fayl tanlash<input className="sr-only" type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={(event) => { const picked = Array.from(event.target.files || []); event.target.value = ''; if (files.length + picked.length > 10) { setMessage('Arizaga ko‘pi bilan 10 ta fayl biriktiriladi.'); return } if (picked.some((file) => file.size > 10 * 1024 * 1024)) { setMessage('Har bir fayl hajmi 10 MB dan oshmasligi kerak.'); return } setMessage(''); onChange([...files, ...picked]) }}/></label></div>{files.length > 0 && <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2 text-xs"><span className="min-w-0 truncate text-slate-700">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" onClick={() => onChange(files.filter((_, itemIndex) => itemIndex !== index))} className="shrink-0 font-semibold text-red-700">Olib tashlash</button></li>)}</ul>}{message && <p role="alert" className="mt-2 text-xs text-red-700">{message}</p>}</div>
}

function FileField({ language = 'uz', label, required, file, onChange }: { language?: ApplicantLanguage; label: string; required?: boolean; file: File | null; onChange: (file: File | null) => void }) {
  const t = (uz: string, ru: string) => applicantText(language, uz, ru)
  const [message, setMessage] = useState('')
  const selectFile = (chosen: File | null) => {
    if (chosen && chosen.size > 10 * 1024 * 1024) {
      setMessage(t('Fayl hajmi 10 MB dan oshmasligi kerak.', 'Размер файла не должен превышать 10 МБ.'))
      onChange(null)
      return
    }
    setMessage('')
    onChange(chosen)
  }
  return <FileInput
    label={label}
    withAsterisk={required}
    required={required && !file}
    description={t('PDF, DOCX, JPG yoki PNG · 10 MB gacha', 'PDF, DOCX, JPG или PNG · до 10 МБ')}
    placeholder={t('Faylni tanlang', 'Выберите файл')}
    accept=".pdf,.docx,.jpg,.jpeg,.png"
    leftSection={<Upload size={16}/>}
    leftSectionPointerEvents="none"
    value={file}
    onChange={selectFile}
    clearable
    error={message || undefined}
  />
}
function Dialog({ language = 'uz', children, title, description, onClose }: { language?: ApplicantLanguage; children: React.ReactNode; title: string; description: string; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="workflow-title" className="relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><header className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><button type="button" onClick={onClose} aria-label={applicantText(language, 'Yopish', 'Закрыть')} className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button><h2 id="workflow-title" className="pr-10 text-lg font-semibold text-slate-950">{title}</h2><p className="mt-1 pr-7 text-xs leading-5 text-slate-500">{description}</p></header>{children}</section></div>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-slate-600"><span className="mb-1 block">{label}</span>{children}</label> }
function Summary({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{value}</dd></div> }
function ErrorNotice({ message }: { message: string }) { return <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-800"><AlertCircle size={16} className="mt-0.5 shrink-0"/>{message}</div> }

export function WorkflowFileIcon() { return <FileText size={17}/> }
