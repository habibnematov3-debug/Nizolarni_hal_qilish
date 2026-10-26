import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Inbox, LoaderCircle } from 'lucide-react'
import { apiGet, apiPatch, apiPost } from './api'

type Notification = {
  id: string
  title: string
  content: string
  channel: string
  status: string
  isRead: boolean
  createdAt: string
  readAt?: string | null
}

type NotificationPage = {
  items: Notification[]
  unreadCount: number
  pagination: { total: number; page: number; limit: number; totalPages: number }
}

type ReadFilter = 'all' | 'unread' | 'read'

export function NotificationsWorkspace({ onToast }: { onToast: (message: string) => void }) {
  const [data, setData] = useState<NotificationPage | null>(null)
  const [filter, setFilter] = useState<ReadFilter>('all')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' })
      if (filter === 'unread') params.set('unreadOnly', 'true')
      if (filter === 'read') params.set('status', 'READ')
      const result = await apiGet<NotificationPage>(`/cabinet/notifications?${params.toString()}`)
      setData(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Bildirishnomalarni yuklab bo‘lmadi.')
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => { void load() }, [load])

  async function markRead(item: Notification) {
    if (item.isRead) return
    setBusyId(item.id)
    try {
      await apiPatch(`/cabinet/notifications/${encodeURIComponent(item.id)}/read`, {})
      await load()
      onToast('Bildirishnoma o‘qilgan deb belgilandi.')
    } catch (cause) {
      onToast(cause instanceof Error ? cause.message : 'Bildirishnomani yangilab bo‘lmadi.')
    } finally {
      setBusyId('')
    }
  }

  async function markAllRead() {
    setBusyId('all')
    try {
      await apiPost('/cabinet/notifications/read-all', {})
      await load()
      onToast('Barcha bildirishnomalar o‘qilgan deb belgilandi.')
    } catch (cause) {
      onToast(cause instanceof Error ? cause.message : 'Bildirishnomalarni yangilab bo‘lmadi.')
    } finally {
      setBusyId('')
    }
  }

  const tabs: { key: ReadFilter; label: string }[] = [
    { key: 'all', label: 'Barchasi' },
    { key: 'unread', label: `O‘qilmagan${data ? ` (${data.unreadCount})` : ''}` },
    { key: 'read', label: 'O‘qilgan' },
  ]

  return <section>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-emerald-700">Kabinet</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Xabarnomalar</h1><p className="mt-2 text-sm text-slate-500">Arizalar, uchrashuvlar va platforma yangiliklari bo‘yicha xabarlar.</p></div>
      <button onClick={() => void markAllRead()} disabled={!data?.unreadCount || busyId === 'all'} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><CheckCheck size={16}/>{busyId === 'all' ? 'Saqlanmoqda…' : 'Barchasini o‘qish'}</button>
    </div>
    <div className="mb-4 flex flex-wrap gap-2">{tabs.map((tab) => <button key={tab.key} onClick={() => { setFilter(tab.key); setPage(1) }} className={`rounded-full px-3.5 py-2 text-xs font-semibold ${filter === tab.key ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{tab.label}</button>)}</div>
    {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span>{error}</span><button onClick={() => void load()} className="shrink-0 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold">Qayta urinish</button></div>}
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
      {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin"/>Yuklanmoqda…</div>
        : !data?.items.length ? <div className="flex flex-col items-center px-6 py-14 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Inbox size={21}/></span><h2 className="mt-4 text-sm font-semibold text-slate-800">Bildirishnomalar yo‘q</h2><p className="mt-1 text-xs text-slate-500">Yangi xabarlar shu yerda ko‘rinadi.</p></div>
          : <div className="divide-y divide-slate-100">{data.items.map((item) => <article key={item.id} className={`flex gap-3 p-4 sm:p-5 ${item.isRead ? '' : 'bg-emerald-50/40'}`}><span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.isRead ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-800'}`}><Bell size={17}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>{!item.isRead && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Yangi</span>}</div><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.content}</p><p className="mt-2 text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString('uz-UZ')} · {item.channel}</p></div>{!item.isRead && <button onClick={() => void markRead(item)} disabled={busyId === item.id} className="h-9 shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{busyId === item.id ? '…' : 'O‘qildi'}</button>}</article>)}</div>}
      {data && data.pagination.totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500"><span>{data.pagination.total} ta xabar · {data.pagination.page}/{data.pagination.totalPages}</span><div className="flex gap-2"><button aria-label="Oldingi sahifa" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft size={15}/></button><button aria-label="Keyingi sahifa" disabled={page >= data.pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight size={15}/></button></div></div>}
    </div>
  </section>
}
