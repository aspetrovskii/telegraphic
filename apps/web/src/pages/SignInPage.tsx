import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

function safeNext(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

export function SignInPage() {
  const { user, ready, signin, error, clearError } = useAuthStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (ready && user) {
    return <Navigate to={next} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()
    setSubmitting(true)
    try {
      await signin(email, password)
      navigate(next, { replace: true })
    } catch {
      // error in store
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="auth-brand">Telegraphic</p>
        <h1 className="auth-title">Sign in</h1>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="signin-email"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="signin-password"
          />
        </label>
        {error ? (
          <p className="form-error" role="alert" data-testid="auth-error">
            {error}
          </p>
        ) : null}
        <button
          className="btn btn-primary"
          type="submit"
          disabled={submitting}
          data-testid="signin-submit"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="auth-switch">
          Need an account?{' '}
          <Link to={`/sign-up?next=${encodeURIComponent(next)}`}>Sign up</Link>
        </p>
      </form>
    </main>
  )
}
