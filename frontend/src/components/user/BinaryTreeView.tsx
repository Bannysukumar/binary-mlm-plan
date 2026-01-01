'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { BinaryTreeData } from '@/shared/types';

export function BinaryTreeView() {
  const { user } = useAuthStore();
  const [treeData, setTreeData] = useState<BinaryTreeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.companyId && user?.uid) {
      loadTreeData();
    }
  }, [user?.companyId, user?.uid]);

  const loadTreeData = async () => {
    if (!user?.companyId || !user?.uid) return;

    try {
      setLoading(true);
      const treeDoc = await getDoc(doc(db, `companies/${user.companyId}/users/${user.uid}/binaryTree/main`));
      if (treeDoc.exists()) {
        setTreeData(treeDoc.data() as BinaryTreeData);
      }
    } catch (error) {
      console.error('Failed to load binary tree:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading binary tree...</div>;
  }

  if (!treeData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No binary tree data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-6">Binary Tree Overview</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Left Leg</h4>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {treeData.leftCount} members
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Volume: {treeData.leftVolume}
          </p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Right Leg</h4>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {treeData.rightCount} members
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Volume: {treeData.rightVolume}
          </p>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Total</h4>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {treeData.totalCount} members
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Volume: {treeData.totalVolume}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Note: Full binary tree visualization will be implemented with a tree component.
        </p>
      </div>
    </div>
  );
}
