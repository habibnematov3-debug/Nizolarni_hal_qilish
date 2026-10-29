import { FormEvent, useCallback, useEffect, useState } from 'react'
import { CalendarDays, Check, FileCheck2, FilePlus2, LoaderCircle, MessageSquare, Trash2, Upload } from 'lucide-react'
import { apiDownload, apiGet, apiGetPublic, apiPatch, apiPost, getAccessToken, uploadPrivateDocument } from './api'

type Notice = (text: string) => void
type CalendarEvent = { id: string; title: string; eventDate: string; notes?: string | null }
type MediatorApplication = { id: string; type: string; status: string; reason?: string | null; createdAt: string }
type TrainingItem = { id: string; trainingCenterCode?: string; courseName?: string; course?: string; certificateNumber?: string; issuedAt?: string; expiresAt?: string; status?: string; contract?: { id: string; contractNumber: string; status: string } | null }
type Conversation = { id: string; participantA: string; participantB: string; messages: { id: string; senderId: string; body: string; createdAt: string }[] }
type MediatorContact = { id: string; fullName: string; region: string }

export function ProfileWorkspace({ onToast }: { onToast: Notice }) {
  const [portfolio, setPortfolio] = useState<Record<string, any> | null>(null)
  const [specialization, setSpecialization] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [workExperience, setWorkExperience] = useState('')
  const [achievements, setAchievements] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (!getAccessToken()) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const result = await apiGet<{ user: { fullName: string }; dossier: Record<string, any> }>('/cabinet/med/portfolio')
      setPortfolio({ ...result.dossier, fullName: result.user.fullName })
      setSpecialization((result.dossier.specialization || []).join(', '))
      setProfileBio(result.dossier.profileBio || '')
      setWorkExperience(typeof result.dossier.workExperience === 'string' ? result.dossier.workExperience : JSON.stringify(result.dossier.workExperience || '', null, 2))
      setAchievements(typeof result.dossier.achievements === 'string' ? result.dossier.achievements : JSON.stringify(result.dossier.achievements || '', null, 2))
      setVideoUrl(result.dossier.videoUrl || '')
      setIsPublic(Boolean(result.dossier.isPublic))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Portfolio yuklanmadi.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const result = await apiPatch<Record<string, any>>('/cabinet/med/portfolio', { specialization: specialization.split(',').map((item) => item.trim()).filter(Boolean), profileBio, workExperience, achievements, videoUrl: videoUrl || undefined, isPublic })
      setPortfolio((current) => current ? { ...current, ...result } : result); onToast('Portfolio yangilandi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Portfolio saqlanmadi.') }
    finally { setBusy(false) }
  }
  if (!getAccessToken()) return <Heading title="Profil va portfolio" detail="Portfolio ma’lumotlarini saqlash uchun tasdiqlangan mediator kabinetiga kiring."/>
  return <section><Heading title="Profil va portfolio" detail="Reyestrda ko‘rinadigan ixtisoslik, tajriba va yutuqlarni boshqaring."/>{error && <ErrorNotice text={error}/ >}{loading ? <Loading/> : <form onSubmit={save} className="mt-5 grid gap-5 lg:grid-cols-[.75fr_1.25fr]"><aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Mediator profili</p><h2 className="mt-2 text-xl font-semibold">{portfolio?.fullName || 'Mediator'}</h2><p className="mt-1 text-sm text-slate-500">{portfolio?.region || 'Hudud ko‘rsatilmagan'}</p><p className="mt-5 text-xs text-slate-500">Reyestr holati</p><p className="mt-1 text-sm font-semibold">{portfolio?.registryStatus || '—'}</p><label className="mt-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="rounded border-slate-300"/>Ochiq reyestrda ko‘rsatish</label></aside><div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><Field label="Ixtisosliklar, vergul bilan"><input value={specialization} onChange={(event) => setSpecialization(event.target.value)} className="form-control" placeholder="Fuqarolik nizolari, mehnat nizolari"/></Field><Field label="Portfolio haqida"><textarea maxLength={2000} value={profileBio} onChange={(event) => setProfileBio(event.target.value)} className="form-control min-h-24"/></Field><Field label="Ish tajribasi"><textarea value={workExperience} onChange={(event) => setWorkExperience(event.target.value)} className="form-control min-h-20" placeholder="Lavozim, ish joyi va davr"/></Field><Field label="Yutuqlar va malaka oshirish"><textarea value={achievements} onChange={(event) => setAchievements(event.target.value)} className="form-control min-h-20"/></Field><Field label="Tanishtiruv videosi HTTPS havolasi"><input type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} className="form-control"/></Field><button disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"><Check size={15}/>{busy ? 'Saqlanmoqda…' : 'Portfolio saqlash'}</button></div></form>}</section>
}

export function CalendarWorkspace({ onToast }: { onToast: Notice }) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const reload = useCallback(async () => {
    if (!getAccessToken()) { setLoading(false); return }
    setLoading(true)
    try { setEvents(await apiGet<CalendarEvent[]>('/cabinet/med/calendar')) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Kalendarni yuklab bo‘lmadi.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await apiPost('/cabinet/med/calendar', { title, eventDate: new Date(eventDate).toISOString(), notes }); setTitle(''); setEventDate(''); setNotes(''); await reload(); onToast('Kalendar tadbiri qo‘shildi.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Tadbirni saqlab bo‘lmadi.') }
    finally { setBusy(false) }
  }
  const remove = async (id: string) => { try { await fetchCalendarDelete(id); await reload() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Tadbir bekor qilinmadi.') } }
  if (!getAccessToken()) return <Heading title="Kalendar" detail="Uchrashuvlarni ko‘rish va belgilash uchun tasdiqlangan kabinetga kiring."/>
  return <section><Heading title="Kalendar" detail="Mediatsiya uchrashuvlari, sessiyalar va muhim muddatlar."/>{error && <ErrorNotice text={error}/ >}<form onSubmit={create} className="mt-5 grid gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:grid-cols-2"><Field label="Tadbir nomi"><input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="form-control"/></Field><Field label="Sana va vaqt"><input required type="datetime-local" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="form-control"/></Field><Field label="Izoh"><input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} className="form-control"/></Field><button disabled={busy} className="mt-5 h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">Uchrashuv belgilash</button></form>{loading ? <Loading/> : <div className="mt-4 space-y-2">{events.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-start gap-3"><CalendarDays className="mt-1 text-emerald-700" size={18}/><div><h2 className="text-sm font-semibold">{item.title}</h2><p className="mt-1 text-xs text-slate-500">{new Date(item.eventDate).toLocaleString('uz-UZ')} · {item.notes || 'Izoh yo‘q'}</p></div></div><button onClick={() => void remove(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-700"><Trash2 size={14}/>Bekor qilish</button></article>)}{!events.length && <Empty text="Kalendar tadbirlari yo‘q."/>}</div>}</section>
}

export function MediatorCertificateWorkspace({ onToast }: { onToast: Notice }) {
  const [certificates, setCertificates] = useState<TrainingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  useEffect(() => {
    if (!getAccessToken()) { setLoading(false); return }
    let active = true
    apiGet<{ items: TrainingItem[] }>('/cabinet/certificates?page=1&limit=50')
      .then((result) => { if (active) setCertificates(result.items || []) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Guvohnomalarni yuklab bo‘lmadi.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const download = async (item: TrainingItem) => {
    setBusyId(item.id); setError('')
    try { await apiDownload(`/certificates/${item.id}/file`, `malaka-guvohnomasi-${item.certificateNumber || item.id}.pdf`) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Guvohnomani yuklab bo‘lmadi.') }
    finally { setBusyId('') }
  }
  if (!getAccessToken()) return <section><Heading title="Malaka guvohnomalari" detail="QR-kodli elektron malaka guvohnomalaringiz va amal qilish muddatlari."/><div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Haqiqiy guvohnomalarni ko‘rish uchun mediator hisobiga kiring. Demo rejimida reyestr hujjatlari mavjud emas.</div></section>
  const expiring = certificates.filter((item) => item.expiresAt && new Date(item.expiresAt).getTime() - Date.now() <= 30 * 86400000 && new Date(item.expiresAt).getTime() >= Date.now())
  return <section><Heading title="Malaka guvohnomalari" detail="QR-kodli elektron guvohnomalar va amal qilish muddatlari."/>{expiring.length > 0 && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{expiring.length} ta guvohnomaning muddati yaqin 30 kun ichida tugaydi.</div>}{error && <ErrorNotice text={error}/ >}{loading ? <Loading/> : <div className="mt-5 grid gap-3 md:grid-cols-2">{certificates.map((item) => { const expires = item.expiresAt ? new Date(item.expiresAt) : null; const expired = Boolean(expires && expires.getTime() < Date.now()); const near = Boolean(expires && !expired && expires.getTime() - Date.now() <= 30 * 86400000); return <article key={item.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{item.course || item.courseName || 'Malaka guvohnomasi'}</p><p className="mt-1 text-xs text-slate-500">№ {item.certificateNumber || '—'}</p></div><FileCheck2 size={19} className={expired ? 'text-red-600' : near ? 'text-amber-600' : 'text-emerald-700'}/></div><div className="mt-4 space-y-2 text-xs"><Info label="Berilgan sana" value={item.issuedAt ? new Date(item.issuedAt).toLocaleDateString('uz-UZ') : '—'}/><Info label="Amal qilish muddati" value={expires ? expires.toLocaleDateString('uz-UZ') : 'Ko‘rsatilmagan'}/></div><div className="mt-4 flex items-center justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${expired ? 'bg-red-50 text-red-700' : near ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{expired ? 'Muddati tugagan' : near ? 'Muddat yaqin' : item.status || 'Amalda'}</span><button disabled={busyId === item.id} onClick={() => void download(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-50">{busyId === item.id ? 'Yuklanmoqda…' : 'Yuklab olish'}</button></div></article>})}{!certificates.length && <div className="md:col-span-2"><Empty text="Guvohnomalar topilmadi."/></div>}</div>}</section>
}

function Info({ label: name, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3"><span className="text-slate-500">{name}</span><span className="text-right font-medium text-slate-800">{value}</span></div> }

export function MediatorApplicationsWorkspace({ onToast }: { onToast: Notice }) {
  const [items, setItems] = useState<MediatorApplication[]>([])
  const [reason, setReason] = useState('')
  const [replacementReason, setReplacementReason] = useState('DAMAGED')
  const [supportingFile, setSupportingFile] = useState<File | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState('PICKUP')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const reload = useCallback(async () => {
    if (!getAccessToken()) { setLoading(false); return }
    try { setItems(await apiGet<MediatorApplication[]>('/cabinet/med/applications')) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Arizalar yuklanmadi.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])
  const submitRemoval = async () => {
    if (reason.trim().length < 5) { setError('Reyestrdan chiqish sababini kiriting.'); return }
    setBusy(true); setError('')
    try { await apiPost('/cabinet/med/applications/registry-removal', { reason }); setReason(''); await reload(); onToast('Reyestrdan chiqarish arizasi yuborildi.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Ariza yuborilmadi.') }
    finally { setBusy(false) }
  }
  const submitReplacement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!supportingFile) { setError('Tasdiqlovchi hujjatni biriktiring.'); return }
    setBusy(true); setError('')
    try {
      const file = await uploadPrivateDocument(supportingFile, 'Mediator guvohnomasini almashtirish uchun hujjat')
      await apiPost('/cabinet/med/applications/certificate-replacement', { reason: replacementReason, supportingDocumentId: file.id, deliveryMethod, deliveryAddress: deliveryMethod === 'POST' ? deliveryAddress : undefined })
      setSupportingFile(null); setDeliveryAddress(''); await reload(); onToast('Guvohnomani almashtirish arizasi yuborildi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ariza yuborilmadi.') }
    finally { setBusy(false) }
  }
  if (!getAccessToken()) return <Heading title="Mediator arizalari" detail="Arizalarni yuborish uchun tasdiqlangan mediator kabinetiga kiring."/>
  return <section><Heading title="Mediator arizalari" detail="Reyestrdan chiqarish yoki mediator guvohnomasini almashtirish uchun ariza yuboring."/>{error && <ErrorNotice text={error}/ >}<div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="space-y-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><h2 className="font-semibold">Reyestrdan chiqarish</h2><Field label="Ariza sababi"><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} className="form-control min-h-24"/></Field><button disabled={busy} onClick={() => void submitRemoval()} className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">Ariza yuborish</button></div><form onSubmit={submitReplacement} className="space-y-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><h2 className="font-semibold">Guvohnomani almashtirish</h2><Field label="Sabab"><select value={replacementReason} onChange={(event) => setReplacementReason(event.target.value)} className="form-control"><option value="DAMAGED">Shikastlangan</option><option value="LOST">Yo‘qolgan</option><option value="EXPIRED">Muddati tugagan</option><option value="NAME_CHANGED">F.I.Sh. o‘zgargan</option></select></Field><label className="block text-xs font-semibold text-slate-600">Tasdiqlovchi fayl *<span className="mt-1 flex items-center gap-2 rounded-lg border border-dashed p-3"><Upload size={16}/><input required type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setSupportingFile(event.target.files?.[0] || null)} className="min-w-0 text-xs"/></span></label><Field label="Yetkazib berish"><select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)} className="form-control"><option value="PICKUP">Shaxsan olib ketish</option><option value="POST">Pochta orqali</option></select></Field>{deliveryMethod === 'POST' && <Field label="Pochta manzili"><input required value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} className="form-control"/></Field>}<button disabled={busy} className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">Ariza yuborish</button></form></div><div className="mt-5 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><h2 className="font-semibold">Arizalarim</h2>{loading ? <Loading/> : <div className="mt-3 divide-y divide-slate-100">{items.map((item) => <div key={item.id} className="flex justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{item.type === 'REGISTRY_REMOVAL' ? 'Reyestrdan chiqarish' : 'Guvohnomani almashtirish'}</p><p className="mt-1 text-xs text-slate-500">{item.reason} · {new Date(item.createdAt).toLocaleDateString('uz-UZ')}</p></div><span className="text-xs">{item.status}</span></div>)}{!items.length && <Empty text="Yuborilgan arizalar yo‘q."/>}</div>}</div></section>
}

export function TrainingWorkspace({ role, onToast }: { role: string; onToast: Notice }) {
  const [applications, setApplications] = useState<TrainingItem[]>([])
  const [certificates, setCertificates] = useState<TrainingItem[]>([])
  const [staffItems, setStaffItems] = useState<TrainingItem[]>([])
  const [courseName, setCourseName] = useState('Mediatorlar malakasini oshirish kursi')
  const [trainingCenterCode, setTrainingCenterCode] = useState('TRAIN_YMOM')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const authenticated = Boolean(getAccessToken())
  const isStaff = ['REGIONAL', 'MINISTRY', 'COMMISSION', 'ADMIN'].includes(role)
  const reload = useCallback(async () => {
    if (!authenticated) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      if (isStaff) {
        const endpoint = role === 'REGIONAL' ? '/staff/training/overdue' : '/staff/training/qualified'
        const result = await apiGet<{ items: TrainingItem[] }>(`${endpoint}?page=1&limit=100`)
        setStaffItems(result.items || [])
      } else {
        const [apps, certs] = await Promise.all([
          apiGet<{ items: TrainingItem[] }>('/cabinet/training/applications?page=1&limit=50'),
          apiGet<{ items: TrainingItem[] }>('/cabinet/certificates?page=1&limit=50'),
        ])
        setApplications(apps.items || []); setCertificates(certs.items || [])
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Malaka oshirish ma’lumotlari yuklanmadi.') }
    finally { setLoading(false) }
  }, [authenticated, isStaff, role])
  useEffect(() => { void reload() }, [reload])
  const apply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await apiPost('/cabinet/training/applications', { trainingCenterCode, courseName, note }); setNote(''); await reload(); onToast('Malaka oshirish arizasi yuborildi.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Ariza yuborilmadi.') }
    finally { setBusy(false) }
  }
  const createTrainingContract = async (id: string) => { setBusy(true); setError(''); try { await apiPost(`/cabinet/training/applications/${id}/contract`, {}); await reload(); onToast('O‘quv markazi bilan shartnoma yaratildi.') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Shartnoma yaratilmadi.') } finally { setBusy(false) } }
  if (!authenticated) return <Heading title="Malaka oshirish" detail="O‘quv markaziga ariza yuborish va sertifikatlarni ko‘rish uchun mediator hisobiga kiring."/>
  return <section><Heading title={role === 'COMMISSION' ? 'O‘quv va malaka nazorati' : 'Malaka oshirish'} detail={role === 'COMMISSION' ? 'Tizimda mavjud malaka sertifikatlari va reyestrga kiritilgan mutaxassislar.' : isStaff ? 'Hududiy reyestr va malaka muddati bo‘yicha nazorat.' : 'O‘quv kursiga ariza yuboring, shartnoma va sertifikatlarni kuzating.'}/>{error && <ErrorNotice text={error}/ >}{loading ? <Loading/> : isStaff ? <><div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Kurs katalogini joylashtirish va onlayn qatnashuvni qayd etish API’da hozircha mavjud emas; quyida serverdagi malaka reyestri ko‘rsatiladi.</div><div className="mt-5 space-y-2">{staffItems.map((item) => <article key={item.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><p className="font-semibold">{item.course || item.courseName || item.certificateNumber || item.id}</p><p className="mt-1 text-xs text-slate-500">{item.status || 'Malaka muddati o‘tgan'}</p></article>)}{!staffItems.length && <Empty text="Ushbu filtr bo‘yicha mediator topilmadi."/>}</div></> : <><form onSubmit={apply} className="mt-5 grid gap-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:grid-cols-2"><Field label="O‘quv markazi kodi"><input required value={trainingCenterCode} onChange={(event) => setTrainingCenterCode(event.target.value)} className="form-control" placeholder="TRAIN_YMOM"/></Field><Field label="Kurs nomi"><input required value={courseName} onChange={(event) => setCourseName(event.target.value)} className="form-control"/></Field><Field label="Izoh"><input value={note} onChange={(event) => setNote(event.target.value)} className="form-control"/></Field><button disabled={busy} className="mt-5 h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">Kursga ariza yuborish</button></form><div className="mt-5 grid gap-4 lg:grid-cols-2"><section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><h2 className="font-semibold">Arizalarim</h2><div className="mt-3 divide-y divide-slate-100">{applications.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{item.courseName} · {item.trainingCenterCode}</p><p className="mt-1 text-xs text-slate-500">{item.contract?.contractNumber ? `Shartnoma ${item.contract.contractNumber}` : 'Shartnoma yaratilmagan'}</p></div>{!item.contract && <button disabled={busy} onClick={() => void createTrainingContract(item.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Shartnoma yaratish</button>}</div>)}{!applications.length && <Empty text="O‘quv kursi arizalari yo‘q."/>}</div></section><section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><h2 className="font-semibold">Sertifikatlarim</h2><div className="mt-3 divide-y divide-slate-100">{certificates.map((item) => <a key={item.id} href={`/certificates/${item.id}/file`} className="flex items-center gap-2 py-3 text-sm text-blue-800"><FileCheck2 size={16}/>{item.course || item.courseName || item.certificateNumber || 'Sertifikat'}</a>)}{!certificates.length && <Empty text="Sertifikatlar topilmadi."/>}</div></section></div></>}</section>
}

export function MessagesWorkspace({ onToast }: { onToast: Notice }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [contacts, setContacts] = useState<MediatorContact[]>([])
  const [profile, setProfile] = useState<{ id: string } | null>(null)
  const [recipientId, setRecipientId] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const reload = useCallback(async () => {
    if (!getAccessToken()) { setLoading(false); return }
    setLoading(true)
    try {
      const [messages, me, directory] = await Promise.all([
        apiGet<Conversation[]>('/cabinet/med/messages'), apiGet<{ id: string }>('/users/me'), apiGetPublic<MediatorContact[]>('/public/mediators?limit=100'),
      ])
      setConversations(messages || []); setProfile(me); setContacts(directory || [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Yozishmalarni yuklab bo‘lmadi.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])
  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await apiPost('/cabinet/med/messages', { recipientId, body }); setBody(''); await reload(); onToast('Xabar yuborildi.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Xabar yuborilmadi.') }
    finally { setBusy(false) }
  }
  if (!getAccessToken()) return <Heading title="Yozishmalar" detail="Mediatorlar bilan xabar almashish uchun tasdiqlangan hisob bilan kiring."/>
  return <section><Heading title="Yozishmalar" detail="Mediatorlar bilan xabar va fayl almashish."/>{error && <ErrorNotice text={error}/ >}<form onSubmit={send} className="mt-5 grid gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:grid-cols-[260px_1fr_auto]"><Field label="Qabul qiluvchi"><select required value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className="form-control"><option value="">Mediatorni tanlang</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName} · {contact.region}</option>)}</select></Field><Field label="Xabar"><input required maxLength={10000} value={body} onChange={(event) => setBody(event.target.value)} className="form-control" placeholder="Xabar matni"/></Field><button disabled={busy} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"><MessageSquare size={15}/>Yuborish</button></form>{loading ? <Loading/> : <div className="mt-4 space-y-3">{conversations.map((conversation) => { const otherId = conversation.participantA === profile?.id ? conversation.participantB : conversation.participantA; const person = contacts.find((contact) => contact.id === otherId); return <article key={conversation.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><h2 className="text-sm font-semibold">{person?.fullName || 'Suhbat'}</h2><div className="mt-3 space-y-2">{conversation.messages.map((message) => <p key={message.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${message.senderId === profile?.id ? 'ml-auto bg-emerald-50 text-emerald-950' : 'bg-slate-100 text-slate-700'}`}>{message.body}<span className="mt-1 block text-[10px] opacity-60">{new Date(message.createdAt).toLocaleString('uz-UZ')}</span></p>)}</div></article>})}{!conversations.length && <Empty text="Hozircha yozishmalar yo‘q."/>}</div>}</section>
}

async function fetchCalendarDelete(id: string) {
  const token = localStorage.getItem('nizolar.auth.accessToken')
  const response = await fetch(`${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')}/cabinet/med/calendar/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error('Kalendar tadbirini bekor qilib bo‘lmadi.')
}
function Heading({ title, detail }: { title: string; detail: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Mediator kabineti</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1><p className="mt-1.5 text-sm text-slate-500">{detail}</p></div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-slate-600">{label}<span className="mt-1 block">{children}</span></label> }
function ErrorNotice({ text }: { text: string }) { return <div role="alert" className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">{text}</div> }
function Loading() { return <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={17}/>Yuklanmoqda…</div> }
function Empty({ text }: { text: string }) { return <p className="py-6 text-center text-sm text-slate-500">{text}</p> }
