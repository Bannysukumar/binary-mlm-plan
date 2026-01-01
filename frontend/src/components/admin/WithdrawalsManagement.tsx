'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { Withdrawal } from '@/shared/types';
import { toast } from 'react-hot-toast';
import { walletService } from '@/lib/firebase-services';

export function WithdrawalsManagement() {
  const { user } = useAuthStore();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (user?.companyId) {
      loadWithdrawals();
    }
  }, [user?.companyId, filter]);

  const loadWithdrawals = async () => {
    if (!user?.companyId) return;

    try {
      setLoading(true);
      let q = query(collection(db, `companies/${user.companyId}/withdrawals`));
      
      if (filter !== 'all') {
        q = query(
          collection(db, `companies/${user.companyId}/withdrawals`),
          where('status', '==', filter)
        );
      }

      const snapshot = await getDocs(q);
      const withdrawalsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        requestedAt: doc.data().requestedAt?.toDate() || new Date(),
        processedAt: doc.data().processedAt?.toDate(),
      })) as Withdrawal[];
      
      setWithdrawals(withdrawalsData.sort((a, b) => 
        b.requestedAt.getTime() - a.requestedAt.getTime()
      ));
      
      if (withdrawalsData.length === 0) {
        // No withdrawals yet - this is normal
        console.log('No withdrawals found. This is normal.');
      }
    } catch (error: any) {
      console.error('Error loading withdrawals:', error);
      if (error?.code === 'permission-denied') {
        toast.error('Permission denied. Make sure you are logged in as Company Admin.');
      } else if (error?.code === 'failed-precondition') {
        // Missing index - this is okay, just show empty
        setWithdrawals([]);
        console.log('Index not found. This is normal. Withdrawals will appear once created.');
      } else {
        toast.error('Failed to load withdrawals');
      }
      setWithdrawals([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const updateWithdrawalStatus = async (
    withdrawalId: string,
    status: Withdrawal['status'],
    remarks?: string
  ) => {
    if (!user?.companyId) return;

    try {
      // Get withdrawal data to access userId and amount
      const withdrawal = withdrawals.find(w => w.id === withdrawalId);
      if (!withdrawal) {
        toast.error('Withdrawal not found');
        return;
      }

      // If approving, deduct from wallet balance
      if (status === 'approved' && withdrawal.status === 'pending') {
        try {
          await walletService.recordWithdrawal(
            user.companyId,
            withdrawal.userId,
            withdrawal.amount
          );
          console.log(`[v0] Wallet balance deducted for withdrawal ${withdrawalId}`);
        } catch (walletError) {
          console.error('[v0] Error deducting wallet balance:', walletError);
          toast.error('Failed to deduct wallet balance. Withdrawal not approved.');
          return;
        }
      }

      // Update withdrawal status
      await updateDoc(doc(db, `companies/${user.companyId}/withdrawals/${withdrawalId}`), {
        status,
        processedAt: new Date(),
        processedBy: user.uid,
        remarks: remarks || '',
      });
      
      toast.success(`Withdrawal ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'updated'}`);
      loadWithdrawals();
    } catch (error) {
      console.error('[v0] Error updating withdrawal status:', error);
      toast.error('Failed to update withdrawal status');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading withdrawals...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Withdrawals Management</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {withdrawals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No withdrawals found yet. This is normal for a new company.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Withdrawals will appear here once users request them.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  Net Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  Requested
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {withdrawal.userId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {withdrawal.currencySymbol || '$'} {withdrawal.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {withdrawal.currencySymbol || '$'} {withdrawal.netAmount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        withdrawal.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : withdrawal.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {withdrawal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {withdrawal.requestedAt.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {withdrawal.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateWithdrawalStatus(withdrawal.id, 'approved')}
                          className="text-green-600 hover:text-green-900 dark:text-green-400"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateWithdrawalStatus(withdrawal.id, 'rejected')}
                          className="text-red-600 hover:text-red-900 dark:text-red-400"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
