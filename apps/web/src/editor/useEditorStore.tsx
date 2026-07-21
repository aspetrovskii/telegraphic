/* eslint-disable react-refresh/only-export-components -- provider + store hooks share one module */
import { createContext, useContext, useRef, type ReactNode } from 'react'
import { useStore } from 'zustand'
import type { Project } from '@telegraphic/shared'
import { createEditorStore, type EditorStore } from './editorStore'

const EditorStoreContext = createContext<EditorStore | null>(null)

export function EditorProvider({
  projectId,
  initialProject,
  children,
}: {
  projectId: string
  initialProject?: Project
  children: ReactNode
}) {
  const storeRef = useRef<EditorStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = createEditorStore(projectId, initialProject)
  }
  return (
    <EditorStoreContext.Provider value={storeRef.current}>{children}</EditorStoreContext.Provider>
  )
}

function useEditorStoreContext(): EditorStore {
  const store = useContext(EditorStoreContext)
  if (!store) {
    throw new Error('Editor store hooks must be used within EditorProvider')
  }
  return store
}

export function useEditorStore<T>(selector: (state: ReturnType<EditorStore['getState']>) => T): T {
  const store = useEditorStoreContext()
  return useStore(store, selector)
}

export function useEditorStoreApi(): EditorStore {
  return useEditorStoreContext()
}
