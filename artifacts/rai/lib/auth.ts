import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from "firebase/auth";
import { firebaseAuth } from "./firebase";

export async function signIn(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
  return result.user;
}

export async function signUp(email: string, password: string, displayName?: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
  if (displayName) {
    await updateProfile(result.user, { displayName });
  }
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(firebaseAuth);
}

export function listenToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(firebaseAuth, callback);
}

export function getCurrentUser(): User | null {
  return firebaseAuth.currentUser;
}
