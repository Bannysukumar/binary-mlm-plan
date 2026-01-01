"use client"

import type React from "react"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { toast } from "react-hot-toast"
import Link from "next/link"
import { Eye, EyeOff, Check, X, AlertCircle, ArrowRight } from "lucide-react"

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sponsorId = searchParams.get("sponsor")
  const companyId = searchParams.get("company")

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    sponsorId: sponsorId || "",
    placementSide: "left" as "left" | "right",
    placementId: "",
  })
  const [loading, setLoading] = useState(false)
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [validatingSponsor, setValidatingSponsor] = useState(false)
  const [sponsorValid, setSponsorValid] = useState<boolean | null>(null)
  const [companyIdInput, setCompanyIdInput] = useState(companyId || "")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [step, setStep] = useState(1)

  useEffect(() => {
    if (companyId) {
      loadCompanyInfo(companyId)
    }
  }, [companyId])

  const loadCompanyInfo = async (companyId: string) => {
    try {
      const companyDoc = await getDoc(doc(db, "companies", companyId))
      if (companyDoc.exists()) {
        setCompanyInfo(companyDoc.data())
      } else {
        toast.error("Company not found")
      }
    } catch (error) {
      console.error("Error loading company:", error)
    }
  }

  const validateSponsor = async () => {
    const finalCompanyId = companyId || companyIdInput
    if (!formData.sponsorId || !finalCompanyId) {
      setSponsorValid(false)
      return
    }

    try {
      setValidatingSponsor(true)
      const sponsorQuery = query(
        collection(db, `companies/${finalCompanyId}/users`),
        where("id", "==", formData.sponsorId),
      )
      const sponsorSnapshot = await getDocs(sponsorQuery)

      if (sponsorSnapshot.empty) {
        setSponsorValid(false)
        toast.error("Sponsor ID not found. Please check and try again.")
      } else {
        setSponsorValid(true)
        toast.success("Sponsor ID verified!")
      }
    } catch (error) {
      console.error("Error validating sponsor:", error)
      setSponsorValid(false)
    } finally {
      setValidatingSponsor(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    if (!formData.sponsorId) {
      toast.error("Sponsor ID is required")
      return
    }

    const finalCompanyId = companyId || companyIdInput
    if (!finalCompanyId) {
      toast.error("Company ID is required")
      return
    }

    try {
      setLoading(true)

      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)

      // Use user UID as document ID for consistency
      const userDocRef = doc(db, `companies/${finalCompanyId}/users`, userCredential.user.uid)
      await setDoc(userDocRef, {
        id: userCredential.user.uid,
        companyId: finalCompanyId,
        email: formData.email,
        phone: formData.phone || "",
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: "user",
        sponsorId: formData.sponsorId,
        placementId: formData.placementId || formData.sponsorId,
        placementSide: formData.placementSide,
        status: "pending",
        kycStatus: "pending",
        blockedIncome: false,
        blockedWithdrawals: false,
        packageBV: 0,
        registrationDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast.success("Account created successfully!")

      await auth.signOut()

      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (error: any) {
      let errorMessage = "Registration failed"

      if (error?.code === "auth/email-already-in-use") {
        errorMessage = "Email already registered."
      } else if (error?.code === "auth/weak-password") {
        errorMessage = "Password is too weak."
      } else if (error?.code === "auth/invalid-email") {
        errorMessage = "Invalid email address."
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl" />
      </div>

      {/* Register card */}
      <div className="w-full max-w-2xl relative">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">BinaryMLM</h1>
            </div>
            <p className="text-sm text-slate-600">Create your account to join the network</p>
            {companyInfo && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900 font-medium">
                  Company: <span className="font-semibold">{companyInfo.name}</span>
                </p>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">
            {/* Step indicator */}
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                      step >= s
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${step > s ? "bg-gradient-to-r from-blue-600 to-cyan-600" : "bg-slate-200"}`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Personal Information */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Personal Information</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-900">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-900">Last Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-900">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-900">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 group mt-6"
                >
                  Continue
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {/* MLM Placement */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">MLM Placement</h3>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-900">Sponsor ID / Referral ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Enter sponsor ID"
                      value={formData.sponsorId}
                      onChange={(e) => {
                        setFormData({ ...formData, sponsorId: e.target.value })
                        setSponsorValid(null)
                      }}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                    {companyId && (
                      <button
                        type="button"
                        onClick={validateSponsor}
                        disabled={validatingSponsor || !formData.sponsorId}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {validatingSponsor ? "Checking..." : "Verify"}
                      </button>
                    )}
                  </div>
                  {sponsorValid === true && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check size={16} />
                      Sponsor verified
                    </div>
                  )}
                  {sponsorValid === false && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <X size={16} />
                      Sponsor not found
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-900">Placement Side</label>
                  <div className="flex gap-4">
                    {["left", "right"].map((side) => (
                      <label key={side} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="placementSide"
                          value={side}
                          checked={formData.placementSide === side}
                          onChange={(e) =>
                            setFormData({ ...formData, placementSide: e.target.value as "left" | "right" })
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-700 capitalize font-medium">{side} Leg</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-900">Placement ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="Leave empty for auto-placement"
                    value={formData.placementId}
                    onChange={(e) => setFormData({ ...formData, placementId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                {!companyId && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-900">Company ID</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter company ID"
                      value={companyIdInput}
                      onChange={(e) => {
                        const id = e.target.value
                        setCompanyIdInput(id)
                        if (id) {
                          loadCompanyInfo(id)
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-900 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 group"
                  >
                    Continue
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}

            {/* Secure Your Account */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Secure Your Account</h3>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-900">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">Minimum 6 characters</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-900">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900">
                    Your account will be pending admin approval. You can login once activated.
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-900 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="px-8 py-6 bg-slate-50 border-t border-slate-200">
            <p className="text-sm text-slate-600 text-center">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterLoading />}>
      <RegisterContent />
    </Suspense>
  )
}

function RegisterLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20 p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    </div>
  )
}
