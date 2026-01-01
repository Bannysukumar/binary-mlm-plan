'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { User, BinaryTreeData } from '@/shared/types';

interface TreeNode {
  userId: string;
  name: string;
  email: string;
  leftLeg?: TreeNode;
  rightLeg?: TreeNode;
  placementSide?: 'left' | 'right';
  packageBV?: number;
  isActive: boolean;
}

export function BinaryTreeView({ rootUserId }: { rootUserId: string }) {
  const { user } = useAuthStore();
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([rootUserId]));

  useEffect(() => {
    if (user?.companyId && rootUserId) {
      loadTree();
    }
  }, [user?.companyId, rootUserId]);

  const loadTree = async () => {
    if (!user?.companyId) return;

    try {
      setLoading(true);
      const rootNode = await buildTreeNode(rootUserId, user.companyId);
      setTree(rootNode);
    } catch (error) {
      console.error('Error loading tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTreeNode = async (userId: string, companyId: string, depth: number = 0): Promise<TreeNode | null> => {
    if (depth > 5) return null; // Limit depth for performance

    try {
      const userDoc = await getDoc(doc(db, `companies/${companyId}/users/${userId}`));
      if (!userDoc.exists()) return null;

      const userData = userDoc.data() as User;
      
      // Get downlines
      const downlinesSnapshot = await getDocs(
        query(
          collection(db, `companies/${companyId}/users`),
          where('placementId', '==', userId)
        )
      );

      const leftLegUser = downlinesSnapshot.docs.find(d => d.data().placementSide === 'left');
      const rightLegUser = downlinesSnapshot.docs.find(d => d.data().placementSide === 'right');

      const node: TreeNode = {
        userId: userDoc.id,
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        isActive: userData.status === 'active',
        packageBV: userData.packageBV,
      };

      if (leftLegUser && expandedNodes.has(userId)) {
        node.leftLeg = await buildTreeNode(leftLegUser.id, companyId, depth + 1);
      }

      if (rightLegUser && expandedNodes.has(userId)) {
        node.rightLeg = await buildTreeNode(rightLegUser.id, companyId, depth + 1);
      }

      return node;
    } catch (error) {
      console.error(`Error building node ${userId}:`, error);
      return null;
    }
  };

  const toggleNode = (userId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedNodes(newExpanded);
    loadTree();
  };

  const renderNode = (node: TreeNode | null, level: number = 0): React.ReactNode => {
    if (!node) return null;

    const hasChildren = node.leftLeg || node.rightLeg;
    const isExpanded = expandedNodes.has(node.userId);

    return (
      <div className="flex flex-col items-center" key={node.userId}>
        <div
          className={`relative p-3 rounded-lg border-2 min-w-[120px] ${
            node.isActive
              ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
              : 'bg-gray-50 border-gray-300 dark:bg-gray-800 dark:border-gray-600'
          }`}
        >
          <div className="text-center">
            <p className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[100px]">
              {node.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
              {node.email}
            </p>
            {node.packageBV && (
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                BV: {node.packageBV}
              </p>
            )}
          </div>
          {hasChildren && (
            <button
              onClick={() => toggleNode(node.userId)}
              className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-indigo-700"
            >
              {isExpanded ? '−' : '+'}
            </button>
          )}
        </div>
        {(node.leftLeg || node.rightLeg) && isExpanded && (
          <div className="flex gap-4 mt-8 relative">
            {node.leftLeg && (
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-600"></div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Left</div>
                {renderNode(node.leftLeg, level + 1)}
              </div>
            )}
            {node.rightLeg && (
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-600"></div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Right</div>
                {renderNode(node.rightLeg, level + 1)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading binary tree...</div>;
  }

  if (!tree) {
    return <div className="text-center py-8 text-gray-500">No tree data available</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 overflow-x-auto">
      <h3 className="text-lg font-medium mb-4">Binary Tree Visualization</h3>
      <div className="flex justify-center">
        {renderNode(tree)}
      </div>
    </div>
  );
}
