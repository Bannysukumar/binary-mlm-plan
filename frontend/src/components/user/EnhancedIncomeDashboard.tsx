'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { IncomeTransaction } from '@/shared/types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function EnhancedIncomeDashboard() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<IncomeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [incomeSummary, setIncomeSummary] = useState({
    total: 0,
    byType: {} as Record<string, number>,
    today: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    if (user?.companyId && user?.uid) {
      loadTransactions();
    }
  }, [user?.companyId, user?.uid, timeRange]);

  const loadTransactions = async () => {
    if (!user?.companyId || !user?.uid) return;

    try {
      setLoading(true);
      
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      let q = query(
        collection(db, `companies/${user.companyId}/incomeTransactions`),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const transactionsData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          creditedAt: doc.data().creditedAt?.toDate(),
        }))
        .filter(t => t.createdAt >= startDate || timeRange === 'all')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) as IncomeTransaction[];

      setTransactions(transactionsData);

      // Calculate summary
      const summary = {
        total: 0,
        byType: {} as Record<string, number>,
        today: 0,
        thisMonth: 0,
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      transactionsData.forEach(t => {
        summary.total += t.amount;
        summary.byType[t.incomeType] = (summary.byType[t.incomeType] || 0) + t.amount;
        
        if (t.createdAt >= today) {
          summary.today += t.amount;
        }
        if (t.createdAt >= firstDayOfMonth) {
          summary.thisMonth += t.amount;
        }
      });

      setIncomeSummary(summary);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIncomeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      direct: 'Direct Income',
      binary_matching: 'Binary Matching',
      repurchase: 'Repurchase Income',
      sponsor_matching: 'Sponsor Matching',
      rank_reward: 'Rank Reward',
    };
    return labels[type] || type;
  };

  const getIncomeTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      direct: '#3b82f6',
      binary_matching: '#8b5cf6',
      repurchase: '#10b981',
      sponsor_matching: '#f59e0b',
      rank_reward: '#ef4444',
    };
    return colors[type] || '#6b7280';
  };

  // Prepare chart data
  const chartData = transactions.reduce((acc, t) => {
    const date = t.createdAt.toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, amount: 0 };
    }
    acc[date].amount += t.amount;
    return acc;
  }, {} as Record<string, { date: string; amount: number }>);

  const chartDataArray = Object.values(chartData).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (loading) {
    return <div className="text-center py-8">Loading income data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg text-white">
          <h4 className="text-sm font-medium opacity-90 mb-2">Total Income</h4>
          <p className="text-3xl font-bold">${(incomeSummary.total / 100).toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg text-white">
          <h4 className="text-sm font-medium opacity-90 mb-2">Today</h4>
          <p className="text-3xl font-bold">${(incomeSummary.today / 100).toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg text-white">
          <h4 className="text-sm font-medium opacity-90 mb-2">This Month</h4>
          <p className="text-3xl font-bold">${(incomeSummary.thisMonth / 100).toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-lg text-white">
          <h4 className="text-sm font-medium opacity-90 mb-2">Transactions</h4>
          <p className="text-3xl font-bold">{transactions.length}</p>
        </div>
      </div>

      {/* Income by Type */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Income by Type</h3>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(incomeSummary.byType).map(([type, amount]) => (
            <div key={type} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div
                className="w-4 h-4 rounded-full mx-auto mb-2"
                style={{ backgroundColor: getIncomeTypeColor(type) }}
              ></div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                {getIncomeTypeLabel(type)}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                ${(amount / 100).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {/* Income Chart */}
        {chartDataArray.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDataArray}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${(value / 100).toFixed(2)}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Daily Income"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium mb-4">Recent Income Transactions</h3>
          
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No income transactions found for the selected period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.slice(0, 20).map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {transaction.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="px-2 py-1 text-xs font-medium rounded-full"
                          style={{
                            backgroundColor: `${getIncomeTypeColor(transaction.incomeType)}20`,
                            color: getIncomeTypeColor(transaction.incomeType),
                          }}
                        >
                          {getIncomeTypeLabel(transaction.incomeType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                        ${transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            transaction.status === 'credited'
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                        {transaction.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
