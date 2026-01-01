import * as admin from 'firebase-admin';

export async function evaluateRanks(): Promise<void> {
  // Get all companies
  const companiesSnapshot = await admin.firestore()
    .collection('companies')
    .where('isActive', '==', true)
    .get();

  for (const companyDoc of companiesSnapshot.docs) {
    const companyId = companyDoc.id;

    // Get MLM config
    const configDoc = await admin.firestore()
      .collection(`companies/${companyId}/mlmConfig`)
      .doc('main')
      .get();

    if (!configDoc.exists) {
      continue;
    }

    const config = configDoc.data();
    if (!config?.ranks || config.ranks.length === 0) {
      continue;
    }

    // Get all users
    const usersSnapshot = await admin.firestore()
      .collection(`companies/${companyId}/users`)
      .where('role', '==', 'user')
      .where('isActive', '==', true)
      .get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      // Get user's binary tree
      const treeDoc = await admin.firestore()
        .collection(`companies/${companyId}/users/${userId}/binaryTree`)
        .doc('main')
        .get();

      if (!treeDoc.exists) {
        continue;
      }

      const treeData = treeDoc.data();
      if (!treeData) {
        continue;
      }

      // Get direct downlines count
      const directsSnapshot = await admin.firestore()
        .collection(`companies/${companyId}/users`)
        .where('sponsorId', '==', userId)
        .get();

      const directs = directsSnapshot.size;

      // Calculate pairs
      const leftVolume = treeData.leftVolume || 0;
      const rightVolume = treeData.rightVolume || 0;
      const pairs = Math.min(leftVolume, rightVolume);

      // Evaluate ranks (highest to lowest)
      const sortedRanks = [...config.ranks].sort((a, b) => b.level - a.level);

      for (const rank of sortedRanks) {
        const qualification = rank.qualification;

        // Check all qualification criteria
        const meetsTeamVolume = !qualification.teamVolume || 
          (treeData.totalVolume || 0) >= qualification.teamVolume;
        
        const meetsPairs = !qualification.pairs || pairs >= qualification.pairs;
        
        const meetsDirects = !qualification.directs || directs >= qualification.directs;
        
        const meetsLeftVolume = !qualification.leftVolume || 
          (treeData.leftVolume || 0) >= qualification.leftVolume;
        
        const meetsRightVolume = !qualification.rightVolume || 
          (treeData.rightVolume || 0) >= qualification.rightVolume;

        if (meetsTeamVolume && meetsPairs && meetsDirects && 
            meetsLeftVolume && meetsRightVolume) {
          // User qualifies for this rank
          if (userData.rankId !== rank.id) {
            // Update user rank
            await admin.firestore()
              .collection(`companies/${companyId}/users`)
              .doc(userId)
              .update({
                rankId: rank.id,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

            // Award rank rewards if auto-assign
            if (rank.autoAssign && rank.rewards) {
              // Award cash reward
              if (rank.rewards.cash) {
                await admin.firestore()
                  .collection(`companies/${companyId}/incomeTransactions`)
                  .add({
                    companyId,
                    userId,
                    incomeType: 'rank_reward',
                    amount: rank.rewards.cash,
                    currency: 'USD',
                    description: `Rank reward: ${rank.name}`,
                    status: 'credited',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    creditedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
              }

              // Products and achievements would be handled separately
            }

            break; // User gets the highest rank they qualify for
          }
        }
      }
    }
  }
}
