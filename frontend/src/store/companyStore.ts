import { create } from 'zustand';
import { CompanySettings } from '@/shared/types';

interface CompanyState {
  settings: CompanySettings | null;
  loading: boolean;
  setSettings: (settings: CompanySettings | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useCompanyStore = create<CompanyState>((set) => ({
  settings: null,
  loading: true,
  
  setSettings: (settings) => set({ settings }),
  
  setLoading: (loading) => set({ loading }),
}));
