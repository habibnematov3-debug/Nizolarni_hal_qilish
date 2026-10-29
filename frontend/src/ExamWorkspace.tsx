import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Check, Download, FileText, LoaderCircle, Video } from 'lucide-react'
import { apiDownload, apiGet, apiPost, getAccessToken } from './api'

type MkExam = { id: string; scheduledAt: string; venue: string; streamUrl?: string | null; protocolFileId?: string | null; status: string; assignments?: { score?: { score: number | string; comment?: string | null } | null }[] }
type MkApplication = { id: string; status: string; submittedAt: string; phone: string; email?: string | null; profession?: string | null; rejectionReason?: string | null; exams?: MkExam[] }
type ExamQuestion = { id: string; text: string; options?: unknown }
type ExamDetail = MkExam & { questions: ExamQuestion[] }

const statusLabels: Record<string, string> = { SUBMITTED: 'Yangi yuborildi', CHECKING: 'Tekshiruvda', ACCEPTED: 'Qabul qilindi', REJECTED: 'Rad etildi', INVITED: 'Imtihonga chaqirildi', PASSED: 'Imtihondan o‘tdi', FAILED: 'Imtihondan o‘tmadi', REGISTERED: 'Reyestrga kiritildi', SCHEDULED: 'Rejalashtirilgan', COMPLETED: 'Yakunlangan' }

export function ExamWorkspace({ role, page, onToast }: { role: string; page: string; onToast: (message: string) => void }) {
  const [applications, setApplications] = useState<MkApplication[]>([])
  const [assignedExams, setAssignedExams] = useState<MkExam[]>([])
  const [selectedExam, setSelectedExam] = useState<ExamDetail | null>(null)
  const [inviteFor, setInviteFor] = useState('')
  const [rejectFor, setRejectFor] = useState('')
  const [invite, setInvite] = useState({ scheduledAt: '', venue: '', secretaryPhone: '', questionCount: '20', streamUrl: '' })
  const [rejectReason, setRejectReason] = useState('')
  const [scores, setScores] = useState<Record<string, { score: string; comment: string }>>({})
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const authenticated = Boolean(getAccessToken())
  const applicantView = role === 'APPLICANT'
  const staffReviewView = ['COMMISSION', 'MINISTRY'].includes(role)
  const ballotView = page === 'Elektron byulleten'
  const protocolView = page === 'Bayonnomalar'

  const reload = useCallback(async () => {
    if (!authenticated) return
    setLoading(true); setError('')
    try {
      if (applicantView) setApplications(await apiGet<MkApplication[]>('/cabinet/mk/applications'))
      else if (staffReviewView) {
        const [rows, exams] = await Promise.all([
          apiGet<MkApplication[]>('/committee/mk/applications'),
          role === 'COMMISSION' ? apiGet<MkExam[]>('/committee/mk/exams') : Promise.resolve([] as MkExam[]),
        ])
        setApplications(rows || [])
        setAssignedExams(exams || [])
      } else setError('Bu imtihon bo‘limi uchun tegishli kabinet roli kerak.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Imtihon ma’lumotlarini yuklab bo‘lmadi.') }
    finally { setLoading(false) }
  }, [authenticated, applicantView, role, staffReviewView])
  useEffect(() => { void reload() }, [reload])

  const loadExam = async (id: string) => {
    setError('')
    try { setSelectedExam(await apiGet<ExamDetail>(`/cabinet/mk/exams/${id}`)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Imtihon savollarini yuklab bo‘lmadi.') }
  }
  const applicationDecision = async (id: string, action: 'accept' | 'reject') => {
    if (action === 'reject' && !rejectReason.trim()) { setError('Arizani rad etish sababini yozing.'); return }
    setBusy(true); setError('')
    try {
      if (action === 'accept') await apiPost(`/committee/mk/applications/${id}/accept`, {})
      else await apiPost(`/committee/mk/applications/${id}/reject`, { rejectionReason: rejectReason.trim() })
      setRejectFor(''); setRejectReason(''); await reload()
      onToast(action === 'accept' ? 'Ariza qabul qilindi.' : 'Ariza rad etildi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ariza holatini yangilab bo‘lmadi.') }
    finally { setBusy(false) }
  }
  const submitInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!inviteFor) return
    setBusy(true); setError('')
    try {
      await apiPost(`/committee/mk/applications/${inviteFor}/invite`, { scheduledAt: new Date(invite.scheduledAt).toISOString(), venue: invite.venue, secretaryPhone: invite.secretaryPhone, questionCount: Number(invite.questionCount), streamUrl: invite.streamUrl || undefined })
      setInviteFor(''); setInvite({ scheduledAt: '', venue: '', secretaryPhone: '', questionCount: '20', streamUrl: '' }); await reload()
      onToast('Imtihon taklifnomasi yuborildi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Imtihon taklifnomasini yuborib bo‘lmadi.') }
    finally { setBusy(false) }
  }
  const submitScore = async (examId: string) => {
    const value = scores[examId]
    if (!value || value.score === '' || Number(value.score) < 0 || Number(value.score) > 100) { setError('Bahoni 0 dan 100 gacha kiriting.'); return }
    setBusy(true); setError('')
    try {
      await apiPost(`/committee/mk/exams/${examId}/score`, { score: Number(value.score), comment: value.comment || undefined })
      await reload(); onToast('Elektron byulleten saqlandi.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Bahoni saqlab bo‘lmadi.') }
    finally { setBusy(false) }
  }

  const heading = applicantView ? 'Malaka imtihoni' : page
  return <section>
    <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Malaka va baholash</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{heading}</h1><p className="mt-1.5 text-sm text-slate-500">Imtihon jadvali, translyatsiya, komissiya baholari va bayonnomalar.</p></div>
    {!authenticated && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Demo kabinetda imtihon ma’lumotlari o‘zgartirilmaydi. Haqiqiy imtihonlar uchun OneID/ERI orqali tasdiqlangan va tegishli rolga ega seans bilan kiring.</div>}
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    {loading ? <div className="flex items-center justify-center gap-2 rounded-xl bg-white p-10 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18}/>Imtihonlar yuklanmoqda…</div> : !authenticated ? null : applicantView ? <div className="space-y-3">{applications.flatMap((application) => (application.exams || []).map((exam) => <article key={exam.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase text-emerald-800">{statusLabels[exam.status] || exam.status}</p><h2 className="mt-2 text-base font-semibold">{new Date(exam.scheduledAt).toLocaleString('uz-UZ')}</h2><p className="mt-1 text-sm text-slate-500">{exam.venue}</p><p className="mt-1 text-xs text-slate-400">Ariza: {application.id}</p></div><div className="flex flex-wrap gap-2">{exam.streamUrl && <a href={exam.streamUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-800 px-3 text-xs font-semibold text-white"><Video size={14}/>Jonli translyatsiya</a>}<button onClick={() => void loadExam(exam.id)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold">Savollar</button>{exam.protocolFileId && <button onClick={() => void apiDownload(`/cabinet/mk/exams/${exam.id}/protocol`, `imtihon-bayonnomasi-${exam.id}.pdf`).catch((cause) => setError(cause instanceof Error ? cause.message : 'Bayonnomani yuklab bo‘lmadi.'))} className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 px-3 text-xs font-semibold text-blue-900"><FileText size={14}/>Bayonnoma</button>}</div></div></article>))}{applications.every((application) => !(application.exams || []).length) && <EmptyExam text="Sizga hali malaka imtihoni belgilanmagan."/>}{selectedExam && <ExamQuestions exam={selectedExam} onClose={() => setSelectedExam(null)}/>}</div> : staffReviewView && !ballotView && !protocolView ? <div className="space-y-3">{applications.map((application) => <article key={application.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-emerald-800">{application.id} · {application.profession || 'MEDIATOR'}</p><h2 className="mt-2 font-semibold">Mediator maqomiga ariza</h2><p className="mt-1 text-xs text-slate-500">{application.phone} · {new Date(application.submittedAt).toLocaleDateString('uz-UZ')}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{statusLabels[application.status] || application.status}</span></div>{application.rejectionReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">Rad etilgan: {application.rejectionReason}</p>}{application.exams?.map((exam) => <div key={exam.id} className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50 p-3 text-sm"><span>{new Date(exam.scheduledAt).toLocaleString('uz-UZ')} · {exam.venue}</span>{exam.streamUrl && <a href={exam.streamUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800"><Video size={14}/>Translyatsiya</a>}</div>)}{['SUBMITTED', 'CHECKING'].includes(application.status) && <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={() => void applicationDecision(application.id, 'accept')} className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white"><Check size={14}/>Qabul qilish</button><button disabled={busy} onClick={() => { setRejectFor(rejectFor === application.id ? '' : application.id); setError('') }} className="h-9 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-800">Rad etish</button></div>}{rejectFor === application.id && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} maxLength={2000} className="form-control" placeholder="Rad etish sababi"/><button onClick={() => void applicationDecision(application.id, 'reject')} disabled={busy} className="h-10 shrink-0 rounded-lg bg-red-700 px-4 text-xs font-semibold text-white">Rad etish sababini yuborish</button></div>}{application.status === 'ACCEPTED' && <button onClick={() => { setInviteFor(inviteFor === application.id ? '' : application.id); setError('') }} className="mt-3 h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold">Imtihonga chaqirish</button>}{inviteFor === application.id && <form onSubmit={(event) => void submitInvite(event)} className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><label className="text-xs font-semibold">Sana va vaqt<input required type="datetime-local" value={invite.scheduledAt} onChange={(event) => setInvite((current) => ({ ...current, scheduledAt: event.target.value }))} className="form-control mt-1"/></label><label className="text-xs font-semibold">Imtihon joyi<input required maxLength={500} value={invite.venue} onChange={(event) => setInvite((current) => ({ ...current, venue: event.target.value }))} className="form-control mt-1"/></label><label className="text-xs font-semibold">Kotib telefoni<input required type="tel" value={invite.secretaryPhone} onChange={(event) => setInvite((current) => ({ ...current, secretaryPhone: event.target.value }))} className="form-control mt-1"/></label><label className="text-xs font-semibold">Savollar soni<input required type="number" min="1" max="100" value={invite.questionCount} onChange={(event) => setInvite((current) => ({ ...current, questionCount: event.target.value }))} className="form-control mt-1"/></label><label className="text-xs font-semibold sm:col-span-2">Jonli translyatsiya HTTPS havolasi<input type="url" value={invite.streamUrl} onChange={(event) => setInvite((current) => ({ ...current, streamUrl: event.target.value }))} className="form-control mt-1" placeholder="https://…"/></label><button disabled={busy} className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">Taklifnoma va bildirishnomani yuborish</button></form>}</article>)}{!applications.length && <EmptyExam text="Komissiya ko‘rib chiqishi uchun arizalar yo‘q."/>}</div> : role === 'COMMISSION' && ballotView ? <div className="space-y-3">{assignedExams.map((exam) => { const assignment = exam.assignments?.[0]; const saved = assignment?.score; const value = scores[exam.id] || { score: saved ? String(saved.score) : '', comment: saved?.comment || '' }; return <article key={exam.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">Imtihon · {new Date(exam.scheduledAt).toLocaleString('uz-UZ')}</h2><p className="mt-1 text-sm text-slate-500">{exam.venue} · Ariza {exam.id}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{statusLabels[exam.status] || exam.status}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-[150px_1fr_auto]"><label className="text-xs font-semibold text-slate-600">Baho (0–100)<input type="number" min="0" max="100" value={value.score} onChange={(event) => setScores((current) => ({ ...current, [exam.id]: { ...value, score: event.target.value } }))} className="form-control mt-1"/></label><label className="text-xs font-semibold text-slate-600">Izoh<textarea value={value.comment} onChange={(event) => setScores((current) => ({ ...current, [exam.id]: { ...value, comment: event.target.value } }))} maxLength={2000} className="form-control mt-1 min-h-10"/></label><button onClick={() => void submitScore(exam.id)} disabled={busy || exam.status === 'COMPLETED'} className="mt-5 h-10 rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white disabled:opacity-50">{saved ? 'Bahoni yangilash' : 'Byulletenni yuborish'}</button></div></article>})}{!assignedExams.length && <EmptyExam text="Sizga biriktirilgan imtihon topilmadi."/>}</div> : role === 'COMMISSION' && protocolView ? <div className="space-y-3">{assignedExams.filter((exam) => exam.protocolFileId).map((exam) => <article key={exam.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div><h2 className="font-semibold">Imtihon bayonnomasi</h2><p className="mt-1 text-sm text-slate-500">{new Date(exam.scheduledAt).toLocaleString('uz-UZ')} · {exam.venue}</p></div><button onClick={() => void apiDownload(`/committee/mk/exams/${exam.id}/protocol`, `imtihon-bayonnomasi-${exam.id}.pdf`).catch((cause) => setError(cause instanceof Error ? cause.message : 'Bayonnoma yuklanmadi.'))} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold"><Download size={14}/>PDF yuklab olish</button></article>)}{!assignedExams.some((exam) => exam.protocolFileId) && <EmptyExam text="Yakunlangan imtihon bayonnomalari yo‘q."/>}</div> : <EmptyExam text="Bu bo‘limni ochish uchun komissiya yoki talabgor hisobi kerak."/>}
  </section>
}

function ExamQuestions({ exam, onClose }: { exam: ExamDetail; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Random tanlangan imtihon savollari</h2><p className="mt-1 text-sm text-slate-500">{new Date(exam.scheduledAt).toLocaleString('uz-UZ')} · {exam.venue}</p></div><button onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Yopish</button></div><ol className="mt-5 space-y-3">{exam.questions.map((question, index) => <li key={question.id} className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold">{index + 1}. {question.text}</p>{Array.isArray(question.options) && <ul className="mt-3 space-y-2">{question.options.map((option, optionIndex) => <li key={optionIndex} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{String(option)}</li>)}</ul>}</li>)}</ol>{!exam.questions.length && <p className="mt-5 text-sm text-slate-500">Imtihon savollari mavjud emas.</p>}</section></div>
}

function EmptyExam({ text }: { text: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">{text}</div>
}
