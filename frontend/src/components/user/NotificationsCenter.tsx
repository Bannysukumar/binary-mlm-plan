'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { Announcement } from '@/shared/types';
import { toast } from 'react-hot-toast';

export function NotificationsCenter() {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.companyId) {
      loadNotifications();
    }
  }, [user?.companyId]);

  const loadNotifications = async () => {
    if (!user?.companyId) return;

    try {
      setLoading(true);

      // Load announcements
      const announcementsQuery = query(
        collection(db, `companies/${user.companyId}/announcements`),
        where('isActive', '==', true),
        where('targetAudience', 'in', ['all', 'user']),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const announcementsSnapshot = await getDocs(announcementsQuery);
      const announcementsData = announcementsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate(),
      })) as Announcement[];

      // Filter out expired announcements
      const activeAnnouncements = announcementsData.filter(a => 
        !a.expiresAt || a.expiresAt > new Date()
      );

      setAnnouncements(activeAnnouncements);
      setUnreadCount(activeAnnouncements.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading notifications...</div>;
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      error: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };
    return colors[type] || colors.info;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Notifications & Announcements</h3>
        {unreadCount > 0 && (
          <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm">
            {unreadCount} New
          </span>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No notifications or announcements at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4"
              style={{
                borderLeftColor: 
                  announcement.type === 'info' ? '#3b82f6' :
                  announcement.type === 'success' ? '#10b981' :
                  announcement.type === 'warning' ? '#f59e0b' : '#ef4444'
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(announcement.type)}`}>
                    {announcement.type.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {announcement.createdAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {announcement.title}
              </h4>
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {announcement.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
