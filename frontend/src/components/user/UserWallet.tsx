'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { Wallet, Withdrawal, WithdrawalConfig } from '@/shared/types';
import { toast } from 'react-hot-toast';

export function UserWallet() {
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [withdrawalConfig, setWithdrawalConfig] = useState<WithdrawalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState<'bank' | 'upi'>('bank');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    accountHolderName: '',
  });
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    if (user?.companyId && user?.uid) {
      loadWallet();
      loadWithdrawalConfig();
    }
  }, [user?.companyId, user?.uid]);

  const loadWallet = async () => {
    if (!user?.companyId || !user?.uid) return;

    try {
      setLoading(true);
      const walletDoc = await getDoc(doc(db, `companies/${user.companyId}/users/${user.uid}/wallet/main`));
      if (walletDoc.exists()) {
        setWallet(walletDoc.data() as Wallet);
      }
    } catch (error) {
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawalConfig = async () => {
    if (!user?.companyId) return;

    try {
      const configDoc = await getDoc(doc(db, `companies/${user.companyId}/withdrawalConfig/main`));
      if (configDoc.exists()) {
        setWithdrawalConfig(configDoc.data() as WithdrawalConfig);
      }
    } catch (error) {
      console.error('Failed to load withdrawal config:', error);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId || !user?.uid || !wallet || !withdrawalConfig) return;

    const amount = parseFloat(withdrawalAmount);
    if (amount < withdrawalConfig.minimumWithdrawal) {
      toast.error(`Minimum withdrawal amount is ${withdrawalConfig.currencySymbol || '$'}${withdrawalConfig.minimumWithdrawal || 0}`);
      return;
    }

    if (amount > wallet.availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    // Calculate charges
    const charges = withdrawalConfig.charges?.type === 'fixed' 
      ? (withdrawalConfig.charges.value || withdrawalConfig.adminCharges || 0)
      : (amount * (withdrawalConfig.charges?.value || withdrawalConfig.adminCharges || 0)) / 100;

    const tds = withdrawalConfig.tds?.enabled 
      ? (amount * (withdrawalConfig.tds.percentage || withdrawalConfig.tdsPercentage || 0)) / 100 
      : (amount * (withdrawalConfig.tdsPercentage || 0)) / 100;

    const adminFee = withdrawalConfig.adminFee?.enabled
      ? withdrawalConfig.adminFee.type === 'fixed'
        ? withdrawalConfig.adminFee.value
        : (amount * withdrawalConfig.adminFee.value) / 100
      : withdrawalConfig.adminCharges || 0;

    const netAmount = amount - charges - tds - adminFee;

    try {
      await addDoc(collection(db, `companies/${user.companyId}/withdrawals`), {
        userId: user.uid,
        amount,
        currency: withdrawalConfig.currency || 'USD',
        charges,
        tds,
        adminFee,
        netAmount,
        status: 'pending',
        bankDetails: withdrawalMethod === 'bank' ? bankDetails : undefined,
        upiDetails: withdrawalMethod === 'upi' ? { upiId } : undefined,
        requestedAt: new Date(),
      });

      toast.success('Withdrawal request submitted successfully');
      setWithdrawalAmount('');
      setBankDetails({
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        accountHolderName: '',
      });
      setUpiId('');
      loadWallet();
    } catch (error) {
      toast.error('Failed to submit withdrawal request');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading wallet...</div>;
  }

  if (!wallet) {
    return <div className="text-center py-8">Wallet not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Wallet Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Earnings</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {wallet.currencySymbol || '$'} {(wallet.totalEarnings || wallet.totalEarned || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Available Balance</h3>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
            {wallet.currencySymbol || '$'} {wallet.availableBalance.toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Locked Balance</h3>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
            {wallet.currencySymbol || '$'} {wallet.lockedBalance.toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Withdrawn</h3>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-2">
            {wallet.currencySymbol || '$'} {wallet.withdrawnBalance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Withdrawal Form */}
      {!wallet.isFrozen && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Request Withdrawal</h3>
          <form onSubmit={handleWithdrawal} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount
              </label>
              <input
                type="number"
                required
                min={withdrawalConfig?.minimumWithdrawal || 0}
                max={wallet.availableBalance}
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={`Min: ${withdrawalConfig?.minimumWithdrawal || 0}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Withdrawal Method
              </label>
              <select
                value={withdrawalMethod}
                onChange={(e) => setWithdrawalMethod(e.target.value as 'bank' | 'upi')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="bank">Bank Transfer</option>
                <option value="upi">UPI</option>
              </select>
            </div>

            {withdrawalMethod === 'bank' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={bankDetails.accountHolderName}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    required
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    required
                    value={bankDetails.ifscCode}
                    onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    required
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  UPI ID
                </label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="yourname@upi"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Submit Withdrawal Request
            </button>
          </form>
        </div>
      )}

      {wallet.isFrozen && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            Your wallet is frozen. Please contact support.
          </p>
        </div>
      )}
    </div>
  );
}
