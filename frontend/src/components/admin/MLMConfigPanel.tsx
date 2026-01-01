'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { MLMConfig } from '@/shared/types';
import { toast } from 'react-hot-toast';

export function MLMConfigPanel() {
  const { user } = useAuthStore();
  const [config, setConfig] = useState<MLMConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.companyId) {
      loadConfig();
    }
  }, [user?.companyId]);

  const loadConfig = async () => {
    if (!user?.companyId) return;
    
    try {
      setLoading(true);
      const configDoc = await getDoc(doc(db, `companies/${user.companyId}/mlmConfig/main`));
      if (configDoc.exists()) {
        setConfig(configDoc.data() as MLMConfig);
      } else {
        // Initialize default config
        const defaultConfig: MLMConfig = {
          companyId: user.companyId,
          spilloverMode: 'auto',
          directIncome: {
            enabled: true,
            type: 'percentage',
            value: 10,
            basedOnPackage: true,
            creditTiming: 'instant',
          },
          binaryMatching: {
            enabled: true,
            pairRatio: '1:1',
            pairIncome: 100,
            cappingPeriod: 'daily',
            carryForward: true,
            flushOut: false,
            weakLegLogic: 'smaller',
          },
          repurchaseIncome: {
            enabled: true,
            repurchaseBV: 1000,
            incomePercentage: 5,
            eligibleLevels: [1, 2, 3],
            monthlyQualification: true,
          },
          sponsorMatching: {
            enabled: true,
            levels: [
              { level: 1, percentage: 5, qualification: {} },
              { level: 2, percentage: 3, qualification: {} },
            ],
            autoDisableIfInactive: true,
            inactiveDays: 30,
          },
          ranks: [],
          updatedAt: new Date(),
          updatedBy: user.uid,
        };
        setConfig(defaultConfig);
      }
    } catch (error: any) {
      console.error('Error loading MLM config:', error);
      // If config doesn't exist, that's okay - we'll use defaults
      if (error?.code !== 'permission-denied') {
        toast.error('Failed to load MLM configuration. Using defaults.');
      }
      // Set default config on error
      if (user?.companyId) {
        const defaultConfig: MLMConfig = {
          companyId: user.companyId,
          spilloverMode: 'auto',
          directIncome: {
            enabled: true,
            type: 'percentage',
            value: 10,
            basedOnPackage: true,
            creditTiming: 'instant',
          },
          binaryMatching: {
            enabled: true,
            pairRatio: '1:1',
            pairIncome: 100,
            cappingPeriod: 'daily',
            carryForward: true,
            flushOut: false,
            weakLegLogic: 'smaller',
          },
          repurchaseIncome: {
            enabled: true,
            repurchaseBV: 1000,
            incomePercentage: 5,
            eligibleLevels: [1, 2, 3],
            monthlyQualification: true,
          },
          sponsorMatching: {
            enabled: true,
            levels: [
              { level: 1, percentage: 5, qualification: {} },
              { level: 2, percentage: 3, qualification: {} },
            ],
            autoDisableIfInactive: true,
            inactiveDays: 30,
          },
          ranks: [],
          updatedAt: new Date(),
          updatedBy: user.uid,
        };
        setConfig(defaultConfig);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!user?.companyId || !config) return;

    try {
      setSaving(true);
      await setDoc(
        doc(db, `companies/${user.companyId}/mlmConfig/main`),
        {
          ...config,
          updatedAt: new Date(),
          updatedBy: user.uid,
        }
      );
      toast.success('MLM configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save MLM configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading configuration...</div>;
  }

  if (!config) {
    return <div className="text-center py-8">No configuration found</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">MLM Configuration</h3>
      
      <div className="space-y-6">
        {/* Spillover Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Spillover Mode
          </label>
          <select
            value={config.spilloverMode}
            onChange={(e) => setConfig({ ...config, spilloverMode: e.target.value as 'auto' | 'manual' })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="auto">Auto</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        {/* Direct Income */}
        <div className="border-t pt-4">
          <h4 className="text-md font-medium mb-3">Direct/Sponsor Income</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.directIncome.enabled}
                onChange={(e) => setConfig({
                  ...config,
                  directIncome: { ...config.directIncome, enabled: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={config.directIncome.type}
                  onChange={(e) => setConfig({
                    ...config,
                    directIncome: { ...config.directIncome, type: e.target.value as 'fixed' | 'percentage' }
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="fixed">Fixed</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Value
                </label>
                <input
                  type="number"
                  value={config.directIncome.value}
                  onChange={(e) => setConfig({
                    ...config,
                    directIncome: { ...config.directIncome, value: parseFloat(e.target.value) }
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Binary Matching */}
        <div className="border-t pt-4">
          <h4 className="text-md font-medium mb-3">Binary Matching Income</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.binaryMatching.enabled}
                onChange={(e) => setConfig({
                  ...config,
                  binaryMatching: { ...config.binaryMatching, enabled: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pair Ratio
                </label>
                <input
                  type="text"
                  value={config.binaryMatching.pairRatio}
                  onChange={(e) => setConfig({
                    ...config,
                    binaryMatching: { ...config.binaryMatching, pairRatio: e.target.value }
                  })}
                  placeholder="1:1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pair Income
                </label>
                <input
                  type="number"
                  value={config.binaryMatching.pairIncome}
                  onChange={(e) => setConfig({
                    ...config,
                    binaryMatching: { ...config.binaryMatching, pairIncome: parseFloat(e.target.value) }
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
