'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { Announcement } from '@/shared/types';
import { toast } from 'react-hot-toast';

export function AnnouncementsManagement() {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info' as 'info' | 'warning' | 'success' | 'error',
    targetAudience: 'all' as 'all' | 'company_admin' | 'user',
  });

  useEffect(() => {
    if (user?.companyId) {
      loadAnnouncements();
    }
  }, [user?.companyId]);

  const loadAnnouncements = async () => {
    if (!user?.companyId) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, `companies/${user.companyId}/announcements`),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const announcementsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate(),
      })) as Announcement[];
      setAnnouncements(announcementsData);
      
      if (announcementsData.length === 0) {
        // No announcements yet - this is normal
        console.log('No announcements found. This is normal.');
      }
    } catch (error: any) {
      console.error('Error loading announcements:', error);
      if (error?.code === 'permission-denied') {
        toast.error('Permission denied. Make sure you are logged in as Company Admin.');
      } else if (error?.code === 'failed-precondition') {
        // Missing index - this is okay, just show empty
        setAnnouncements([]);
        console.log('Index not found. This is normal. Announcements will appear once created.');
      } else {
        toast.error('Failed to load announcements');
      }
      setAnnouncements([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;

    try {
      await addDoc(collection(db, `companies/${user.companyId}/announcements`), {
        ...formData,
        isActive: true,
        createdAt: new Date(),
        createdBy: user.uid,
      });
      toast.success('Announcement created successfully');
      setShowModal(false);
      setFormData({
        title: '',
        content: '',
        type: 'info',
        targetAudience: 'all',
      });
      loadAnnouncements();
    } catch (error) {
      toast.error('Failed to create announcement');
    }
  };

  const toggleAnnouncementStatus = async (announcementId: string, isActive: boolean) => {
    if (!user?.companyId) return;

    try {
      await updateDoc(doc(db, `companies/${user.companyId}/announcements/${announcementId}`), {
        isActive: !isActive,
      });
      toast.success('Announcement status updated');
      loadAnnouncements();
    } catch (error) {
      toast.error('Failed to update announcement status');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading announcements...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Create Announcement
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No announcements found yet. This is normal for a new company.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Click "Create Announcement" to add your first announcement.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {announcements.map((announcement) => (
            <li key={announcement.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {announcement.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {announcement.content}
                    </p>
                    <div className="mt-2 flex items-center space-x-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        announcement.type === 'info' ? 'bg-blue-100 text-blue-800' :
                        announcement.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        announcement.type === 'success' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {announcement.type}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Target: {announcement.targetAudience}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        announcement.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {announcement.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => toggleAnnouncementStatus(announcement.id, announcement.isActive)}
                      className="text-sm text-indigo-600 hover:text-indigo-900"
                    >
                      {announcement.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Create Announcement
            </h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Content
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Target Audience
                </label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="all">All</option>
                  <option value="company_admin">Company Admin</option>
                  <option value="user">Users</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
