'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { MLMConfig } from '@/shared/types';
import { toast } from 'react-hot-toast';

export function EnhancedMLMConfigPanel() {
  const { user } = useAuthStore();
  const [config, setConfig] = useState<MLMConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('binary');

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
            cappingAmount: 1000,
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
              { level: 1, percentage: 5, qualification: { directs: 1 } },
              { level: 2, percentage: 3, qualification: { directs: 2 } },
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
      if (error?.code !== 'permission-denied') {
        toast.error('Failed to load MLM configuration. Using defaults.');
      }
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
            cappingAmount: 1000,
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
              { level: 1, percentage: 5, qualification: { directs: 1 } },
              { level: 2, percentage: 3, qualification: { directs: 2 } },
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
          updatedAt: serverTimestamp(),
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

  const sections = [
    { id: 'binary', label: 'Binary Settings' },
    { id: 'direct', label: 'Direct Income' },
    { id: 'matching', label: 'Matching Income' },
    { id: 'repurchase', label: 'Repurchase Income' },
    { id: 'sponsor', label: 'Sponsor Matching' },
    { id: 'ranks', label: 'Ranks & Rewards' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === section.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Binary Settings */}
        {activeSection === 'binary' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-md font-medium mb-4">Binary Plan Configuration</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={config.binaryMatching.enabled}
                      onChange={(e) => setConfig({
                        ...config,
                        binaryMatching: { ...config.binaryMatching, enabled: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Binary Matching Income</span>
                  </label>
                </div>

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
                    <p className="text-xs text-gray-500 mt-1">Format: 1:1, 2:1, etc.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Pair Income Value
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Capping Period
                    </label>
                    <select
                      value={config.binaryMatching.cappingPeriod}
                      onChange={(e) => setConfig({
                        ...config,
                        binaryMatching: { ...config.binaryMatching, cappingPeriod: e.target.value as any }
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Maximum Income Per Period
                    </label>
                    <input
                      type="number"
                      value={config.binaryMatching.cappingAmount || 0}
                      onChange={(e) => setConfig({
                        ...config,
                        binaryMatching: { ...config.binaryMatching, cappingAmount: parseFloat(e.target.value) }
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.binaryMatching.carryForward}
                      onChange={(e) => setConfig({
                        ...config,
                        binaryMatching: { ...config.binaryMatching, carryForward: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Enable Carry Forward</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.binaryMatching.flushOut}
                      onChange={(e) => setConfig({
                        ...config,
                        binaryMatching: { ...config.binaryMatching, flushOut: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Enable Flush Out</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Weak Leg Logic
                  </label>
                  <select
                    value={config.binaryMatching.weakLegLogic}
                    onChange={(e) => setConfig({
                      ...config,
                      binaryMatching: { ...config.binaryMatching, weakLegLogic: e.target.value as any }
                    })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="left">Left Leg</option>
                    <option value="right">Right Leg</option>
                    <option value="smaller">Smaller Leg</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spillover Mode
                  </label>
                  <select
                    value={config.spilloverMode}
                    onChange={(e) => setConfig({ ...config, spilloverMode: e.target.value as 'auto' | 'manual' })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="auto">Auto Spillover</option>
                    <option value="manual">Manual Placement</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Direct Income */}
        {activeSection === 'direct' && (
          <div className="space-y-6">
            <h4 className="text-md font-medium mb-4">Direct / Sponsor Income Configuration</h4>
            
            <div className="space-y-4">
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Direct Income</span>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Income Type
                  </label>
                  <select
                    value={config.directIncome.type}
                    onChange={(e) => setConfig({
                      ...config,
                      directIncome: { ...config.directIncome, type: e.target.value as 'fixed' | 'percentage' }
                    })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="fixed">Fixed Amount</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {config.directIncome.type === 'fixed' ? 'Fixed Amount' : 'Percentage (%)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.directIncome.value}
                    onChange={(e) => setConfig({
                      ...config,
                      directIncome: { ...config.directIncome, value: parseFloat(e.target.value) }
                    })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.directIncome.basedOnPackage}
                    onChange={(e) => setConfig({
                      ...config,
                      directIncome: { ...config.directIncome, basedOnPackage: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Based on Package BV</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Credit Timing
                </label>
                <select
                  value={config.directIncome.creditTiming}
                  onChange={(e) => setConfig({
                    ...config,
                    directIncome: { 
                      ...config.directIncome, 
                      creditTiming: e.target.value as 'instant' | 'delayed',
                      delayHours: e.target.value === 'delayed' ? config.directIncome.delayHours || 24 : undefined
                    }
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="instant">Instant</option>
                  <option value="delayed">Delayed</option>
                </select>
              </div>

              {config.directIncome.creditTiming === 'delayed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Delay Hours
                  </label>
                  <input
                    type="number"
                    value={config.directIncome.delayHours || 24}
                    onChange={(e) => setConfig({
                      ...config,
                      directIncome: { ...config.directIncome, delayHours: parseInt(e.target.value) }
                    })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Matching Income */}
        {activeSection === 'matching' && (
          <div className="space-y-6">
            <h4 className="text-md font-medium mb-4">Binary Matching / Pair Income Configuration</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure how binary pairs are calculated and income is distributed.
            </p>
            {/* Configuration already shown in Binary Settings section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Binary Matching settings are configured in the "Binary Settings" tab above.
              </p>
            </div>
          </div>
        )}

        {/* Repurchase Income */}
        {activeSection === 'repurchase' && (
          <div className="space-y-6">
            <h4 className="text-md font-medium mb-4">Repurchase Income Configuration</h4>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.repurchaseIncome.enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    repurchaseIncome: { ...config.repurchaseIncome, enabled: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Repurchase Income</span>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Repurchase BV Threshold
                  </label>
                  <input
                    type="number"
                    value={config.repurchaseIncome.repurchaseBV}
                    onChange={(e) => setConfig({
                      ...config,
                      repurchaseIncome: { ...config.repurchaseIncome, repurchaseBV: parseFloat(e.target.value) }
                    })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Income Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.repurchaseIncome.incomePercentage}
                    onChange={(e) => setConfig({
                      ...config,
                      repurchaseIncome: { ...config.repurchaseIncome, incomePercentage: parseFloat(e.target.value) }
                    })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Eligible Upline Levels (comma-separated)
                </label>
                <input
                  type="text"
                  value={config.repurchaseIncome.eligibleLevels.join(', ')}
                  onChange={(e) => {
                    const levels = e.target.value.split(',').map(l => parseInt(l.trim())).filter(l => !isNaN(l));
                    setConfig({
                      ...config,
                      repurchaseIncome: { ...config.repurchaseIncome, eligibleLevels: levels }
                    });
                  }}
                  placeholder="1, 2, 3"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.repurchaseIncome.monthlyQualification}
                  onChange={(e) => setConfig({
                    ...config,
                    repurchaseIncome: { ...config.repurchaseIncome, monthlyQualification: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Monthly Qualification Required</span>
              </label>
            </div>
          </div>
        )}

        {/* Sponsor Matching */}
        {activeSection === 'sponsor' && (
          <div className="space-y-6">
            <h4 className="text-md font-medium mb-4">Sponsor Matching Income Configuration</h4>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.sponsorMatching.enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    sponsorMatching: { ...config.sponsorMatching, enabled: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Sponsor Matching Income</span>
              </label>

              <div className="space-y-4">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Level Configuration</h5>
                {Array.isArray(config.sponsorMatching.levels) && config.sponsorMatching.levels.map((level, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h6 className="font-medium">Level {level.level}</h6>
                      <button
                        type="button"
                        onClick={() => {
                          if (Array.isArray(config.sponsorMatching.levels)) {
                            const newLevels = config.sponsorMatching.levels.filter((_, i) => i !== index);
                            setConfig({
                              ...config,
                              sponsorMatching: { ...config.sponsorMatching, levels: newLevels }
                            });
                          }
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Percentage (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={level.percentage}
                          onChange={(e) => {
                            if (Array.isArray(config.sponsorMatching.levels)) {
                              const newLevels = [...config.sponsorMatching.levels];
                              newLevels[index].percentage = parseFloat(e.target.value);
                              setConfig({
                                ...config,
                                sponsorMatching: { ...config.sponsorMatching, levels: newLevels }
                              });
                            }
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Min Directs</label>
                        <input
                          type="number"
                          value={level.qualification.directs || 0}
                          onChange={(e) => {
                            if (Array.isArray(config.sponsorMatching.levels)) {
                              const newLevels = [...config.sponsorMatching.levels];
                              newLevels[index].qualification.directs = parseInt(e.target.value);
                              setConfig({
                                ...config,
                                sponsorMatching: { ...config.sponsorMatching, levels: newLevels }
                              });
                            }
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Min Team Volume</label>
                        <input
                          type="number"
                          value={level.qualification.teamVolume || 0}
                          onChange={(e) => {
                            if (Array.isArray(config.sponsorMatching.levels)) {
                              const newLevels = [...config.sponsorMatching.levels];
                              newLevels[index].qualification.teamVolume = parseFloat(e.target.value);
                              setConfig({
                                ...config,
                                sponsorMatching: { ...config.sponsorMatching, levels: newLevels }
                              });
                            }
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    if (Array.isArray(config.sponsorMatching.levels)) {
                      const newLevel = {
                        level: config.sponsorMatching.levels.length + 1,
                        percentage: 0,
                        qualification: {}
                      };
                      setConfig({
                        ...config,
                        sponsorMatching: {
                          ...config.sponsorMatching,
                          levels: [...config.sponsorMatching.levels, newLevel]
                        }
                      });
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                >
                  + Add Level
                </button>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.sponsorMatching.autoDisableIfInactive}
                    onChange={(e) => setConfig({
                      ...config,
                      sponsorMatching: { ...config.sponsorMatching, autoDisableIfInactive: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Auto-disable if Inactive</span>
                </label>
                {config.sponsorMatching.autoDisableIfInactive && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Inactive Days Threshold
                    </label>
                    <input
                      type="number"
                      value={config.sponsorMatching.inactiveDays || 30}
                      onChange={(e) => setConfig({
                        ...config,
                        sponsorMatching: { ...config.sponsorMatching, inactiveDays: parseInt(e.target.value) }
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ranks & Rewards */}
        {activeSection === 'ranks' && (
          <div className="space-y-6">
            <h4 className="text-md font-medium mb-4">Ranks & Rewards Configuration</h4>
            
            <div className="space-y-4">
              {config.ranks.map((rank, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h6 className="font-medium">{rank.name} (Level {rank.level})</h6>
                    <button
                      type="button"
                      onClick={() => {
                        const newRanks = config.ranks.filter((_, i) => i !== index);
                        setConfig({
                          ...config,
                          ranks: newRanks
                        });
                      }}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Min Team Volume</label>
                      <input
                        type="number"
                        value={rank.qualification.teamVolume}
                        onChange={(e) => {
                          const newRanks = [...config.ranks];
                          newRanks[index].qualification.teamVolume = parseFloat(e.target.value);
                          setConfig({ ...config, ranks: newRanks });
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Min Pairs</label>
                      <input
                        type="number"
                        value={rank.qualification.pairs}
                        onChange={(e) => {
                          const newRanks = [...config.ranks];
                          newRanks[index].qualification.pairs = parseInt(e.target.value);
                          setConfig({ ...config, ranks: newRanks });
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Cash Reward</label>
                    <input
                      type="number"
                      value={rank.rewards.cash || 0}
                      onChange={(e) => {
                        const newRanks = [...config.ranks];
                        newRanks[index].rewards.cash = parseFloat(e.target.value);
                        setConfig({ ...config, ranks: newRanks });
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={rank.autoAssign}
                      onChange={(e) => {
                        const newRanks = [...config.ranks];
                        newRanks[index].autoAssign = e.target.checked;
                        setConfig({ ...config, ranks: newRanks });
                      }}
                      className="mr-2"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Auto-assign when qualified</span>
                  </label>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newRank = {
                    id: `rank_${Date.now()}`,
                    name: `Rank ${config.ranks.length + 1}`,
                    level: config.ranks.length + 1,
                    qualification: {
                      teamVolume: 0,
                      pairs: 0,
                      directs: 0,
                    },
                    rewards: {
                      cash: 0,
                    },
                    autoAssign: true,
                  };
                  setConfig({
                    ...config,
                    ranks: [...config.ranks, newRank]
                  });
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
              >
                + Add Rank
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-6 border-t mt-6">
          <button
            type="button"
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
