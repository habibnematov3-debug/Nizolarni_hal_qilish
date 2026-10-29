import { useCallback, useEffect, useState } from 'react'
import { CreditCard, ExternalLink, LoaderCircle, RefreshCw } from 'lucide-react'
import { apiGet, apiPost, getAccessToken } from './api'

type Payment = {
  id: string
  invoiceNumber: string
  amount: number | string
  serviceType: string
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  createdAt: string
  paidAt?: string | null
  metadata?: Record<string, unknown> | null
}

const statusLabels: Record<Payment['paymentStatus'], string> = {
  PENDING: 'To‘lov kutilmoqda',
  PAID: 'To‘langan',
  FAILED: 'To‘lov amalga oshmadi',
  REFUNDED: 'Qaytarilgan',
}

export function BusinessPaymentsWorkspace() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setError('To‘lov invoyslari va holatini ko‘rish uchun tizimga kiring.')
      setLoading(false)
      return
    }
    setLoading(true); setError('')
    try {
      const result = await apiGet<{ items: Payment[] }>('/cabinet/tol/payments?page=1&limit=100')
      setPayments(result.items || [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'To‘lovlar tarixini yuklab bo‘lmadi.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load, reload])

  const reconcile = async (payment: Payment) => {
    setBusyId(payment.invoiceNumber); setError('')
    try {
      await apiPost(`/payments/${encodeURIComponent(payment.invoiceNumber)}/reconcile`, {})
      setReload((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Billing holatini yangilab bo‘lmadi.')
    } finally { setBusyId('') }
  }

  return <section>
    <header className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-emerald-700">Billing va invoyslar</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">To‘lovlar</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Tizimda sizning hisobingiz uchun shakllangan invoyslar, to‘lov va qaytarish holatlari.</p></div><button onClick={() => setReload((value) => value + 1)} className="inline-flex h-10 items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 text-sm sm:self-auto"><RefreshCw size={15}/>Yangilash</button></header>
    <p className="mb-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-5 text-blue-950">To‘lov havolasi invoys yaratilganda ko‘rinadi. Holat billing tizimidan yangilanadi; davlat bojini qaytarish va mediatsiya xizmati uchun alohida hisob-kitob oqimi tegishli idoraviy sozlamalarga bog‘liq.</p>
    {error && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
    {loading ? <div className="flex items-center justify-center gap-2 rounded-xl bg-white p-10 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin"/>Invoyslar yuklanmoqda…</div> : payments.length ? <div className="space-y-3">{payments.map((payment) => {
      const qrUrl = typeof payment.metadata?.billingQrCodeUrl === 'string' ? payment.metadata.billingQrCodeUrl : ''
      return <article key={payment.id} className="flex flex-col justify-between gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:flex-row sm:items-center"><div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><CreditCard size={18}/></span><div className="min-w-0"><p className="break-all text-sm font-semibold text-slate-900">Invoys {payment.invoiceNumber}</p><p className="mt-1 text-xs text-slate-500">{payment.serviceType} · {new Date(payment.createdAt).toLocaleDateString('uz-UZ')}{payment.paidAt ? ` · to‘langan ${new Date(payment.paidAt).toLocaleDateString('uz-UZ')}` : ''}</p><p className="mt-2 text-sm font-semibold text-slate-800">{Number(payment.amount).toLocaleString('uz-UZ')} so‘m</p></div></div><div className="flex flex-wrap items-center gap-2 sm:justify-end"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${payment.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-800' : payment.paymentStatus === 'REFUNDED' ? 'bg-blue-50 text-blue-800' : payment.paymentStatus === 'FAILED' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>{statusLabels[payment.paymentStatus] || payment.paymentStatus}</span>{payment.paymentStatus === 'PENDING' && qrUrl && <a href={qrUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white">To‘lov sahifasini ochish<ExternalLink size={13}/></a>}{payment.paymentStatus === 'PENDING' && <button disabled={busyId === payment.invoiceNumber} onClick={() => void reconcile(payment)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:opacity-50">{busyId === payment.invoiceNumber ? 'Tekshirilmoqda…' : 'Holatini tekshirish'}</button>}</div></article>
    })}</div> : <div className="rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200/70"><CreditCard className="mx-auto text-slate-300" size={27}/><h2 className="mt-3 text-sm font-semibold text-slate-900">Invoyslar topilmadi</h2><p className="mt-1 text-xs text-slate-500">Ushbu foydalanuvchi uchun hali billing invoysi shakllanmagan.</p></div>}
  </section>
}
