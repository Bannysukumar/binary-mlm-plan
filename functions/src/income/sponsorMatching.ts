import * as admin from 'firebase-admin';
import { MLMConfig } from '../types';
import { getBinaryTreePath } from '../binary/binaryTree';

export async function calculateSponsorMatching(
  companyId: string,
  userId: string
): Promise<void> {
  // Get MLM config
  const configDoc = await admin.firestore()
    .collection(`companies/${companyId}/mlmConfig`)
    .doc('main')
    .get();

  if (!configDoc.exists) {
    return;
  }

  const config = configDoc.data() as MLMConfig;

  if (!config.sponsorMatching.enabled) {
    return;
  }

  // Get user data
  const userDoc = await admin.firestore()
    .collection(`companies/${companyId}/users`)
    .doc(userId)
    .get();

  if (!userDoc.exists) {
    return;
  }

  const userData = userDoc.data();
  if (!userData?.sponsorId) {
    return;
  }

  // Get binary tree path to find all upline sponsors
  const path = await getBinaryTreePath(companyId, userId);
  
  // Get package BV
  const packageBV = userData.packageBV || 0;

  // Calculate income for each level
  for (const levelConfig of config.sponsorMatching.levels) {
    const level = levelConfig.level;
    
    if (path.length < level + 1) {
      continue; // Not enough levels in upline
    }

    const sponsorId = path[path.length - level - 1];
    
    // Check if sponsor is active
    if (config.sponsorMatching.autoDisableIfInactive) {
      const sponsorDoc = await admin.firestore()
        .collection(`companies/${companyId}/users`)
        .doc(sponsorId)
        .get();

      if (!sponsorDoc.exists) {
        continue;
      }

      const sponsorData = sponsorDoc.data();
      if (!sponsorData?.isActive) {
        continue;
      }

      // Check inactivity
      if (config.sponsorMatching.inactiveDays) {
        const lastActivity = sponsorData.lastActivity?.toDate();
        if (lastActivity) {
          const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceActivity > config.sponsorMatching.inactiveDays) {
            continue;
          }
        }
      }
    }

    // Check qualification
    const qualification = levelConfig.qualification;
    if (qualification.teamVolume || qualification.pairs || qualification.directs) {
      // Get sponsor's binary tree for qualification check
      const sponsorTreeDoc = await admin.firestore()
        .collection(`companies/${companyId}/users/${sponsorId}/binaryTree`)
        .doc('main')
        .get();

      if (!sponsorTreeDoc.exists) {
        continue;
      }

      const sponsorTreeData = sponsorTreeDoc.data();
      
      if (qualification.teamVolume && (sponsorTreeData?.totalVolume || 0) < qualification.teamVolume) {
        continue;
      }

      if (qualification.pairs) {
        // Calculate pairs (similar to binary matching logic)
        const leftVolume = sponsorTreeData?.leftVolume || 0;
        const rightVolume = sponsorTreeData?.rightVolume || 0;
        const pairs = Math.min(leftVolume, rightVolume);
        if (pairs < qualification.pairs) {
          continue;
        }
      }

      if (qualification.directs) {
        const directsSnapshot = await admin.firestore()
          .collection(`companies/${companyId}/users`)
          .where('sponsorId', '==', sponsorId)
          .get();
        
        if (directsSnapshot.size < qualification.directs) {
          continue;
        }
      }
    }

    // Calculate income
    const incomeAmount = (packageBV * levelConfig.percentage) / 100;

    if (incomeAmount <= 0) {
      continue;
    }

    // Create income transaction
    await admin.firestore()
      .collection(`companies/${companyId}/incomeTransactions`)
      .add({
        companyId,
        userId: sponsorId,
        incomeType: 'sponsor_matching',
        amount: incomeAmount,
        currency: 'USD',
        description: `Sponsor matching income - Level ${level} from ${userData.firstName} ${userData.lastName}`,
        relatedUserId: userId,
        status: 'credited',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        creditedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }
}
