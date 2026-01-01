'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { AuditLog } from '@/shared/types';

export function AuditLogs() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user?.companyId) {
      loadLogs();
    }
  }, [user?.companyId, filter]);

  const loadLogs = async () => {
    if (!user?.companyId) return;

    try {
      setLoading(true);
      let q = query(
        collection(db, `companies/${user.companyId}/auditLogs`),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      if (filter !== 'all') {
        q = query(
          collection(db, `companies/${user.companyId}/auditLogs`),
          where('action', '==', filter),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }

      const snapshot = await getDocs(q);
      const logsData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          companyId: user.companyId,
          userId: data.userId || data.adminId || '',
          adminId: data.adminId || data.userId || '',
          action: data.action || '',
          resource: data.resource,
          resourceId: data.resourceId,
          targetUserId: data.targetUserId,
          changes: data.changes || {},
          createdAt: data.createdAt?.toDate() || data.timestamp?.toDate() || new Date(),
          timestamp: data.timestamp?.toDate() || data.createdAt?.toDate() || new Date(),
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        } as AuditLog;
      });
      
      setLogs(logsData);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading audit logs...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Audit Logs</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">All Actions</option>
            <option value="user_created">User Created</option>
            <option value="user_updated">User Updated</option>
            <option value="withdrawal_approved">Withdrawal Approved</option>
            <option value="withdrawal_rejected">Withdrawal Rejected</option>
            <option value="config_updated">Config Updated</option>
          </select>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No audit logs found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {log.createdAt.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {log.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {log.resource}: {log.resourceId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {log.userId}
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
