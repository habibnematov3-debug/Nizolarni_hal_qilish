import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, FileDown, FileUp, LoaderCircle, MapPin, Phone, Search, X } from 'lucide-react'
import { apiDownload, apiGet, apiGetPublic, apiUpload, getAccessToken } from './api'

type RegistryEntry = {
  id: string
  registryNumber?: string | null
  type: string
  fullName: string
  phone?: string | null
  address?: string | null
  region: string
  specialization?: string[]
  status?: string
  photoUrl?: string | null
  certificateNumber?: string | null
  registeredAt?: string | null
  rating?: { score?: number | string } | null
  latitude?: number | null
  longitude?: number | null
  gender?: string | null
  birthDate?: string | null
}

type RegistryPage = { items: RegistryEntry[]; pagination: { page: number; totalPages: number; total: number } }
type DemoRegistryEntry = { id: string; name: string; specialty: string; region: string; experience: string; rating: string; status: string; initials: string }
type MapPoint = Pick<RegistryEntry, 'id' | 'fullName' | 'region' | 'latitude' | 'longitude' | 'phone' | 'address' | 'specialization'>

const registryTypes = [
  ['Mediatorlar', 'MEDIATOR'],
  ['Hakamlik sudyalari', 'ARBITRATION_JUDGE'],
  ['Arbitrlar', 'ARBITRATOR'],
] as const
const regions = ['Qoraqalpog‘iston Respublikasi', 'Andijon viloyati', 'Buxoro viloyati', 'Farg‘ona viloyati', 'Jizzax viloyati', 'Xorazm viloyati', 'Namangan viloyati', 'Navoiy viloyati', 'Qashqadaryo viloyati', 'Samarqand viloyati', 'Surxondaryo viloyati', 'Sirdaryo viloyati', 'Toshkent shahri', 'Toshkent viloyati']
const emptyPage: RegistryPage = { items: [], pagination: { page: 1, totalPages: 1, total: 0 } }

export function PublicRegistryDirectory({
  registryKind,
  setRegistryKind,
  query,
  setQuery,
  region,
  setRegion,
  onLogin,
  onContact,
}: {
  registryKind: string
  setRegistryKind: (value: string) => void
  query: string
  setQuery: (value: string) => void
  region: string
  setRegion: (value: string) => void
  onLogin: () => void
  onContact: (name: string) => void
}) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<RegistryPage>(emptyPage)
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([])
  const [mapOpen, setMapOpen] = useState(false)
  const [selected, setSelected] = useState<RegistryEntry | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const type = registryTypes.find(([label]) => label === registryKind)?.[1] || 'MEDIATOR'

  useEffect(() => { setPage(1) }, [query, region, type])
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ type, page: String(page), limit: '12' })
    if (query.trim()) params.set('search', query.trim())
    if (region !== 'Barcha hududlar') params.set('region', region)
    apiGetPublic<RegistryPage>(`/public/mediators?${params.toString()}`)
      .then((result) => { if (active) setData(result || emptyPage) })
      .catch((cause) => { if (active) { setData(emptyPage); setError(cause instanceof Error ? cause.message : 'Reyestrni yuklab bo‘lmadi.') } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, query, region, type])
  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ type })
    if (query.trim()) params.set('search', query.trim())
    if (region !== 'Barcha hududlar') params.set('region', region)
    apiGetPublic<MapPoint[]>(`/public/mediators/map?${params.toString()}`)
      .then((points) => { if (active) setMapPoints(points || []) })
      .catch(() => { if (active) setMapPoints([]) })
    return () => { active = false }
  }, [query, region, type])

  const title = registryKind
  const selectedType = registryTypes.find(([label]) => label === registryKind)?.[1]
  const typeLabel = (value: string) => registryTypes.find(([, code]) => code === value)?.[0] || value

  return <section className="min-h-[calc(100vh-130px)] bg-slate-50 px-4 py-8 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Ochiq ma’lumotlar</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Faol reyestrdan mutaxassisni F.I.Sh. va hudud bo‘yicha qidiring.</p></div>
        <button onClick={onLogin} className="inline-flex h-11 items-center gap-2 rounded-md bg-blue-800 px-5 text-sm font-semibold text-white hover:bg-blue-900">Kabinetga kirish</button>
      </div>
      <div className="mt-7 flex flex-wrap gap-2" role="tablist" aria-label="Reyestr turi">{registryTypes.map(([label]) => <button role="tab" aria-selected={registryKind === label} key={label} onClick={() => setRegistryKind(label)} className={`rounded-full px-4 py-2 text-xs font-semibold ${registryKind === label ? 'bg-blue-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{label}</button>)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_260px_auto]">
        <label className="relative"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="F.I.Sh. yoki kalit so‘z" className="h-12 w-full rounded-md border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"/></label>
        <select aria-label="Hudud" value={region} onChange={(event) => setRegion(event.target.value)} className="h-12 rounded-md border border-slate-300 bg-white px-4 text-sm outline-none"><option>Barcha hududlar</option>{regions.map((item) => <option key={item}>{item}</option>)}</select>
        <button onClick={() => setMapOpen((open) => !open)} className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><MapPin size={16}/>{mapOpen ? 'Ro‘yxatni ko‘rish' : 'Xaritani ko‘rish'}</button>
      </div>
      {error && <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
      {mapOpen && <div className="mt-5 grid gap-4 rounded-2xl bg-slate-950 p-4 text-white sm:p-6 lg:grid-cols-[1.25fr_.75fr]">
        <div className="overflow-hidden rounded-xl bg-[#dcebf0]"><svg viewBox="0 0 1000 600" role="img" aria-label={`${typeLabel(selectedType || 'MEDIATOR')} manzillari xaritasi`} className="block h-[280px] w-full sm:h-[390px]"><rect width="1000" height="600" fill="#dcebf0"/><path d="M94 241 L142 179 L218 159 L278 184 L351 144 L420 162 L477 127 L559 158 L631 145 L701 180 L776 170 L844 206 L817 247 L880 273 L843 315 L882 354 L829 377 L806 425 L757 417 L725 455 L676 448 L647 483 L592 467 L551 442 L489 451 L433 431 L389 452 L343 423 L297 428 L260 399 L208 403 L172 376 L129 367 L151 330 L112 306 L135 275 Z" fill="#f3ead6" stroke="#fff" strokeWidth="8" strokeLinejoin="round"/>{mapPoints.filter((point) => point.latitude != null && point.longitude != null).map((point) => { const x = 94 + (((point.longitude || 0) - 55.5) / 19) * 790; const y = 127 + ((46.5 - (point.latitude || 0)) / 10) * 350; return <g key={point.id} role="button" tabIndex={0} aria-label={`${point.fullName}, ${point.region}`} onClick={() => setSelectedPoint(point)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedPoint(point) }} className="cursor-pointer"><circle cx={x} cy={y} r="13" fill={selectedPoint?.id === point.id ? '#f59e0b' : '#0875cf'} stroke="#fff" strokeWidth="4"/><title>{point.fullName}</title></g> })}</svg></div>
        <div className="flex min-h-52 flex-col rounded-xl bg-white/[.07] p-4">{selectedPoint ? <><p className="text-xs font-semibold uppercase text-amber-300">Tanlangan mutaxassis</p><h2 className="mt-3 text-lg font-semibold">{selectedPoint.fullName}</h2><p className="mt-1 text-sm text-blue-100/75">{selectedPoint.region}</p><p className="mt-3 text-xs text-blue-100/70">{selectedPoint.address || 'Manzil ko‘rsatilmagan'}</p>{selectedPoint.phone && <a className="mt-2 inline-flex items-center gap-2 text-xs text-amber-200" href={`tel:${selectedPoint.phone}`}><Phone size={13}/>{selectedPoint.phone}</a>}<a className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-amber-300" href={`https://www.openstreetmap.org/?mlat=${selectedPoint.latitude}&mlon=${selectedPoint.longitude}#map=12/${selectedPoint.latitude}/${selectedPoint.longitude}`} target="_blank" rel="noreferrer">Xaritada ochish<ArrowUpRight size={14}/></a></> : <><p className="text-xs font-semibold uppercase text-amber-300">Interaktiv xarita</p><p className="mt-3 text-sm leading-6 text-blue-100/75">{mapPoints.length} ta koordinatali manzil. Belgini tanlab mutaxassis ma’lumotini ko‘ring.</p><p className="mt-3 text-xs text-blue-100/60">Xaritada ko‘rinish uchun reyestr yozuvida koordinatalar bo‘lishi kerak.</p></>}</div>
      </div>}
      {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18}/>Reyestr yuklanmoqda…</div> : mapOpen ? null : <>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{data.pagination.total} ta natija</span><span>Faol reyestr · {typeLabel(selectedType || 'MEDIATOR')}</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((person) => <article key={person.id} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{person.fullName}</h2><p className="mt-1 text-xs text-slate-500">{person.region}</p></div><span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-800">Faol</span></div><p className="mt-4 min-h-10 text-sm text-slate-700">{person.specialization?.join(', ') || 'Ixtisoslik ko‘rsatilmagan'}</p><p className="mt-3 text-xs text-slate-500">Reyestr raqami: {person.registryNumber || '—'}{person.rating?.score != null ? ` · Reyting ${Number(person.rating.score).toFixed(1)}` : ''}</p><div className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><button onClick={() => setSelected(person)} className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Profil</button><button onClick={() => type === 'MEDIATOR' ? onContact(person.fullName) : onLogin()} className="flex-1 rounded-lg bg-blue-800 py-2 text-xs font-semibold text-white hover:bg-blue-900">{type === 'MEDIATOR' ? 'Murojaat' : 'Kabinetga kirish'}</button></div></article>)}</div>
        {!data.items.length && !error && <div className="mt-4 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Reyestrda mos mutaxassis topilmadi.</div>}
        <div className="mt-5 flex items-center justify-between"><button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold disabled:opacity-40"><ArrowLeft size={14}/>Oldingi</button><span className="text-xs text-slate-500">{data.pagination.page} / {Math.max(1, data.pagination.totalPages)}</span><button disabled={page >= data.pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold disabled:opacity-40">Keyingi<ArrowRight size={14}/></button></div>
      </>}
      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><section role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><button onClick={() => setSelected(null)} aria-label="Yopish" className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Ochiq reyestr profili</p><h2 className="mt-2 pr-8 text-xl font-semibold">{selected.fullName}</h2><p className="mt-1 text-sm text-slate-500">{typeLabel(selected.type)} · {selected.region}</p><div className="mt-5 space-y-3 text-sm"><p><strong>Reyestr raqami:</strong> {selected.registryNumber || '—'}</p><p><strong>Ixtisoslik:</strong> {selected.specialization?.join(', ') || 'Ko‘rsatilmagan'}</p><p><strong>Manzil:</strong> {selected.address || 'Ko‘rsatilmagan'}</p><p><strong>Guvohnoma:</strong> {selected.certificateNumber || '—'}</p>{selected.phone && <a className="inline-flex items-center gap-2 text-blue-800" href={`tel:${selected.phone}`}><Phone size={15}/>{selected.phone}</a>}</div></section></div>}
    </div>
  </section>
}

export function StaffRegistryWorkspace({ demoRows, onToast }: { demoRows: DemoRegistryEntry[]; onToast: (message: string) => void }) {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('')
  const [gender, setGender] = useState('')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<RegistryPage>(emptyPage)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<RegistryEntry | null>(null)
  const authenticated = Boolean(getAccessToken())
  const params = useMemo(() => {
    const next = new URLSearchParams({ type: 'MEDIATOR', page: String(page), limit: '20' })
    if (query.trim()) next.set('search', query.trim())
    if (region) next.set('region', region)
    if (gender) next.set('gender', gender)
    if (ageMin) next.set('ageMin', ageMin)
    if (ageMax) next.set('ageMax', ageMax)
    return next
  }, [page, query, region, gender, ageMin, ageMax])
  const demoFiltered = useMemo(() => demoRows.filter((row) => (!query || [row.name, row.region, row.specialty].join(' ').toLocaleLowerCase('uz').includes(query.toLocaleLowerCase('uz'))) && (!region || row.region === region)), [demoRows, query, region])

  const reload = () => {
    if (!authenticated) return
    setLoading(true)
    setError('')
    apiGet<RegistryPage>(`/staff/registry/mediators?${params.toString()}`)
      .then(setData)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Reyestrni yuklab bo‘lmadi.'))
      .finally(() => setLoading(false))
  }
  useEffect(reload, [authenticated, params.toString()])

  const importExcel = async (file?: File) => {
    if (!file) return
    try {
      const result = await apiUpload<{ imported: number; errors?: { row: number; reason: string }[] }>('/staff/registry/imports', 'file', file)
      onToast(`${result.imported} ta reyestr yozuvi import qilindi${result.errors?.length ? `, ${result.errors.length} ta qator xatosi bor` : ''}`)
      reload()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Excel import bajarilmadi.') }
  }

  const rows: RegistryEntry[] = authenticated ? data.items : demoFiltered.map((row) => ({ id: row.id, registryNumber: row.id, fullName: row.name, type: 'MEDIATOR', region: row.region, specialization: [row.specialty], status: row.status, rating: { score: row.rating }, phone: null, address: null, gender: null, birthDate: null }))
  const queryString = params.toString()

  return <>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_220px_150px]">
      <label className="relative"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="F.I.Sh. yoki reyestr raqami" className="form-control pl-10"/></label>
      <select aria-label="Hudud" value={region} onChange={(event) => setRegion(event.target.value)} className="form-control"><option value="">Barcha hududlar</option>{regions.map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="Jinsi" value={gender} onChange={(event) => setGender(event.target.value)} className="form-control"><option value="">Jinsi: barchasi</option><option value="MALE">Erkak</option><option value="FEMALE">Ayol</option></select>
    </div>
    <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap gap-3"><label className="text-xs font-semibold text-slate-600">Yoshdan<input type="number" min="18" max="100" value={ageMin} onChange={(event) => setAgeMin(event.target.value)} className="form-control mt-1 w-28" placeholder="18"/></label><label className="text-xs font-semibold text-slate-600">Yoshgacha<input type="number" min="18" max="100" value={ageMax} onChange={(event) => setAgeMax(event.target.value)} className="form-control mt-1 w-28" placeholder="100"/></label></div>
      {authenticated ? <div className="flex flex-wrap gap-2"><button onClick={() => void apiDownload('/staff/registry/imports/template', 'registry-import-template.xlsx').catch((cause) => setError(cause instanceof Error ? cause.message : 'Shablon yuklanmadi.'))} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"><FileDown size={15}/>Import shabloni</button><label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"><FileUp size={15}/>Excel import<input className="sr-only" type="file" accept=".xlsx,.xls" onChange={(event) => { void importExcel(event.target.files?.[0]); event.currentTarget.value = '' }}/></label><button onClick={() => void apiDownload(`/staff/registry/export?${queryString}`, 'registry.xlsx').catch((cause) => setError(cause instanceof Error ? cause.message : 'Eksport bajarilmadi.'))} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white"><FileDown size={15}/>Excel eksport</button></div> : <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Demo ko‘rinish: Excel amallari uchun vakolatli xodim sifatida kiring.</span>}
    </div>
    {error && <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</div>}
    {loading ? <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={17}/>Ichki reyestr yuklanmoqda…</div> : <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">{rows.length ? <div className="divide-y divide-slate-100">{rows.map((row) => <article key={row.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold">{row.fullName}</p><p className="mt-1 text-xs text-slate-500">{row.specialization?.join(', ') || 'Ixtisoslik yo‘q'} · {row.region}</p><p className="mt-1 text-[11px] text-slate-400">{row.registryNumber || row.id} · {row.status || 'Faol'}</p></div><div className="flex items-center gap-2"><span className="text-xs text-slate-500">★ {row.rating?.score != null ? Number(row.rating.score).toFixed(1) : '—'}</span><button onClick={() => setSelected(row)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Tafsilotlar</button></div></article>)}</div> : <div className="p-10 text-center text-sm text-slate-500">Mos mediator topilmadi.</div>}{authenticated && <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs text-slate-500"><span>{data.pagination.total} ta yozuv</span><div className="flex items-center gap-3"><button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="disabled:opacity-40">Oldingi</button><span>{data.pagination.page} / {Math.max(1, data.pagination.totalPages)}</span><button disabled={page >= data.pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="disabled:opacity-40">Keyingi</button></div></div>}</div>}
    {!authenticated && <p className="mt-2 text-right text-[11px] text-slate-400">Namuna ma’lumotlar</p>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><section role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-2xl bg-white p-6"><button onClick={() => setSelected(null)} aria-label="Yopish" className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button><h2 className="pr-8 text-xl font-semibold">{selected.fullName}</h2><p className="mt-1 text-sm text-slate-500">{selected.region}</p><div className="mt-4 space-y-2 text-sm"><p><strong>Reyestr raqami:</strong> {selected.registryNumber || '—'}</p><p><strong>Jinsi:</strong> {selected.gender || '—'}</p><p><strong>Tug‘ilgan sana:</strong> {selected.birthDate ? new Date(selected.birthDate).toLocaleDateString('uz-UZ') : '—'}</p><p><strong>Ixtisoslik:</strong> {selected.specialization?.join(', ') || '—'}</p><p><strong>Telefon:</strong> {selected.phone || '—'}</p><p><strong>Manzil:</strong> {selected.address || '—'}</p></div></section></div>}
  </>
}
