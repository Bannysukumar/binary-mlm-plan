'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-hot-toast';

export function ReferralTools() {
  const { user } = useAuthStore();
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.uid && user?.companyId) {
      const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?sponsor=${user.uid}&company=${user.companyId}`;
      setReferralLink(link);
    }
  }, [user?.uid, user?.companyId]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      action: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(`Join me! ${referralLink}`)}`, '_blank');
      },
    },
    {
      name: 'Email',
      action: () => {
        window.location.href = `mailto:?subject=Join My Network&body=${encodeURIComponent(`Join me in this amazing opportunity! ${referralLink}`)}`;
      },
    },
    {
      name: 'Facebook',
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank');
      },
    },
    {
      name: 'Twitter',
      action: () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=Join my network!`, '_blank');
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Your Referral Link</h3>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your Referral ID:</p>
            <div className="flex items-center gap-2">
              <code className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md font-mono text-sm">
                {user?.uid}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(user?.uid || '');
                  toast.success('Referral ID copied!');
                }}
                className="text-sm text-indigo-600 hover:text-indigo-900"
              >
                Copy ID
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code - Will be implemented with qrcode.react */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">QR Code</h3>
        <div className="flex flex-col items-center">
          <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 w-48 h-48 flex items-center justify-center">
            <p className="text-sm text-gray-500 text-center">
              QR Code will be generated here
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Share this QR code for easy registration
          </p>
        </div>
      </div>

      {/* Share Options */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Share Your Link</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {shareOptions.map((option) => (
            <button
              key={option.name}
              onClick={option.action}
              className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {option.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
