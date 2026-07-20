import { useRef, useState, type DragEvent } from 'react'
import { parseExportInWorker, ParseWorkerClientError } from '../parser/parseExport'
import { useEditorStore } from './useEditorStore'

/**
 * Add record import modal — drop result.json / ZIP, parse in worker, append record.
 */
export function ImportModal() {
  const open = useEditorStore((s) => s.importModal.open)
  const progressRatio = useEditorStore((s) => s.importModal.progressRatio)
  const progressStage = useEditorStore((s) => s.importModal.progressStage)
  const error = useEditorStore((s) => s.importModal.error)
  const closeImportModal = useEditorStore((s) => s.closeImportModal)
  const setImportProgress = useEditorStore((s) => s.setImportProgress)
  const setImportError = useEditorStore((s) => s.setImportError)
  const addParsedRecord = useEditorStore((s) => s.addParsedRecord)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const runImport = async (file: File) => {
    if (busy) return
    setBusy(true)
    setImportError(null)
    setImportProgress('reading', 0)
    try {
      const parsed = await parseExportInWorker(file, {
        onProgress: (p) => setImportProgress(p.stage, p.ratio ?? null),
      })
      addParsedRecord(parsed)
      closeImportModal()
    } catch (err) {
      const message =
        err instanceof ParseWorkerClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not parse export'
      setImportError(message)
    } finally {
      setBusy(false)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void runImport(file)
  }

  return (
    <div className="modal-backdrop" data-testid="import-modal" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id="import-modal-title" className="modal__title">
            Add Record
          </h2>
          <button
            type="button"
            className="modal__close"
            aria-label="Close"
            data-testid="import-modal-close"
            onClick={closeImportModal}
            disabled={busy}
          >
            ×
          </button>
        </header>

        <div className="modal__body">
          <div
            className={`dropzone${dragging ? ' is-dragging' : ''}${busy ? ' is-busy' : ''}`}
            data-testid="import-dropzone"
            onDragEnter={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => {
              if (!busy) fileInputRef.current?.click()
            }}
          >
            <p className="dropzone__title">Drop your result.json or ZIP here</p>
            <p className="dropzone__hint">
              Export a single chat from Telegram Desktop → Export chat history → JSON
            </p>
          </div>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            data-testid="import-file-input"
            type="file"
            accept=".json,.zip,application/json,application/zip"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void runImport(file)
              e.target.value = ''
            }}
          />

          {busy && (
            <div className="import-progress" data-testid="import-progress">
              <div className="import-progress__bar">
                <div
                  className="import-progress__fill"
                  style={{
                    width: `${Math.round((progressRatio ?? 0.15) * 100)}%`,
                  }}
                />
              </div>
              <p className="import-progress__label">
                {progressStage ? `Parsing (${progressStage})…` : 'Parsing…'}
              </p>
            </div>
          )}

          {error && (
            <p className="import-error" data-testid="import-error" role="alert">
              {error}
            </p>
          )}

          <p className="import-privacy">
            Data is processed locally in your browser. Raw messages never leave this device.
          </p>
        </div>

        <footer className="modal__footer">
          <button
            type="button"
            className="btn btn--ghost"
            data-testid="import-cancel"
            onClick={closeImportModal}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            data-testid="import-browse"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            Import
          </button>
        </footer>
      </div>
    </div>
  )
}
