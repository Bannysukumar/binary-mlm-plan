'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { CompanyAnalytics } from '@/shared/types';

export function AnalyticsDashboard() {
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState<Partial<CompanyAnalytics>>({
    totalUsers: 0,
    activeUsers: 0,
    newRegistrations: 0,
    totalIncome: 0,
    totalWithdrawals: 0,
    totalPairs: 0,
    totalVolume: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.companyId) {
      loadAnalytics();
    } else {
      setLoading(false);
    }
  }, [user?.companyId]);

  const loadAnalytics = async () => {
    if (!user?.companyId) return;

    try {
      setLoading(true);

      if (!db) {
        throw new Error('Firestore not initialized');
      }

      // Load users
      const usersSnapshot = await getDocs(
        query(collection(db, `companies/${user.companyId}/users`))
      );
      const users = usersSnapshot.docs.map(doc => doc.data());
      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.isActive).length;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newRegistrations = users.filter(u => {
        const createdAt = u.createdAt?.toDate() || new Date(0);
        return createdAt >= today;
      }).length;

      // Load income transactions
      const incomeSnapshot = await getDocs(
        query(collection(db, `companies/${user.companyId}/incomeTransactions`))
      );
      const totalIncome = incomeSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.amount || 0);
      }, 0);

      // Load withdrawals
      const withdrawalsSnapshot = await getDocs(
        query(collection(db, `companies/${user.companyId}/withdrawals`))
      );
      const totalWithdrawals = withdrawalsSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.amount || 0);
      }, 0);

      setAnalytics({
        totalUsers,
        activeUsers,
        newRegistrations,
        totalIncome,
        totalWithdrawals,
        totalPairs: 0, // Calculate from binary tree
        totalVolume: 0, // Calculate from binary tree
      });
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      // Set default values on error
      setAnalytics({
        totalUsers: 0,
        activeUsers: 0,
        newRegistrations: 0,
        totalIncome: 0,
        totalWithdrawals: 0,
        totalPairs: 0,
        totalVolume: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  const stats = [
    { label: 'Total Users', value: analytics.totalUsers || 0 },
    { label: 'Active Users', value: analytics.activeUsers || 0 },
    { label: 'New Registrations (Today)', value: analytics.newRegistrations || 0 },
    { label: 'Total Income', value: `$${((analytics.totalIncome || 0) / 100).toFixed(2)}` },
    { label: 'Total Withdrawals', value: `$${((analytics.totalWithdrawals || 0) / 100).toFixed(2)}` },
    { label: 'Total Pairs', value: analytics.totalPairs || 0 },
    { label: 'Total Volume', value: analytics.totalVolume || 0 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{index + 1}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">
                    {stat.label}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stat.value}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
