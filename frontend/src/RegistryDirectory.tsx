import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, FileDown, FileUp, LoaderCircle, MapPin, Phone, Search, X } from 'lucide-react'
import { apiDownload, apiGet, apiGetPublic, apiUpload, getAccessToken } from './api'
import type { PublicMapPoint } from './PublicMediatorMap'

const PublicMediatorMap = lazy(() => import('./PublicMediatorMap').then((module) => ({ default: module.PublicMediatorMap })))

type RegistryEntry = {
  id: string
  registryNumber?: string | null
  rating?: { score?: number | string | null } | null
  type: string
  fullName: string
  phone?: string | null
  email?: string | null
  address?: string | null
  region: string
  specialization?: string[]
  languages?: string[]
  education?: string | null
  status?: string
  registeredAt?: string | null
  statusChangedAt?: string | null
  latitude?: number | null
  longitude?: number | null
  gender?: string | null
  birthDate?: string | null
}

type RegistryPage = { items: RegistryEntry[]; pagination: { page: number; totalPages: number; total: number } }
type DemoRegistryEntry = { id: string; name: string; specialty: string; region: string; experience: string; rating: string; status: string; initials: string }
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
  specialization,
  setSpecialization,
  onLogin,
  onContact,
}: {
  registryKind: string
  setRegistryKind: (value: string) => void
  query: string
  setQuery: (value: string) => void
  region: string
  setRegion: (value: string) => void
  specialization: string
  setSpecialization: (value: string) => void
  onLogin: () => void
  onContact: (name: string, registryId?: string, isSample?: boolean) => void
}) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<RegistryPage>(emptyPage)
  const [mapPoints, setMapPoints] = useState<PublicMapPoint[]>([])
  const [mapOpen, setMapOpen] = useState(false)
  const [selected, setSelected] = useState<RegistryEntry | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<PublicMapPoint | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState('')
  const [status, setStatus] = useState('')
  const type = registryTypes.find(([label]) => label === registryKind)?.[1] || 'MEDIATOR'

  useEffect(() => { setPage(1) }, [query, region, type, specialization, language, status])
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ type, page: String(page), limit: '20' })
    if (query.trim()) params.set('search', query.trim())
    if (region !== 'Barcha hududlar') params.set('region', region)
    if (specialization) params.set('specialization', specialization)
    if (language) params.set('language', language)
    if (status) params.set('status', status)
    apiGetPublic<RegistryPage>(`/public/mediators?${params.toString()}`)
      .then((result) => {
        if (!active) return
        setData(result || emptyPage)
        setError('')
      })
      .catch((cause) => {
        if (!active) return
        setData(emptyPage)
        setError(cause instanceof Error ? cause.message : 'Reyestrni yuklab bo‘lmadi.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, query, region, type, specialization, language, status])
  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ type })
    if (query.trim()) params.set('search', query.trim())
    if (region !== 'Barcha hududlar') params.set('region', region)
    if (specialization) params.set('specialization', specialization)
    if (language) params.set('language', language)
    apiGetPublic<PublicMapPoint[]>(`/public/mediators/map?${params.toString()}`)
      .then((points) => { if (active) setMapPoints(points || []) })
      .catch(() => { if (active) setMapPoints([]) })
    return () => { active = false }
  }, [query, region, type, specialization, language])

  const title = registryKind
  const selectedType = registryTypes.find(([label]) => label === registryKind)?.[1]
  const typeLabel = (value: string) => registryTypes.find(([, code]) => code === value)?.[0] || value

  return <section className="min-h-[calc(100vh-130px)] bg-slate-50 px-4 py-8 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Ochiq ma’lumotlar</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Ochiq reyestrdagi mutaxassisni F.I.Sh., reyestr raqami, ixtisoslik, til va hudud bo‘yicha qidiring.</p></div>
        <button onClick={onLogin} className="inline-flex h-11 items-center gap-2 rounded-md bg-blue-800 px-5 text-sm font-semibold text-white hover:bg-blue-900">Kabinetga kirish</button>
      </div>
      <div className="mt-7 flex flex-wrap gap-2" role="tablist" aria-label="Reyestr turi">{registryTypes.map(([label]) => <button role="tab" aria-selected={registryKind === label} key={label} onClick={() => setRegistryKind(label)} className={`rounded-full px-4 py-2 text-xs font-semibold ${registryKind === label ? 'bg-blue-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{label}</button>)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="relative"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="F.I.Sh. yoki kalit so‘z" className="h-12 w-full rounded-md border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"/></label>
        <select aria-label="Hudud" value={region} onChange={(event) => setRegion(event.target.value)} className="h-12 rounded-md border border-slate-300 bg-white px-4 text-sm outline-none"><option>Barcha hududlar</option>{regions.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Ixtisoslik" value={specialization} onChange={(event) => setSpecialization(event.target.value)} className="h-12 rounded-md border border-slate-300 bg-white px-4 text-sm outline-none"><option value="">Barcha ixtisosliklar</option>{[['FAMILY','Oilaviy nizolar'],['CIVIL','Fuqarolik nizolari'],['LABOR','Mehnat nizolari'],['ECONOMIC','Iqtisodiy / tijorat nizolari'],['INTELLECTUAL_PROPERTY','Intellektual mulk'],['INVESTMENT','Investitsiya nizolari']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="Xizmat tili" value={language} onChange={(event) => setLanguage(event.target.value)} className="h-12 rounded-md border border-slate-300 bg-white px-4 text-sm outline-none"><option value="">Barcha tillar</option><option value="uz">O‘zbek</option><option value="ru">Русский</option><option value="en">English</option><option value="kaa">Qoraqalpoq</option><option value="tg">Tojik</option></select>
        <select aria-label="Reyestr holati" value={status} onChange={(event) => setStatus(event.target.value)} className="h-12 rounded-md border border-slate-300 bg-white px-4 text-sm outline-none"><option value="">Barcha holatlar</option><option value="ACTIVE">Faol</option><option value="SUSPENDED">Faoliyati to‘xtatilgan</option><option value="REVOKED">Reyestrdan chiqarilgan</option></select>
        <button onClick={() => setMapOpen((open) => !open)} className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><MapPin size={16}/>{mapOpen ? 'Ro‘yxatni ko‘rish' : 'Xaritani ko‘rish'}</button>
      </div>
      {error && <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
      {mapOpen && <div className="mt-5 grid gap-4 rounded-2xl bg-slate-950 p-4 text-white sm:p-6 lg:grid-cols-[1.25fr_.75fr]">
        <div className="overflow-hidden rounded-xl bg-[#dcebf0]"><Suspense fallback={<div className="flex h-[300px] items-center justify-center text-sm text-slate-600 sm:h-[420px]">Haqiqiy xarita yuklanmoqda…</div>}><PublicMediatorMap points={mapPoints} selectedId={selectedPoint?.id} onSelect={setSelectedPoint} label={`${typeLabel(selectedType || 'MEDIATOR')} manzillari xaritasi`}/></Suspense></div>
        <div className="flex min-h-52 flex-col rounded-xl bg-white/[.07] p-4">{selectedPoint ? <><p className="text-xs font-semibold uppercase text-amber-300">Tanlangan mutaxassis</p><h2 className="mt-3 text-lg font-semibold">{selectedPoint.fullName}</h2><p className="mt-1 text-sm text-blue-100/75">{selectedPoint.region}</p><p className="mt-3 text-xs text-blue-100/70">{selectedPoint.address || 'Ochiq aloqa manzili ko‘rsatilmagan'}</p><a className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-amber-300" href={`https://www.openstreetmap.org/?mlat=${selectedPoint.latitude}&mlon=${selectedPoint.longitude}#map=12/${selectedPoint.latitude}/${selectedPoint.longitude}`} target="_blank" rel="noreferrer">Xaritada ochish<ArrowUpRight size={14}/></a></> : <><p className="text-xs font-semibold uppercase text-amber-300">Interaktiv xarita · OpenStreetMap</p><p className="mt-3 text-sm leading-6 text-blue-100/75">{mapPoints.length} ta koordinatali faol mutaxassis. Belgini tanlab hududini ko‘ring.</p><p className="mt-3 text-xs text-blue-100/60">Reyestr yozuvida koordinata bo‘lmagan mutaxassislar xaritada chiqmaydi.</p></>}</div>
      </div>}
      {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18}/>Reyestr yuklanmoqda…</div> : mapOpen ? null : <>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{data.pagination.total} ta natija</span><span>Holatga ko‘ra tartiblangan · {typeLabel(selectedType || 'MEDIATOR')}</span></div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Reyestr № / sana</th><th>Mutaxassis</th><th>Ochiq aloqa</th><th>Ixtisoslik va til</th><th>Ma’lumoti</th><th>Holati</th><th></th></tr></thead><tbody className="divide-y divide-slate-100">{data.items.map((person) => { const activeEntry = person.status === 'ACTIVE'; const statusLabel = person.status === 'SUSPENDED' ? 'Faoliyati to‘xtatilgan' : person.status === 'REVOKED' ? 'Reyestrdan chiqarilgan' : activeEntry ? 'Faol' : 'Holat noma’lum'; return <tr key={person.id} className="align-top"><td className="px-4 py-4"><p className="font-semibold text-slate-800">{person.registryNumber || '—'}</p><p className="mt-1 text-slate-500">{person.registeredAt ? new Date(person.registeredAt).toLocaleDateString('uz-UZ') : '—'}</p></td><td className="py-4 pr-4"><p className="font-semibold text-slate-900">{person.fullName}</p><p className="mt-1 text-slate-500">{person.region}</p></td><td className="py-4 pr-4">{person.phone && <a className="block text-blue-800 hover:underline" href={`tel:${person.phone}`}>{person.phone}</a>}{person.email && <a className="mt-1 block text-blue-800 hover:underline" href={`mailto:${person.email}`}>{person.email}</a>}{person.address && <p className="mt-1 text-slate-500">{person.address}</p>}{!person.phone && !person.email && !person.address && <span className="text-slate-400">Ma’lumot kiritilmagan</span>}</td><td className="py-4 pr-4"><p>{person.specialization?.join(', ') || 'Ko‘rsatilmagan'}</p><p className="mt-1 text-slate-500">{person.languages?.join(', ') || 'Ko‘rsatilmagan'}</p></td><td className="py-4 pr-4">{person.education || '—'}</td><td className="py-4 pr-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${activeEntry ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{statusLabel}</span></td><td className="py-4 pr-4"><button disabled={type !== 'MEDIATOR' || !activeEntry} onClick={() => onContact(person.fullName, person.id, false)} className="whitespace-nowrap rounded-lg bg-blue-800 px-3 py-2 text-[11px] font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-300">{type !== 'MEDIATOR' ? 'Ko‘rish' : activeEntry ? 'Murojaat' : 'Nofaol'}</button></td></tr>})}</tbody></table></div>
        {!data.items.length && !error && <div className="mt-4 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Reyestrda mos mutaxassis topilmadi.</div>}
        <div className="mt-5 flex items-center justify-between"><button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold disabled:opacity-40"><ArrowLeft size={14}/>Oldingi</button><span className="text-xs text-slate-500">{data.pagination.page} / {Math.max(1, data.pagination.totalPages)}</span><button disabled={page >= data.pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold disabled:opacity-40">Keyingi<ArrowRight size={14}/></button></div>
      </>}
      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><section role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><button onClick={() => setSelected(null)} aria-label="Yopish" className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Ochiq reyestr profili</p><h2 className="mt-2 pr-8 text-xl font-semibold">{selected.fullName}</h2><p className="mt-1 text-sm text-slate-500">{typeLabel(selected.type)} · {selected.region}</p><div className="mt-5 space-y-3 text-sm"><p><strong>Reyestr raqami:</strong> {selected.registryNumber || '—'}</p><p><strong>Holati:</strong> {selected.status || '—'}{selected.statusChangedAt ? ` · ${new Date(selected.statusChangedAt).toLocaleDateString('uz-UZ')}` : ''}</p><p><strong>Ixtisoslik:</strong> {selected.specialization?.join(', ') || 'Ko‘rsatilmagan'}</p><p><strong>Mediatsiya tillari:</strong> {selected.languages?.join(', ') || 'Ko‘rsatilmagan'}</p><p><strong>Ma’lumoti:</strong> {selected.education || 'Ko‘rsatilmagan'}</p><p><strong>Ochiq manzil:</strong> {selected.address || 'Ko‘rsatilmagan'}</p>{selected.phone && <a className="inline-flex items-center gap-2 text-blue-800" href={`tel:${selected.phone}`}><Phone size={15}/>{selected.phone}</a>}{selected.email && <a className="block text-blue-800" href={`mailto:${selected.email}`}>{selected.email}</a>}</div></section></div>}
    </div>
  </section>
}

export function BusinessSpecialistDirectory({ onSelectSpecialist, businessMode = false }: { onSelectSpecialist: (person: { id: string; fullName: string; type: string; isSample?: boolean }) => void; businessMode?: boolean }) {
  const [type, setType] = useState('MEDIATOR')
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [language, setLanguage] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<RegistryPage>(emptyPage)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { setPage(1) }, [type, search, region, specialization, language])
  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ type, page: String(page), limit: '12' })
    if (search.trim()) params.set('search', search.trim())
    if (region) params.set('region', region)
    if (specialization) params.set('specialization', specialization)
    if (language) params.set('language', language)
    setLoading(true); setError('')
    apiGetPublic<RegistryPage>(`/public/mediators?${params.toString()}`)
      .then((result) => {
        if (!active) return
        setData(result || emptyPage)
        setError('')
      })
      .catch((cause) => {
        if (!active) return
        setData(emptyPage)
        setError(cause instanceof Error ? cause.message : 'Reyestrni yuklab bo‘lmadi.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [type, search, region, specialization, language, page])

  return <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
    <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{businessMode ? 'Yuridik shaxs uchun ochiq reyestr' : 'Ochiq mutaxassislar reyestri'}</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Mutaxassisni tanlang</h2><p className="mt-1 text-sm text-slate-500">Mediatsiya, hakamlik yoki arbitraj mutaxassislarini til, ixtisoslik, hudud va e’lon qilingan reyting bo‘yicha saralang.</p></div>
    <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Mutaxassis turi">{[['MEDIATOR','Mediator'],['ARBITRATION_JUDGE','Hakamlik sudyasi'],['ARBITRATOR','Arbitr']].map(([value,label]) => <button key={value} role="tab" aria-selected={type === value} onClick={() => setType(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${type === value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>)}</div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <label className="text-xs font-semibold text-slate-600">Ism yoki kalit so‘z<input value={search} onChange={(event) => setSearch(event.target.value)} className="form-control mt-1.5" placeholder="Masalan: tijorat arbitraji"/></label>
      <label className="text-xs font-semibold text-slate-600">Hudud<select value={region} onChange={(event) => setRegion(event.target.value)} className="form-control mt-1.5"><option value="">Barcha hududlar</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Ixtisoslik<select value={specialization} onChange={(event) => setSpecialization(event.target.value)} className="form-control mt-1.5"><option value="">Barcha ixtisosliklar</option>{[['ECONOMIC','Iqtisodiy / tijorat'],['INVESTMENT','Investitsiya'],['INTELLECTUAL','Intellektual mulk'],['CIVIL','Fuqarolik / shartnomaviy'],['BANKING','Bank va moliya'],['DIGITAL','Raqamli texnologiyalar']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Xizmat tili<select value={language} onChange={(event) => setLanguage(event.target.value)} className="form-control mt-1.5"><option value="">Barcha tillar</option><option value="uz">O‘zbek</option><option value="ru">Русский</option><option value="en">English</option></select></label>
    </div>
    {error && <div role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</div>}
    {loading ? <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={17}/>Reyestr yuklanmoqda…</div> : data.items.length ? <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.items.map((person) => <article key={person.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">{person.fullName}</h3><p className="mt-1 text-xs text-slate-500">{person.region}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${person.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{person.status === 'ACTIVE' ? 'Faol' : person.status === 'SUSPENDED' ? 'To‘xtatilgan' : 'Reyestrdan chiqarilgan'}</span></div><p className="mt-3 text-xs leading-5 text-slate-600">{person.specialization?.join(', ') || 'Ixtisoslik ko‘rsatilmagan'}</p><p className="mt-2 text-xs text-slate-500">Tillar: {person.languages?.join(', ') || 'Ko‘rsatilmagan'}</p><button disabled={person.type !== 'MEDIATOR' || person.status !== 'ACTIVE'} onClick={() => onSelectSpecialist({ id: person.id, fullName: person.fullName, type: person.type })} className="mt-4 h-9 w-full rounded-lg bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300">{person.type !== 'MEDIATOR' ? 'Hakamlik / arbitraj oqimi ulanmagan' : person.status === 'ACTIVE' ? 'Tanlash va mediatsiya boshlash' : 'Faol emas'}</button></article>)}</div> : <div className="mt-4 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Tanlangan mezonlarga mos faol mutaxassis topilmadi.</div>}
    {!loading && data.items.length > 0 && <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500"><span>{data.pagination.total} ta mutaxassis</span><div className="flex items-center gap-3"><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="disabled:opacity-40">Oldingi</button><span>{page} / {Math.max(1, data.pagination.totalPages)}</span><button disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="disabled:opacity-40">Keyingi</button></div></div>}
    <p className="mt-3 text-[11px] text-slate-400">Ochiq ko‘rinishda faqat e’lon qilingan reyestr ma’lumotlari ko‘rsatiladi. Pasport, PINFL va tug‘ilgan sana yopiq qoladi.</p>
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
