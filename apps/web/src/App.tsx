import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { EngineFixturePage } from './EngineFixturePage'
import { EditorPage } from './editor/EditorPage'
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

/**
 * Phase 3 editor shell. `/edit/fixture` is public for engine/e2e smoke;
 * other project ids require sign-in (Phase 7 auth). Real project payloads
 * still use the shared fixture race until Phase 4 wires Data import.
 */
function EditorRoute() {
  const { projectId } = useParams<{ projectId: string }>()
  const user = useAuthStore((s) => s.user)
  const ready = useAuthStore((s) => s.ready)

  if (!projectId) {
    return <Navigate to="/" replace />
  }
  if (projectId !== 'fixture' && ready && !user) {
    return <Navigate to="/sign-in" replace />
  }
  return <EditorPage projectId={projectId} />
}

export function App() {
  return (
    <BrowserRouter>
      <Bootstrap>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/edit/:projectId" element={<EditorRoute />} />
          <Route path="/engine-fixture/*" element={<EngineFixturePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Bootstrap>
    </BrowserRouter>
  )
}
