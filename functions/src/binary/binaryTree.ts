import * as admin from 'firebase-admin';

export async function updateBinaryTree(companyId: string, userId: string): Promise<void> {
  const userRef = admin.firestore()
    .collection(`companies/${companyId}/users`)
    .doc(userId);

  const treeRef = admin.firestore()
    .collection(`companies/${companyId}/users/${userId}/binaryTree`)
    .doc('main');

  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    return;
  }

  const userData = userDoc.data();
  if (!userData) {
    return;
  }

  // Get all direct downlines
  const downlinesSnapshot = await admin.firestore()
    .collection(`companies/${companyId}/users`)
    .where('placementId', '==', userId)
    .get();

  let leftVolume = 0;
  let rightVolume = 0;
  let leftCount = 0;
  let rightCount = 0;
  let leftLegId: string | null = null;
  let rightLegId: string | null = null;

  // Calculate volumes and counts for each leg
  for (const downlineDoc of downlinesSnapshot.docs) {
    const downlineData = downlineDoc.data();
    const placementSide = downlineData.placementSide;

    if (placementSide === 'left') {
      if (!leftLegId) {
        leftLegId = downlineDoc.id;
      }
      leftCount++;
      
      // Get downline's total volume
      const downlineTreeDoc = await admin.firestore()
        .collection(`companies/${companyId}/users/${downlineDoc.id}/binaryTree`)
        .doc('main')
        .get();
      
      const downlineTreeData = downlineTreeDoc.data();
      leftVolume += (downlineTreeData?.totalVolume || 0) + (downlineData.packageBV || 0);
    } else if (placementSide === 'right') {
      if (!rightLegId) {
        rightLegId = downlineDoc.id;
      }
      rightCount++;
      
      // Get downline's total volume
      const downlineTreeDoc = await admin.firestore()
        .collection(`companies/${companyId}/users/${downlineDoc.id}/binaryTree`)
        .doc('main')
        .get();
      
      const downlineTreeData = downlineTreeDoc.data();
      rightVolume += (downlineTreeData?.totalVolume || 0) + (downlineData.packageBV || 0);
    }
  }

  // Add user's own package BV if exists
  if (userData.packageBV) {
    // Distribute to the leg with less volume
    if (leftVolume <= rightVolume) {
      leftVolume += userData.packageBV;
    } else {
      rightVolume += userData.packageBV;
    }
  }

  const totalVolume = leftVolume + rightVolume;
  const totalCount = leftCount + rightCount;

  // Update binary tree
  await treeRef.set({
    userId,
    companyId,
    leftLegId,
    rightLegId,
    leftVolume,
    rightVolume,
    totalVolume,
    leftCount,
    rightCount,
    totalCount,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // Recursively update upline
  if (userData.placementId) {
    await updateBinaryTree(companyId, userData.placementId);
  }
}

export async function getBinaryTreePath(
  companyId: string,
  userId: string
): Promise<string[]> {
  const path: string[] = [userId];
  let currentUserId = userId;

  while (currentUserId) {
    const userDoc = await admin.firestore()
      .collection(`companies/${companyId}/users`)
      .doc(currentUserId)
      .get();

    if (!userDoc.exists) {
      break;
    }

    const userData = userDoc.data();
    if (userData?.placementId) {
      path.push(userData.placementId);
      currentUserId = userData.placementId;
    } else {
      break;
    }
  }

  return path.reverse();
}
