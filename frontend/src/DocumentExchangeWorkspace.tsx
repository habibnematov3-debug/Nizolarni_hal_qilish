import { FormEvent, useCallback, useEffect, useState } from 'react'
import { ArrowRight, Check, FileDown, FileUp, LoaderCircle, MessageSquare, Paperclip, Send, X } from 'lucide-react'
import { apiDownload, apiGet, apiPost, getAccessToken, uploadPrivateDocument } from './api'

type ExchangeFile = { id: string; originalName: string; mimeType: string; sizeBytes: number }
type ExchangeMessage = { id: string; action: string; body: string; sender: { id: string; fullName: string }; createdAt: string; attachments: ExchangeFile[] }
type ExchangeThread = {
  id: string
  type: 'MEDIATION' | 'INTERAGENCY'
  status: string
  subject: string
  region?: string | null
  mediationId?: string | null
  relatedMediation?: { id: string; disputeSubject: string; region: string } | null
  targetOrganization?: { id: string; name: string; type: string } | null
  createdBy: { id: string; fullName: string }
  createdAt: string
  updatedAt: string
  messages: ExchangeMessage[]
}
type MtsCase = { id: string; disputeSubject: string; region: string; status: string }
type Props = { role: string; mediationId?: string; onToast?: (text: string) => void }

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Yuborildi', IN_REVIEW: 'Ko‘rib chiqilmoqda', NEEDS_CORRECTION: 'Tuzatish so‘raldi',
  FORWARDED: 'Vazirlikka yuborildi', COMPLETED: 'Yakunlandi', REJECTED: 'Rad etildi',
}

export function DocumentExchangeWorkspace({ role, mediationId, onToast = () => undefined }: Props) {
  const isOffice = ['REGIONAL', 'MINISTRY'].includes(role)
  const isMediator = role === 'MEDIATOR'
  const [threads, setThreads] = useState<ExchangeThread[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<ExchangeThread | null>(null)
  const [cases, setCases] = useState<MtsCase[]>([])
  const [folder, setFolder] = useState<'INBOX' | 'OUTBOX'>(() => ['REGIONAL', 'MINISTRY'].includes(role) ? 'INBOX' : 'OUTBOX')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [relatedMediationId, setRelatedMediationId] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [decisionNote, setDecisionNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const reloadList = useCallback(async () => {
    if (!getAccessToken()) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      if (mediationId) {
        const item = await apiGet<ExchangeThread>(`/cabinet/document-exchange/mediations/${encodeURIComponent(mediationId)}`)
        setDetail(item)
        setThreads([])
      } else {
        const result = await apiGet<ExchangeThread[]>(`/cabinet/document-exchange?folder=${folder}`)
        setThreads(result || [])
        if (selectedId && result?.some((item) => item.id === selectedId)) {
          setDetail(await apiGet<ExchangeThread>(`/cabinet/document-exchange/${encodeURIComponent(selectedId)}`))
        } else if (selectedId) {
          setSelectedId(''); setDetail(null)
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Hujjatlar almashinuvini yuklab bo‘lmadi.')
    } finally { setLoading(false) }
  }, [folder, mediationId, reloadKey, selectedId])

  useEffect(() => { void reloadList() }, [reloadList])
  useEffect(() => {
    if (!isMediator || mediationId || !getAccessToken()) return
    apiGet<MtsCase[]>('/cabinet/mts/mediations').then((items) => setCases(items || [])).catch(() => setCases([]))
  }, [isMediator, mediationId])

  const selectThread = async (id: string) => {
    setSelectedId(id); setError('')
    try { setDetail(await apiGet<ExchangeThread>(`/cabinet/document-exchange/${encodeURIComponent(id)}`)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Hujjat tafsilotini ochib bo‘lmadi.') }
  }

  const uploadFiles = async () => {
    const uploaded = []
    for (const file of files) uploaded.push(await uploadPrivateDocument(file, 'Hujjat almashinuvi ilovasi'))
    return uploaded.map((item) => item.id)
  }

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!detail) return
    setBusy(true); setError('')
    try {
      const attachmentIds = await uploadFiles()
      const path = mediationId
        ? `/cabinet/document-exchange/mediations/${encodeURIComponent(mediationId)}/messages`
        : `/cabinet/document-exchange/${encodeURIComponent(detail.id)}/messages`
      await apiPost(path, { body, attachmentIds })
      setBody(''); setFiles([]); setReloadKey((value) => value + 1); onToast('Xabar va hujjatlar yuborildi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Xabar yuborilmadi.') }
    finally { setBusy(false) }
  }

  const createInteragency = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const attachmentIds = await uploadFiles()
      const created = await apiPost<ExchangeThread>('/cabinet/document-exchange/interagency', {
        subject, body, relatedMediationId: relatedMediationId || undefined, attachmentIds,
      })
      setSubject(''); setBody(''); setRelatedMediationId(''); setFiles([]); setSelectedId(created.id); setDetail(created); setReloadKey((value) => value + 1)
      onToast('Hujjat hududiy adliya organiga yuborildi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Hujjat yuborilmadi.') }
    finally { setBusy(false) }
  }

  const act = async (action: string) => {
    if (!detail) return
    setBusy(true); setError('')
    try {
      const updated = await apiPost<ExchangeThread>(`/cabinet/document-exchange/${encodeURIComponent(detail.id)}/actions`, { action, note: decisionNote })
      setDetail(updated); setDecisionNote(''); setReloadKey((value) => value + 1)
      onToast('Hujjat holati yangilandi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Amal bajarilmadi.') }
    finally { setBusy(false) }
  }

  if (!getAccessToken()) return <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">Hujjatlarni yuborish va ko‘rish uchun OneID/ERI orqali tasdiqlangan kabinetga kiring. Demo rejimida rasmiy fayllar yuborilmaydi.</section>

  return <section>
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-700">Hujjat almashinuvi</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{mediationId ? 'Ish hujjatlari va yozishmalar' : isOffice ? 'Kiruvchi va chiquvchi hujjatlar' : 'Idoraga yuborilgan hujjatlar'}</h1><p className="mt-1.5 text-sm text-slate-500">Har bir fayl va xabar tegishli ish yoki tashkilotlararo yozuv bilan bog‘lanadi.</p></div>
      {!mediationId && !isMediator && <div className="flex gap-2">{(['INBOX', 'OUTBOX'] as const).map((value) => <button key={value} onClick={() => { setFolder(value); setSelectedId(''); setDetail(null) }} className={`h-9 rounded-lg px-3 text-xs font-semibold ${folder === value ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{value === 'INBOX' ? 'Kiruvchi' : 'Chiquvchi'}</button>)}</div>}
    </div>
    {error && <div role="alert" className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

    {!mediationId && isMediator && !detail && <form onSubmit={createInteragency} className="mb-5 grid gap-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">Hududiy adliya organiga hujjat yuborish</h2>
      <label className="block text-xs font-semibold text-slate-600">Mavzu<input required maxLength={180} value={subject} onChange={(event) => setSubject(event.target.value)} className="form-control mt-1.5" placeholder="Masalan, mediatsiya hisoboti yoki so‘rovga javob"/></label>
      <label className="block text-xs font-semibold text-slate-600">Tegishli mediatsiya ishi <select value={relatedMediationId} onChange={(event) => setRelatedMediationId(event.target.value)} className="form-control mt-1.5"><option value="">Umumiy hujjat</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.disputeSubject} · {item.region}</option>)}</select></label>
      <MessageForm body={body} setBody={setBody} files={files} setFiles={setFiles} busy={busy} submitLabel="Hududiy organga yuborish"/>
    </form>}

    <div className={`grid gap-4 ${!mediationId && !isMediator ? 'lg:grid-cols-[minmax(260px,.72fr)_minmax(0,1.28fr)]' : ''}`}>
      {!mediationId && !isMediator && <aside className="space-y-2">
        {loading ? <Loading/> : threads.length ? threads.map((thread) => <button key={thread.id} onClick={() => void selectThread(thread.id)} className={`w-full rounded-xl border p-4 text-left transition ${selectedId === thread.id ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'}`}><div className="flex items-start justify-between gap-2"><strong className="text-sm">{thread.subject}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">{statusLabels[thread.status] || thread.status}</span></div><p className="mt-2 text-xs text-slate-500">{thread.region || 'Hudud ko‘rsatilmagan'} · {thread.targetOrganization?.name || 'Tashkilot'}</p><p className="mt-2 text-[11px] text-slate-400">{new Date(thread.updatedAt).toLocaleString('uz-UZ')}</p></button>) : <Empty text="Hujjatlar topilmadi."/>}
      </aside>}
      {detail ? <ThreadDetail thread={detail} role={role} isOffice={isOffice} decisionNote={decisionNote} setDecisionNote={setDecisionNote} act={act} sendMessage={sendMessage} body={body} setBody={setBody} files={files} setFiles={setFiles} busy={busy} mediationId={mediationId} onDownload={(file) => void apiDownload(`/platform/files/${encodeURIComponent(file.id)}`, file.originalName).catch((cause) => setError(cause instanceof Error ? cause.message : 'Fayl yuklanmadi.'))}/>
        : !loading && (!isOffice && !isMediator) ? <Empty text="Yozuv tanlang."/> : null}
      {!mediationId && isMediator && !detail && threads.length > 0 && <div className="space-y-2">{threads.map((thread) => <button key={thread.id} onClick={() => void selectThread(thread.id)} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"><div className="flex items-center justify-between gap-3"><strong className="text-sm">{thread.subject}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px]">{statusLabels[thread.status] || thread.status}</span></div><p className="mt-2 text-xs text-slate-500">{thread.targetOrganization?.name || 'Hududiy adliya organi'} · {thread.relatedMediation?.disputeSubject || 'Umumiy hujjat'}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-800">Yozishmani ochish<ArrowRight size={14}/></span></button>)}</div>}
      {!mediationId && isMediator && !loading && !threads.length && !detail && <Empty text="Hali idoraga yuborilgan hujjatlar yo‘q."/>}
    </div>
    {loading && mediationId && <Loading/>}
  </section>
}

function ThreadDetail({ thread, role, isOffice, decisionNote, setDecisionNote, act, sendMessage, body, setBody, files, setFiles, busy, mediationId, onDownload }: {
  thread: ExchangeThread; role: string; isOffice: boolean; decisionNote: string; setDecisionNote: (value: string) => void; act: (action: string) => void;
  sendMessage: (event: FormEvent<HTMLFormElement>) => void; body: string; setBody: (value: string) => void; files: File[]; setFiles: (value: File[]) => void;
  busy: boolean; mediationId?: string; onDownload: (file: ExchangeFile) => void;
}) {
  const isClosed = ['COMPLETED', 'REJECTED'].includes(thread.status)
  return <article className="min-w-0 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4"><div><h2 className="font-semibold">{thread.subject}</h2><p className="mt-1 text-xs text-slate-500">{thread.region || thread.relatedMediation?.region || 'Hudud ko‘rsatilmagan'}{thread.targetOrganization ? ` · ${thread.targetOrganization.name}` : ''}</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">{statusLabels[thread.status] || thread.status}</span></div>
    <div className="my-4 max-h-[460px] space-y-3 overflow-y-auto">{thread.messages.map((message) => <div key={message.id} className={`rounded-xl p-3 ${message.action === 'MESSAGE' ? 'bg-slate-50' : 'border border-blue-100 bg-blue-50/60'}`}><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs">{message.sender.fullName}</strong><span className="text-[10px] text-slate-400">{new Date(message.createdAt).toLocaleString('uz-UZ')}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p>{message.attachments.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{message.attachments.map((file) => <button key={file.id} onClick={() => onDownload(file)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-blue-800 hover:bg-blue-50"><FileDown size={14}/>{file.originalName}</button>)}</div>}</div>)}</div>
    {isOffice && !isClosed && <div className="mb-4 rounded-xl border border-slate-200 p-3"><p className="mb-2 text-xs font-semibold text-slate-700">Ko‘rib chiqish amallari</p><input value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} maxLength={4000} className="form-control" placeholder="Izoh yoki tuzatish sababi"/><div className="mt-2 flex flex-wrap gap-2">{['SUBMITTED', 'FORWARDED'].includes(thread.status) && <ActionButton busy={busy} onClick={() => act('RECEIVE')} icon={<Check size={14}/>} label="Qabul qilish"/>}{!['COMPLETED', 'REJECTED'].includes(thread.status) && <ActionButton busy={busy} disabled={!decisionNote.trim()} onClick={() => act('REQUEST_CORRECTION')} label="Tuzatishga qaytarish"/>}{role === 'REGIONAL' && <ActionButton busy={busy} onClick={() => act('FORWARD_TO_MINISTRY')} icon={<ArrowRight size={14}/>} label="Vazirlikka yuborish"/>}<ActionButton busy={busy} onClick={() => act('COMPLETE')} icon={<Check size={14}/>} label="Yakunlash"/>{!['COMPLETED', 'REJECTED'].includes(thread.status) && <ActionButton busy={busy} disabled={!decisionNote.trim()} onClick={() => act('REJECT')} label="Rad etish" danger/>}</div></div>}
    {!isClosed && <form onSubmit={sendMessage}><MessageForm body={body} setBody={setBody} files={files} setFiles={setFiles} busy={busy} submitLabel="Xabar yuborish"/></form>}
    {isClosed && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Bu hujjat oqimi yakunlangan. Yangi hujjat kerak bo‘lsa, alohida yozuv oching.</p>}
  </article>
}

function MessageForm({ body, setBody, files, setFiles, busy, submitLabel }: { body: string; setBody: (value: string) => void; files: File[]; setFiles: (value: File[]) => void; busy: boolean; submitLabel: string }) {
  return <div className="grid gap-3"><label className="block text-xs font-semibold text-slate-600">Xabar<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={10000} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Izoh yoki hujjat bo‘yicha xabar yozing"/></label><div className="flex flex-wrap items-center justify-between gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><FileUp size={15}/>Fayl biriktirish<input type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png" className="sr-only" onChange={(event) => { const selected = Array.from(event.target.files || []); setFiles([...files, ...selected].slice(0, 10)); event.currentTarget.value = '' }}/></label><button disabled={busy || (!body.trim() && !files.length)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"><Send size={15}/>{submitLabel}</button></div>{files.length > 0 && <div className="flex flex-wrap gap-2">{files.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] text-slate-700"><Paperclip size={12}/>{file.name}<button type="button" onClick={() => setFiles(files.filter((_, at) => at !== index))} aria-label={`${file.name} faylini olib tashlash`}><X size={13}/></button></span>)}</div>}</div>
}

function ActionButton({ busy, disabled, onClick, icon, label, danger }: { busy: boolean; disabled?: boolean; onClick: () => void; icon?: React.ReactNode; label: string; danger?: boolean }) {
  return <button type="button" disabled={busy || disabled} onClick={onClick} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold disabled:opacity-40 ${danger ? 'border border-red-200 text-red-700' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{icon}{label}</button>
}
function Loading() { return <div className="flex items-center justify-center gap-2 rounded-xl bg-white p-8 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={17}/>Hujjatlar yuklanmoqda…</div> }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"><MessageSquare className="mx-auto mb-2 text-slate-300" size={22}/>{text}</div> }
