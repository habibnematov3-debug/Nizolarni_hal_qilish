import { FormEvent, useCallback, useEffect, useState } from 'react'
import { BookOpen, ExternalLink, FilePlus2, LoaderCircle, Newspaper, Pencil, Send, Trash2 } from 'lucide-react'
import { apiDelete, apiGet, apiGetPublic, apiPost, apiPut } from './api'

type ContentType = 'news' | 'legal_framework' | 'templates' | 'faq' | 'manuals' | 'video_manuals' | 'announcements' | 'mandatory_mediation'
type ContentItem = {
  id: string
  type: ContentType
  titleUz: string
  summaryUz?: string | null
  bodyUz?: string | null
  fileUrl?: string | null
  videoUrl?: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  publishedAt?: string | null
  createdAt?: string
}
type ContentList = { items: ContentItem[]; pagination?: { total: number; page: number; totalPages: number } }
type ContentDraft = Pick<ContentItem, 'titleUz'> & {
  summaryUz: string
  bodyUz: string
  fileUrl: string
  videoUrl: string
}

const types: { key: ContentType; label: string }[] = [
  { key: 'news', label: 'Yangiliklar' },
  { key: 'legal_framework', label: 'Huquqiy baza' },
  { key: 'templates', label: 'Hujjat namunalari' },
  { key: 'faq', label: 'Savol-javoblar' },
  { key: 'manuals', label: 'Qo‘llanmalar' },
  { key: 'video_manuals', label: 'Video qo‘llanmalar' },
  { key: 'announcements', label: 'E’lonlar' },
  { key: 'mandatory_mediation', label: 'Majburiy mediatsiya toifalari' },
]

const emptyDraft: ContentDraft = { titleUz: '', summaryUz: '', bodyUz: '', fileUrl: '', videoUrl: '' }

export function ContentWorkspace({ role, onToast }: { role: string; onToast: (message: string) => void }) {
  const [type, setType] = useState<ContentType>('news')
  const [items, setItems] = useState<ContentItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<ContentItem | null>(null)
  const [draft, setDraft] = useState<ContentDraft>(emptyDraft)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const canManage = role !== 'REGIONAL'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      const result = canManage
        ? await apiGet<ContentList>(`/admin/content/${type}?${params}`)
        : await apiGetPublic<ContentList>(`/public/content/${type}?${params}`)
      setItems(result.items || [])
      setTotalPages(result.pagination?.totalPages || 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kontentni yuklab bo‘lmadi.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [canManage, page, type])

  useEffect(() => { void load() }, [load])

  function startCreate() {
    setEditing(null)
    setDraft(emptyDraft)
    setFormOpen(true)
  }

  function startEdit(item: ContentItem) {
    setEditing(item)
    setDraft({ titleUz: item.titleUz, summaryUz: item.summaryUz || '', bodyUz: item.bodyUz || '', fileUrl: item.fileUrl || '', videoUrl: item.videoUrl || '' })
    setFormOpen(true)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = { ...draft, fileUrl: draft.fileUrl || undefined, videoUrl: draft.videoUrl || undefined }
      if (editing) await apiPut(`/admin/content/${type}/${encodeURIComponent(editing.id)}`, payload)
      else await apiPost(`/admin/content/${type}`, payload)
      setEditing(null)
      setDraft(emptyDraft)
      setFormOpen(false)
      await load()
      onToast(editing ? 'Kontent saqlandi.' : 'Kontent qo‘shildi.')
    } catch (cause) {
      onToast(cause instanceof Error ? cause.message : 'Kontentni saqlab bo‘lmadi.')
    } finally {
      setSaving(false)
    }
  }

  async function publish(item: ContentItem) {
    try {
      await apiPost(`/admin/content/${type}/${encodeURIComponent(item.id)}/publish`, {})
      await load()
      onToast('Kontent nashr qilindi.')
    } catch (cause) {
      onToast(cause instanceof Error ? cause.message : 'Kontentni nashr qilib bo‘lmadi.')
    }
  }

  async function remove(item: ContentItem) {
    if (!window.confirm(`“${item.titleUz}” yozuvini o‘chirasizmi?`)) return
    try {
      await apiDelete(`/admin/content/${type}/${encodeURIComponent(item.id)}`)
      await load()
      onToast('Kontent o‘chirildi.')
    } catch (cause) {
      onToast(cause instanceof Error ? cause.message : 'Kontentni o‘chirib bo‘lmadi.')
    }
  }

  const activeType = types.find((item) => item.key === type)?.label || 'Kontent'

  return <section>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-emerald-700">Platforma materiallari</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Kontent boshqaruvi</h1><p className="mt-2 text-sm text-slate-500">Yangiliklar, qonunchilik, shablonlar, FAQ, qo‘llanmalar va e’lonlar.</p></div>
      {canManage && <button onClick={startCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"><FilePlus2 size={16}/>Yangi material</button>}
    </div>
    <div className="mb-5 flex flex-wrap gap-2">{types.map((item) => <button key={item.key} onClick={() => { setType(item.key); setPage(1); setEditing(null); setDraft(emptyDraft); setFormOpen(false) }} className={`rounded-full px-3 py-2 text-xs font-semibold ${type === item.key ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{item.label}</button>)}</div>

    {canManage && formOpen && <form onSubmit={(event) => void save(event)} className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold">{editing ? 'Materialni tahrirlash' : 'Yangi material'}</h2><p className="mt-1 text-xs text-slate-500">Bo‘lim: {activeType}</p></div><button type="button" onClick={() => { setEditing(null); setDraft(emptyDraft); setFormOpen(false) }} className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100">Yopish</button></div>
      <div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-medium text-slate-600">Sarlavha (o‘zbekcha)<input required value={draft.titleUz} onChange={(event) => setDraft({ ...draft, titleUz: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500"/></label><label className="text-xs font-medium text-slate-600">Qisqacha mazmun<textarea value={draft.summaryUz} onChange={(event) => setDraft({ ...draft, summaryUz: event.target.value })} rows={2} className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 outline-none focus:border-emerald-500"/></label><label className="text-xs font-medium text-slate-600 md:col-span-2">Matn<textarea value={draft.bodyUz} onChange={(event) => setDraft({ ...draft, bodyUz: event.target.value })} rows={4} className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 outline-none focus:border-emerald-500"/></label><label className="text-xs font-medium text-slate-600">Fayl havolasi<input type="url" value={draft.fileUrl} onChange={(event) => setDraft({ ...draft, fileUrl: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500"/></label><label className="text-xs font-medium text-slate-600">Video havolasi<input type="url" value={draft.videoUrl} onChange={(event) => setDraft({ ...draft, videoUrl: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500"/></label></div>
      <div className="mt-4 flex justify-end"><button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Send size={15}/>{saving ? 'Saqlanmoqda…' : 'Saqlash'}</button></div>
    </form>}

    {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span>{error}</span><button onClick={() => void load()} className="shrink-0 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold">Qayta urinish</button></div>}
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
      {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin"/>Yuklanmoqda…</div> : !items.length ? <div className="flex flex-col items-center px-6 py-14 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><BookOpen size={21}/></span><h2 className="mt-4 text-sm font-semibold text-slate-800">{activeType} bo‘limida material yo‘q</h2><p className="mt-1 text-xs text-slate-500">Yangi material qo‘shilgach, ro‘yxatda ko‘rinadi.</p></div> : <div className="divide-y divide-slate-100">{items.map((item) => <article key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:p-5"><span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 sm:flex"><Newspaper size={18}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-slate-900">{item.titleUz}</h2><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : item.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>{item.status === 'PUBLISHED' ? 'Nashr qilingan' : item.status === 'ARCHIVED' ? 'Arxivlangan' : 'Qoralama'}</span></div>{item.summaryUz && <p className="mt-1 text-sm text-slate-600">{item.summaryUz}</p>}<p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.bodyUz}</p><div className="mt-2 flex flex-wrap gap-3">{item.fileUrl && <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">Faylni ochish<ExternalLink size={12}/></a>}{item.videoUrl && <a href={item.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">Videoni ochish<ExternalLink size={12}/></a>}</div></div>{canManage && <div className="flex shrink-0 gap-2">{item.status !== 'PUBLISHED' && <button onClick={() => void publish(item)} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50">Nashr</button>}<button onClick={() => startEdit(item)} aria-label="Tahrirlash" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Pencil size={15}/></button><button onClick={() => void remove(item)} aria-label="O‘chirish" className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"><Trash2 size={15}/></button></div>}</article>)}</div>}
      {totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500"><span>{page}/{totalPages} sahifa</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Oldingi</button><button disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Keyingi</button></div></div>}
    </div>
  </section>
}
