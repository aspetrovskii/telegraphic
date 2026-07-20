import { useEffect, useState } from 'react'
import { health as sharedHealth } from '@telegraphic/shared/health'
import { EngineFixturePage } from './EngineFixturePage'

type ApiHealth = {
  ok: true
  service: string
  shared: { ok: true; package: string }
}

function HealthPage() {
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const shared = sharedHealth()

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/health')
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data = (await res.json()) as ApiHealth
        if (!cancelled) {
          setApiHealth(data)
          setApiError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setApiError(err instanceof Error ? err.message : 'Unknown error')
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="page">
      <h1 className="brand">Telegraphic</h1>
      <p className="tagline">Phase 1 — parser &amp; data model ready</p>
      <dl className="status">
        <div>
          <dt>Shared package</dt>
          <dd data-testid="shared-status">{shared.ok ? 'ok' : 'fail'}</dd>
        </div>
        <div>
          <dt>API</dt>
          <dd data-testid="api-status">
            {apiError ? `error: ${apiError}` : apiHealth?.ok ? 'ok' : 'loading…'}
          </dd>
        </div>
      </dl>
    </main>
  )
}

export function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'
  if (path === '/engine-fixture' || path.startsWith('/engine-fixture/')) {
    return <EngineFixturePage />
  }
  return <HealthPage />
}
