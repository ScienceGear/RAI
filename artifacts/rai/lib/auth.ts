import {
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  getCurrentUser as supabaseGetCurrentUser,
  onAuthStateChange,
} from "@/src/supabase/auth";
import { supabase } from "@/src/supabase/client";

export interface AuthUser {
  uid: string;
  email: string | null;
}

function toAuthUser(user: { id: string; email?: string | null } | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.id,
    email: user.email ?? null,
  };
}

let cachedUser: AuthUser | null = null;

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const data = await supabaseSignIn(email.trim().toLowerCase(), password);
  const user = toAuthUser(data.user);
  if (!user) throw new Error("Sign in succeeded but no user was returned.");
  cachedUser = user;
  return user;
}

export async function signUp(email: string, password: string, displayName?: string): Promise<AuthUser> {
  const data = await supabaseSignUp(email.trim().toLowerCase(), password, displayName ?? "");
  const user = toAuthUser(data.user);
  if (!user) throw new Error("Sign up succeeded but no user was returned.");
  cachedUser = user;
  return user;
}

export async function signOut(): Promise<void> {
  await supabaseSignOut();
  cachedUser = null;
}

export function listenToAuthState(callback: (user: AuthUser | null) => void): () => void {
  const { data } = onAuthStateChange((user) => {
    const mapped = toAuthUser(user as { id: string; email?: string | null } | null);
    cachedUser = mapped;
    callback(mapped);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export function getCurrentUser(): AuthUser | null {
  return cachedUser;
}

export async function handleEmailLink(url: string): Promise<void> {
  const parsed = new URL(url);
  const code = parsed.searchParams.get("code");
  if (!code) return;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

void supabaseGetCurrentUser().then((user) => {
  cachedUser = toAuthUser(user as { id: string; email?: string | null } | null);
}).catch(() => {
  cachedUser = null;
});
