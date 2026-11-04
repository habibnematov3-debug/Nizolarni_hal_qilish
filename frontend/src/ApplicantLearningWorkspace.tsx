import { FormEvent, useEffect, useState } from 'react'
import { BookOpen, CalendarDays, CheckCircle2, Circle, FileCheck2, GraduationCap, PlusCircle, QrCode, Users, Video } from 'lucide-react'
import { apiGet, apiPatch, apiPost, getAccessToken } from './api'
import { applicantText, type ApplicantLanguage } from './applicantLocale'

type LearningState = { enrolled: string[]; attended: string[]; examSubmitted: boolean; examScore: number | null }
type LearningCourse = {
  id: string; title: string; type: string; hours?: number; date?: string; detail?: string; durationHours?: number; dateLabel?: string; description?: string; joinUrl?: string | null
  enrollment?: { id: string; enrolledAt: string; attendedAt: string | null; completedAt: string | null } | null
  enrollmentCount?: number
  enrollments?: { id: string; attendedAt: string | null; completedAt: string | null; user: { id: string; fullName: string; pinfl: string | null } }[]
}
const defaultCourses: LearningCourse[] = [
  { id: 'negotiation', title: 'Mediatsiyada muzokara olib borish', type: 'Onlayn kurs', hours: 24, date: '2026-yil 2–20-noyabr', detail: 'Muzokara bosqichlari, taraflar bilan ishlash va kelishuv loyihasi.' },
  { id: 'adr-webinar', title: 'ADR jarayonlarida raqamli hujjatlar', type: 'Vebinar', hours: 2, date: '2026-yil 6-noyabr · 15:00', detail: 'Masofaviy sessiya, elektron hujjat va imzolash amaliyoti.' },
]
const quiz = [
  { prompt: 'Mediatsiyada mediatorning asosiy vazifasi qaysi?', answers: ['Taraflar o‘rniga nizoni hal qilish', 'Taraflarga kelishuvga erishishda ko‘maklashish', 'Sud qarorini chiqarish'], correct: 1 },
  { prompt: 'Majburiy mediatsiya murojaati bo‘yicha mediator qanday tanlanishi mumkin?', answers: ['Faqat qo‘lda tayinlanadi', 'Hudud va ixtisoslikni hisobga olgan tasodifiy tanlov orqali', 'Reyestrga kiritilmagan shaxslar orasidan'], correct: 1 },
  { prompt: 'Masofaviy sessiyani yozib olish qachon mumkin?', answers: ['Har doim', 'Taraflar roziligi bilan', 'Faqat mediator xohlasa'], correct: 1 },
]
const storageKey = 'nizolar.demo.applicant.learning'
const courseCatalogKey = 'nizolar.demo.learning.catalog'
const initial: LearningState = { enrolled: [], attended: [], examSubmitted: false, examScore: null }
const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
function readDemoCourses(): LearningCourse[] {
  try { return JSON.parse(localStorage.getItem(courseCatalogKey) || 'null') || defaultCourses }
  catch { return defaultCourses }
}

export function ApplicantLearningWorkspace({ language, page, onNavigate, onToast }: { language: ApplicantLanguage; page: string; onNavigate: (page: string) => void; onToast: (message: string) => void }) {
  const t = (uz: string, ru: string) => applicantText(language, uz, ru)
  const authenticated = Boolean(getAccessToken())
  const [courses, setCourses] = useState<LearningCourse[]>(readDemoCourses)
  const [state, setState] = useState<LearningState>(() => {
    try { return { ...initial, ...JSON.parse(localStorage.getItem(storageKey) || '{}') } }
    catch { return initial }
  })
  const [loading, setLoading] = useState(authenticated)
  const [error, setError] = useState('')
  const [busyCourseId, setBusyCourseId] = useState('')
  const [answers, setAnswers] = useState<Record<number, number>>({})

  const refreshCourses = async () => {
    if (!authenticated) return
    setLoading(true); setError('')
    try { setCourses(await apiGet<LearningCourse[]>('/cabinet/mk/training-courses')) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Kurslarni yuklab bo‘lmadi.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refreshCourses() }, [authenticated])
  useEffect(() => { if (!authenticated) localStorage.setItem(storageKey, JSON.stringify(state)) }, [authenticated, state])
  useEffect(() => { if (!authenticated) localStorage.setItem(courseCatalogKey, JSON.stringify(courses)) }, [authenticated, courses])

  const isExam = /imtihon/i.test(page)
  const isCertificate = /guvohnoma/i.test(page)
  const courseCompleted = authenticated ? courses.some((course) => course.type === 'COURSE' && Boolean(course.enrollment?.completedAt)) : state.attended.length > 0
  const submitExam = () => {
    if (!quiz.every((_, index) => answers[index] !== undefined)) { onToast(t('Imtihonni yakunlashdan oldin barcha savollarga javob bering.', 'Перед завершением экзамена ответьте на все вопросы.')); return }
    const score = Math.round(quiz.reduce((sum, item, index) => sum + Number(answers[index] === item.correct), 0) / quiz.length * 100)
    setState((value) => ({ ...value, examSubmitted: true, examScore: score }))
    onToast(t('Elektron imtihon javoblari topshirildi. Natija va komissiya qarorini kuting.', 'Ответы на электронный экзамен отправлены. Ожидайте результат и решение комиссии.'))
  }
  const enroll = async (course: LearningCourse) => {
    setBusyCourseId(course.id)
    try {
      if (authenticated) {
        await apiPost(`/cabinet/mk/training-courses/${encodeURIComponent(course.id)}/enroll`, {})
        await refreshCourses()
      } else {
        setState((value) => ({ ...value, enrolled: [...new Set([...value.enrolled, course.id])] }))
      }
      onToast(t('Kursga ro‘yxatdan o‘tildi.', 'Вы записаны на курс.'))
    } catch (cause) { onToast(cause instanceof Error ? cause.message : t('Kursga yozilish amalga oshmadi.', 'Не удалось записаться на курс.')) }
    finally { setBusyCourseId('') }
  }
  const demoAttend = (courseId: string) => {
    setState((value) => ({ ...value, attended: [...new Set([...value.attended, courseId])] }))
    onToast(t('Demo rejimida qatnashuv qayd etildi.', 'В демонстрационном режиме посещение отмечено.'))
  }

  if (isCertificate) return <section>
    <Header language={language} title={t('Malaka guvohnomasi', 'Квалификационное свидетельство')} detail={t('Komissiya qaroridan keyingi QR-kodli elektron guvohnoma.', 'Электронное свидетельство с QR-кодом после решения комиссии.')}/>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]"><article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-start gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><FileCheck2 size={22}/></span><div><h2 className="font-semibold">{t('Elektron malaka guvohnomasi', 'Электронное квалификационное свидетельство')}</h2><p className="mt-1 text-sm text-slate-500">{t('Guvohnoma komissiya qarori va reestrga kiritishdan so‘ng ko‘rsatiladi.', 'Свидетельство отобразится после решения комиссии и внесения в реестр.')}</p></div></div><div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center"><QrCode className="mx-auto text-slate-300" size={42}/><p className="mt-3 text-sm font-medium text-slate-700">{t('QR-kod hozircha mavjud emas', 'QR-код пока недоступен')}</p><p className="mt-1 text-xs text-slate-500">{t('Ijobiy qarordan keyin guvohnoma shu yerda ko‘rinadi.', 'Свидетельство появится здесь после положительного решения.')}</p></div></article><article className="rounded-2xl bg-slate-950 p-5 text-white"><p className="text-sm font-semibold">{t('Bosqichlar', 'Этапы')}</p><div className="mt-4 space-y-4">{[[t('Kursga ro‘yxatdan o‘tish', 'Запись на курс'), courses.some((course) => Boolean(course.enrollment))], [t('Kursni tugatish', 'Завершение курса'), courseCompleted], [t('Elektron imtihon', 'Электронный экзамен'), state.examSubmitted], [t('Komissiya qarori', 'Решение комиссии'), false], [t('QR-kodli guvohnoma', 'Свидетельство с QR-кодом'), false]].map(([label, done]) => <div className="flex items-center gap-3" key={String(label)}>{done ? <CheckCircle2 size={17} className="text-emerald-300"/> : <Circle size={17} className="text-slate-500"/>}<span className={`text-sm ${done ? 'text-white' : 'text-slate-400'}`}>{String(label)}</span></div>)}</div></article></div>
  </section>

  if (isExam) return <section><Header language={language} title={t('Elektron malaka imtihoni', 'Электронный квалификационный экзамен')} detail={t('O‘quv kursi yakunlangach, malaka imtihonini elektron topshiring.', 'После завершения курса сдайте квалификационный экзамен онлайн.')}/><div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{authenticated ? t('Bu sahifadagi imtihon hozircha namuna. Rasmiy imtihonni komissiya tayinlaydi va natijani serverda qayd etadi.', 'Экзамен на этой странице пока демонстрационный. Официальный экзамен назначает комиссия и фиксирует результат на сервере.') : t('Namuna imtihon demo rejimida ishlaydi; javoblar va natija ushbu brauzerda saqlanadi.', 'Демонстрационный экзамен работает в тестовом режиме; ответы и результат сохраняются в этом браузере.')}</div>{!courseCompleted ? <Empty text={t('Imtihonga o‘tishdan oldin kamida bitta o‘quv kursini tugating.', 'Перед экзаменом завершите хотя бы один учебный курс.')}/> : state.examSubmitted ? <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><h2 className="font-semibold">{t('Javoblar topshirildi', 'Ответы отправлены')}</h2><p className="mt-2 text-sm text-slate-600">{t(`Namuna natija: ${state.examScore}%. Rasmiy qarorni komissiya beradi.`, `Демонстрационный результат: ${state.examScore}%. Официальное решение принимает комиссия.`)}</p></div> : <div className="mt-5 space-y-4">{quiz.map((question, questionIndex) => <fieldset key={question.prompt} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><legend className="px-1 text-sm font-semibold">{questionIndex + 1}. {question.prompt}</legend><div className="mt-3 grid gap-2">{question.answers.map((answer, answerIndex) => <label key={answer} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm"><input type="radio" name={`question-${questionIndex}`} checked={answers[questionIndex] === answerIndex} onChange={() => setAnswers((value) => ({ ...value, [questionIndex]: answerIndex }))}/>{answer}</label>)}</div></fieldset>)}<button onClick={submitExam} className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">{t('Imtihon javoblarini yuborish', 'Отправить ответы')}</button></div>}</section>

  return <section><div className="mb-6"><Header language={language} title={t('Onlayn malaka oshirish', 'Онлайн-повышение квалификации')} detail={t('Kurs va vebinarlarga yoziling; qatnashuv va tugatish holatini kuzating.', 'Записывайтесь на курсы и вебинары; отслеживайте посещение и завершение.')}/></div><div className={`mb-5 rounded-xl border p-3 text-xs leading-5 ${authenticated ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{authenticated ? t('Kurs katalogi serverdan yuklanadi. Davomat va kursni tugatganlikni komissiya qayd etadi.', 'Каталог курсов загружается с сервера. Посещение и завершение курса отмечает комиссия.') : t('Demo rejimi: kurslar va ro‘yxatdan o‘tish brauzerda saqlanadi. Haqiqiy kurslar uchun tizimga kiring.', 'Демо-режим: курсы и запись сохраняются в браузере. Для настоящих курсов войдите в систему.')}</div>{error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}{loading ? <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">{t('Kurslar yuklanmoqda…', 'Загрузка курсов…')}</p> : <div className="grid gap-4 lg:grid-cols-2">{courses.map((course) => { const enrolled = authenticated ? Boolean(course.enrollment) : state.enrolled.includes(course.id); const attended = authenticated ? Boolean(course.enrollment?.attendedAt) : state.attended.includes(course.id); const completed = authenticated ? course.type === 'COURSE' && Boolean(course.enrollment?.completedAt) : attended; const title = language === 'ru' && course.id === 'negotiation' ? 'Переговоры в медиации' : course.title; const typeLabel = course.type === 'WEBINAR' || course.type === 'Vebinar' ? t('Vebinar', 'Вебинар') : t('Onlayn kurs', 'Онлайн-курс'); return <article key={course.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">{course.type === 'WEBINAR' || course.type === 'Vebinar' ? <Video size={20}/> : <BookOpen size={20}/>}</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-800">{typeLabel}</span></div><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-500">{course.description || course.detail}</p><div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><CalendarDays size={14}/>{course.dateLabel || course.date}</span><span className="inline-flex items-center gap-1"><GraduationCap size={14}/>{course.durationHours || course.hours} {t('soat', 'часа')}</span>{authenticated && <span className="inline-flex items-center gap-1"><Users size={14}/>{course.enrollmentCount || 0} {t('tinglovchi', 'участников')}</span>}</div><div className="mt-5 flex flex-wrap items-center gap-2">{!enrolled ? <button disabled={busyCourseId === course.id} onClick={() => void enroll(course)} className="h-9 rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white disabled:opacity-50">{busyCourseId === course.id ? t('Yozilmoqda…', 'Запись…') : t('Kursga ro‘yxatdan o‘tish', 'Записаться на курс')}</button> : authenticated ? <><span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">{t('Ro‘yxatdan o‘tilgan', 'Вы записаны')}</span>{course.joinUrl && <a href={course.joinUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">{t('Kursga kirish', 'Перейти к курсу')}</a>}</> : <button disabled={attended} onClick={() => demoAttend(course.id)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold disabled:bg-emerald-50 disabled:text-emerald-800">{attended ? t('Ishtirok qayd etilgan', 'Участие отмечено') : t('Demo qatnashuvini qayd etish', 'Отметить посещение в демо')}</button>}{attended && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 size={15}/>{completed ? t('Kurs tugallangan', 'Курс завершен') : t('Davomat qayd etilgan', 'Посещение отмечено')}</span>}</div></article>})}{!courses.length && <div className="lg:col-span-2"><Empty text={t('Hozircha e’lon qilingan kurs yoki vebinar yo‘q.', 'Пока нет опубликованных курсов и вебинаров.')}/></div>}</div>}<div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl bg-slate-950 p-5 text-white sm:flex-row sm:items-center"><div><h2 className="font-semibold">{t('Malaka imtihoniga tayyormisiz?', 'Готовы к квалификационному экзамену?')}</h2><p className="mt-1 text-xs text-slate-400">{courseCompleted ? t('Kurs tugallangan; imtihon bosqichiga o‘tishingiz mumkin.', 'Курс завершен; можно перейти к экзамену.') : t('Imtihonga o‘tish uchun kamida bitta kursni tugating.', 'Для перехода к экзамену завершите хотя бы один курс.')}</p></div><button disabled={!courseCompleted} onClick={() => onNavigate('Malaka imtihoni')} className="h-10 shrink-0 rounded-lg bg-emerald-300 px-4 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{t('Imtihonga o‘tish', 'Перейти к экзамену')}</button></div></section>
}

export function CommissionTrainingWorkspace({ onToast }: { onToast: (message: string) => void }) {
  const authenticated = Boolean(getAccessToken())
  const [courses, setCourses] = useState<LearningCourse[]>(readDemoCourses)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'COURSE' | 'WEBINAR'>('COURSE')
  const [hours, setHours] = useState('8')
  const [date, setDate] = useState('')
  const [detail, setDetail] = useState('')
  const [joinUrl, setJoinUrl] = useState('')
  const [loading, setLoading] = useState(authenticated)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const refresh = async () => {
    if (!authenticated) return
    setLoading(true)
    try { setCourses(await apiGet<LearningCourse[]>('/committee/mk/training-courses')); setError('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Kurslarni yuklab bo‘lmadi.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [authenticated])
  useEffect(() => { if (!authenticated) localStorage.setItem(courseCatalogKey, JSON.stringify(courses)) }, [authenticated, courses])
  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const course = { title: title.trim(), type, durationHours: Number(hours), dateLabel: date.trim(), description: detail.trim(), ...(joinUrl.trim() ? { joinUrl: joinUrl.trim() } : {}) }
    try {
      if (authenticated) { const created = await apiPost<LearningCourse>('/committee/mk/training-courses', course); setCourses((current) => [created, ...current]) }
      else setCourses((current) => [{ ...course, id: `course-${Date.now()}`, hours: course.durationHours, date: course.dateLabel, detail: course.description }, ...current])
      setTitle(''); setDate(''); setDetail(''); setJoinUrl('')
      onToast(authenticated ? 'Kurs bazaga saqlandi va nomzodlarga e’lon qilindi.' : 'Kurs demo rejimida brauzerga saqlandi.')
    } catch (cause) { onToast(cause instanceof Error ? cause.message : 'Kursni joylab bo‘lmadi.') }
  }
  const markAttendance = async (enrollmentId: string, attended: boolean, completed: boolean) => {
    setBusyId(enrollmentId)
    try { await apiPatch(`/committee/mk/training-enrollments/${encodeURIComponent(enrollmentId)}/attendance`, { attended, completed }); await refresh(); onToast('Davomat bazada yangilandi.') }
    catch (cause) { onToast(cause instanceof Error ? cause.message : 'Davomatni saqlab bo‘lmadi.') }
    finally { setBusyId('') }
  }
  return <section><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Malaka komissiyasi</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Kurslar va ishtirok nazorati</h1><p className="mt-1.5 text-sm text-slate-500">Kurs va vebinarlarni e’lon qiling, nomzodlar yozilishi va davomatini boshqaring.</p></div><div className={`mt-4 rounded-xl border p-3 text-xs leading-5 ${authenticated ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{authenticated ? 'Kurslar va davomat server bazasida saqlanadi. Texnik administratorga kontent boshqaruvi berilmagan.' : 'Demo ko‘rinishi: tizimga komissiya yoki Adliya xodimi sifatida kiring. Hozircha kiritilgan ma’lumotlar faqat brauzerda saqlanadi.'}</div>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}<form onSubmit={(event) => void publish(event)} className="mt-5 grid gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Kurs nomi<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="form-control mt-1"/></label><label className="text-xs font-semibold text-slate-600">Turi<select value={type} onChange={(event) => setType(event.target.value as 'COURSE' | 'WEBINAR')} className="form-control mt-1"><option value="COURSE">Onlayn kurs</option><option value="WEBINAR">Vebinar</option></select></label><label className="text-xs font-semibold text-slate-600">Davomiyligi (soat)<input required type="number" min="1" max="500" value={hours} onChange={(event) => setHours(event.target.value)} className="form-control mt-1"/></label><label className="text-xs font-semibold text-slate-600">Sana va vaqt<input required maxLength={100} value={date} onChange={(event) => setDate(event.target.value)} className="form-control mt-1" placeholder="2026-yil 12-noyabr · 15:00"/></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Tavsif<textarea required maxLength={1000} value={detail} onChange={(event) => setDetail(event.target.value)} className="form-control mt-1" rows={2}/></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Kurs yoki vebinar havolasi (ixtiyoriy)<input type="url" value={joinUrl} onChange={(event) => setJoinUrl(event.target.value)} className="form-control mt-1" placeholder="https://"/></label><button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white sm:col-span-2"><PlusCircle size={16}/>Kursni joylashtirish</button></form>{loading ? <p className="mt-5 rounded-xl bg-white p-8 text-center text-sm text-slate-500">Kurslar yuklanmoqda…</p> : <div className="mt-5 space-y-3">{courses.map((course) => <article key={course.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><div className="flex flex-wrap items-center gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">{course.type === 'WEBINAR' || course.type === 'Vebinar' ? <Video size={18}/> : <BookOpen size={18}/>}</span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{course.title}</h2><p className="mt-1 text-xs text-slate-500">{course.type} · {course.dateLabel || course.date} · {course.durationHours || course.hours} soat</p><p className="mt-1 text-xs text-slate-500">{course.description || course.detail}</p></div><span className="inline-flex items-center gap-1 text-xs text-slate-600"><Users size={14}/>{course.enrollmentCount ?? 0} yozilgan</span></div>{authenticated && <div className="mt-4 space-y-2">{course.enrollments?.map((enrollment) => <div key={enrollment.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3"><span className="min-w-44 flex-1 text-xs"><strong>{enrollment.user.fullName}</strong><span className="ml-2 text-slate-500">{enrollment.user.pinfl}</span></span><span className="text-xs text-slate-600">{enrollment.completedAt ? 'Kurs tugallangan' : enrollment.attendedAt ? 'Davomat bor' : 'Yozilgan'}</span><button disabled={busyId === enrollment.id} onClick={() => void markAttendance(enrollment.id, true, enrollment.attendedAt ? !enrollment.completedAt : false)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">{enrollment.completedAt ? 'Tugatishni bekor qilish' : enrollment.attendedAt ? 'Kurs tugatildi deb belgilash' : 'Davomatni qayd etish'}</button></div>)}</div>}</article>)}{!courses.length && <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Kurs katalogi hozircha bo‘sh.</p>}</div>}</section>
}

function Header({ language, title, detail }: { language: ApplicantLanguage; title: string; detail: string }) { return <><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{applicantText(language, 'Mediator nomzodi', 'Кандидат в медиаторы')}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1><p className="mt-1.5 text-sm text-slate-500">{detail}</p></> }
function Empty({ text }: { text: string }) { return <div className="mt-5 rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/70">{text}</div> }
