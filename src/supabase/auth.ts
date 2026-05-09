import { supabase } from './client'

export async function signUpWithEmail(
  email: string, 
  password: string,
  name: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  })
  if (error) throw error
  
  // Update profile name
  if (data.user) {
    await supabase.from('profiles')
      .update({ name })
      .eq('id', data.user.id)
  }
  return data
}

export async function signInWithEmail(
  email: string, 
  password: string
) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'rai://auth/callback',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthStateChange(
  callback: (session: any) => void
) {
  return supabase.auth.onAuthStateChange(
    (_, session) => callback(session)
  )
}