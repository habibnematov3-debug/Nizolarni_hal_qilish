import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Activity, AlertCircle, ArrowRight, BookOpen, Building2, Check, ClipboardList, FileCheck2, FileDown, Gavel, GraduationCap, Landmark, LoaderCircle, Search, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { apiDownload, apiGet, apiPut, getAccessToken } from './api'

type OfficeRole = 'COMMISSION' | 'REGIONAL' | 'MINISTRY'
type OfficeUser = { id: string; username: string; fullName: string; status: string; roles: { id: string; name: string; displayName: string }[]; organization?: { name?: string; region?: string } | null }
type Stats = { total?: number; active?: number; completed?: number; incomplete?: number; reportCount?: number; totals?: Record<string, number>; byStatus?: Record<string, number> }
type OfficeRegistryEntry = { id: string; registryNumber?: string | null; type: string; fullName: string; region: string; specialization?: string[]; status?: string; certificateExpiresAt?: string | null }
type OfficeRegistryResponse = { items: OfficeRegistryEntry[]; pagination?: { page: number; totalPages: number; total: number } }
type Permission = { id: string; code: string; name: string; module: string }
type PermissionRole = { id: string; name: string; displayName: string; description?: string | null; permissions: { permission: Permission }[] }

export function JusticeOfficeDashboard({ role, page }: { role: OfficeRole; page: string }) {
  const [stats, setStats] = useState<Record<string, number | string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const authenticated = Boolean(getAccessToken())
  const ministry = role === 'MINISTRY'
  const commission = role === 'COMMISSION'
  const title = commission ? 'Malaka komissiyasi ish maydoni' : ministry ? 'Respublika monitoringi' : 'Hududiy monitoring'
  const description = commission ? 'Nomzodlar, elektron imtihonlar va komissiya baholashlari.' : ministry ? 'Reyestr, ijro va hisobot ko‘rsatkichlari respublika kesimida.' : 'O‘z hududingizdagi reyestr, ijro va mediatorlar hisobotlari.'

  useEffect(() => {
    if (!authenticated) return
    let active = true
    setLoading(true); setError('')
    const requests = commission
      ? [apiGet<any[]>('/committee/mk/applications').then((rows) => ({ 'Ko‘rib chiqilayotgan arizalar': rows.length })), apiGet<any[]>('/committee/mk/exams').then((rows) => ({ 'Biriktirilgan imtihonlar': rows.length })), apiGet<{ items: unknown[] }>('/staff/training/qualified?page=1&limit=100').then((data) => ({ 'Malaka reyestridagi mutaxassislar': data.items?.length || 0 }))]
      : ministry
        ? [apiGet<Stats>('/staff/registry/statistics').then((data) => ({ 'Reyestrdagi mutaxassislar': data.total || 0, 'Faol mutaxassislar': data.active || 0 })), apiGet<Stats>('/ministry/monitoring/statistics').then((data) => ({ 'Ijro monitoringidagi ishlar': data.total || 0, 'Ijro etilgan': data.completed || 0, 'Ijrosi kutilayotgan': data.incomplete || 0 })), apiGet<Stats>('/cabinet/mts/staff/monitoring').then((data) => ({ 'Mediatsiya arizalari': data.total || 0, 'Faol mediatsiyalar': data.active || 0, 'Yakunlangan mediatsiyalar': data.completed || 0 })), apiGet<Stats>('/ministry/analytics').then((data) => ({ 'Hududiy hisobotlar': data.reportCount || 0, ...Object.fromEntries(Object.entries(data.totals || {}).slice(0, 2)) }))]
        : [apiGet<Stats>('/staff/registry/statistics').then((data) => ({ 'Hududiy reyestr': data.total || 0, 'Faol mutaxassislar': data.active || 0 })), apiGet<Stats>('/ministry/monitoring/statistics').then((data) => ({ 'Ijro monitoringidagi ishlar': data.total || 0, 'Ijro etilgan': data.completed || 0, 'Ijrosi kutilayotgan': data.incomplete || 0 })), apiGet<Stats>('/cabinet/mts/staff/monitoring').then((data) => ({ 'Mediatsiya arizalari': data.total || 0, 'Faol mediatsiyalar': data.active || 0, 'Yakunlangan mediatsiyalar': data.completed || 0 })), apiGet<{ items: unknown[] }>('/staff/reports?page=1&limit=100').then((data) => ({ 'Ko‘rib chiqiladigan hisobotlar': data.items?.length || 0 })), apiGet<{ items: unknown[] }>('/staff/training/overdue?page=1&limit=100').then((data) => ({ 'Malaka muddati o‘tganlar': data.items?.length || 0 }))]
    Promise.allSettled(requests).then((results) => {
      if (!active) return
      const next: Record<string, number | string> = {}
      results.forEach((result) => { if (result.status === 'fulfilled') Object.assign(next, result.value) })
      setStats(next)
      if (results.every((result) => result.status === 'rejected')) setError('Ma’lumotlarni yuklash uchun tegishli rol va ishlayotgan server kerak.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [authenticated, commission, ministry, page])

  const blocks: [string, string, typeof Users, string][] = commission
    ? [['Arizalar va malaka imtihonlari', 'Arizalarni ko‘rib chiqing, imtihon belgilang va elektron byulletenni to‘ldiring.', GraduationCap, 'Nomzodlar'], ['Kurslar va ishtirok nazorati', 'Kurs katalogi va nomzodlarning qatnashuv holati.', BookOpen, 'O‘quv nazorati'], ['Bayonnomalar', 'Yakunlangan imtihonlarning elektron bayonnomalarini yuklab oling.', FileCheck2, 'Bayonnomalar']]
    : ministry
      ? [['Markaziy reyestr', 'Mediator, hakamlik sudyasi va arbitrlar reestri hamda holatlari.', Users, 'Mutaxassislar reyestri'], ['Statistika va hisobotlar', 'Hudud, nizo turi, hal etilish usuli va natijalar bo‘yicha tahlil.', ClipboardList, 'Hisobotlar tahlili'], ['SI yordamchisi', 'Administrativ o‘zgarish uchun topshiriq loyihasini tayyorlang.', Sparkles, 'SI yordamchisi']]
      : [['Hududiy reyestr', 'Hududingizdagi mediatorlar, hakamlik sudyalari va arbitrlar.', Users, 'Mutaxassislar reyestri'], ['Hisobotlar', 'Hududiy hisobotlarni ko‘ring, qaytaring va jamlanma yuboring.', ClipboardList, 'Hisobotlar'], ['Malaka nazorati', 'Hududingizdagi malaka muddati o‘tgan mutaxassislarni ko‘ring.', GraduationCap, 'Malaka nazorati']]

  return <section><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Adliya organlari kabineti</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{page === 'Umumiy ko‘rsatkich' ? title : page}</h1><p className="mt-1.5 text-sm text-slate-500">{description}</p></div>{!authenticated && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Demo kabinetda bu ko‘rsatkichlar serverdan yuklanmaydi. Tegishli xodim roli bilan kiring.</div>}{error && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{(loading ? [['Ma’lumotlar', '…']] : Object.entries(stats)).map(([label, value]) => <article key={label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><Activity size={17} className="text-emerald-700"/></div><p className="mt-3 text-3xl font-semibold">{String(value).padStart(2, '0')}</p><p className="mt-2 text-xs text-slate-400">{ministry ? 'Respublika bo‘yicha' : commission ? 'Komissiya ish oqimi' : 'Biriktirilgan hudud bo‘yicha'}</p></article>)}{!loading && authenticated && !Object.keys(stats).length && <p className="rounded-xl bg-white p-5 text-sm text-slate-500">Ko‘rsatkichlar hozircha mavjud emas.</p>}</div>{ministry && <article className="mt-5 rounded-2xl bg-slate-950 p-5 text-white"><div className="flex items-center gap-2"><Landmark size={19} className="text-emerald-300"/><h2 className="font-semibold">Respublika miqyosidagi nazorat</h2></div><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Hududiy hisobotlar va kelishuvlar ijrosi markaziy ko‘rsatkichlarda jamlanadi. Yozuv tafsilotlari tegishli bo‘limlarda ochiladi.</p></article>}{role === 'REGIONAL' && <article className="mt-5 rounded-2xl bg-slate-950 p-5 text-white"><div className="flex items-center gap-2"><Building2 size={19} className="text-emerald-300"/><h2 className="font-semibold">Hududiy vakolat doirasi</h2></div><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Reyestr, hisobot va malaka ma’lumotlari foydalanuvchi profilidagi hudud bo‘yicha serverda cheklanadi.</p></article>}{commission && <article className="mt-5 rounded-2xl bg-slate-950 p-5 text-white"><div className="flex items-center gap-2"><Gavel size={19} className="text-emerald-300"/><h2 className="font-semibold">Malaka komissiyasi</h2></div><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Nomzodlar, imtihon bayonnomalari va a’zoga biriktirilgan baholash ishlari komissiya menyusida mavjud.</p></article>}<div className="mt-5 grid gap-3 lg:grid-cols-2">{blocks.map(([heading, detail, Icon, target]) => <article key={String(target)} className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Icon size={20}/></span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{heading}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div><span className="text-xs text-slate-400">{String(target)}</span></article>)}</div></section>
}

export function JusticeRegistryWorkspace({ role }: { role: 'REGIONAL' | 'MINISTRY' }) {
  const [type, setType] = useState('MEDIATOR')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<OfficeRegistryResponse>({ items: [], pagination: { page: 1, totalPages: 1, total: 0 } })
  const [totals, setTotals] = useState<Stats>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const authenticated = Boolean(getAccessToken())
  const roleLabel = role === 'MINISTRY' ? 'Respublika reyestri' : 'Hududiy reyestr'
  const typeLabel = type === 'MEDIATOR' ? 'Mediatorlar' : type === 'ARBITRATION_JUDGE' ? 'Hakamlik sudyalari' : 'Arbitrlar'
  const params = useMemo(() => {
    const query = new URLSearchParams({ type, page: String(page), limit: '20' })
    if (search.trim()) query.set('search', search.trim())
    return query.toString()
  }, [page, search, type])

  useEffect(() => { setPage(1) }, [type, search])
  useEffect(() => {
    if (!authenticated) return
    let active = true
    setLoading(true); setError('')
    Promise.all([
      apiGet<OfficeRegistryResponse>(`/staff/registry/mediators?${params}`),
      apiGet<Stats>(`/staff/registry/statistics?type=${encodeURIComponent(type)}`),
    ]).then(([rows, summary]) => {
      if (active) { setData(rows); setTotals(summary) }
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Reyestr ma’lumotlarini yuklab bo‘lmadi.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [authenticated, params, type])

  return <section><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{roleLabel}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Mutaxassislar reyestri</h1><p className="mt-1.5 text-sm text-slate-500">Mediator, hakamlik sudyasi va arbitrlar bo‘yicha vakolat doirasidagi holatlarni ko‘ring.</p></div>{!authenticated && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Reyestr ko‘rsatkichlari uchun adliya xodimi hisobi bilan kiring.</p>}<div className="mb-4 grid gap-3 sm:grid-cols-2"><article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><p className="text-xs text-slate-500">{typeLabel}</p><p className="mt-2 text-2xl font-semibold">{totals.total ?? '—'}</p></article><article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><p className="text-xs text-slate-500">Faol reyestr yozuvlari</p><p className="mt-2 text-2xl font-semibold">{totals.active ?? '—'}</p></article></div><div className="flex flex-wrap items-center gap-2">{[['MEDIATOR','Mediatorlar'],['ARBITRATION_JUDGE','Hakamlik sudyalari'],['ARBITRATOR','Arbitrlar']].map(([value,label]) => <button key={value} onClick={() => setType(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${type === value ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{label}</button>)}</div><div className="mt-3 flex flex-wrap gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} className="form-control min-w-[240px] flex-1" placeholder="F.I.Sh. yoki reyestr raqami"/><button disabled={!authenticated} onClick={() => void apiDownload(`/staff/registry/export?${new URLSearchParams({ type, ...(search.trim() ? { search: search.trim() } : {}) })}`, `reyestr-${type.toLocaleLowerCase('en')}.xlsx`).catch((cause) => setError(cause instanceof Error ? cause.message : 'Excel faylini yuklab bo‘lmadi.'))} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold disabled:opacity-50"><FileDown size={15}/>Excel eksport</button></div>{error && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}{loading ? <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-white p-10 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={17}/>Reyestr yuklanmoqda…</div> : <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70"><div className="divide-y divide-slate-100">{data.items.map((entry) => <article key={entry.id} className="flex flex-wrap items-start justify-between gap-3 p-4"><div><p className="text-sm font-semibold">{entry.fullName}</p><p className="mt-1 text-xs text-slate-500">{entry.specialization?.join(', ') || 'Ixtisoslik ko‘rsatilmagan'} · {entry.region}</p><p className="mt-1 text-[11px] text-slate-400">{entry.registryNumber || entry.id} · {entry.status || 'Holat ko‘rsatilmagan'}{entry.certificateExpiresAt ? ` · Guvohnoma ${new Date(entry.certificateExpiresAt).toLocaleDateString('uz-UZ')} gacha` : ''}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-800">{typeLabel}</span></article>)}{!data.items.length && <p className="p-10 text-center text-sm text-slate-500">Mos reyestr yozuvi topilmadi.</p>}</div><div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs text-slate-500"><span>{data.pagination?.total ?? 0} ta yozuv</span><div className="flex items-center gap-3"><button disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="disabled:opacity-40">Oldingi</button><span>{data.pagination?.page || page} / {Math.max(1, data.pagination?.totalPages || 1)}</span><button disabled={page >= (data.pagination?.totalPages || 1) || loading} onClick={() => setPage((current) => current + 1)} className="disabled:opacity-40">Keyingi</button></div></div></div>}</section>
}

export function MinistryRoleMatrixWorkspace({ onToast }: { onToast: (message: string) => void }) {
  const [roles, setRoles] = useState<PermissionRole[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedCodes, setSelectedCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selected = roles.find((role) => role.id === selectedId)

  useEffect(() => {
    let active = true
    Promise.all([apiGet<PermissionRole[]>('/admin/roles'), apiGet<Permission[]>('/admin/roles/permissions')])
      .then(([roleRows, permissionRows]) => {
        if (!active) return
        const manageable = roleRows.filter((role) => !['ADMIN', 'MINISTRY_STAFF'].includes(role.name))
        setRoles(manageable); setPermissions(permissionRows)
        setSelectedId(manageable[0]?.id || '')
      }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Rollar va huquqlarni yuklab bo‘lmadi.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  useEffect(() => { setSelectedCodes(selected?.permissions.map((item) => item.permission.code) || []) }, [selectedId])

  const save = async () => {
    if (!selected || !selectedCodes.length) return
    setSaving(true); setError('')
    try {
      const updated = await apiPut<PermissionRole>(`/admin/roles/${selected.id}/permissions`, { permissionCodes: selectedCodes })
      setRoles((current) => current.map((role) => role.id === updated.id ? updated : role))
      onToast(`${selected.displayName} vakolatlari yangilandi va audit jurnaliga yozildi.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Vakolatlarni saqlab bo‘lmadi.') }
    finally { setSaving(false) }
  }
  const grouped = useMemo(() => permissions.reduce<Record<string, Permission[]>>((groups, permission) => { (groups[permission.module] ||= []).push(permission); return groups }, {}), [permissions])

  return <section><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Markaziy apparat · vakolatlar</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Huquqlar matritsasi</h1><p className="mt-1.5 text-sm text-slate-500">Tizim rollariga biriktirilgan huquqlarni ko‘rib, o‘zgarishlarni audit jurnaliga yozing.</p></div><div className="mb-5 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900"><ShieldCheck size={16} className="mt-0.5 shrink-0"/><p>Administrator va vazirlikning markaziy rollari himoyalangan. O‘zgarishlar boshqa rollarga ta’sir qiladi va auditda qayd etiladi.</p></div>{error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}{loading ? <div className="flex items-center justify-center gap-2 rounded-xl bg-white p-10 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={17}/>Rollar yuklanmoqda</div> : <div className="grid gap-5 lg:grid-cols-[260px_1fr]"><aside className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70">{roles.map((role) => <button key={role.id} onClick={() => setSelectedId(role.id)} className={`mb-1 flex w-full items-center gap-3 rounded-lg p-3 text-left ${role.id === selectedId ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-slate-50'}`}><ShieldCheck size={17}/><span><strong className="block text-sm">{role.displayName}</strong><span className="text-[11px] text-slate-500">{role.name}</span></span></button>)}</aside><section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4"><div><h2 className="font-semibold">{selected?.displayName || 'Rolni tanlang'}</h2><p className="mt-1 text-xs text-slate-500">{selected?.description || selected?.name}</p></div><button disabled={!selected || saving || !selectedCodes.length} onClick={() => void save()} className="h-10 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Saqlanmoqda…' : 'Vakolatlarni saqlash'}</button></div><div className="mt-4 grid gap-4 md:grid-cols-2">{Object.entries(grouped).map(([module, items]) => <article key={module} className="rounded-xl border border-slate-200 p-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{module}</h3><div className="mt-3 space-y-2">{items.map((permission) => <label key={permission.id} className="flex items-start gap-2 text-xs"><input type="checkbox" checked={selectedCodes.includes(permission.code)} onChange={(event) => setSelectedCodes((current) => event.target.checked ? [...current, permission.code] : current.filter((code) => code !== permission.code))}/><span><strong className="font-medium">{permission.name}</strong><span className="mt-0.5 block text-[10px] text-slate-400">{permission.code}</span></span></label>)}</div></article>)}</div>{!permissions.length && <p className="py-8 text-center text-sm text-slate-500">Vakolatlar katalogida yozuv yo‘q.</p>}</section></div>}</section>
}

export function MinistryAssistantWorkspace({ onToast }: { onToast: (message: string) => void }) {
  const [instruction, setInstruction] = useState('')
  const [proposal, setProposal] = useState<{ id: string; area: string; current: string; proposed: string; status: string; requestedAt: string } | null>(null)
  const generate = (event: FormEvent) => {
    event.preventDefault()
    if (!instruction.trim()) return
    const text = instruction.toLocaleLowerCase('uz')
    const area = /tuman|hudud|klassifikator/.test(text) ? 'Ma’lumotnoma yoki klassifikator' : /hisobot|ustun|statistika/.test(text) ? 'Hisobot va statistika shakli' : /bildirish|xabarnoma/.test(text) ? 'Bildirishnoma matni' : 'Administrativ sozlama'
    setProposal({ id: crypto.randomUUID(), area, current: `Joriy ${area.toLocaleLowerCase('uz')} sozlamasi`, proposed: instruction.trim(), status: 'Qoralama', requestedAt: new Date().toISOString() })
  }
  return <section><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Markaziy apparat · nazoratli o‘zgarish</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">SI yordamchisi</h1><p className="mt-1.5 text-sm text-slate-500">Administrativ topshiriqni tabiiy tilda yozing va o‘zgarish loyihasini ko‘rib chiqing.</p></div><div className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><AlertCircle size={16} className="mt-0.5 shrink-0"/><p>SI xizmati va serverdagi tasdiqlash oqimi backend’da mavjud emas. Qoralama yuborilganda shu brauzerdagi admin navbatiga qo‘shiladi; konfiguratsiyani avtomatik o‘zgartirmaydi.</p></div><form onSubmit={generate} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><label className="block text-sm font-semibold">Topshiriq<textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={4} maxLength={2000} className="form-control mt-2" placeholder="Masalan: reyestr hudud klassifikatoriga yangi tuman qo‘shish"/></label><div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-slate-400">Ma’lumotnoma, hisobot shakli yoki bildirishnoma matni</p><button className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"><Sparkles size={15}/>O‘zgarish loyihasini tayyorlash</button></div></form>{proposal && <article className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-emerald-700">{proposal.area}</p><h2 className="mt-2 font-semibold">Taklif etilayotgan o‘zgarish</h2></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">{proposal.status}</span></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Joriy holat</p><p className="mt-2 text-sm">{proposal.current}</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-800">Taklif</p><p className="mt-2 text-sm">{proposal.proposed}</p></div></div><div className="mt-4 flex gap-2"><button disabled={proposal.status === 'KUTILMOQDA'} onClick={() => { const existing = JSON.parse(localStorage.getItem('nizolar.admin.config-proposals') || '[]') as Array<{ id: string }>; const item = { ...proposal, status: 'KUTILMOQDA' }; localStorage.setItem('nizolar.admin.config-proposals', JSON.stringify([item, ...existing.filter((row) => row.id !== proposal.id)])); setProposal(item); onToast('Taklif admin ko‘rib chiqish navbatiga qo‘shildi (shu brauzer).') }} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold disabled:opacity-50"><Check size={14}/>{proposal.status === 'KUTILMOQDA' ? 'Ko‘rib chiqish kutilmoqda' : 'Ko‘rib chiqishga yuborish'}</button><button onClick={() => { setProposal(null); onToast('Qoralama yopildi.') }} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold">Yopish</button></div></article>}</section>
}

export function MinistryStaffRolesWorkspace({ onToast }: { onToast: (message: string) => void }) {
  const [users, setUsers] = useState<OfficeUser[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selected = users.find((user) => user.id === selectedId)
  const refresh = async () => {
    setLoading(true); setError('')
    try {
      const result = await apiGet<{ items: OfficeUser[] }>(`/admin/users?page=1&limit=100${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`)
      setUsers(result.items || [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Xodimlar ro‘yxatini yuklab bo‘lmadi.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [])
  useEffect(() => { setSelectedRoles((selected?.roles || []).map((role) => role.name).filter((role) => ['REGIONAL_STAFF', 'COMMISSION'].includes(role))) }, [selectedId])
  const assign = async () => {
    if (!selected) return
    const protectedRoles = selected.roles.map((role) => role.name).filter((role) => !['REGIONAL_STAFF', 'COMMISSION'].includes(role))
    setSaving(true); setError('')
    try {
      await apiPut(`/admin/users/${selected.id}/roles`, { roles: [...protectedRoles, ...selectedRoles] })
      await refresh(); onToast('Hududiy adliya/komissiya rollari yangilandi va auditga yozildi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Rollarni saqlab bo‘lmadi.') }
    finally { setSaving(false) }
  }
  const eligible = selected && !selected.roles.some((role) => ['ADMIN', 'MINISTRY_STAFF'].includes(role.name))
  return <section><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Markaziy apparat · xodimlar vakolati</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Xodimlar va rollar</h1><p className="mt-1.5 text-sm text-slate-500">Hududiy adliya va malaka komissiyasi xodimlariga rollarni biriktiring. O‘zgarishlar audit jurnaliga yoziladi.</p></div><div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900">Markaziy apparat roli faqat “Hududiy adliya xodimi” va “Malaka komissiyasi” rollarini boshqarishi mumkin. Administrator va vazirlik rollari himoyalangan.</div>{error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<div className="grid gap-5 lg:grid-cols-[1fr_360px]"><section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex gap-2"><label className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void refresh()} className="form-control pl-9" placeholder="F.I.Sh., username yoki telefon"/></label><button onClick={() => void refresh()} className="rounded-lg border border-slate-200 px-3 text-xs font-semibold">Qidirish</button></div>{loading ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={17}/>Yuklanmoqda</div> : <div className="mt-3 divide-y divide-slate-100">{users.map((user) => <button key={user.id} onClick={() => setSelectedId(user.id)} className={`flex w-full items-center gap-3 py-3 text-left ${selectedId === user.id ? 'text-emerald-800' : ''}`}><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100"><Users size={16}/></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{user.fullName}</strong><span className="mt-1 block truncate text-xs text-slate-500">{user.organization?.name || user.username} · {user.roles.map((role) => role.displayName).join(', ') || 'Rol biriktirilmagan'}</span></span><ArrowRight size={15}/></button>)}{!users.length && <p className="py-8 text-center text-sm text-slate-500">Xodim topilmadi.</p>}</div>}</section><section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><h2 className="font-semibold">Rol biriktirish</h2>{selected ? <><p className="mt-2 text-sm">{selected.fullName}</p><p className="mt-1 text-xs text-slate-500">{selected.organization?.name || selected.username}</p>{eligible ? <div className="mt-5 space-y-3">{[['REGIONAL_STAFF', 'Hududiy adliya xodimi'], ['COMMISSION', 'Malaka komissiyasi']].map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm"><input type="checkbox" checked={selectedRoles.includes(key)} onChange={(event) => setSelectedRoles((roles) => event.target.checked ? [...roles, key] : roles.filter((role) => role !== key))}/>{label}</label>)}<button disabled={saving} onClick={() => void assign()} className="h-10 w-full rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saqlanmoqda…' : 'Rollarni saqlash'}</button></div> : <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">Vazirlik va administrator hisoblari markaziy himoyalangan rollar hisoblanadi.</p>}</> : <p className="mt-3 text-sm text-slate-500">Ro‘yxatdan xodimni tanlang.</p>}</section></div></section>
}
