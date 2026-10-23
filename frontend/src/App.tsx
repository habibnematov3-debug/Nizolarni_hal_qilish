import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileClock,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PenLine,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import Login from './Login'
import { AdminUser, clearSession, createOrganization, getCurrentAdmin, getOrganizations, hasSession, logout, OrganizationRecord, updateOrganization } from './api'

type OrganizationType = 'MINISTRY' | 'REGIONAL_DEPARTMENT' | 'TRAINING_CENTER'
type Organization = {
  id: string
  name: string
  type: OrganizationType
  parent: string
  region: string
  status: 'ACTIVE' | 'INACTIVE'
  code: string
  parentId: string | null
}

const navItems = [
  { label: 'Tashkilotlar', icon: Building2 },
  { label: 'Foydalanuvchilar va rollar', icon: Users },
  { label: 'Spravochniklar', icon: BookOpen },
  { label: 'Audit jurnali', icon: FileClock },
  { label: 'Tizim sozlamalari', icon: Settings },
  { label: 'Kontent', icon: FileText },
]

const typeLabels: Record<OrganizationType, string> = {
  MINISTRY: 'Vazirlik',
  REGIONAL_DEPARTMENT: 'Hududiy boshqarma',
  TRAINING_CENTER: 'O‘quv markazi',
}

const emptyForm = { name: '', type: 'REGIONAL_DEPARTMENT' as OrganizationType, parent: '', region: '', code: '', status: 'ACTIVE' as Organization['status'] }

function toOrganization(record: OrganizationRecord): Organization {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    parent: record.parent?.name || '—',
    parentId: record.parentId || record.parent?.id || null,
    region: record.region || '',
    status: record.status,
    code: record.code || '',
  }
}

function App() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [loadingOrganizations, setLoadingOrganizations] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [activePage, setActivePage] = useState('Tashkilotlar')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null)
  const [notice, setNotice] = useState('')

  const loadOrganizations = async () => {
    setLoadingOrganizations(true)
    try {
      const rows = await getOrganizations()
      setOrganizations(rows.map(toOrganization))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Tashkilotlarni yuklab bo‘lmadi')
    } finally { setLoadingOrganizations(false) }
  }

  useEffect(() => {
    if (!hasSession()) { setAuthChecking(false); return }
    getCurrentAdmin()
      .then((user) => { setAdmin(user); return loadOrganizations() })
      .catch(() => clearSession())
      .finally(() => setAuthChecking(false))
  }, [])

  const handleLogin = async (user: AdminUser) => {
    setAdmin(user)
    await loadOrganizations()
  }

  const handleLogout = async () => {
    await logout().catch(() => clearSession())
    setAdmin(null)
    setOrganizations([])
  }

  const activeCount = organizations.filter((item) => item.status === 'ACTIVE').length
  const filteredOrganizations = useMemo(() => organizations.filter((item) => {
    const matchesQuery = [item.name, item.region, item.parent, item.code, typeLabels[item.type]].join(' ').toLocaleLowerCase('uz').includes(query.toLocaleLowerCase('uz').trim())
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
    return matchesQuery && matchesStatus
  }), [organizations, query, statusFilter])

  useEffect(() => {
    if (!dialog && !deleteTarget) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setDialog(null); setDeleteTarget(null) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialog, deleteTarget])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const openCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setDialog('create')
  }

  const openEdit = (organization: Organization) => {
    setForm({ name: organization.name, type: organization.type, parent: organization.parent === '—' ? '' : organization.parent, region: organization.region, code: organization.code, status: organization.status })
    setEditingId(organization.id)
    setDialog('edit')
  }

  const saveOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parentId = organizations.find((item) => item.name === form.parent)?.id || null
    const payload = { name: form.name, type: form.type, parentId, region: form.region || undefined, code: form.code || undefined, status: form.status }
    try {
      if (dialog === 'edit' && editingId) {
        await updateOrganization(editingId, payload)
        setNotice('Tashkilot ma’lumotlari saqlandi')
      } else {
        await createOrganization(payload)
        setNotice('Yangi tashkilot qo‘shildi')
      }
      await loadOrganizations()
      setDialog(null)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Ma’lumotni saqlab bo‘lmadi')
    }
  }

  const removeOrganization = async () => {
    if (!deleteTarget) return
    try {
      await updateOrganization(deleteTarget.id, { status: 'INACTIVE' })
      setNotice('Tashkilot faolsizlantirildi')
      setDeleteTarget(null)
      await loadOrganizations()
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Tashkilotni faolsizlantirib bo‘lmadi') }
  }

  if (authChecking) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Seans tekshirilmoqda...</div>
  if (!admin) return <Login onLogin={handleLogin} />

  const sidebar = (
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-sm font-bold text-white shadow-lg shadow-blue-950/30"><ShieldCheck size={21} /></div>
          <div><p className="text-[15px] font-semibold leading-tight text-white">Nizolarni hal etish</p><p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Ma’muriy panel</p></div>
          <button className="ml-auto rounded-lg p-1 text-slate-400 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Menyuni yopish"><X size={19} /></button>
        </div>
        <div className="mx-5 border-t border-slate-800" />
        <nav className="flex-1 space-y-1 px-3 py-6" aria-label="Asosiy navigatsiya">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Boshqaruv</p>
          {navItems.map(({ label, icon: Icon }) => {
            const active = activePage === label
            return <button key={label} className={`nav-item ${active ? 'nav-item-active' : ''}`} onClick={() => { setActivePage(label); setMobileOpen(false) }} aria-current={active ? 'page' : undefined}>
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} /><span>{label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />}
            </button>
          })}
        </nav>
        <div className="mx-5 mb-5 rounded-xl border border-slate-800 bg-slate-800/45 p-4">
          <div className="mb-2 flex items-center gap-2 text-slate-300"><Activity size={15} /><span className="text-xs font-medium">Tizim holati</span></div>
          <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${loadingOrganizations ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'}`} /><span className="text-xs text-slate-400">{loadingOrganizations ? 'Ma’lumot yuklanmoqda' : 'API bilan ulangan'}</span></div>
        </div>
      </div>
    </aside>
  )

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    {sidebar}
    {mobileOpen && <button className="fixed inset-0 z-20 bg-slate-950/40 md:hidden" aria-label="Menyuni yopish" onClick={() => setMobileOpen(false)} />}
    <div className="md:pl-[260px]">
      <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 md:px-8">
        <button className="mr-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" onClick={() => setMobileOpen(true)} aria-label="Menyuni ochish"><Menu size={21} /></button>
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input className="h-10 w-full rounded-lg border border-transparent bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-50" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tashkilotlarni qidirish..." aria-label="Tashkilotlarni qidirish" />
        </div>
        <div className="ml-4 flex items-center gap-3">
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{(admin.fullName || admin.username).slice(0, 2).toLocaleUpperCase('uz')}</div><div className="hidden sm:block"><p className="text-sm font-semibold text-slate-800">{admin.fullName || admin.username}</p><p className="text-xs text-slate-400">Administrator</p></div><ChevronDown size={16} className="hidden text-slate-400 sm:block" /></div>
          <button onClick={handleLogout} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500" aria-label="Tizimdan chiqish"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {activePage === 'Tashkilotlar' ? <>
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="mb-2 text-xs font-medium text-slate-400">ADM / Boshqaruv</p><h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[28px]">Tashkilotlar</h1><p className="mt-1.5 text-sm text-slate-500">Platformadagi tashkilotlar ro‘yxatini boshqaring</p></div>
            <button onClick={openCreate} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"><Plus size={18} strokeWidth={2.5} />Qo‘shish</button>
          </div>

          <section className="mb-6 grid gap-4 sm:grid-cols-3" aria-label="Tashkilotlar statistikasi">
            <StatCard label="Jami tashkilotlar" value={organizations.length} icon={Building2} detail="Ro‘yxatdagi barcha tashkilotlar" />
            <StatCard label="Faol tashkilotlar" value={activeCount} icon={Check} detail="Hozirda faol holatda" tone="green" />
            <StatCard label="Faolsiz tashkilotlar" value={organizations.length - activeCount} icon={Activity} detail="Faollashtirish mumkin" tone="slate" />
          </section>

          <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70" aria-labelledby="organizations-heading">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center md:px-6">
              <div className="flex items-center gap-3"><div><h2 id="organizations-heading" className="text-sm font-semibold text-slate-800">Barcha tashkilotlar</h2><p className="mt-0.5 text-xs text-slate-400">Tashkilotlar va ularning hududiy bo‘linmalari</p></div><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{filteredOrganizations.length}</span></div>
              <label className="relative flex items-center gap-2 self-start text-xs font-medium text-slate-500 sm:self-auto"><span className="sr-only">Holat bo‘yicha filtrlash</span><span>Holati:</span><select className="h-9 rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Barchasi</option><option value="ACTIVE">Faol</option><option value="INACTIVE">Faolsiz</option></select></label>
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="bg-slate-50"><tr>{['Nomi', 'Turi', 'Yuqori tashkilot', 'Hudud', 'Holati', 'Amallar'].map((heading) => <th key={heading} scope="col" className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 md:px-6">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{filteredOrganizations.map((organization) => <tr key={organization.id} className="transition-colors hover:bg-slate-50/80">
                <td className="px-5 py-4 md:px-6"><div className="flex items-center gap-3"><OrgMark name={organization.name} /><div><span className="block text-sm font-semibold text-slate-800">{organization.name}</span><span className="mt-0.5 block text-xs text-slate-400">STIR: {organization.code || '—'}</span></div></div></td>
                <td className="px-5 py-4 text-sm text-slate-500 md:px-6">{typeLabels[organization.type]}</td><td className="max-w-[220px] truncate px-5 py-4 text-sm text-slate-500 md:px-6" title={organization.parent}>{organization.parent}</td><td className="px-5 py-4 text-sm text-slate-500 md:px-6">{organization.region || '—'}</td>
                <td className="px-5 py-4 md:px-6"><StatusBadge active={organization.status === 'ACTIVE'} /></td>
                <td className="px-5 py-4 md:px-6"><div className="flex items-center gap-1"><button onClick={() => openEdit(organization)} className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" aria-label={`${organization.name}ni tahrirlash`}><PenLine size={16} /></button><button onClick={() => setDeleteTarget(organization)} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200" aria-label={`${organization.name}ni o‘chirish`}><Trash2 size={16} /></button></div></td>
              </tr>)}</tbody>
            </table></div>
            {filteredOrganizations.length === 0 && <div className="px-6 py-14 text-center"><Search className="mx-auto mb-3 text-slate-300" size={28} /><p className="text-sm font-medium text-slate-700">{loadingOrganizations ? 'Tashkilotlar yuklanmoqda' : 'Tashkilot topilmadi'}</p><p className="mt-1 text-xs text-slate-400">{loadingOrganizations ? 'API dan ma’lumot olinmoqda' : 'Qidiruv yoki filtrni o‘zgartirib ko‘ring'}</p></div>}
            <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center md:px-6"><span>Jami <strong className="font-semibold text-slate-700">{filteredOrganizations.length}</strong> ta tashkilot</span><div className="flex items-center gap-1"><button disabled className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-slate-400 disabled:cursor-not-allowed"><ChevronLeft size={14} />Oldingi</button><span className="rounded-md bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-600">1</span><button disabled className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-slate-400 disabled:cursor-not-allowed">Keyingi<ChevronRight size={14} /></button></div></div>
          </section>
        </> : <section className="rounded-xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-200/70"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><LayoutDashboard size={22} /></div><h1 className="text-xl font-semibold text-slate-900">{activePage}</h1><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Ushbu bo‘lim interfeysi navbatdagi bosqichda ishlab chiqiladi. Hozirda tashkilotlarni boshqarish moduli tayyorlanmoqda.</p><button onClick={() => setActivePage('Tashkilotlar')} className="mt-5 text-sm font-semibold text-blue-600 hover:text-blue-700">Tashkilotlarga qaytish</button></section>}
        <footer className="mt-6 flex flex-col justify-between gap-2 text-xs text-slate-400 sm:flex-row"><span>© 2026 Nizolarni muqobil hal etish platformasi</span><span>Ma’muriy boshqaruv paneli</span></footer>
      </main>
    </div>

    {dialog && <OrganizationDialog mode={dialog} form={form} organizations={organizations} setForm={setForm} onClose={() => setDialog(null)} onSubmit={saveOrganization} />}
    {deleteTarget && <ConfirmDialog organization={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={removeOrganization} />}
    {notice && <div role="status" className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg"><Check size={17} className="text-emerald-400" />{notice}</div>}
  </div>
}

function StatCard({ label, value, icon: Icon, detail, tone = 'blue' }: { label: string; value: number; icon: typeof Building2; detail: string; tone?: 'blue' | 'green' | 'slate' }) {
  const colors = { blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', slate: 'bg-slate-100 text-slate-600' }
  return <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p></div><div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors[tone]}`}><Icon size={19} /></div></div><p className="mt-3 text-xs text-slate-400">{detail}</p></div>
}

function OrgMark({ name }: { name: string }) {
  const colors = ['bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700']
  const index = name.length % colors.length
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('uz')
  return <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${colors[index]}`}>{initials}</div>
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />{active ? 'Faol' : 'Faolsiz'}</span>
}

function OrganizationDialog({ mode, form, organizations, setForm, onClose, onSubmit }: { mode: 'create' | 'edit'; form: typeof emptyForm; organizations: Organization[]; setForm: (value: typeof emptyForm) => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void> }) {
  const update = (field: keyof typeof emptyForm, value: string) => setForm({ ...form, [field]: value })
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="organization-dialog-title" className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl">
      <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5"><div><h2 id="organization-dialog-title" className="text-lg font-semibold text-slate-900">{mode === 'create' ? 'Tashkilot qo‘shish' : 'Tashkilotni tahrirlash'}</h2><p className="mt-1 text-sm text-slate-500">Tashkilot ma’lumotlarini kiriting</p></div><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Oynani yopish"><X size={18} /></button></div>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          <Field label="Tashkilot nomi" required className="sm:col-span-2"><input autoFocus required maxLength={180} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Masalan, Adliya vazirligi" className="form-control" /></Field>
          <Field label="Tashkilot turi" required><select required value={form.type} onChange={(event) => update('type', event.target.value)} className="form-control"><option value="MINISTRY">Vazirlik</option><option value="REGIONAL_DEPARTMENT">Hududiy boshqarma</option><option value="TRAINING_CENTER">O‘quv markazi</option></select></Field>
          <Field label="Yuqori tashkilot"><select value={form.parent} onChange={(event) => update('parent', event.target.value)} className="form-control"><option value="">Yuqori tashkilot yo‘q</option>{organizations.filter((item) => item.name !== form.name).map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></Field>
          <Field label="Hudud"><input value={form.region} onChange={(event) => update('region', event.target.value)} placeholder="Masalan, Toshkent shahri" className="form-control" /></Field>
          <Field label="STIR / kodi"><input value={form.code} onChange={(event) => update('code', event.target.value)} maxLength={32} placeholder="Tashkilot kodi" className="form-control" /></Field>
          <Field label="Holati"><select value={form.status} onChange={(event) => update('status', event.target.value)} className="form-control"><option value="ACTIVE">Faol</option><option value="INACTIVE">Faolsiz</option></select></Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4"><button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">Bekor qilish</button><button type="submit" className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">{mode === 'create' ? 'Qo‘shish' : 'Saqlash'}</button></div>
      </form>
    </section>
  </div>
}

function Field({ label, required, className = '', children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>{children}</label>
}

function ConfirmDialog({ organization, onClose, onConfirm }: { organization: Organization; onClose: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Trash2 size={20} /></div><h2 id="delete-title" className="text-lg font-semibold text-slate-900">Tashkilotni faolsizlantirasizmi?</h2><p className="mt-2 text-sm leading-6 text-slate-500"><strong className="font-semibold text-slate-700">{organization.name}</strong> faol tashkilotlar ro‘yxatidan chiqariladi. Uni keyin qayta faollashtirish mumkin.</p><div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">Bekor qilish</button><button onClick={onConfirm} className="h-10 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700">Faolsizlantirish</button></div></section></div>
}

export default App
