'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { User, MLMConfig } from '@/shared/types';

export function RewardsRankTracker() {
  const { user } = useAuthStore();
  const [currentRank, setCurrentRank] = useState<any>(null);
  const [nextRank, setNextRank] = useState<any>(null);
  const [progress, setProgress] = useState({
    teamVolume: 0,
    pairs: 0,
    directs: 0,
    leftVolume: 0,
    rightVolume: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.companyId && user?.uid) {
      loadRankData();
    }
  }, [user?.companyId, user?.uid]);

  const loadRankData = async () => {
    if (!user?.companyId || !user?.uid) return;

    try {
      setLoading(true);

      // Load MLM config to get ranks
      const configDoc = await getDoc(doc(db, `companies/${user.companyId}/mlmConfig/main`));
      const config = configDoc.exists() ? (configDoc.data() as MLMConfig) : null;

      // Load user data
      const userDoc = await getDoc(doc(db, `companies/${user.companyId}/users/${user.uid}`));
      const userData = userDoc.data() as User;

      // Load binary tree stats
      const treeDoc = await getDoc(doc(db, `companies/${user.companyId}/users/${user.uid}/binaryTree/main`));
      const treeData = treeDoc.data();

      // Calculate progress
      const teamVolume = treeData?.totalVolume || 0;
      const leftVolume = treeData?.leftVolume || 0;
      const rightVolume = treeData?.rightVolume || 0;
      const pairs = Math.min(leftVolume, rightVolume);

      // Get direct downlines count
      const directsSnapshot = await getDocs(
        query(
          collection(db, `companies/${user.companyId}/users`),
          where('sponsorId', '==', user.uid)
        )
      );
      const directs = directsSnapshot.size;

      setProgress({
        teamVolume,
        pairs,
        directs,
        leftVolume,
        rightVolume,
      });

      // Find current rank
      if (config?.ranks && userData.rankId) {
        const rank = config.ranks.find(r => r.id === userData.rankId);
        setCurrentRank(rank);
      }

      // Find next rank
      if (config?.ranks) {
        const sortedRanks = [...config.ranks].sort((a, b) => a.level - b.level);
        const currentLevel = currentRank?.level || 0;
        const next = sortedRanks.find(r => r.level > currentLevel);
        setNextRank(next);
      }
    } catch (error) {
      console.error('Error loading rank data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (current: number, required: number) => {
    if (required === 0) return 100;
    return Math.min((current / required) * 100, 100);
  };

  if (loading) {
    return <div className="text-center py-8">Loading rank information...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Current Rank */}
      {currentRank && (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-lg font-medium mb-2">Your Current Rank</h3>
          <p className="text-3xl font-bold mb-4">{currentRank.name}</p>
          {currentRank.rewards?.cash && (
            <p className="text-sm opacity-90">
              Reward: ${currentRank.rewards.cash}
            </p>
          )}
        </div>
      )}

      {/* Next Rank */}
      {nextRank ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Next Rank: {nextRank.name}</h3>
          
          <div className="space-y-4">
            {nextRank.qualification.teamVolume > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Team Volume</span>
                  <span className="font-medium">
                    {progress.teamVolume} / {nextRank.qualification.teamVolume}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${calculateProgress(progress.teamVolume, nextRank.qualification.teamVolume)}%` }}
                  ></div>
                </div>
              </div>
            )}

            {nextRank.qualification.pairs > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Pairs</span>
                  <span className="font-medium">
                    {progress.pairs} / {nextRank.qualification.pairs}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${calculateProgress(progress.pairs, nextRank.qualification.pairs)}%` }}
                  ></div>
                </div>
              </div>
            )}

            {nextRank.qualification.directs > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Direct Referrals</span>
                  <span className="font-medium">
                    {progress.directs} / {nextRank.qualification.directs}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${calculateProgress(progress.directs, nextRank.qualification.directs)}%` }}
                  ></div>
                </div>
              </div>
            )}

            {nextRank.rewards && (
              <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-2">
                  Rewards on Achievement:
                </p>
                {nextRank.rewards.cash && (
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    Cash: ${nextRank.rewards.cash}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {currentRank ? 'You have achieved the highest rank!' : 'No rank information available.'}
          </p>
        </div>
      )}

      {/* Progress Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Your Progress</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {progress.teamVolume}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Team Volume</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {progress.pairs}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pairs</p>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {progress.directs}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Direct Referrals</p>
          </div>
          <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {Math.min(progress.leftVolume, progress.rightVolume)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Matching Pairs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
