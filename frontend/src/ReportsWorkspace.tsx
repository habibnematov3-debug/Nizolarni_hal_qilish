import { useCallback, useEffect, useState } from 'react'
import { Download, FilePlus2, LoaderCircle, Send, Check, RotateCcw } from 'lucide-react'
import { apiDownload, apiGet, apiPost, apiPut, getAccessToken } from './api'

type ReportRecord = {
  id: string
  status: string
  periodYear: number
  periodQuarter: number
  additionalData?: Record<string, unknown> | null
  prefilledData?: Record<string, unknown> | null
  returnReason?: string | null
  mediator?: { fullName?: string }
  organization?: { name?: string }
}
type DemoReport = { id: string; title: string; status: string; detail?: string }

const statusLabels: Record<string, string> = { DRAFT: 'Qoralama', RETURNED: 'Qaytarilgan', SUBMITTED: 'Yuborilgan', ACCEPTED: 'Qabul qilingan', FORWARDED: 'Vazirlikka yuborilgan' }
const quarterLabel = (year: number, quarter: number) => `${year}-yil, ${quarter}-chorak`

export function ReportsWorkspace({ title, items, onCreate, role }: { title: string; items: DemoReport[]; onCreate: () => void; onAdvance: (id: string) => void; role: string }) {
  const authenticated = Boolean(getAccessToken())
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [current, setCurrent] = useState<ReportRecord | null>(null)
  const [summaries, setSummaries] = useState<ReportRecord[]>([])
  const [analytics, setAnalytics] = useState<{ reportCount?: number; totals?: Record<string, number>; byRegion?: { organizationName: string; reportCount: number; totals: Record<string, number> }[] } | null>(null)
  const [sessions, setSessions] = useState('')
  const [resolved, setResolved] = useState('')
  const [notes, setNotes] = useState('')
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ministry = role === 'MINISTRY' || role === 'ADMIN'
  const regional = role === 'REGIONAL'

  const reload = useCallback(async () => {
    if (!authenticated) return
    setLoading(true)
    setError('')
    try {
      if (ministry) {
        const [summaryRows, analysis] = await Promise.all([
          apiGet<ReportRecord[]>('/ministry/report-summaries'),
          apiGet<NonNullable<typeof analytics>>('/ministry/analytics'),
        ])
        setSummaries(summaryRows || [])
        setAnalytics(analysis)
      } else if (regional) {
        const result = await apiGet<{ items: ReportRecord[] }>('/staff/reports?page=1&limit=50')
        setReports(result.items || [])
      } else {
        const [report, list] = await Promise.all([
          apiGet<ReportRecord>('/cabinet/reports/current'),
          apiGet<{ items: ReportRecord[] }>('/cabinet/reports?page=1&limit=20'),
        ])
        setCurrent(report)
        setReports(list.items || [])
        const data = report.additionalData || {}
        setSessions(String(data.mediationSessions ?? ''))
        setResolved(String(data.resolvedCases ?? ''))
        setNotes(String(data.notes ?? ''))
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Hisobotlarni yuklab bo‘lmadi.')
    } finally { setLoading(false) }
  }, [authenticated, ministry, regional])

  useEffect(() => { void reload() }, [reload])

  const saveReport = async () => {
    if (!current) return
    setBusy(true); setError('')
    try {
      const saved = await apiPut<ReportRecord>(`/cabinet/reports/${current.id}`, { additionalData: { mediationSessions: Number(sessions) || 0, resolvedCases: Number(resolved) || 0, notes } })
      setCurrent(saved)
      await reload()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Hisobotni saqlab bo‘lmadi.') }
    finally { setBusy(false) }
  }

  const submitReport = async (id: string) => {
    setBusy(true); setError('')
    try { await apiPost(`/cabinet/reports/${id}/submit`, {}); await reload() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Hisobotni yuborib bo‘lmadi.') }
    finally { setBusy(false) }
  }

  const decideReport = async (id: string, decision: 'accept' | 'return') => {
    if (decision === 'return' && !returnReasons[id]?.trim()) { setError('Hisobotni qaytarish sababini yozing.'); return }
    setBusy(true); setError('')
    try {
      if (decision === 'accept') await apiPost(`/staff/reports/${id}/accept`, {})
      else await apiPost(`/staff/reports/${id}/return`, { reason: returnReasons[id].trim() })
      await reload()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Hisobot holatini yangilab bo‘lmadi.') }
    finally { setBusy(false) }
  }

  const createAndSubmitSummary = async () => {
    const now = new Date()
    const period = { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 }
    setBusy(true); setError('')
    try {
      const summary = await apiPost<ReportRecord>('/staff/report-summaries', period)
      await apiPost(`/staff/report-summaries/${summary.id}/submit`, {})
      await reload()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Hududiy jamlanmani yuborib bo‘lmadi.') }
    finally { setBusy(false) }
  }

  if (!authenticated) return <>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-700">Tahlil va hisobot</p><h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1><p className="mt-1.5 text-sm text-slate-500">Hisobotlar mediator, hududiy adliya va vazirlik bosqichlari bo‘yicha yuboriladi.</p></div><button onClick={onCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"><FilePlus2 size={16}/>Demo hisobot</button></div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Demo kabinetda hisobot faqat brauzerda saqlanadi. Rasmiy yuborish uchun mediator yoki adliya xodimi hisobiga kiring.</div>
    <div className="mt-4 space-y-3">{items.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">{item.title}</h2><p className="mt-1 text-sm text-slate-500">{item.id} · {item.detail}</p><p className="mt-3 text-xs">{item.status}</p></article>)}</div>
  </>

  return <>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-700">Tahlil va hisobot</p><h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1><p className="mt-1.5 text-sm text-slate-500">Ma’lumotlar hisobot xizmatidan olinadi va yuborilgan amallar serverda qayd etiladi.</p></div>{regional && <button disabled={busy} onClick={() => void createAndSubmitSummary()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"><Send size={15}/>Hududiy jamlanmani yuborish</button>}</div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18}/>Hisobotlar yuklanmoqda…</div> : <>
      {ministry ? <>
        <div className="grid gap-4 sm:grid-cols-3"><Metric title="Hisobotlar" value={analytics?.reportCount ?? 0}/>{Object.entries(analytics?.totals || {}).slice(0, 2).map(([label, value]) => <Metric key={label} title={label} value={value}/>)}</div>
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Hududlar kesimidagi tahlil</h2><p className="mt-1 text-xs text-slate-500">Yuborilgan va qabul qilingan hisobotlar</p></div><div className="flex gap-2"><button onClick={() => void apiDownload('/ministry/analytics/export?format=excel', 'hisobotlar-tahlili.xls').catch((cause) => setError(cause instanceof Error ? cause.message : 'Excel eksport bajarilmadi.'))} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold"><Download size={14}/>Excel</button><button onClick={() => void apiDownload('/ministry/analytics/export?format=pdf', 'hisobotlar-tahlili.pdf').catch((cause) => setError(cause instanceof Error ? cause.message : 'PDF eksport bajarilmadi.'))} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold"><Download size={14}/>PDF</button></div></div><div className="mt-4 divide-y divide-slate-100">{(analytics?.byRegion || []).map((row) => <div key={row.organizationName} className="flex justify-between gap-3 py-3 text-sm"><span>{row.organizationName}</span><span className="font-semibold">{row.reportCount} ta hisobot · {Object.entries(row.totals).map(([key, value]) => `${key}: ${value}`).join(', ')}</span></div>)}{!analytics?.byRegion?.length && <p className="py-6 text-sm text-slate-500">Hozircha tahlil uchun yuborilgan hisobot yo‘q.</p>}</div></section>
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><h2 className="font-semibold">Hududiy jamlanmalar</h2><div className="mt-3 divide-y divide-slate-100">{summaries.map((summary) => <div key={summary.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{summary.organization?.name || 'Hudud'} · {quarterLabel(summary.periodYear, summary.periodQuarter)}</span><span>{statusLabels[summary.status] || summary.status}</span></div>)}{!summaries.length && <p className="py-4 text-sm text-slate-500">Vazirlikka yuborilgan jamlanmalar yo‘q.</p>}</div></section>
      </> : regional ? <section className="space-y-3">{reports.map((report) => <article key={report.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{report.mediator?.fullName || 'Mediator'} · {quarterLabel(report.periodYear, report.periodQuarter)}</h2><p className="mt-1 text-xs text-slate-500">{report.organization?.name || 'Hudud'} · {report.id}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{statusLabels[report.status] || report.status}</span></div>{report.returnReason && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Qaytarish sababi: {report.returnReason}</p>}<pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(report.additionalData || {}, null, 2)}</pre>{report.status === 'SUBMITTED' && <div className="mt-3 flex flex-wrap items-end gap-2"><label className="min-w-64 flex-1 text-xs text-slate-600">Qaytarish sababi<input value={returnReasons[report.id] || ''} onChange={(event) => setReturnReasons((current) => ({ ...current, [report.id]: event.target.value }))} className="form-control mt-1"/></label><button disabled={busy} onClick={() => void decideReport(report.id, 'return')} className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-900"><RotateCcw size={14}/>Qaytarish</button><button disabled={busy} onClick={() => void decideReport(report.id, 'accept')} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white"><Check size={14}/>Qabul qilish</button></div>}</article>)}{!reports.length && <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Ko‘rib chiqiladigan hisobot yo‘q.</p>}</section> : <>
        {current && <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Joriy chorak hisoboti · {quarterLabel(current.periodYear, current.periodQuarter)}</h2><p className="mt-1 text-xs text-slate-500">Holati: {statusLabels[current.status] || current.status}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{current.organization?.name || 'Biriktirilgan adliya organi'}</span></div>{current.returnReason && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Qaytarilgan: {current.returnReason}</p>}<div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">O‘tkazilgan mediatsiya sessiyalari<input type="number" min="0" value={sessions} onChange={(event) => setSessions(event.target.value)} disabled={!['DRAFT', 'RETURNED'].includes(current.status)} className="form-control mt-1"/></label><label className="text-xs font-semibold text-slate-600">Yakunlangan nizolar<input type="number" min="0" value={resolved} onChange={(event) => setResolved(event.target.value)} disabled={!['DRAFT', 'RETURNED'].includes(current.status)} className="form-control mt-1"/></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Izoh<textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!['DRAFT', 'RETURNED'].includes(current.status)} className="form-control mt-1 min-h-24"/></label></div>{['DRAFT', 'RETURNED'].includes(current.status) && <div className="mt-4 flex justify-end gap-2"><button disabled={busy} onClick={() => void saveReport()} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold">Saqlash</button><button disabled={busy} onClick={() => void submitReport(current.id)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"><Send size={14}/>Hududga yuborish</button></div>}</section>}
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><h2 className="font-semibold">Oldingi hisobotlar</h2><div className="mt-3 divide-y divide-slate-100">{reports.map((report) => <div key={report.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{quarterLabel(report.periodYear, report.periodQuarter)}</span><span>{statusLabels[report.status] || report.status}</span></div>)}{!reports.length && <p className="py-4 text-sm text-slate-500">Oldingi hisobotlar topilmadi.</p>}</div></section>
      </>}
    </>}
  </>
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><p className="text-xs text-slate-500">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>
}
