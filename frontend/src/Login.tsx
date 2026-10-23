import { FormEvent, useState } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { login, AdminUser } from './api'

export default function Login({ onLogin }: { onLogin: (user: AdminUser) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try { onLogin(await login(username.trim(), password)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Tizimga kirishda xatolik yuz berdi.') }
    finally { setLoading(false) }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
    <section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-9">
      <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm"><ShieldCheck size={24} /></div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Ma’muriy panel</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Tizimga kirish</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Tashkilotlarni boshqarish uchun administrator hisobingiz bilan kiring.</p>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Login</span><input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="form-control" placeholder="Administrator logini" /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Parol</span><span className="relative block"><input required autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="form-control pr-11" placeholder="Parolingiz" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600" aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-70">{loading ? <><LockKeyhole size={17} />Tekshirilmoqda...</> : <>Kirish<ArrowRight size={17} /></>}</button>
      </form>
      <p className="mt-6 text-center text-xs leading-5 text-slate-400">Kirish ma’lumotlari platforma administratoridan olinadi.</p>
    </section>
  </main>
}
