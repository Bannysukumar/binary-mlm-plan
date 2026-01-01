'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { CompanyAnalytics } from '@/shared/types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function EnhancedAnalyticsDashboard() {
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
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    if (user?.companyId) {
      loadAnalytics();
    }
  }, [user?.companyId, timeRange]);

  const loadAnalytics = async () => {
    if (!user?.companyId) return;

    try {
      setLoading(true);

      // Load users
      const usersSnapshot = await getDocs(
        query(collection(db, `companies/${user.companyId}/users`))
      );
      const users = usersSnapshot.docs.map(doc => doc.data());
      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.isActive).length;
      
      const today = new Date();
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(today.getDate() - daysAgo);
      
      const newRegistrations = users.filter(u => {
        const createdAt = u.createdAt?.toDate() || new Date(0);
        return createdAt >= startDate;
      }).length;

      // Load income transactions
      const incomeSnapshot = await getDocs(
        query(collection(db, `companies/${user.companyId}/incomeTransactions`))
      );
      const incomeByType: Record<string, number> = {};
      let totalIncome = 0;
      
      incomeSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const amount = data.amount || 0;
        totalIncome += amount;
        const type = data.incomeType || 'other';
        incomeByType[type] = (incomeByType[type] || 0) + amount;
      });

      // Load withdrawals
      const withdrawalsSnapshot = await getDocs(
        query(collection(db, `companies/${user.companyId}/withdrawals`))
      );
      const totalWithdrawals = withdrawalsSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.amount || 0);
      }, 0);

      // Calculate pairs (simplified - would need binary tree data)
      const totalPairs = 0; // TODO: Calculate from binary tree
      const totalVolume = 0; // TODO: Calculate from binary tree

      setAnalytics({
        totalUsers,
        activeUsers,
        newRegistrations,
        totalIncome,
        totalWithdrawals,
        totalPairs,
        totalVolume,
        incomeByType,
      });
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
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
    { label: 'Total Users', value: analytics.totalUsers || 0, color: 'bg-blue-500' },
    { label: 'Active Users', value: analytics.activeUsers || 0, color: 'bg-green-500' },
    { label: `New Registrations (${timeRange})`, value: analytics.newRegistrations || 0, color: 'bg-purple-500' },
    { label: 'Total Income', value: `$${((analytics.totalIncome || 0) / 100).toFixed(2)}`, color: 'bg-indigo-500' },
    { label: 'Total Withdrawals', value: `$${((analytics.totalWithdrawals || 0) / 100).toFixed(2)}`, color: 'bg-yellow-500' },
    { label: 'Total Pairs', value: analytics.totalPairs || 0, color: 'bg-pink-500' },
    { label: 'Total Volume', value: analytics.totalVolume || 0, color: 'bg-teal-500' },
    { label: 'Net Income', value: `$${(((analytics.totalIncome || 0) - (analytics.totalWithdrawals || 0)) / 100).toFixed(2)}`, color: 'bg-emerald-500' },
  ];

  const incomeData = analytics.incomeByType ? Object.entries(analytics.incomeByType).map(([type, amount]) => ({
    name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: amount / 100,
  })) : [];

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                  <span className="text-white text-lg font-bold">{index + 1}</span>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Distribution Pie Chart */}
        {incomeData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Income Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={incomeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {incomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* User Growth Chart */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">User Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Users</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{analytics.totalUsers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Users</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">{analytics.activeUsers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Inactive Users</span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                {(analytics.totalUsers || 0) - (analytics.activeUsers || 0)}
              </span>
            </div>
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Active Rate</div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full"
                  style={{
                    width: `${analytics.totalUsers > 0 ? ((analytics.activeUsers || 0) / analytics.totalUsers) * 100 : 0}%`
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {analytics.totalUsers > 0 ? (((analytics.activeUsers || 0) / analytics.totalUsers) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
