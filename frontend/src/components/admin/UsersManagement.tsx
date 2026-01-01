'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { User } from '@/shared/types';
import { toast } from 'react-hot-toast';
import { BinaryTreeView } from './BinaryTreeView';

export function UsersManagement() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');

  useEffect(() => {
    if (user?.companyId) {
      loadUsers();
    }
  }, [user?.companyId]);

  const loadUsers = async () => {
    if (!user?.companyId) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'companies', user.companyId, 'users'),
        where('role', '==', 'user')
      );
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          companyId: user.companyId,
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone,
          sponsorId: data.sponsorId,
          placementSide: data.placementSide,
          placementUnderUserId: data.placementUnderUserId,
          packageId: data.packageId || '',
          packageBV: data.packageBV,
          status: data.status || 'pending',
          kycStatus: data.kycStatus || 'pending',
          kycData: data.kycData,
          registrationDate: data.registrationDate?.toDate() || data.createdAt?.toDate() || new Date(),
          lastActiveDate: data.lastActiveDate?.toDate(),
          blockedIncome: data.blockedIncome || false,
          blockedWithdrawals: data.blockedWithdrawals || false,
          metadata: data.metadata,
        } as User;
      });
      setUsers(usersData);
      
      if (usersData.length === 0) {
        // No users yet - this is normal for a new company
        console.log('No users found. This is normal for a new company.');
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      if (error?.code === 'permission-denied') {
        toast.error('Permission denied. Make sure you are logged in as Company Admin.');
      } else if (error?.code === 'failed-precondition') {
        // Missing index - this is okay, just show empty
        setUsers([]);
        console.log('Index not found. This is normal. Users will appear once created.');
      } else {
        toast.error('Failed to load users');
      }
      setUsers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    if (!user?.companyId) return;

    try {
      await updateDoc(doc(db, `companies/${user.companyId}/users/${userId}`), {
        status: isActive ? 'inactive' : 'active',
        updatedAt: new Date(),
      });
      toast.success('User status updated');
      loadUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  const filteredUsers = users.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Users Management</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm rounded-md ${
                  viewMode === 'list'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-4 py-2 text-sm rounded-md ${
                  viewMode === 'tree'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Tree View
              </button>
            </div>
          </div>

          {viewMode === 'list' && (
            <>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search users by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No users found yet. This is normal for a new company.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Users will appear here once they register or are created by an admin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Sponsor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Placement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {userItem.firstName} {userItem.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {userItem.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {userItem.sponsorId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {userItem.placementSide ? (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          userItem.placementSide === 'left'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {userItem.placementSide.toUpperCase()}
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${  
                          userItem.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {userItem.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setSelectedUser(userItem.id)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                      >
                        View Tree
                      </button>
                      <button
                        onClick={() => toggleUserStatus(userItem.id, userItem.status === 'active')}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400"
                      >
                        {userItem.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
            </>
          )}

          {viewMode === 'tree' && (
            <div>
              {selectedUser ? (
                <div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="mb-4 text-sm text-indigo-600 hover:text-indigo-900"
                  >
                    ← Back to List
                  </button>
                  <BinaryTreeView rootUserId={selectedUser} />
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Select a user from the list view to view their binary tree
                  </p>
                  <button
                    onClick={() => setViewMode('list')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Switch to List View
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
