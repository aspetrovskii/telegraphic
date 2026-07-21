import { useEffect, useRef } from 'react'
import { ApiError, api } from '../api/client'
import { useEditorStore, useEditorStoreApi } from './useEditorStore'

const DEBOUNCE_MS = 700

/**
 * Debounced PATCH of the open project. Surfaces oversized-payload and other
 * save errors via editor store saveStatus / saveError.
 */
export function EditorAutosave({ projectId }: { projectId: string }) {
  const persistable = useEditorStore((s) => s.persistable)
  const saveStatus = useEditorStore((s) => s.saveStatus)
  const project = useEditorStore((s) => s.project)
  const store = useEditorStoreApi()
  const skipFirst = useRef(true)
  const timerRef = useRef(0)
  const inFlight = useRef(0)

  useEffect(() => {
    if (!persistable) return
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    if (saveStatus !== 'dirty') return

    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      const seq = ++inFlight.current
      const snapshot = store.getState().project
      store.getState().setSaveStatus('saving')
      void (async () => {
        try {
          const res = await api.updateProject(projectId, {
            title: snapshot.title.trim() || 'Untitled rating',
            ticks: snapshot.ticks,
            records: snapshot.records,
            settings: snapshot.settings,
            theme: snapshot.theme,
          })
          if (seq !== inFlight.current) return
          const latest = store.getState()
          // Only mark clean if nothing dirtied while we were saving.
          if (latest.saveStatus === 'saving' || latest.saveStatus === 'dirty') {
            // If the user edited during the request, keep dirty.
            const stillSame =
              latest.project.title === snapshot.title &&
              latest.project.ticks === snapshot.ticks &&
              latest.project.records === snapshot.records &&
              latest.project.settings === snapshot.settings &&
              latest.project.theme === snapshot.theme
            if (stillSame) {
              store.getState().setProject({
                ...res.project,
                // keep client project identity fields in sync
              })
              store.getState().setSaveStatus('saved')
            } else {
              store.getState().setSaveStatus('dirty')
            }
          }
        } catch (err) {
          if (seq !== inFlight.current) return
          const message =
            err instanceof ApiError && err.status === 413
              ? err.message ||
                'Project is too large to save. Remove avatars or records and try again.'
              : err instanceof Error
                ? err.message
                : 'Failed to save project'
          store.getState().setSaveStatus('error', message)
        }
      })()
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timerRef.current)
  }, [persistable, project, projectId, saveStatus, store])

  return null
}
