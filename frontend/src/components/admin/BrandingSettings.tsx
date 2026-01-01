'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useCompanyStore } from '@/store/companyStore';
import { toast } from 'react-hot-toast';

export function BrandingSettings() {
  const { user } = useAuthStore();
  const { settings, setSettings } = useCompanyStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    logoDark: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    fontFamily: 'Inter',
    currency: 'USD',
    currencySymbol: '$',
    language: 'en',
    timezone: 'UTC',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoDarkFile, setLogoDarkFile] = useState<File | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name || '',
        logo: settings.logo || '',
        logoDark: settings.logoDark || '',
        primaryColor: settings.primaryColor || '#3b82f6',
        secondaryColor: settings.secondaryColor || '#8b5cf6',
        fontFamily: (settings as any).fontFamily || 'Inter',
        currency: settings.currency || 'USD',
        currencySymbol: settings.currencySymbol || '$',
        language: settings.language || 'en',
        timezone: settings.timezone || 'UTC',
      });
    }
  }, [settings]);

  const handleLogoUpload = async (file: File, isDark: boolean) => {
    if (!user?.companyId) return null;
    
    try {
      const fileRef = ref(storage, `companies/${user.companyId}/logo${isDark ? '-dark' : ''}.${file.name.split('.').pop()}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      return url;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
      return null;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;

    try {
      setSaving(true);

      let logoUrl = formData.logo;
      let logoDarkUrl = formData.logoDark;

      // Upload logos if files are selected
      if (logoFile) {
        logoUrl = await handleLogoUpload(logoFile, false) || logoUrl;
      }
      if (logoDarkFile) {
        logoDarkUrl = await handleLogoUpload(logoDarkFile, true) || logoDarkUrl;
      }

      const updatedSettings = {
        ...formData,
        logo: logoUrl,
        logoDark: logoDarkUrl,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'companies', user.companyId), updatedSettings);
      
      setSettings({
        ...settings!,
        ...updatedSettings,
      });

      // Apply branding to page
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--color-primary', formData.primaryColor);
        document.documentElement.style.setProperty('--color-secondary', formData.secondaryColor);
      }

      toast.success('Branding settings saved successfully!');
      setLogoFile(null);
      setLogoDarkFile(null);
    } catch (error: any) {
      console.error('Error saving branding:', error);
      let errorMessage = 'Failed to save branding settings';
      
      if (error?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Make sure you are logged in as Company Admin and have signed out/in to refresh your token.';
      } else if (error?.code === 'unavailable') {
        errorMessage = 'Firestore is unavailable. Please check your connection.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-lg font-medium mb-6">Company Branding & Whitelabel Settings</h3>
      
      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Company Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Logo Upload */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Logo (Light Mode)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {formData.logo && (
              <img src={formData.logo} alt="Logo" className="mt-2 h-16 object-contain" />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Logo (Dark Mode)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoDarkFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {formData.logoDark && (
              <img src={formData.logoDark} alt="Logo Dark" className="mt-2 h-16 object-contain" />
            )}
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Primary Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="h-10 w-20 rounded-md border-gray-300"
              />
              <input
                type="text"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Secondary Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.secondaryColor}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                className="h-10 w-20 rounded-md border-gray-300"
              />
              <input
                type="text"
                value={formData.secondaryColor}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Currency Code
            </label>
            <input
              type="text"
              required
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="USD"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Currency Symbol
            </label>
            <input
              type="text"
              required
              value={formData.currencySymbol}
              onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="$"
            />
          </div>
        </div>

        {/* Language & Timezone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="hi">Hindi</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">EST</option>
              <option value="America/Los_Angeles">PST</option>
              <option value="Europe/London">GMT</option>
              <option value="Asia/Kolkata">IST</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Branding Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
