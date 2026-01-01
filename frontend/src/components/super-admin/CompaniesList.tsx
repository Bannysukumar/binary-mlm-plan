'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Company, CompanySettings } from '@/shared/types';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export function CompaniesList() {
  const { user, hasRole } = useAuthStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    currency: 'USD',
    currencySymbol: '$',
    language: 'en',
    timezone: 'UTC',
  });

  useEffect(() => {
    // Only load companies if user is authenticated
    if (user) {
      loadCompanies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      if (!user) {
        toast.error('You must be logged in to view companies');
        return;
      }

      // Check if Firestore is initialized
      if (!db) {
        toast.error('Firestore is not initialized. Please refresh the page.');
        return;
      }

      const snapshot = await getDocs(collection(db, 'companies'));
      const companiesData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          code: data.code || '',
          adminEmail: data.adminEmail || '',
          defaultCurrency: data.defaultCurrency || 'USD',
          country: data.country || '',
          timezone: data.timezone || 'UTC',
          language: data.language || 'en',
          domain: data.domain,
          status: data.status || 'active',
          demoMode: data.demoMode || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Company;
      });
      
      setCompanies(companiesData);
      
      if (companiesData.length === 0) {
        // No companies yet, but that's okay
        console.log('No companies found. This is normal for a new installation.');
      }
    } catch (error: any) {
      console.error('Error loading companies:', error);
      const errorMessage = error?.message || 'Failed to load companies';
      
      // Show specific error messages
      if (error?.code === 'permission-denied') {
        toast.error('Permission denied. Make sure you are logged in and have the correct role.');
      } else if (error?.code === 'unavailable') {
        toast.error('Firestore is unavailable. Please check your connection.');
      } else if (error?.code === 'unauthenticated') {
        toast.error('You must be logged in to view companies. Please sign in again.');
      } else {
        toast.error(`Failed to load companies: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is super admin
    if (!hasRole('super_admin')) {
      toast.error('Only Super Admins can create companies. Please sign out and sign in again to refresh your permissions.');
      return;
    }

    try {
      // Validate form data
      if (!formData.name.trim()) {
        toast.error('Company name is required');
        return;
      }

      // Use serverTimestamp for Firestore compatibility
      await addDoc(collection(db, 'companies'), {
        ...formData,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      toast.success('Company created successfully');
      setShowModal(false);
      setFormData({
        name: '',
        primaryColor: '#3b82f6',
        secondaryColor: '#8b5cf6',
        currency: 'USD',
        currencySymbol: '$',
        language: 'en',
        timezone: 'UTC',
      });
      loadCompanies();
    } catch (error: any) {
      console.error('Error creating company:', error);
      const errorMessage = error?.message || 'Failed to create company';
      
      // Show more specific error messages
      if (error?.code === 'permission-denied') {
        toast.error('Permission denied. Make sure you are logged in as Super Admin and have signed out/in to refresh your token.');
      } else if (error?.code === 'unavailable') {
        toast.error('Firestore is unavailable. Please check your connection.');
      } else {
        toast.error(`Failed to create company: ${errorMessage}`);
      }
    }
  };

  const toggleCompanyStatus = async (companyId: string, isActive: boolean) => {
    try {
      const newStatus = isActive ? 'suspended' : 'active';
      await updateDoc(doc(db, 'companies', companyId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success('Company status updated');
      loadCompanies();
    } catch (error: any) {
      console.error('Error updating company status:', error);
      const errorMessage = error?.message || 'Failed to update company status';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Create Company
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {companies.map((company) => (
            <li key={company.id}>
              <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {company.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Currency: {company.defaultCurrency}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                    ID: {company.id}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      company.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {company.status === 'active' ? 'Active' : company.status}
                  </span>
                  <button
                    onClick={() => toggleCompanyStatus(company.id, company.status === 'active')}
                    className="text-sm text-indigo-600 hover:text-indigo-900"
                  >
                    {company.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Create New Company
            </h3>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Primary Color
                </label>
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Secondary Color
                </label>
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Currency
                </label>
                <input
                  type="text"
                  required
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  required
                  value={formData.currencySymbol}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
