import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { EngineFixturePage } from './EngineFixturePage'
import { EditStubPage } from './pages/EditStubPage'
import { HomePage } from './pages/HomePage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'
import { useAuthStore } from './store/auth'

function Bootstrap({ children }: { children: ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const ready = useAuthStore((s) => s.ready)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  if (!ready) {
    return (
      <main className="auth-page">
        <p className="muted" data-testid="bootstrapping">
          Loading…
        </p>
      </main>
    )
  }

  return children
}

export function App() {
  return (
    <BrowserRouter>
      <Bootstrap>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/edit/:projectId" element={<EditStubPage />} />
          <Route path="/engine-fixture/*" element={<EngineFixturePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Bootstrap>
    </BrowserRouter>
  )
}
