import * as admin from 'firebase-admin';
import { MLMConfig } from '../types';
import { getBinaryTreePath } from '../binary/binaryTree';

export async function calculateRepurchaseIncome(
  companyId: string,
  userId: string,
  repurchaseBV: number
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

  if (!config.repurchaseIncome.enabled) {
    return;
  }

  if (repurchaseBV < config.repurchaseIncome.repurchaseBV) {
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

  // Get binary tree path
  const path = await getBinaryTreePath(companyId, userId);

  // Calculate income for eligible levels
  for (const level of config.repurchaseIncome.eligibleLevels) {
    if (path.length < level + 1) {
      continue;
    }

    const uplineId = path[path.length - level - 1];

    // Check monthly qualification if enabled
    if (config.repurchaseIncome.monthlyQualification) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthlyTransactions = await admin.firestore()
        .collection(`companies/${companyId}/incomeTransactions`)
        .where('userId', '==', uplineId)
        .where('incomeType', '==', 'repurchase')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(firstDayOfMonth))
        .get();

      // Check if already qualified this month
      if (monthlyTransactions.size > 0) {
        continue;
      }
    }

    // Calculate income
    const incomeAmount = (repurchaseBV * config.repurchaseIncome.incomePercentage) / 100;

    if (incomeAmount <= 0) {
      continue;
    }

    // Create income transaction
    await admin.firestore()
      .collection(`companies/${companyId}/incomeTransactions`)
      .add({
        companyId,
        userId: uplineId,
        incomeType: 'repurchase',
        amount: incomeAmount,
        currency: 'USD',
        description: `Repurchase income - Level ${level} from ${userData.firstName} ${userData.lastName}`,
        relatedUserId: userId,
        status: 'credited',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        creditedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }
}
