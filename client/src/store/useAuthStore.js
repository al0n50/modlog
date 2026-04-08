import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ session, user: session?.user ?? null, loading: false })
    supabase.auth.onAuthStateChange((_e, session) => {
      set({ session, user: session?.user ?? null })
    })
  },

  signUp: async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username } }
    })
    if (error) throw error
    return data
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))