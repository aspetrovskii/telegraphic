import { useRef, useState } from 'react'
import { recordMessageTotal, type Record as ChatRecord } from '@telegraphic/shared'
import { useEditorStore } from './useEditorStore'
import { resizeImageFileToDataUrl } from './resizeAvatar'
import { ImportModal } from './ImportModal'

function formatCount(n: number): string {
  return n.toLocaleString('en-US')
}

function RecordRow({ record }: { record: ChatRecord }) {
  const renameRecord = useEditorStore((s) => s.renameRecord)
  const deleteRecord = useEditorStore((s) => s.deleteRecord)
  const setRecordVisible = useEditorStore((s) => s.setRecordVisible)
  const setRecordAvatar = useEditorStore((s) => s.setRecordAvatar)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(record.title)
  const [menuOpen, setMenuOpen] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const commitRename = () => {
    const next = draft.trim()
    if (next && next !== record.title) renameRecord(record.id, next)
    else setDraft(record.title)
    setEditing(false)
  }

  return (
    <li
      className={`record-row${!record.visible ? ' is-hidden' : ''}`}
      data-testid={`record-row-${record.id}`}
      data-record-id={record.id}
    >
      <button
        type="button"
        className="record-row__eye"
        data-testid={`record-visibility-${record.id}`}
        aria-label={record.visible ? 'Hide record' : 'Show record'}
        aria-pressed={record.visible}
        onClick={() => setRecordVisible(record.id, !record.visible)}
      >
        {record.visible ? (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path
              fill="currentColor"
              d="M8 3C4.5 3 1.7 5.1 1 8c.7 2.9 3.5 5 7 5s6.3-2.1 7-5c-.7-2.9-3.5-5-7-5zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
            />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path
              fill="currentColor"
              d="M1.2 1.2 14.8 14.8l-.9.9L11.7 13.5A8.6 8.6 0 0 1 8 13c-3.5 0-6.3-2.1-7-5 .3-1.2 1-2.3 1.9-3.2L.3 2.1l.9-.9zM8 5a3 3 0 0 1 2.8 4l-1.1-1.1A1.7 1.7 0 0 0 8 6.3V5zm0 6c-.5 0-1-.1-1.4-.4l-1.2 1.2c.8.4 1.7.7 2.6.7 3.5 0 6.3-2.1 7-5-.3-1.1-.9-2.1-1.7-2.9l-1.2 1.2A5.5 5.5 0 0 1 13.7 8C13 10.1 10.7 11 8 11z"
            />
          </svg>
        )}
      </button>

      <button
        type="button"
        className="record-row__avatar"
        data-testid={`record-avatar-${record.id}`}
        aria-label={`Upload avatar for ${record.title}`}
        onClick={() => avatarInputRef.current?.click()}
      >
        {record.avatarDataUrl ? (
          <img src={record.avatarDataUrl} alt="" width={32} height={32} />
        ) : (
          <span aria-hidden>{record.title.slice(0, 1).toUpperCase()}</span>
        )}
      </button>
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="record-row__file"
        data-testid={`record-avatar-input-${record.id}`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          void resizeImageFileToDataUrl(file).then((url) => setRecordAvatar(record.id, url))
          e.target.value = ''
        }}
      />

      <div className="record-row__main">
        {editing ? (
          <input
            className="record-row__rename"
            data-testid={`record-rename-${record.id}`}
            value={draft}
            autoFocus
            aria-label="Rename"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setDraft(record.title)
                setEditing(false)
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="record-row__title"
            data-testid={`record-title-${record.id}`}
            onClick={() => {
              setDraft(record.title)
              setEditing(true)
            }}
          >
            {record.title}
          </button>
        )}
        <span className="record-row__count" data-testid={`record-count-${record.id}`}>
          {formatCount(recordMessageTotal(record))} messages
        </span>
      </div>

      <div className="record-row__actions">
        <button
          type="button"
          className="record-row__menu-btn"
          data-testid={`record-menu-${record.id}`}
          aria-label="Record actions"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          ⋮
        </button>
        {menuOpen && (
          <div className="record-row__menu" role="menu">
            <button
              type="button"
              role="menuitem"
              data-testid={`record-rename-action-${record.id}`}
              onClick={() => {
                setMenuOpen(false)
                setDraft(record.title)
                setEditing(true)
              }}
            >
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              data-testid={`record-delete-${record.id}`}
              onClick={() => {
                setMenuOpen(false)
                deleteRecord(record.id)
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

/**
 * Data panel — records list, search, visibility, rename/delete, Add record.
 */
export function DataPanel() {
  const records = useEditorStore((s) => s.project.records)
  const search = useEditorStore((s) => s.recordSearch)
  const setRecordSearch = useEditorStore((s) => s.setRecordSearch)
  const openImportModal = useEditorStore((s) => s.openImportModal)

  const q = search.trim().toLowerCase()
  const filtered = q
    ? records.filter(
        (r) => r.title.toLowerCase().includes(q) || r.sourceChatTitle.toLowerCase().includes(q),
      )
    : records

  return (
    <div className="data-panel" data-testid="data-panel">
      <div className="data-panel__toolbar">
        <button
          type="button"
          className="btn btn--primary"
          data-testid="add-record"
          onClick={openImportModal}
        >
          Add record
        </button>
      </div>

      <label className="field data-panel__search">
        <span className="visually-hidden">Search records</span>
        <input
          className="field__input"
          data-testid="record-search"
          type="search"
          placeholder="Search records"
          value={search}
          onChange={(e) => setRecordSearch(e.target.value)}
        />
      </label>

      {filtered.length === 0 ? (
        <div className="data-panel__empty" data-testid="data-empty">
          {records.length === 0 ? (
            <>
              <p>No records yet.</p>
              <button type="button" className="btn btn--primary" onClick={openImportModal}>
                Add record
              </button>
            </>
          ) : (
            <p>No records match “{search}”.</p>
          )}
        </div>
      ) : (
        <ul className="record-list" data-testid="record-list">
          {filtered.map((record) => (
            <RecordRow key={record.id} record={record} />
          ))}
        </ul>
      )}

      <ImportModal />
    </div>
  )
}
