import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { ProfileWithStore } from '../types/database'

interface AuthContextValue {
  session: Session | null
  profile: ProfileWithStore | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchProfile(userId: string): Promise<ProfileWithStore | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, store:stores(*)')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error cargando perfil:', error.message)
    return null
  }
  return data as ProfileWithStore
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileWithStore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) {
        setProfile(await fetchProfile(data.session.user.id))
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!active) return
        setLoading(true)
        setSession(newSession)
        if (newSession) {
          setProfile(await fetchProfile(newSession.user.id))
        } else {
          setProfile(null)
        }
        setLoading(false)
      },
    )

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (session) {
      setProfile(await fetchProfile(session.user.id))
    }
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
