"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/store/authStore"
import { useCompanyStore } from "@/store/companyStore"
import { BrandingSettings } from "./BrandingSettings"
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "react-hot-toast"
import { Bell, Shield, Globe, Building2, Mail, Smartphone, CreditCard, Users, Settings as SettingsIcon } from "lucide-react"

interface CompanySettings {
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    newUserAlerts: boolean
    withdrawalAlerts: boolean
    incomeAlerts: boolean
    systemUpdates: boolean
  }
  security: {
    twoFactorAuth: boolean
    loginAlerts: boolean
    sessionTimeout: number
    passwordPolicy: {
      minLength: number
      requireUppercase: boolean
      requireLowercase: boolean
      requireNumbers: boolean
      requireSpecialChars: boolean
    }
  }
  preferences: {
    language: string
    currency: string
    timezone: string
    dateFormat: string
    timeFormat: string
  }
  company: {
    taxId: string
    registrationNumber: string
    address: string
    phone: string
    email: string
    website: string
  }
  withdrawal: {
    autoApprove: boolean
    requireKYC: boolean
    minWithdrawalAmount: number
    maxWithdrawalAmount: number
    processingDays: number
  }
}

const defaultSettings: CompanySettings = {
  notifications: {
    email: true,
    push: true,
    sms: false,
    newUserAlerts: true,
    withdrawalAlerts: true,
    incomeAlerts: true,
    systemUpdates: true,
  },
  security: {
    twoFactorAuth: false,
    loginAlerts: true,
    sessionTimeout: 30,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
    },
  },
  preferences: {
    language: "en",
    currency: "USD",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
  },
  company: {
    taxId: "",
    registrationNumber: "",
    address: "",
    phone: "",
    email: "",
    website: "",
  },
  withdrawal: {
    autoApprove: false,
    requireKYC: true,
    minWithdrawalAmount: 10,
    maxWithdrawalAmount: 10000,
    processingDays: 3,
  },
}

export function CompanySettingsPage() {
  const { user } = useAuthStore()
  const { settings: companySettings } = useCompanyStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState("branding")
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings)

  useEffect(() => {
    if (user?.companyId) {
      loadSettings()
    }
  }, [user?.companyId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      if (!user?.companyId) return

      const docRef = doc(db, "companies", user.companyId, "settings", "company")
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        setSettings({
          ...defaultSettings,
          ...data,
        })
      }
    } catch (error) {
      console.error("[v0] Error loading company settings:", error)
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (!user?.companyId) {
        toast.error("Company ID not found")
        return
      }

      setSaving(true)
      const docRef = doc(db, "companies", user.companyId, "settings", "company")
      await setDoc(docRef, {
        ...settings,
        updatedAt: Timestamp.now(),
        updatedBy: user.uid,
      }, { merge: true })

      toast.success("Settings saved successfully")
    } catch (error) {
      console.error("[v0] Error saving settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (category: keyof CompanySettings, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }))
  }

  const updateNestedSetting = (category: keyof CompanySettings, subCategory: string, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subCategory]: {
          ...(prev[category] as any)[subCategory],
          [key]: value,
        },
      },
    }))
  }

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>
  }

  const sections = [
    { id: "branding", label: "Branding", icon: Building2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "preferences", label: "Preferences", icon: Globe },
    { id: "company", label: "Company Info", icon: Building2 },
    { id: "withdrawal", label: "Withdrawal", icon: CreditCard },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Company Settings</h1>
        <p className="text-muted-foreground">Manage your company configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border p-4 space-y-2 sticky top-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-primary hover:bg-muted"
                }`}
              >
                <section.icon size={18} />
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="space-y-6">
            {/* Branding Section */}
            {activeSection === "branding" && (
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="text-primary" size={24} />
                  <h2 className="text-xl font-bold text-foreground">Branding</h2>
                </div>
                <BrandingSettings />
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === "notifications" && (
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Bell className="text-primary" size={24} />
                  <h2 className="text-xl font-bold text-foreground">Notifications</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail size={20} className="text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">Receive updates via email</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.email}
                        onChange={(e) => updateSetting("notifications", "email", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone size={20} className="text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">Push Notifications</p>
                        <p className="text-sm text-muted-foreground">Receive browser notifications</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.push}
                        onChange={(e) => updateSetting("notifications", "push", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">New User Alerts</p>
                      <p className="text-sm text-muted-foreground">Get notified when new users register</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.newUserAlerts}
                        onChange={(e) => updateSetting("notifications", "newUserAlerts", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Withdrawal Alerts</p>
                      <p className="text-sm text-muted-foreground">Get notified about withdrawal requests</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.withdrawalAlerts}
                        onChange={(e) => updateSetting("notifications", "withdrawalAlerts", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === "security" && (
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="text-primary" size={24} />
                  <h2 className="text-xl font-bold text-foreground">Security</h2>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.security.twoFactorAuth}
                        onChange={(e) => updateSetting("security", "twoFactorAuth", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Login Alerts</p>
                      <p className="text-sm text-muted-foreground">Get notified of new login attempts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.security.loginAlerts}
                        onChange={(e) => updateSetting("security", "loginAlerts", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => updateSetting("security", "sessionTimeout", parseInt(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      min="5"
                      max="480"
                    />
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-foreground mb-4">Password Policy</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Minimum Length</label>
                        <input
                          type="number"
                          value={settings.security.passwordPolicy.minLength}
                          onChange={(e) => updateNestedSetting("security", "passwordPolicy", "minLength", parseInt(e.target.value))}
                          className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          min="6"
                          max="32"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Require Uppercase</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.security.passwordPolicy.requireUppercase}
                            onChange={(e) => updateNestedSetting("security", "passwordPolicy", "requireUppercase", e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Require Numbers</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.security.passwordPolicy.requireNumbers}
                            onChange={(e) => updateNestedSetting("security", "passwordPolicy", "requireNumbers", e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Section */}
            {activeSection === "preferences" && (
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="text-primary" size={24} />
                  <h2 className="text-xl font-bold text-foreground">Preferences</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Language</label>
                    <select
                      value={settings.preferences.language}
                      onChange={(e) => updateSetting("preferences", "language", e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Currency</label>
                    <select
                      value={settings.preferences.currency}
                      onChange={(e) => updateSetting("preferences", "currency", e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="INR">INR - Indian Rupee</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Timezone</label>
                    <select
                      value={settings.preferences.timezone}
                      onChange={(e) => updateSetting("preferences", "timezone", e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="America/Los_Angeles">America/Los_Angeles</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Asia/Kolkata">Asia/Kolkata</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Date Format</label>
                    <select
                      value={settings.preferences.dateFormat}
                      onChange={(e) => updateSetting("preferences", "dateFormat", e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Company Info Section */}
            {activeSection === "company" && (
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="text-primary" size={24} />
                  <h2 className="text-xl font-bold text-foreground">Company Information</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Tax ID</label>
                    <input
                      type="text"
                      value={settings.company.taxId}
                      onChange={(e) => updateSetting("company", "taxId", e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter tax ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Registration Number</label>
                    <input
                      type="text"
                      value={settings.company.registrationNumber}
                      onChange={(e) => updateSetting("company", "registrationNumber", e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter registration number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Address</label>
                    <textarea
                      value={settings.company.address}
                      onChange={(e) => updateSetting("company", "address", e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                      placeholder="Enter company address"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                      <input
                        type="tel"
                        value={settings.company.phone}
                        onChange={(e) => updateSetting("company", "phone", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                      <input
                        type="email"
                        value={settings.company.email}
                        onChange={(e) => updateSetting("company", "email", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Website</label>
                    <input
                      type="url"
                      value={settings.company.website}
                      onChange={(e) => updateSetting("company", "website", e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Withdrawal Settings Section */}
            {activeSection === "withdrawal" && (
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="text-primary" size={24} />
                  <h2 className="text-xl font-bold text-foreground">Withdrawal Settings</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Auto Approve Withdrawals</p>
                      <p className="text-sm text-muted-foreground">Automatically approve withdrawal requests</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.withdrawal.autoApprove}
                        onChange={(e) => updateSetting("withdrawal", "autoApprove", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Require KYC</p>
                      <p className="text-sm text-muted-foreground">Require KYC verification for withdrawals</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.withdrawal.requireKYC}
                        onChange={(e) => updateSetting("withdrawal", "requireKYC", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Minimum Withdrawal Amount</label>
                      <input
                        type="number"
                        value={settings.withdrawal.minWithdrawalAmount}
                        onChange={(e) => updateSetting("withdrawal", "minWithdrawalAmount", parseFloat(e.target.value))}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Maximum Withdrawal Amount</label>
                      <input
                        type="number"
                        value={settings.withdrawal.maxWithdrawalAmount}
                        onChange={(e) => updateSetting("withdrawal", "maxWithdrawalAmount", parseFloat(e.target.value))}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Processing Days</label>
                    <input
                      type="number"
                      value={settings.withdrawal.processingDays}
                      onChange={(e) => updateSetting("withdrawal", "processingDays", parseInt(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      min="1"
                      max="30"
                    />
                    <p className="text-sm text-muted-foreground mt-1">Number of business days to process withdrawals</p>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            {activeSection !== "branding" && (
              <div className="flex justify-end gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

