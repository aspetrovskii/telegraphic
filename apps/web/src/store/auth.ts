import { create } from 'zustand'
import { api, ApiError, type User } from '../api/client'

type AuthState = {
  user: User | null
  ready: boolean
  error: string | null
  bootstrap: () => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  signin: (email: string, password: string) => Promise<void>
  signout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,
  error: null,

  clearError: () => set({ error: null }),

  bootstrap: async () => {
    try {
      const res = await api.me()
      set({ user: res.user, ready: true, error: null })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        set({ user: null, ready: true, error: null })
        return
      }
      set({ user: null, ready: true, error: null })
    }
  },

  signup: async (email, password) => {
    set({ error: null })
    try {
      const res = await api.signup(email, password)
      set({ user: res.user })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed'
      set({ error: message })
      throw err
    }
  },

  signin: async (email, password) => {
    set({ error: null })
    try {
      const res = await api.signin(email, password)
      set({ user: res.user })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed'
      set({ error: message })
      throw err
    }
  },

  signout: async () => {
    try {
      await api.signout()
    } finally {
      set({ user: null })
    }
  },
}))
