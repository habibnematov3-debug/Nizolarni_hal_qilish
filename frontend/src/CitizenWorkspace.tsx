import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Bell, CalendarDays, CheckCircle2, LoaderCircle, Save, UserRound } from 'lucide-react'
import { apiGet, apiPatch, getAccessToken } from './api'

type CitizenProfile = {
  id: string
  fullName: string
  pinfl?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notificationChannels?: string[]
}

type Obligation = {
  id: string
  agreementId: string
  description: string
  dueDate: string
  responsiblePartyName: string
  status: string
  completedAt?: string | null
  region?: string | null
}

export function CitizenProfileWorkspace({ onToast }: { onToast: (message: string) => void }) {
  const [profile, setProfile] = useState<CitizenProfile | null>(null)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [channels, setChannels] = useState<string[]>(['CABINET', 'SMS'])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getAccessToken()) { setLoading(false); setError('Profil sozlamalarini serverda saqlash uchun OneID yoki ERI orqali kiring.'); return }
    let cancelled = false
    apiGet<CitizenProfile>('/cabinet/profile').then((item) => {
      if (cancelled) return
      setProfile(item); setPhone(item.phone || ''); setEmail(item.email || ''); setAddress(item.address || '')
      const supportedChannels = (item.notificationChannels || []).filter((channel) => ['CABINET', 'SMS'].includes(channel))
      setChannels(supportedChannels.length ? supportedChannels : ['CABINET', 'SMS'])
    }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Profilni yuklab bo‘lmadi.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const updated = await apiPatch<CitizenProfile>('/cabinet/profile', { phone, email: email || undefined, address })
      setProfile(updated); onToast('Aloqa ma’lumotlari saqlandi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Profil saqlanmadi.') }
    finally { setBusy(false) }
  }

  const saveChannels = async () => {
    if (!channels.length) { setError('Kamida bitta xabarnoma kanalini tanlang.'); return }
    setBusy(true); setError('')
    try {
      const updated = await apiPatch<CitizenProfile>('/cabinet/profile', { notificationChannels: channels })
      setProfile(updated); onToast('Xabarnoma kanallari saqlandi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Xabarnoma sozlamalari saqlanmadi.') }
    finally { setBusy(false) }
  }

  const toggleChannel = (channel: string) => setChannels((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel])

  return <section>
    <header className="mb-6"><p className="text-xs font-semibold uppercase tracking-[.14em] text-emerald-700">Fuqaro kabineti</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Shaxsiy ma’lumotlar</h1><p className="mt-2 text-sm text-slate-500">OneID orqali tasdiqlangan shaxsiy ma’lumotlarni ko‘ring, aloqa ma’lumotlarini va xabarnoma kanallarini boshqaring.</p></header>
    {error && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
    {loading ? <div className="flex items-center justify-center gap-2 rounded-xl bg-white p-10 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin"/>Profil yuklanmoqda…</div> : profile && <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><UserRound size={19}/></span><div><h2 className="text-sm font-semibold text-slate-900">Tasdiqlangan profil</h2><p className="mt-1 text-xs text-slate-500">OneID ma’lumotlarini foydalanuvchi tahrirlay olmaydi.</p></div></div>
        <dl className="mb-6 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><ProfileValue label="F.I.Sh." value={profile.fullName}/><ProfileValue label="JSHSHIR / PINFL" value={profile.pinfl || 'OneID ma’lumoti kutilmoqda'}/></dl>
        <form onSubmit={saveProfile} className="space-y-4"><h3 className="text-sm font-semibold text-slate-900">Aloqa ma’lumotlari</h3><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-600">Telefon raqami<input required type="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} className="form-control mt-1.5" placeholder="+998 90 123 45 67"/></label><label className="block text-xs font-semibold text-slate-600">Elektron pochta<input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="form-control mt-1.5" placeholder="name@example.uz"/></label></div><label className="block text-xs font-semibold text-slate-600">Yashash manzili<textarea maxLength={1000} value={address} onChange={(event) => setAddress(event.target.value)} className="form-control mt-1.5 min-h-20" placeholder="Viloyat, tuman, ko‘cha va uy"/></label><button disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"><Save size={15}/>Aloqa ma’lumotlarini saqlash</button></form>
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800"><Bell size={18}/></span><div><h2 className="text-sm font-semibold text-slate-900">Bildirishnoma kanallari</h2><p className="mt-1 text-xs text-slate-500">Qaysi usulda xabar olishni tanlang.</p></div></div>
        <div className="space-y-2">{[['CABINET', 'Kabinet ichidagi xabarlar', 'Har doim platformada ko‘rinadi'], ['SMS', 'SMS-xabarnoma', 'Telefon raqamingizga yuboriladi']].map(([key, title, detail]) => <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50"><input type="checkbox" checked={channels.includes(key)} onChange={() => toggleChannel(key)} className="mt-1 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"/><span><strong className="block text-sm font-medium text-slate-800">{title}</strong><span className="mt-1 block text-xs text-slate-500">{detail}</span></span></label>)}</div>
        {!channels.length && <p className="mt-2 text-xs text-red-700">Kamida bitta xabarnoma kanalini yoqing.</p>}
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Email, push-xabarnoma va Adliya Plus mobil ilovasi provayderlari hozircha ulanmagan.</p><button disabled={busy || !channels.length} onClick={() => void saveChannels()} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"><Save size={15}/>Kanallarni saqlash</button>
      </section>
    </div>}
  </section>
}

export function ObligationMonitoringWorkspace({ onToast }: { onToast: (message: string) => void }) {
  const [items, setItems] = useState<Obligation[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (!getAccessToken()) { setItems([]); setLoading(false); setError('Kelishuv ijrosini kuzatish uchun OneID yoki ERI orqali kiring.'); return }
    setLoading(true); setError('')
    try { setItems(await apiGet<Obligation[]>('/cabinet/monitoring/obligations')) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Majburiyatlarni yuklab bo‘lmadi.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 30_000); return () => window.clearInterval(timer) }, [load])

  const complete = async (item: Obligation) => {
    setBusyId(item.id); setError('')
    try { await apiPatch(`/cabinet/monitoring/obligations/${encodeURIComponent(item.id)}/complete`, {}); await load(); onToast('Majburiyat bajarilgan deb belgilandi.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Holatni yangilab bo‘lmadi.') }
    finally { setBusyId('') }
  }

  const statusLabel = (status: string) => ({ PENDING: 'Bajarilishi kutilmoqda', DUE_SOON: 'Muddat yaqinlashdi', OVERDUE: 'Muddati o‘tgan', COMPLETED: 'Bajarildi' } as Record<string, string>)[status] || status
  return <section><header className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-emerald-700">Fuqaro kabineti</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Kelishuvlar ijrosi</h1><p className="mt-2 text-sm text-slate-500">Mediativ kelishuv va qarorlardagi majburiyatlar hamda ularning muddatlari.</p></div><button onClick={() => void load()} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">Yangilash</button></header>
    {error && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
    {loading ? <div className="flex items-center justify-center gap-2 rounded-xl bg-white p-10 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin"/>Majburiyatlar yuklanmoqda…</div> : !items.length ? <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200/70"><CalendarDays className="mx-auto text-slate-300" size={26}/><h2 className="mt-3 text-sm font-semibold text-slate-800">Monitoringdagi majburiyat yo‘q</h2><p className="mt-1 text-xs text-slate-500">Kelishuv bo‘yicha muddat va majburiyat mediator tomonidan kiritilganda shu yerda ko‘rinadi.</p></div> : <div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800' : item.status === 'OVERDUE' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>{statusLabel(item.status)}</span><span className="text-xs text-slate-400">Ish № {item.agreementId}</span></div><h2 className="mt-3 text-sm font-semibold text-slate-900">{item.description}</h2><p className="mt-1 text-xs text-slate-500">Mas’ul taraf: {item.responsiblePartyName} · Muddat: {new Date(item.dueDate).toLocaleDateString('uz-UZ')}{item.region ? ` · ${item.region}` : ''}</p></div>{item.status !== 'COMPLETED' && <button disabled={busyId === item.id} onClick={() => void complete(item)} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50"><CheckCircle2 size={15}/>{busyId === item.id ? 'Saqlanmoqda…' : 'Bajarildi deb belgilash'}</button>}</div></article>)}</div>}
  </section>
}

function ProfileValue({ label, value }: { label: string; value: string }) { return <div><dt className="text-[11px] text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd></div> }
