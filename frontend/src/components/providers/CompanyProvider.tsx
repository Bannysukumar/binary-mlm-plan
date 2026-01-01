'use client';

import { useEffect } from 'react';
import { useCompanyStore } from '@/store/companyStore';
import { useAuthStore } from '@/store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CompanySettings } from '@/shared/types';

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { setSettings, setLoading } = useCompanyStore();

  useEffect(() => {
    const loadCompanySettings = async () => {
      if (!user?.companyId || !db) {
        setSettings(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const companyDoc = await getDoc(doc(db, 'companies', user.companyId));
        if (companyDoc.exists()) {
          const data = companyDoc.data();
          const settings: CompanySettings = {
            companyId: companyDoc.id,
            name: data.name || data.appName || '',
            appName: data.appName || data.name || '',
            logo: data.logo,
            logoDark: data.logoDark,
            primaryColor: data.primaryColor || data.brandColors?.primary || '#3b82f6',
            secondaryColor: data.secondaryColor || data.brandColors?.secondary || '#8b5cf6',
            brandColors: data.brandColors || {
              primary: data.primaryColor || '#3b82f6',
              secondary: data.secondaryColor || '#8b5cf6',
              accent: data.brandColors?.accent || '#10b981',
            },
            fontFamily: data.fontFamily || 'Inter',
            currency: data.currency,
            currencySymbol: data.currencySymbol,
            language: data.language,
            timezone: data.timezone,
            emailTemplates: data.emailTemplates,
            smsTemplates: data.smsTemplates,
          };
          setSettings(settings);
        } else {
          setSettings(null);
        }
      } catch (error: any) {
        // Only log actual errors, not permission errors for super admins or unauthenticated users
        if (error?.code === 'permission-denied' && user?.role === 'super_admin') {
          // Silently handle permission denied for super admins
        } else if (error?.code !== 'unauthenticated') {
          console.error('Error loading company settings:', error);
        }
        setSettings(null);
      } finally {
        setLoading(false);
      }
    };

    loadCompanySettings();
  }, [user?.companyId, user?.role, setSettings, setLoading]);

  return <>{children}</>;
}
