import { FormEvent, useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Download, FilePlus2, FileText, LoaderCircle, Send } from 'lucide-react'
import { apiDownload, apiGet, apiGetPublic, apiPost, getAccessToken } from './api'

type ContractType = 'MEDIATION' | 'ARBITRATION' | 'ARBITRATION_HEARING'
type Template = { id: string; type: ContractType; name: string; version: number; content: string }
type ContractParticipant = { id: string; role: 'CLIENT' | 'COUNTERPARTY' | 'PROVIDER'; fullName: string; pinfl?: string | null; status: string; signedAt?: string | null; decisionNote?: string | null }
type ContractInvoice = { id: string; invoiceNumber: string; amount: string | number; billingTransaction?: { paymentStatus: string } }
type Contract = { id: string; contractNumber: string; type: ContractType; title: string; caseSummary?: string; rightsAndResponsibilities?: string; terms?: string; renderedContent?: string; status: string; provider?: { id: string; fullName: string }; template?: { name: string; version: number }; participants: ContractParticipant[]; invoices?: ContractInvoice[] }
type ContractList = { items: Contract[]; pagination?: { total: number } }
type Provider = { id: string; fullName: string; region?: string; specialization?: string[] }
type Profile = { id: string; fullName: string; pinfl?: string | null }

const contractTypes: [ContractType, string][] = [['MEDIATION', 'Mediatsiya'], ['ARBITRATION', 'Arbitraj'], ['ARBITRATION_HEARING', 'Hakamlik muhokamasi']]
const statusLabels: Record<string, string> = { DRAFT: 'Qoralama', PENDING_PARTIES: 'Taraflar imzosi kutilmoqda', AWAITING_PROVIDER_APPROVAL: 'Xizmat ko‘rsatuvchi tasdig‘i kutilmoqda', SIGNED: 'Imzolangan', REJECTED: 'Rad etilgan', RETURNED_FOR_EDIT: 'Tahrirga qaytarilgan', EXPIRED: 'Muddati tugagan' }

export function ContractsWorkspace({ role, onToast }: { role: string; onToast: (message: string) => void }) {
  const authenticated = Boolean(getAccessToken())
  const [contracts, setContracts] = useState<Contract[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [selected, setSelected] = useState<Contract | null>(null)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [signature, setSignature] = useState('')
  const [decisionReason, setDecisionReason] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const initialType: ContractType = role === 'ARBITRATOR' ? 'ARBITRATION' : role === 'JUDGE' ? 'ARBITRATION_HEARING' : 'MEDIATION'
  const [draft, setDraft] = useState({ type: initialType, templateId: '', providerUserId: '', title: '', caseSummary: '', rightsAndResponsibilities: '', terms: '', clientName: '', clientPinfl: '', counterpartyName: '', counterpartyPinfl: '' })
  const isProvider = ['MEDIATOR', 'JUDGE', 'ARBITRATOR'].includes(role)

  const reload = useCallback(async () => {
    if (!authenticated) return
    setLoading(true); setError('')
    try {
      const [list, profileData] = await Promise.all([
        apiGet<ContractList>('/contracts?page=1&limit=50'),
        apiGet<Profile>('/users/me'),
      ])
      setContracts(list.items || [])
      setProfile(profileData)
      const templateData = await apiGet<Template[]>('/contract-templates')
      setTemplates(templateData || [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Shartnomalarni yuklab bo‘lmadi.') }
    finally { setLoading(false) }
  }, [authenticated])
  useEffect(() => { void reload() }, [reload])

  useEffect(() => {
    if (!authenticated || isProvider || draft.type !== 'MEDIATION') { setProviders([]); return }
    let active = true
    apiGetPublic<Provider[]>('/public/mediators?limit=100')
      .then((rows) => { if (active) setProviders(rows || []) })
      .catch(() => { if (active) setProviders([]) })
    return () => { active = false }
  }, [authenticated, isProvider, draft.type])

  const openContract = async (id: string) => {
    setLoading(true); setError('')
    try { setSelected(await apiGet<Contract>(`/contracts/${id}`)); setSignature(''); setDecisionReason('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Shartnoma tafsilotini ochib bo‘lmadi.') }
    finally { setLoading(false) }
  }

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile?.pinfl && !isProvider) { setError('Shartnoma yaratishdan oldin shaxsiy profildagi PINFLni to‘ldiring.'); return }
    setBusy(true); setError('')
    const participants = isProvider
      ? [{ role: 'CLIENT', fullName: draft.clientName.trim(), pinfl: draft.clientPinfl }, ...(draft.counterpartyName.trim() ? [{ role: 'COUNTERPARTY', fullName: draft.counterpartyName.trim(), pinfl: draft.counterpartyPinfl }] : [])]
      : [{ role: 'CLIENT', userId: profile!.id, pinfl: profile!.pinfl, fullName: profile!.fullName }, ...(draft.counterpartyName.trim() ? [{ role: 'COUNTERPARTY', fullName: draft.counterpartyName.trim(), pinfl: draft.counterpartyPinfl }] : [])]
    try {
      const created = await apiPost<Contract>('/contracts', { type: draft.type, templateId: draft.templateId, providerUserId: isProvider ? undefined : draft.providerUserId, title: draft.title, caseSummary: draft.caseSummary, rightsAndResponsibilities: draft.rightsAndResponsibilities, terms: draft.terms, participants })
      setCreating(false); setDraft((current) => ({ ...current, title: '', caseSummary: '', rightsAndResponsibilities: '', terms: '', clientName: '', clientPinfl: '', counterpartyName: '', counterpartyPinfl: '' }))
      await reload(); await openContract(created.id); onToast('Shartnoma qoralamasi yaratildi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Shartnoma yaratilmadi.') }
    finally { setBusy(false) }
  }

  const runAction = async (path: string, body?: unknown) => {
    if (!selected) return
    setBusy(true); setError('')
    try {
      const updated = await apiPost<Contract>(`/contracts/${selected.id}/${path}`, body || {})
      setSelected(updated); await reload(); onToast('Shartnoma holati yangilandi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Amalni bajarib bo‘lmadi.') }
    finally { setBusy(false) }
  }

  const createInvoiceAndSend = async () => {
    if (!selected || !invoiceAmount) { setError('Invoys summasini kiriting.'); return }
    setBusy(true); setError('')
    try {
      await apiPost(`/contracts/${selected.id}/invoice`, { amount: Number(invoiceAmount) })
      const updated = await apiPost<Contract>(`/contracts/${selected.id}/send`, {})
      setSelected(updated); setInvoiceAmount(''); await reload(); onToast('Invoys va shartnoma taraflarga yuborildi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Invoys yoki shartnoma yuborilmadi.') }
    finally { setBusy(false) }
  }

  if (!authenticated) return <section><Heading title="Shartnomalar" detail="Mediatsiya, arbitraj va hakamlik muhokamasi uchun elektron shartnomalar."/><div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Demo kabinetda shartnomalar brauzerda qoladi va rasmiy kuchga ega bo‘lmaydi. Haqiqiy shartnomani ko‘rish, ERI bilan imzolash va billing uchun tasdiqlangan hisob bilan kiring.</div></section>

  return <section>
    {selected ? <>
      <button onClick={() => { setSelected(null); setError('') }} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15}/>Shartnomalar ro‘yxati</button>
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-blue-800">{selected.contractNumber} · {selected.type}</p><h1 className="mt-2 text-2xl font-semibold">{selected.title}</h1><p className="mt-1 text-sm text-slate-500">Xizmat ko‘rsatuvchi: {selected.provider?.fullName || '—'} · Namuna v{selected.template?.version || '—'}</p></div><span className="h-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">{statusLabels[selected.status] || selected.status}</span></div>
        {error && <ErrorNotice message={error}/>}<div className="mt-5 grid gap-3 sm:grid-cols-3">{selected.participants.map((party) => <div key={party.id} className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-semibold text-slate-700">{party.role === 'CLIENT' ? 'Mijoz' : party.role === 'COUNTERPARTY' ? 'Qarama-qarshi taraf' : 'Xizmat ko‘rsatuvchi'}</p><p className="mt-1 text-sm font-medium">{party.fullName}</p><p className="mt-1 text-xs text-slate-500">{party.status}{party.signedAt ? ` · ${new Date(party.signedAt).toLocaleString('uz-UZ')}` : ''}</p>{party.decisionNote && <p className="mt-2 text-xs text-amber-800">{party.decisionNote}</p>}</div>)}</div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]"><article className="rounded-xl bg-slate-50 p-4"><h2 className="text-sm font-semibold">Shartnoma matni</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.renderedContent || selected.caseSummary || 'Matn mavjud emas.'}</p><button onClick={() => void apiDownload(`/contracts/${selected.id}/document`, `${selected.contractNumber}.pdf`).catch((cause) => setError(cause instanceof Error ? cause.message : 'PDF yuklanmadi.'))} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"><Download size={14}/>PDF nusxasi</button></article>
          <aside className="space-y-3">{selected.status === 'PENDING_PARTIES' && <div className="rounded-xl border border-emerald-100 p-4"><p className="text-sm font-semibold">Taraf qarori</p><label className="mt-3 block text-xs font-semibold text-slate-600">E-IMZO PKCS#7 qiymati<textarea value={signature} onChange={(event) => setSignature(event.target.value)} className="form-control mt-1 min-h-24 font-mono text-xs" placeholder="ERI imzo qiymatini kiriting"/></label><button disabled={busy || signature.trim().length < 100} onClick={() => void runAction('sign', { pkcs7: signature.trim() })} className="mt-3 h-9 w-full rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-40">Imzolash</button><label className="mt-3 block text-xs font-semibold text-slate-600">Rad etish yoki qaytarish sababi<input value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} className="form-control mt-1"/></label><div className="mt-2 grid grid-cols-2 gap-2"><button disabled={busy} onClick={() => void runAction('reject', { reason: decisionReason })} className="h-9 rounded-lg border border-red-200 text-xs font-semibold text-red-800">Rad etish</button><button disabled={busy} onClick={() => void runAction('return-for-edit', { reason: decisionReason })} className="h-9 rounded-lg border border-amber-200 text-xs font-semibold text-amber-900">Tahrirga qaytarish</button></div></div>}
            {selected.status === 'AWAITING_PROVIDER_APPROVAL' && <div className="rounded-xl border border-blue-100 p-4"><p className="text-sm font-semibold">Xizmat ko‘rsatuvchi tasdig‘i</p><label className="mt-3 block text-xs font-semibold text-slate-600">Yakuniy ERI PKCS#7<textarea value={signature} onChange={(event) => setSignature(event.target.value)} className="form-control mt-1 min-h-24 font-mono text-xs"/></label><button disabled={busy || signature.trim().length < 100} onClick={() => void runAction('approve', { pkcs7: signature.trim() })} className="mt-3 h-9 w-full rounded-lg bg-blue-800 text-xs font-semibold text-white disabled:opacity-40">Yakuniy tasdiqlash</button></div>}
            {isProvider && ['DRAFT', 'RETURNED_FOR_EDIT'].includes(selected.status) && <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold">Invoys yaratish va yuborish</p><label className="mt-3 block text-xs font-semibold text-slate-600">Xizmat haqi, so‘m<input type="number" min="1" value={invoiceAmount} onChange={(event) => setInvoiceAmount(event.target.value)} className="form-control mt-1"/></label><button disabled={busy} onClick={() => void createInvoiceAndSend()} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 text-xs font-semibold text-white"><Send size={14}/>Invoys bilan yuborish</button></div>}
            {(selected.invoices || []).map((invoice) => <div key={invoice.id} className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold">Invoys {invoice.invoiceNumber}</p><p className="mt-1 text-xs text-slate-500">{Number(invoice.amount).toLocaleString('uz-UZ')} so‘m · {invoice.billingTransaction?.paymentStatus || '—'}</p>{invoice.billingTransaction?.paymentStatus === 'PAID' && <button onClick={() => void apiDownload(`/invoices/${invoice.id}/receipt`, `kvitansiya-${invoice.invoiceNumber}.pdf`).catch((cause) => setError(cause instanceof Error ? cause.message : 'Kvitansiya yuklanmadi.'))} className="mt-3 inline-flex h-8 items-center gap-1 text-xs font-semibold text-blue-800"><FileText size={14}/>Kvitansiya</button>}</div>)}
          </aside></div>
      </div>
    </> : <>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><Heading title="Shartnomalar" detail="Mediatsiya, arbitraj va hakamlik muhokamasi uchun elektron shartnomalar."/><button onClick={() => { setCreating((value) => !value); setError('') }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"><FilePlus2 size={15}/>{creating ? 'Yopish' : 'Yangi shartnoma'}</button></div>
      {error && <ErrorNotice message={error}/>} {creating && <form onSubmit={submitCreate} className="mb-5 space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><h2 className="font-semibold">Yangi shartnoma qoralamasi</h2><div className="grid gap-3 sm:grid-cols-2"><Field label="Tartib-taomil turi"><select disabled={role !== 'APPLICANT'} value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as ContractType, templateId: '', providerUserId: '' }))} className="form-control">{contractTypes.filter(([value]) => role === 'APPLICANT' ? value === 'MEDIATION' : value === initialType).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Shartnoma namunasi"><select required value={draft.templateId} onChange={(event) => setDraft((current) => ({ ...current, templateId: event.target.value }))} className="form-control"><option value="">Namunani tanlang</option>{templates.filter((item) => item.type === draft.type).map((template) => <option key={template.id} value={template.id}>{template.name} · v{template.version}</option>)}</select></Field>{!isProvider && <Field label="Mediator / mutaxassis"><select required value={draft.providerUserId} onChange={(event) => setDraft((current) => ({ ...current, providerUserId: event.target.value }))} className="form-control"><option value="">Mutaxassisni tanlang</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.fullName} · {provider.region}</option>)}</select></Field>}<Field label="Shartnoma nomi"><input required maxLength={250} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="form-control"/></Field>
        {isProvider ? <><Field label="Mijoz F.I.Sh."><input required value={draft.clientName} onChange={(event) => setDraft((current) => ({ ...current, clientName: event.target.value }))} className="form-control"/></Field><Field label="Mijoz PINFL"><input required inputMode="numeric" pattern="\d{14}" maxLength={14} value={draft.clientPinfl} onChange={(event) => setDraft((current) => ({ ...current, clientPinfl: event.target.value.replace(/\D/g, '') }))} className="form-control"/></Field></> : <><div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900 sm:col-span-2">Mijoz taraf: {profile?.fullName || 'profil'} · PINFL {profile?.pinfl || 'to‘ldirilmagan'}</div><Field label="Ikkinchi taraf F.I.Sh. (ixtiyoriy)"><input value={draft.counterpartyName} onChange={(event) => setDraft((current) => ({ ...current, counterpartyName: event.target.value }))} className="form-control"/></Field><Field label="Ikkinchi taraf PINFL"><input inputMode="numeric" pattern="\d{14}" maxLength={14} value={draft.counterpartyPinfl} onChange={(event) => setDraft((current) => ({ ...current, counterpartyPinfl: event.target.value.replace(/\D/g, '') }))} className="form-control"/></Field></>}
        {isProvider && <><Field label="Ikkinchi taraf F.I.Sh. (ixtiyoriy)"><input value={draft.counterpartyName} onChange={(event) => setDraft((current) => ({ ...current, counterpartyName: event.target.value }))} className="form-control"/></Field><Field label="Ikkinchi taraf PINFL"><input inputMode="numeric" pattern="\d{14}" maxLength={14} value={draft.counterpartyPinfl} onChange={(event) => setDraft((current) => ({ ...current, counterpartyPinfl: event.target.value.replace(/\D/g, '') }))} className="form-control"/></Field></>}
        <Field label="Nizo mazmuni"><textarea required value={draft.caseSummary} onChange={(event) => setDraft((current) => ({ ...current, caseSummary: event.target.value }))} className="form-control min-h-20"/></Field><Field label="Huquq va majburiyatlar"><textarea required value={draft.rightsAndResponsibilities} onChange={(event) => setDraft((current) => ({ ...current, rightsAndResponsibilities: event.target.value }))} className="form-control min-h-20"/></Field><Field label="Muddatlar va boshqa shartlar"><textarea required value={draft.terms} onChange={(event) => setDraft((current) => ({ ...current, terms: event.target.value }))} className="form-control min-h-20"/></Field></div><button disabled={busy} className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50">Qoralamani yaratish</button></form>}
      {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18}/>Shartnomalar yuklanmoqda…</div> : <div className="space-y-3">{contracts.map((contract) => <button key={contract.id} onClick={() => void openContract(contract.id)} className="flex w-full flex-col justify-between gap-3 rounded-xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200/70 sm:flex-row sm:items-center"><div><p className="text-xs font-semibold text-blue-800">{contract.contractNumber} · {contract.type}</p><h2 className="mt-1 font-semibold">{contract.title}</h2><p className="mt-1 text-xs text-slate-500">Xizmat ko‘rsatuvchi: {contract.provider?.fullName || '—'} · {contract.participants?.map((party) => party.fullName).join(', ')}</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium">{statusLabels[contract.status] || contract.status}</span></button>)}{!contracts.length && <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Shartnoma topilmadi. Yangi qoralama yaratishingiz mumkin.</div>}</div>}
    </>}
  </section>
}

function Heading({ title, detail }: { title: string; detail: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Elektron hujjatlar</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1><p className="mt-1.5 text-sm text-slate-500">{detail}</p></div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-slate-600">{label}<span className="mt-1 block">{children}</span></label> }
function ErrorNotice({ message }: { message: string }) { return <div role="alert" className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">{message}</div> }
