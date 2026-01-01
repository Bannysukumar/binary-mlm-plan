import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { updateBinaryTree } from '../binary/binaryTree';

export async function onUserCreate(
  snapshot: functions.firestore.QueryDocumentSnapshot,
  context: functions.EventContext
) {
  const companyId = context.params.companyId;
  const userId = context.params.userId;
  const userData = snapshot.data();

  // Set custom claims for Firebase Auth
  try {
    const role = userData.role || 'user';
    const customClaims: any = {
      role: role,
    };

    // Add companyId for non-super-admin roles
    if (role !== 'super_admin') {
      customClaims.companyId = companyId;
    }

    await admin.auth().setCustomUserClaims(userId, customClaims);
    console.log(`[v0] Custom claims set for user ${userId}:`, customClaims);
  } catch (error) {
    console.error(`[v0] Error setting custom claims for user ${userId}:`, error);
    // Don't throw - allow user creation to continue even if claims fail
    // Claims can be set manually later if needed
  }

  // Initialize wallet
  await admin.firestore()
    .collection(`companies/${companyId}/users/${userId}/wallet`)
    .doc('main')
    .set({
      userId,
      companyId,
      totalEarnings: 0,
      availableBalance: 0,
      lockedBalance: 0,
      withdrawnBalance: 0,
      currency: 'USD',
      isFrozen: false,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

  // Initialize binary tree
  await admin.firestore()
    .collection(`companies/${companyId}/users/${userId}/binaryTree`)
    .doc('main')
    .set({
      userId,
      companyId,
      leftLegId: null,
      rightLegId: null,
      leftVolume: 0,
      rightVolume: 0,
      totalVolume: 0,
      leftCount: 0,
      rightCount: 0,
      totalCount: 0,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

  // If user has a sponsor, update sponsor's binary tree
  if (userData.sponsorId) {
    await updateBinaryTree(companyId, userData.sponsorId);
  }

  // If user has a placement, update placement's binary tree
  if (userData.placementId) {
    await updateBinaryTree(companyId, userData.placementId);
  }

  // Create audit log
  await admin.firestore()
    .collection(`companies/${companyId}/auditLogs`)
    .add({
      userId: userData.createdBy || 'system',
      action: 'user_created',
      resource: 'users',
      resourceId: userId,
      changes: { userData },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  return null;
}
