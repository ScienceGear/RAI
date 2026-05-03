import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { firebaseAuth } from "./firebase";

const EMAIL_KEY = "rai:emailForSignIn";

// Email must be authorized in Firebase Console → Authentication → Settings → Authorized domains
export const ACTION_CODE_SETTINGS = {
  url: "https://raiai-6abcd.firebaseapp.com",
  handleCodeInApp: true,
  android: {
    packageName: "tech.sciencegear.rai",
    installApp: true,
    minimumVersion: "12",
  },
};

export async function sendMagicLink(email: string): Promise<void> {
  await sendSignInLinkToEmail(firebaseAuth, email, ACTION_CODE_SETTINGS);
  await AsyncStorage.setItem(EMAIL_KEY, email);
}

export async function handleEmailLink(url: string): Promise<User | null> {
  if (!isSignInWithEmailLink(firebaseAuth, url)) return null;
  const email = await AsyncStorage.getItem(EMAIL_KEY);
  if (!email) throw new Error("Enter your email again to complete sign-in.");
  const result = await signInWithEmailLink(firebaseAuth, email, url);
  await AsyncStorage.removeItem(EMAIL_KEY);
  return result.user;
}

export async function getStoredEmail(): Promise<string | null> {
  return AsyncStorage.getItem(EMAIL_KEY);
}

export async function signInWithGoogleCredential(idToken: string): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(firebaseAuth, credential);
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
