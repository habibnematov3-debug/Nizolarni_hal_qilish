import { FormEvent, useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Download, FileCheck2, FileText, LoaderCircle, Save, Upload, UserRound } from 'lucide-react'
import { apiDownload, apiGet, apiPatch, apiPost, getAccessToken, uploadPrivateDocument } from './api'

type AuthorityDocument = {
  id: string
  type: 'POWER_OF_ATTORNEY' | 'APPOINTMENT_ORDER'
  documentNumber?: string | null
  validUntil?: string | null
  createdAt: string
  file: { id: string; originalName: string; sizeBytes: number }
}

type BusinessOrganization = {
  id: string
  name: string
  code?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  bankAccount?: string | null
  authorityDocuments: AuthorityDocument[]
}

type Representative = { fullName: string; pinfl?: string | null; position?: string | null }
type DocumentKind = AuthorityDocument['type']

export function BusinessWorkspace({ onToast }: { onToast: (message: string) => void }) {
  const [organizations, setOrganizations] = useState<BusinessOrganization[]>([])
  const [representative, setRepresentative] = useState<Representative | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [documentKind, setDocumentKind] = useState<DocumentKind>('POWER_OF_ATTORNEY')
  const [documentNumber, setDocumentNumber] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selected = useMemo(() => organizations.find((item) => item.id === selectedId) || null, [organizations, selectedId])

  const load = async () => {
    if (!getAccessToken()) {
      setError('Tashkilot ma’lumotlari va hujjatlarini saqlash uchun E-IMZO orqali kiring.')
      setLoading(false)
      return
    }
    setLoading(true); setError('')
    try {
      const [items, profile] = await Promise.all([
        apiGet<BusinessOrganization[]>('/cabinet/business/organizations'),
        apiGet<Representative>('/cabinet/profile'),
      ])
      setOrganizations(items)
      setRepresentative(profile)
      const activeId = items.some((item) => item.id === selectedId) ? selectedId : items[0]?.id || ''
      setSelectedId(activeId)
      const active = items.find((item) => item.id === activeId)
      setAddress(active?.address || ''); setPhone(active?.phone || ''); setEmail(active?.email || ''); setBankAccount(active?.bankAccount || '')
      if (!items.length) setError('E-IMZO sertifikatiga bog‘langan tashkilot topilmadi. STIR va tashkilot ma’lumoti tasdiqlangan sertifikat orqali olinishi kerak.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tashkilot ma’lumotlarini yuklab bo‘lmadi.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const selectOrganization = (id: string) => {
    setSelectedId(id)
    const item = organizations.find((organization) => organization.id === id)
    setAddress(item?.address || ''); setPhone(item?.phone || ''); setEmail(item?.email || ''); setBankAccount(item?.bankAccount || '')
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    setBusy(true); setError('')
    try {
      await apiPatch(`/cabinet/business/organizations/${encodeURIComponent(selected.id)}`, { address, phone, email: email || undefined, bankAccount })
      await load(); onToast('Tashkilot rekvizitlari saqlandi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Rekvizitlar saqlanmadi.') }
    finally { setBusy(false) }
  }

  const addAuthorityDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected || !documentFile) { setError('Ishonchnoma yoki buyruq faylini tanlang.'); return }
    setBusy(true); setError('')
    let uploadedId = ''
    try {
      const uploaded = await uploadPrivateDocument(documentFile, 'Yuridik shaxs vakolat hujjati')
      uploadedId = uploaded.id
      await apiPost(`/cabinet/business/organizations/${encodeURIComponent(selected.id)}/authority-documents`, {
        fileId: uploaded.id, type: documentKind, documentNumber: documentNumber || undefined,
        validUntil: validUntil ? new Date(`${validUntil}T00:00:00`).toISOString() : undefined,
      })
      setDocumentFile(null); setDocumentNumber(''); setValidUntil('')
      await load(); onToast('Vakolat hujjati tashkilot profiliga biriktirildi.')
    } catch (cause) {
      if (uploadedId) await fetch(`${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')}/platform/files/${uploadedId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getAccessToken()}` } }).catch(() => undefined)
      setError(cause instanceof Error ? cause.message : 'Vakolat hujjatini biriktirib bo‘lmadi.')
    } finally { setBusy(false) }
  }

  const documentTitle = (type: DocumentKind) => type === 'POWER_OF_ATTORNEY' ? 'Ishonchnoma' : 'Tayinlov buyrug‘i'

  return <section>
    <header className="mb-6"><p className="text-xs font-semibold uppercase tracking-[.14em] text-emerald-700">Yuridik shaxs kabineti</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Tashkilot profili</h1><p className="mt-2 text-sm text-slate-500">STIR E-IMZO sertifikatidan olinadi. Tashkilot rekvizitlari va vakil hujjatlarini shu yagona kabinetda yuriting.</p></header>
    {error && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
    {loading ? <div className="flex items-center justify-center gap-2 rounded-xl bg-white p-10 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin"/>Tashkilot profili yuklanmoqda…</div> : selected && <>
      {organizations.length > 1 && <label className="mb-4 block max-w-xl text-xs font-semibold text-slate-600">Vakillik qilinayotgan tashkilot<select value={selectedId} onChange={(event) => selectOrganization(event.target.value)} className="form-control mt-1.5">{organizations.map((item) => <option key={item.id} value={item.id}>{item.name} · STIR {item.code || '—'}</option>)}</select></label>}
      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><BriefcaseBusiness size={19}/></span><div><h2 className="text-sm font-semibold text-slate-900">Yuridik shaxs rekvizitlari</h2><p className="mt-1 text-xs text-slate-500">Tashkilot nomi va STIR tasdiqlangan E-IMZO profilidan olinadi.</p></div></div>
          <dl className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><Value label="Tashkilot" value={selected.name}/><Value label="STIR" value={selected.code || 'Sertifikatdan olinmagan'}/></dl>
          {representative && <div className="mb-5 flex items-start gap-3 rounded-xl border border-slate-200 p-4"><UserRound size={17} className="mt-0.5 text-slate-500"/><div><p className="text-sm font-semibold text-slate-800">Vakil: {representative.fullName}</p><p className="mt-1 text-xs text-slate-500">PINFL: {representative.pinfl || 'OneID ma’lumoti kutilmoqda'}{representative.position ? ` · ${representative.position}` : ''}</p><p className="mt-1 text-xs text-slate-500">Tizimga kirgan E-IMZO sertifikati tashkilot bilan bog‘langan; vakolatning yuridik kuchini tekshirish alohida idoraviy tekshiruvni talab qiladi.</p></div></div>}
          <form onSubmit={saveProfile} className="space-y-4"><h3 className="text-sm font-semibold text-slate-900">Aloqa va hisob-kitob rekvizitlari</h3><label className="block text-xs font-semibold text-slate-600">Yuridik manzil<textarea required maxLength={1000} value={address} onChange={(event) => setAddress(event.target.value)} className="form-control mt-1.5 min-h-20" placeholder="Tashkilotning rasmiy manzili"/></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-600">Telefon<input type="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} className="form-control mt-1.5" placeholder="+998 90 123 45 67"/></label><label className="block text-xs font-semibold text-slate-600">Elektron pochta<input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="form-control mt-1.5" placeholder="info@company.uz"/></label></div><label className="block text-xs font-semibold text-slate-600">Bank hisobvarag‘i<input maxLength={34} value={bankAccount} onChange={(event) => setBankAccount(event.target.value.replace(/\s/g, ''))} className="form-control mt-1.5" placeholder="Hisob raqami"/></label><button disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"><Save size={15}/>Rekvizitlarni saqlash</button></form>
        </section>
        <div className="space-y-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800"><FileCheck2 size={18}/></span><div><h2 className="text-sm font-semibold text-slate-900">Vakil vakolatini tasdiqlovchi hujjatlar</h2><p className="mt-1 text-xs text-slate-500">Ishonchnoma yoki rahbarni tayinlash buyrug‘ini biriktiring.</p></div></div>
            <form onSubmit={addAuthorityDocument} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-600">Hujjat turi<select value={documentKind} onChange={(event) => setDocumentKind(event.target.value as DocumentKind)} className="form-control mt-1.5"><option value="POWER_OF_ATTORNEY">Ishonchnoma</option><option value="APPOINTMENT_ORDER">Tayinlov buyrug‘i</option></select></label><label className="block text-xs font-semibold text-slate-600">Hujjat raqami<input maxLength={100} value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} className="form-control mt-1.5" placeholder="Ixtiyoriy"/></label></div><label className="block text-xs font-semibold text-slate-600">Amal qilish muddati<input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="form-control mt-1.5"/></label><label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600"><Upload size={16}/><span className="min-w-0 flex-1 truncate">{documentFile?.name || 'PDF, DOCX yoki rasm tanlang'}</span><input type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} className="sr-only"/></label><button disabled={busy || !documentFile} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"><Upload size={15}/>Hujjatni biriktirish</button></form>
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6"><div className="mb-4 flex items-center gap-2"><FileText size={17} className="text-slate-500"/><h2 className="text-sm font-semibold text-slate-900">Saqlangan vakolat hujjatlari</h2><span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{selected.authorityDocuments.length}</span></div>{selected.authorityDocuments.length ? <div className="divide-y divide-slate-100">{selected.authorityDocuments.map((document) => <article key={document.id} className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{documentTitle(document.type)} · {document.file.originalName}</p><p className="mt-1 text-xs text-slate-500">{document.documentNumber ? `№ ${document.documentNumber} · ` : ''}{document.validUntil ? `Amal qiladi: ${new Date(document.validUntil).toLocaleDateString('uz-UZ')}` : 'Muddat ko‘rsatilmagan'}</p></div><button type="button" onClick={() => apiDownload(`/platform/files/${document.file.id}`, document.file.originalName).catch((cause) => setError(cause instanceof Error ? cause.message : 'Hujjatni yuklab bo‘lmadi.'))} aria-label="Vakolat hujjatini yuklab olish" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Download size={16}/></button></article>)}</div> : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Vakolat hujjatlari hali biriktirilmagan.</p>}<p className="mt-3 text-xs leading-5 text-amber-800">Hujjat tizimda saqlanadi. Vakolatning yuridik kuchini tekshirish va tasdiqlash jarayoni mas’ul idora integratsiyasiga bog‘liq.</p></section>
        </div>
      </div>
    </>}
  </section>
}

function Value({ label, value }: { label: string; value: string }) { return <div><dt className="text-[11px] text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</dd></div> }
