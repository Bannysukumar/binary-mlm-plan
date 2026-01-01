"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuthStore } from "@/store/authStore"
import { toast } from "react-hot-toast"
import {
  Bell,
  Shield,
  Globe,
  Settings as SettingsIcon,
  Key,
  Database,
  Mail,
  Smartphone,
  AlertTriangle,
  Lock,
  Server,
  CreditCard,
  BarChart3,
} from "lucide-react"

// Platform Settings Interface
interface PlatformSettings {
  branding: {
    platformName: string
    logo: string
    logoDark: string
    primaryColor: string
    secondaryColor: string
    supportEmail: string
    supportPhone: string
    website: string
  }
  system: {
    maintenanceMode: boolean
    maintenanceMessage: string
    allowNewRegistrations: boolean
    allowNewCompanies: boolean
    maxCompaniesPerPlan: number
    defaultTrialDays: number
  }
  security: {
    requireTwoFactorAuth: boolean
    sessionTimeout: number // in minutes
    passwordPolicy: {
      minLength: number
      requireUppercase: boolean
      requireNumbers: boolean
      requireSpecialChars: boolean
    }
    ipWhitelist: string[]
    rateLimiting: {
      enabled: boolean
      requestsPerMinute: number
    }
  }
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    newCompanyAlerts: boolean
    billingAlerts: boolean
    systemAlerts: boolean
    criticalAlerts: boolean
  }
  billing: {
    defaultCurrency: string
    supportedCurrencies: string[]
    paymentMethods: {
      stripe: boolean
      paypal: boolean
      bankTransfer: boolean
    }
    taxSettings: {
      enabled: boolean
      defaultTaxRate: number
    }
    subscriptionDefaults: {
      trialDays: number
      gracePeriodDays: number
    }
  }
  integrations: {
    analytics: {
      googleAnalytics: string
      mixpanel: string
    }
    email: {
      provider: "sendgrid" | "ses" | "mailgun" | "custom"
      apiKey: string
      fromEmail: string
      fromName: string
    }
    sms: {
      provider: "twilio" | "aws-sns" | "custom"
      apiKey: string
      fromNumber: string
    }
  }
  preferences: {
    language: string
    timezone: string
    dateFormat: string
    timeFormat: string
    defaultLanguage: string
  }
  api: {
    rateLimit: number
    enableApiKeys: boolean
    requireApiAuth: boolean
  }
  updatedAt?: Timestamp
  updatedBy?: string
}

const defaultSettings: PlatformSettings = {
  branding: {
    platformName: "BinaryMLM Platform",
    logo: "",
    logoDark: "",
    primaryColor: "#3b82f6",
    secondaryColor: "#8b5cf6",
    supportEmail: "support@binarymlm.com",
    supportPhone: "+1-555-0123",
    website: "https://binarymlm.com",
  },
  system: {
    maintenanceMode: false,
    maintenanceMessage: "Platform is under maintenance. Please check back soon.",
    allowNewRegistrations: true,
    allowNewCompanies: true,
    maxCompaniesPerPlan: 1000,
    defaultTrialDays: 14,
  },
  security: {
    requireTwoFactorAuth: false,
    sessionTimeout: 60,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
    ipWhitelist: [],
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 100,
    },
  },
  notifications: {
    email: true,
    push: true,
    sms: false,
    newCompanyAlerts: true,
    billingAlerts: true,
    systemAlerts: true,
    criticalAlerts: true,
  },
  billing: {
    defaultCurrency: "USD",
    supportedCurrencies: ["USD", "EUR", "GBP", "INR"],
    paymentMethods: {
      stripe: true,
      paypal: false,
      bankTransfer: true,
    },
    taxSettings: {
      enabled: false,
      defaultTaxRate: 0,
    },
    subscriptionDefaults: {
      trialDays: 14,
      gracePeriodDays: 7,
    },
  },
  integrations: {
    analytics: {
      googleAnalytics: "",
      mixpanel: "",
    },
    email: {
      provider: "sendgrid",
      apiKey: "",
      fromEmail: "noreply@binarymlm.com",
      fromName: "BinaryMLM Platform",
    },
    sms: {
      provider: "twilio",
      apiKey: "",
      fromNumber: "",
    },
  },
  preferences: {
    language: "en",
    timezone: "UTC",
    dateFormat: "MM/dd/yyyy",
    timeFormat: "12h",
    defaultLanguage: "en",
  },
  api: {
    rateLimit: 1000,
    enableApiKeys: true,
    requireApiAuth: true,
  },
}

export function SuperAdminSettingsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState("branding")
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const docRef = doc(db, "platform", "settings")
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        setSettings({
          ...defaultSettings,
          ...data,
        })
      }
    } catch (error) {
      console.error("[SuperAdmin] Error loading platform settings:", error)
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (!user?.uid) {
        toast.error("User not authenticated")
        return
      }

      setSaving(true)
      const docRef = doc(db, "platform", "settings")
      await setDoc(
        docRef,
        {
          ...settings,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        },
        { merge: true }
      )

      toast.success("Platform settings saved successfully")
    } catch (error) {
      console.error("[SuperAdmin] Error saving platform settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (category: keyof PlatformSettings, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] as any || {}),
        [key]: value,
      },
    }))
  }

  const updateNestedSetting = (
    category: keyof PlatformSettings,
    subCategory: string,
    key: string,
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] as any || {}),
        [subCategory]: {
          ...((prev[category] as any)?.[subCategory] || {}),
          [key]: value,
        },
      },
    }))
  }

  const updateTripleNestedSetting = (
    category: keyof PlatformSettings,
    subCategory: string,
    subSubCategory: string,
    key: string,
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] as any || {}),
        [subCategory]: {
          ...((prev[category] as any)?.[subCategory] || {}),
          [subSubCategory]: {
            ...((prev[category] as any)?.[subCategory]?.[subSubCategory] || {}),
            [key]: value,
          },
        },
      },
    }))
  }

  if (loading) {
    return <div className="text-center py-8">Loading platform settings...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Platform Settings</h1>
        <p className="text-muted-foreground">Manage platform-wide configuration and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar for sections */}
        <aside className="lg:w-64 flex-shrink-0 bg-card rounded-xl border border-border p-4 shadow-sm">
          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection("branding")}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors ${
                activeSection === "branding"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary hover:bg-muted"
              }`}
            >
              <Globe size={18} />
              Branding
            </button>
            <button
              onClick={() => setActiveSection("system")}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors ${
                activeSection === "system"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary hover:bg-muted"
              }`}
            >
              <Server size={18} />
              System
            </button>
            <button
              onClick={() => setActiveSection("security")}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors ${
                activeSection === "security"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary hover:bg-muted"
              }`}
            >
              <Shield size={18} />
              Security
            </button>
            <button
              onClick={() => setActiveSection("notifications")}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors ${
                activeSection === "notifications"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary hover:bg-muted"
              }`}
            >
              <Bell size={18} />
              Notifications
            </button>
            <button
              onClick={() => setActiveSection("billing")}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors ${
                activeSection === "billing"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary hover:bg-muted"
              }`}
            >
              <CreditCard size={18} />
              Billing
            </button>
            <button
              onClick={() => setActiveSection("integrations")}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors ${
                activeSection === "integrations"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary hover:bg-muted"
              }`}
            >
              <Key size={18} />
              Integrations
            </button>
            <button
              onClick={() => setActiveSection("preferences")}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors ${
                activeSection === "preferences"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary hover:bg-muted"
              }`}
            >
              <SettingsIcon size={18} />
              Preferences
            </button>
            <button
              onClick={() => setActiveSection("api")}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors ${
                activeSection === "api"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary hover:bg-muted"
              }`}
            >
              <Database size={18} />
              API Settings
            </button>
          </nav>
        </aside>

        {/* Content area */}
        <div className="flex-1 space-y-6">
          {/* Branding Section */}
          {activeSection === "branding" && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold text-foreground mb-4">Branding & Platform Info</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Platform Name</label>
                  <input
                    type="text"
                    value={settings.branding.platformName}
                    onChange={(e) => updateSetting("branding", "platformName", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Primary Color</label>
                  <input
                    type="color"
                    value={settings.branding.primaryColor}
                    onChange={(e) => updateSetting("branding", "primaryColor", e.target.value)}
                    className="w-full h-12 rounded-lg border border-border cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Secondary Color</label>
                  <input
                    type="color"
                    value={settings.branding.secondaryColor}
                    onChange={(e) => updateSetting("branding", "secondaryColor", e.target.value)}
                    className="w-full h-12 rounded-lg border border-border cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Support Email</label>
                  <input
                    type="email"
                    value={settings.branding.supportEmail}
                    onChange={(e) => updateSetting("branding", "supportEmail", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Support Phone</label>
                  <input
                    type="tel"
                    value={settings.branding.supportPhone}
                    onChange={(e) => updateSetting("branding", "supportPhone", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Website</label>
                  <input
                    type="url"
                    value={settings.branding.website}
                    onChange={(e) => updateSetting("branding", "website", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* System Section */}
          {activeSection === "system" && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold text-foreground mb-4">System Configuration</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Maintenance Mode</p>
                    <p className="text-sm text-muted-foreground">Put the platform in maintenance mode</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.system.maintenanceMode}
                      onChange={(e) => updateSetting("system", "maintenanceMode", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                {settings.system.maintenanceMode && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Maintenance Message</label>
                    <textarea
                      value={settings.system.maintenanceMessage}
                      onChange={(e) => updateSetting("system", "maintenanceMessage", e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Allow New User Registrations</p>
                    <p className="text-sm text-muted-foreground">Allow new users to register</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.system.allowNewRegistrations}
                      onChange={(e) => updateSetting("system", "allowNewRegistrations", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Allow New Companies</p>
                    <p className="text-sm text-muted-foreground">Allow creation of new companies</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.system.allowNewCompanies}
                      onChange={(e) => updateSetting("system", "allowNewCompanies", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Max Companies Per Plan</label>
                  <input
                    type="number"
                    value={settings.system.maxCompaniesPerPlan}
                    onChange={(e) => updateSetting("system", "maxCompaniesPerPlan", Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Default Trial Days</label>
                  <input
                    type="number"
                    value={settings.system.defaultTrialDays}
                    onChange={(e) => updateSetting("system", "defaultTrialDays", Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === "security" && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold text-foreground mb-4">Security Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Require Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Force 2FA for all users</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.security.requireTwoFactorAuth}
                      onChange={(e) => updateSetting("security", "requireTwoFactorAuth", e.target.checked)}
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
                    onChange={(e) => updateSetting("security", "sessionTimeout", Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Password Policy</p>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">Min Length</label>
                      <input
                        type="number"
                        value={settings.security.passwordPolicy.minLength}
                        onChange={(e) =>
                          updateTripleNestedSetting("security", "passwordPolicy", "", "minLength", Number(e.target.value))
                        }
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                        min="6"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={settings.security.passwordPolicy.requireUppercase}
                          onChange={(e) =>
                            updateTripleNestedSetting(
                              "security",
                              "passwordPolicy",
                              "",
                              "requireUppercase",
                              e.target.checked
                            )
                          }
                          className="h-4 w-4 text-primary rounded"
                        />
                        Uppercase
                      </label>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={settings.security.passwordPolicy.requireNumbers}
                          onChange={(e) =>
                            updateTripleNestedSetting("security", "passwordPolicy", "", "requireNumbers", e.target.checked)
                          }
                          className="h-4 w-4 text-primary rounded"
                        />
                        Numbers
                      </label>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={settings.security.passwordPolicy.requireSpecialChars}
                          onChange={(e) =>
                            updateTripleNestedSetting(
                              "security",
                              "passwordPolicy",
                              "",
                              "requireSpecialChars",
                              e.target.checked
                            )
                          }
                          className="h-4 w-4 text-primary rounded"
                        />
                        Special Chars
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Rate Limiting</p>
                    <p className="text-sm text-muted-foreground">Enable rate limiting for API requests</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.security.rateLimiting.enabled}
                      onChange={(e) => updateNestedSetting("security", "rateLimiting", "enabled", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                {settings.security.rateLimiting.enabled && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Requests Per Minute</label>
                    <input
                      type="number"
                      value={settings.security.rateLimiting.requestsPerMinute}
                      onChange={(e) =>
                        updateNestedSetting("security", "rateLimiting", "requestsPerMinute", Number(e.target.value))
                      }
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      min="1"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold text-foreground mb-4">Notification Settings</h2>
              <div className="space-y-4">
                {[
                  { key: "email", label: "Email Notifications", icon: Mail },
                  { key: "push", label: "Push Notifications", icon: Bell },
                  { key: "sms", label: "SMS Notifications", icon: Smartphone },
                  { key: "newCompanyAlerts", label: "New Company Alerts", icon: Bell },
                  { key: "billingAlerts", label: "Billing Alerts", icon: CreditCard },
                  { key: "systemAlerts", label: "System Alerts", icon: AlertTriangle },
                  { key: "criticalAlerts", label: "Critical Alerts", icon: AlertTriangle },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <item.icon size={20} className="text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications[item.key as keyof typeof settings.notifications] as boolean}
                        onChange={(e) => updateSetting("notifications", item.key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Billing Section */}
          {activeSection === "billing" && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold text-foreground mb-4">Billing Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Default Currency</label>
                  <select
                    value={settings.billing.defaultCurrency}
                    onChange={(e) => updateSetting("billing", "defaultCurrency", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Payment Methods</p>
                  <div className="space-y-2">
                    {Object.keys(settings.billing.paymentMethods).map((method) => (
                      <div key={method} className="flex items-center justify-between">
                        <span className="text-sm text-foreground capitalize">{method}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.billing.paymentMethods[method as keyof typeof settings.billing.paymentMethods]}
                            onChange={(e) =>
                              updateNestedSetting("billing", "paymentMethods", method, e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Tax Settings</p>
                    <p className="text-sm text-muted-foreground">Enable tax calculation</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.billing.taxSettings.enabled}
                      onChange={(e) => updateNestedSetting("billing", "taxSettings", "enabled", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                {settings.billing.taxSettings.enabled && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Default Tax Rate (%)</label>
                    <input
                      type="number"
                      value={settings.billing.taxSettings.defaultTaxRate}
                      onChange={(e) =>
                        updateNestedSetting("billing", "taxSettings", "defaultTaxRate", Number(e.target.value))
                      }
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Default Trial Days</label>
                  <input
                    type="number"
                    value={settings.billing.subscriptionDefaults.trialDays}
                    onChange={(e) =>
                      updateNestedSetting("billing", "subscriptionDefaults", "trialDays", Number(e.target.value))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Grace Period Days</label>
                  <input
                    type="number"
                    value={settings.billing.subscriptionDefaults.gracePeriodDays}
                    onChange={(e) =>
                      updateNestedSetting("billing", "subscriptionDefaults", "gracePeriodDays", Number(e.target.value))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Integrations Section */}
          {activeSection === "integrations" && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold text-foreground mb-4">Third-Party Integrations</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Analytics</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Google Analytics ID</label>
                      <input
                        type="text"
                        value={settings.integrations.analytics.googleAnalytics}
                        onChange={(e) =>
                          updateNestedSetting("integrations", "analytics", "googleAnalytics", e.target.value)
                        }
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="G-XXXXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Mixpanel Token</label>
                      <input
                        type="text"
                        value={settings.integrations.analytics.mixpanel}
                        onChange={(e) => updateNestedSetting("integrations", "analytics", "mixpanel", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Your Mixpanel token"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Email Provider</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Provider</label>
                      <select
                        value={settings.integrations.email.provider}
                        onChange={(e) => updateNestedSetting("integrations", "email", "provider", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="sendgrid">SendGrid</option>
                        <option value="ses">AWS SES</option>
                        <option value="mailgun">Mailgun</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">API Key</label>
                      <input
                        type="password"
                        value={settings.integrations.email.apiKey}
                        onChange={(e) => updateNestedSetting("integrations", "email", "apiKey", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter API key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">From Email</label>
                      <input
                        type="email"
                        value={settings.integrations.email.fromEmail}
                        onChange={(e) => updateNestedSetting("integrations", "email", "fromEmail", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">From Name</label>
                      <input
                        type="text"
                        value={settings.integrations.email.fromName}
                        onChange={(e) => updateNestedSetting("integrations", "email", "fromName", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-3">SMS Provider</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Provider</label>
                      <select
                        value={settings.integrations.sms.provider}
                        onChange={(e) => updateNestedSetting("integrations", "sms", "provider", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="twilio">Twilio</option>
                        <option value="aws-sns">AWS SNS</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">API Key</label>
                      <input
                        type="password"
                        value={settings.integrations.sms.apiKey}
                        onChange={(e) => updateNestedSetting("integrations", "sms", "apiKey", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter API key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">From Number</label>
                      <input
                        type="text"
                        value={settings.integrations.sms.fromNumber}
                        onChange={(e) => updateNestedSetting("integrations", "sms", "fromNumber", e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Section */}
          {activeSection === "preferences" && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold text-foreground mb-4">Platform Preferences</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Default Language</label>
                  <select
                    value={settings.preferences.defaultLanguage}
                    onChange={(e) => updateSetting("preferences", "defaultLanguage", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="hi">Hindi</option>
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
                    <option value="America/New_York">EST</option>
                    <option value="America/Los_Angeles">PST</option>
                    <option value="Europe/London">GMT</option>
                    <option value="Asia/Kolkata">IST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Date Format</label>
                  <select
                    value={settings.preferences.dateFormat}
                    onChange={(e) => updateSetting("preferences", "dateFormat", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                    <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                    <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Time Format</label>
                  <select
                    value={settings.preferences.timeFormat}
                    onChange={(e) => updateSetting("preferences", "timeFormat", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="12h">12-hour</option>
                    <option value="24h">24-hour</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* API Settings Section */}
          {activeSection === "api" && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold text-foreground mb-4">API Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Rate Limit (requests per hour)</label>
                  <input
                    type="number"
                    value={settings.api.rateLimit}
                    onChange={(e) => updateSetting("api", "rateLimit", Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="1"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Enable API Keys</p>
                    <p className="text-sm text-muted-foreground">Allow API key authentication</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.api.enableApiKeys}
                      onChange={(e) => updateSetting("api", "enableApiKeys", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Require API Authentication</p>
                    <p className="text-sm text-muted-foreground">Require authentication for all API requests</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.api.requireApiAuth}
                      onChange={(e) => updateSetting("api", "requireApiAuth", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

