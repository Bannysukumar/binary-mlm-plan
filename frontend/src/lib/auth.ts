import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  getIdTokenResult,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth"
import { auth, db } from "./firebase"
import type { UserRole } from "@/shared/types"
import { doc, setDoc } from "firebase/firestore"

export interface AuthUser {
  uid: string
  email: string | null
  role: UserRole
  companyId?: string
  displayName?: string
}

interface AuthCredentials {
  uid: string
  role: UserRole
  companyId?: string
  displayName?: string
}

export const login = async (email: string, password: string): Promise<{ user: AuthUser }> => {
  try {
    await setPersistence(auth, browserLocalPersistence)
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Get custom claims from ID token
    const tokenResult = await getIdTokenResult(user, true)
    const claims = tokenResult.claims as any

    // Get role from custom claims
    const role = (claims.role || "user") as UserRole
    const companyId = claims.companyId as string | undefined

    return {
      user: {
        uid: user.uid,
        email: user.email,
        role,
        companyId,
        displayName: user.displayName || undefined,
      },
    }
  } catch (error) {
    console.error("[v0] Login error:", error)
    throw error
  }
}

export const register = async (
  email: string,
  password: string,
  companyId: string,
  firstName: string,
  lastName: string,
): Promise<{ uid: string }> => {
  try {
    await setPersistence(auth, browserLocalPersistence)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Create user profile in Firestore
    const userProfile = {
      id: user.uid,
      companyId,
      email,
      firstName,
      lastName,
      status: "pending",
      registrationDate: new Date(),
      blockedIncome: false,
      blockedWithdrawals: false,
    }

    await setDoc(doc(db, "companies", companyId, "users", user.uid), userProfile)

    return { uid: user.uid }
  } catch (error) {
    console.error("[v0] Registration error:", error)
    throw error
  }
}

export const logout = async () => {
  try {
    await signOut(auth)
  } catch (error) {
    console.error("[v0] Logout error:", error)
    throw error
  }
}

export const getCurrentUser = (): Promise<AuthUser | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe()

      if (!firebaseUser) {
        resolve(null)
        return
      }

      try {
        const tokenResult = await getIdTokenResult(firebaseUser, true)
        const claims = tokenResult.claims as any

        const role = (claims.role || "user") as UserRole
        const companyId = claims.companyId as string | undefined

        resolve({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role,
          companyId,
          displayName: firebaseUser.displayName || undefined,
        })
      } catch (error) {
        console.error("[v0] Error getting current user:", error)
        resolve(null)
      }
    })
  })
}

export const checkRole = async (requiredRole: UserRole | UserRole[]): Promise<boolean> => {
  const user = await getCurrentUser()
  if (!user) return false

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  return roles.includes(user.role)
}

export const setCustomClaims = async (uid: string, claims: AuthCredentials): Promise<void> => {
  // This would be called from your backend/Firebase admin SDK
  // The actual implementation would be in your cloud functions
  console.log("[v0] Setting custom claims for user:", uid, claims)
}
