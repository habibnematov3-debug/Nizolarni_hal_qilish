import { FormEvent, useMemo, useState } from 'react'
import { AlertCircle, Check, FileText, ShieldCheck, Upload, X } from 'lucide-react'

const regions = [
  'Qoraqalpog‘iston Respublikasi', 'Andijon viloyati', 'Buxoro viloyati', 'Jizzax viloyati',
  'Qashqadaryo viloyati', 'Navoiy viloyati', 'Namangan viloyati', 'Samarqand viloyati',
  'Surxondaryo viloyati', 'Sirdaryo viloyati', 'Toshkent viloyati', 'Farg‘ona viloyati',
  'Xorazm viloyati', 'Toshkent shahri',
]
const categories = [
  ['FAMILY', 'Oilaviy nizo'], ['CIVIL', 'Fuqarolik nizosi'], ['LABOR', 'Mehnat nizosi'],
  ['BUSINESS', 'Tadbirkorlik nizosi'], ['CONTRACT', 'Shartnomaviy nizo'], ['OTHER', 'Boshqa nizo'],
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
  const isMandatory = draft.type === 'MANDATORY'
  const respondentPinflError = useMemo(() => draft.respondentPinfl && !/^\d{14}$/.test(draft.respondentPinfl) ? 'PINFL 14 ta raqamdan iborat bo‘lishi kerak.' : '', [draft.respondentPinfl])
  const update = <K extends keyof MediationDraft>(key: K, value: MediationDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
        {initialMediator && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Tanlangan mediator: <strong>{initialMediator}</strong>. Rasmiy mediator tanlovi ikki taraf roziligidan keyin qayd etiladi.</div>}
        <div className="flex justify-end border-t border-slate-100 pt-4"><button type="button" onClick={() => setStep(2)} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Taraflar ma’lumotiga o‘tish</button></div>
      </div>}
      {step === 2 && <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-slate-200 p-4"><div><p className="text-sm font-semibold">Ariza beruvchi</p><p className="mt-1 text-xs text-slate-500">Rasmiy tizimda bu ma’lumotlar OneID profilidan olinadi.</p></div><Field label="F.I.Sh. *"><input required maxLength={160} value={draft.claimantName} onChange={(event) => update('claimantName', event.target.value)} className="field-control" autoComplete="name"/></Field><Field label="PINFL *"><input required inputMode="numeric" pattern="\d{14}" maxLength={14} value={draft.claimantPinfl} onChange={(event) => update('claimantPinfl', event.target.value.replace(/\D/g, ''))} className="field-control" placeholder="14 ta raqam"/></Field><Field label="Telefon *"><input required type="tel" value={draft.claimantPhone} onChange={(event) => update('claimantPhone', event.target.value)} className="field-control" placeholder="+998 90 123 45 67" autoComplete="tel"/></Field></section>
          <section className="space-y-3 rounded-xl border border-slate-200 p-4"><div><p className="text-sm font-semibold">Javobgar taraf</p><p className="mt-1 text-xs text-slate-500">Rozilik va xabarnoma uchun telefon raqami kerak.</p></div><Field label="F.I.Sh. yoki tashkilot nomi *"><input required maxLength={160} value={draft.respondentName} onChange={(event) => update('respondentName', event.target.value)} className="field-control"/></Field><Field label="Telefon *"><input required type="tel" value={draft.respondentPhone} onChange={(event) => update('respondentPhone', event.target.value)} className="field-control" placeholder="+998 90 123 45 67"/></Field><Field label="PINFL (jismoniy shaxs uchun)"><input inputMode="numeric" maxLength={14} value={draft.respondentPinfl} onChange={(event) => update('respondentPinfl', event.target.value.replace(/\D/g, ''))} className="field-control" placeholder="14 ta raqam" aria-invalid={Boolean(respondentPinflError)}/>{respondentPinflError && <span className="mt-1 block text-xs text-red-600">{respondentPinflError}</span>}</Field><Field label="Elektron pochta"><input type="email" maxLength={254} value={draft.respondentEmail} onChange={(event) => update('respondentEmail', event.target.value)} className="field-control" placeholder="ixtiyoriy"/></Field></section>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-4"><button type="button" onClick={() => setStep(1)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium">Orqaga</button><button type="button" onClick={() => setStep(3)} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Ma’lumotlarni tekshirish</button></div>
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
}

export function MediatorApplicationForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (draft: ApplicationDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<ApplicationDraft>({ fullName: '', pinfl: '', passportNumber: '', passportGivenDate: '', passportExpireDate: '', phone: '', email: '', address: '', profession: 'MEDIATOR', education: '', diplomaFile: null, passportFile: null, courseCertificate: null })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const courseRequired = draft.profession === 'MEDIATOR'
  const update = <K extends keyof ApplicationDraft>(key: K, value: ApplicationDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^\d{14}$/.test(draft.pinfl)) { setError('PINFL 14 ta raqam bo‘lishi kerak.'); return }
    if (!draft.diplomaFile) { setError('Diplom faylini biriktiring.'); return }
    if (courseRequired && !draft.courseCertificate) { setError('Maxsus o‘quv kursi sertifikatini biriktiring.'); return }
    setError(''); setBusy(true)
    try { await onSubmit(draft) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Arizani yuborib bo‘lmadi.') }
    finally { setBusy(false) }
  }
  return <Dialog onClose={onClose} title="Mediator maqomi uchun ariza" description="Hujjatlar va aloqa ma’lumotlarini to‘ldiring. Tekshiruvlar ariza yuborilgandan keyin davlat manbalarida bajariladi.">
    <form onSubmit={submit} className="space-y-5 p-5 sm:p-7">
      <section className="space-y-4 rounded-xl border border-slate-200 p-4"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-800"><ShieldCheck size={18}/></span><div><h3 className="text-sm font-semibold">Pasport va shaxsiy ma’lumot</h3><p className="mt-1 text-xs leading-5 text-slate-500">Production tizimida F.I.Sh., PINFL va pasport rekvizitlari OneID profilidan olinib tekshiriladi. Demo sinovi uchun quyidagi maydonlarni qo‘lda kiriting.</p></div></div><div className="grid gap-3 sm:grid-cols-2"><Field label="F.I.Sh. *"><input required maxLength={160} value={draft.fullName} onChange={(event) => update('fullName', event.target.value)} className="field-control" autoComplete="name"/></Field><Field label="PINFL *"><input required inputMode="numeric" pattern="\d{14}" maxLength={14} value={draft.pinfl} onChange={(event) => update('pinfl', event.target.value.replace(/\D/g, ''))} className="field-control"/></Field><Field label="Pasport seriyasi va raqami *"><input required maxLength={20} value={draft.passportNumber} onChange={(event) => update('passportNumber', event.target.value.toUpperCase())} className="field-control" placeholder="AA1234567"/></Field><Field label="Pasport berilgan sana *"><input required type="date" value={draft.passportGivenDate} onChange={(event) => update('passportGivenDate', event.target.value)} className="field-control"/></Field><Field label="Pasport amal qilish muddati *"><input required type="date" value={draft.passportExpireDate} onChange={(event) => update('passportExpireDate', event.target.value)} className="field-control"/></Field><Field label="Yashash manzili *"><input required maxLength={1000} value={draft.address} onChange={(event) => update('address', event.target.value)} className="field-control"/></Field></div></section>
      <section className="space-y-4 rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-semibold">Aloqa va kasbiy ma’lumot</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Telefon *"><input required type="tel" value={draft.phone} onChange={(event) => update('phone', event.target.value)} className="field-control" placeholder="+998 90 123 45 67" autoComplete="tel"/></Field><Field label="Elektron pochta *"><input required type="email" maxLength={254} value={draft.email} onChange={(event) => update('email', event.target.value)} className="field-control" placeholder="name@example.uz" autoComplete="email"/></Field><Field label="Kasbiy maqom *"><select value={draft.profession} onChange={(event) => update('profession', event.target.value as ApplicationDraft['profession'])} className="field-control"><option value="MEDIATOR">Mediator nomzodi</option><option value="NOTARY">Amaldagi notarius</option><option value="ADVOCATE">Amaldagi advokat</option></select></Field><Field label="Ma’lumoti / diplom yo‘nalishi *"><input required maxLength={250} value={draft.education} onChange={(event) => update('education', event.target.value)} className="field-control" placeholder="Oliy yuridik ma’lumot"/></Field></div></section>
      <section className="space-y-3 rounded-xl border border-slate-200 p-4"><div><h3 className="text-sm font-semibold">Tasdiqlovchi hujjatlar</h3><p className="mt-1 text-xs text-slate-500">PDF, DOCX yoki JPG/PNG · har biri 10 MB gacha.</p></div><FileField label="Diplom nusxasi *" required file={draft.diplomaFile} onChange={(file) => update('diplomaFile', file)}/><FileField label="Pasport nusxasi (ixtiyoriy)" file={draft.passportFile} onChange={(file) => update('passportFile', file)}/>{courseRequired ? <FileField label="Mediatorlar maxsus kursi sertifikati *" required file={draft.courseCertificate} onChange={(file) => update('courseCertificate', file)}/> : <p className="rounded-lg bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">Notarius va advokat maqomi hujjatlar bilan tasdiqlansa, maxsus kurs sertifikati talab qilinmaydi; maqom davlat manbasida tekshiriladi.</p>}</section>
      <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertCircle size={16} className="mt-0.5 shrink-0"/><span>Sudlanganlik va muomala layoqati arizachining javobiga qarab emas, vakolatli davlat manbasi orqali tekshirilishi kerak. Hozir tashqi reyestr ulanmagan bo‘lsa ariza “tekshiruvda” qoladi.</span></div>
      {error && <ErrorNotice message={error}/>}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm">Bekor qilish</button><button disabled={busy} type="submit" className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Yuborilmoqda…' : 'Arizani yuborish'}</button></div>
    </form>
  </Dialog>
}

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
