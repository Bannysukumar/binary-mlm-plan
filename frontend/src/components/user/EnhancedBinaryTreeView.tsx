'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { BinaryTreeData } from '@/shared/types';

interface TreeNode {
  userId: string;
  name: string;
  email: string;
  leftLeg?: TreeNode;
  rightLeg?: TreeNode;
  packageBV?: number;
  isActive: boolean;
  level: number;
}

export function EnhancedBinaryTreeView() {
  const { user } = useAuthStore();
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [treeStats, setTreeStats] = useState<BinaryTreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [maxDepth, setMaxDepth] = useState(3);

  useEffect(() => {
    if (user?.companyId && user?.uid) {
      loadTree();
      loadTreeStats();
    }
  }, [user?.companyId, user?.uid]);

  const loadTreeStats = async () => {
    if (!user?.companyId || !user?.uid) return;

    try {
      const treeDoc = await getDoc(doc(db, `companies/${user.companyId}/users/${user.uid}/binaryTree/main`));
      if (treeDoc.exists()) {
        setTreeStats(treeDoc.data() as BinaryTreeData);
      }
    } catch (error) {
      console.error('Error loading tree stats:', error);
    }
  };

  const loadTree = async () => {
    if (!user?.companyId || !user?.uid) return;

    try {
      setLoading(true);
      const rootNode = await buildTreeNode(user.uid, user.companyId, 0);
      setTree(rootNode);
      if (rootNode) {
        setExpandedNodes(new Set([rootNode.userId]));
      }
    } catch (error) {
      console.error('Error loading tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTreeNode = async (userId: string, companyId: string, depth: number = 0): Promise<TreeNode | null> => {
    if (depth >= maxDepth) return null;

    try {
      const userDoc = await getDoc(doc(db, `companies/${companyId}/users/${userId}`));
      if (!userDoc.exists()) return null;

      const userData = userDoc.data();
      
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
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown',
        email: userData.email || '',
        isActive: userData.isActive || false,
        packageBV: userData.packageBV || 0,
        level: depth,
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

  const toggleNode = async (userId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedNodes(newExpanded);
    await loadTree();
  };

  const renderNode = (node: TreeNode | null, isRoot: boolean = false): React.ReactNode => {
    if (!node) return null;

    const hasChildren = node.leftLeg || node.rightLeg;
    const isExpanded = expandedNodes.has(node.userId);
    const isCurrentUser = node.userId === user?.uid;

    return (
      <div className="flex flex-col items-center" key={node.userId}>
        <div
          className={`relative p-4 rounded-lg border-2 min-w-[140px] cursor-pointer transition-all ${
            isCurrentUser
              ? 'bg-indigo-100 border-indigo-500 dark:bg-indigo-900/30 dark:border-indigo-400 shadow-lg'
              : node.isActive
              ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
              : 'bg-gray-50 border-gray-300 dark:bg-gray-800 dark:border-gray-600'
          }`}
          onClick={() => hasChildren && toggleNode(node.userId)}
        >
          <div className="text-center">
            {isCurrentUser && (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 block">YOU</span>
            )}
            <p className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[120px]">
              {node.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
              {node.email}
            </p>
            {node.packageBV > 0 && (
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                BV: {node.packageBV}
              </p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Level {node.level}
            </p>
          </div>
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.userId);
              }}
              className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-indigo-700 shadow-md"
            >
              {isExpanded ? '−' : '+'}
            </button>
          )}
        </div>
        {(node.leftLeg || node.rightLeg) && isExpanded && (
          <div className="flex gap-8 mt-10 relative">
            {node.leftLeg && (
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-blue-400 dark:bg-blue-600 mb-2"></div>
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded">
                  LEFT LEG
                </div>
                {renderNode(node.leftLeg)}
              </div>
            )}
            {node.rightLeg && (
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-green-400 dark:bg-green-600 mb-2"></div>
                <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded">
                  RIGHT LEG
                </div>
                {renderNode(node.rightLeg)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading binary network...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tree Statistics */}
      {treeStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Left Leg</h4>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {treeStats.leftCount} members
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Volume: {treeStats.leftVolume}
            </p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Right Leg</h4>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {treeStats.rightCount} members
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Volume: {treeStats.rightVolume}
            </p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Total Network</h4>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {treeStats.totalCount} members
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Volume: {treeStats.totalVolume}
            </p>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pairs</h4>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {Math.min(treeStats.leftVolume, treeStats.rightVolume)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Matching pairs
            </p>
          </div>
        </div>
      )}

      {/* Tree Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Binary Network Tree</h3>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Max Depth:</label>
            <select
              value={maxDepth}
              onChange={(e) => {
                setMaxDepth(parseInt(e.target.value));
                loadTree();
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            >
              <option value="2">2 Levels</option>
              <option value="3">3 Levels</option>
              <option value="4">4 Levels</option>
              <option value="5">5 Levels</option>
            </select>
          </div>
        </div>
        
        {tree ? (
          <div className="flex justify-center py-8">
            {renderNode(tree, true)}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No binary tree data available. You'll see your network here once you have downlines.
          </div>
        )}

        <div className="mt-6 pt-4 border-t text-sm text-gray-500 dark:text-gray-400">
          <p>💡 Click on nodes with children to expand/collapse branches</p>
          <p>💡 Your node is highlighted in blue</p>
        </div>
      </div>
    </div>
  );
}
