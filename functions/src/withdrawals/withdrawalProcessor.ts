import * as admin from 'firebase-admin';

export async function processWithdrawals(): Promise<void> {
  // Get all companies
  const companiesSnapshot = await admin.firestore()
    .collection('companies')
    .where('isActive', '==', true)
    .get();

  for (const companyDoc of companiesSnapshot.docs) {
    const companyId = companyDoc.id;

    // Get withdrawal config
    const configDoc = await admin.firestore()
      .collection(`companies/${companyId}/withdrawalConfig`)
      .doc('main')
      .get();

    if (!configDoc.exists) {
      continue;
    }

    const config = configDoc.data();
    if (!config?.autoPayout) {
      continue;
    }

    // Get pending withdrawals
    const pendingWithdrawals = await admin.firestore()
      .collection(`companies/${companyId}/withdrawals`)
      .where('status', '==', 'pending')
      .get();

    for (const withdrawalDoc of pendingWithdrawals.docs) {
      const withdrawalData = withdrawalDoc.data();

      // Check if withdrawal should be auto-approved based on payout cycle
      const shouldAutoApprove = checkPayoutCycle(
        withdrawalData.requestedAt?.toDate() || new Date(),
        config.payoutCycle
      );

      if (shouldAutoApprove) {
        // Auto-approve withdrawal
        await admin.firestore()
          .collection(`companies/${companyId}/withdrawals`)
          .doc(withdrawalDoc.id)
          .update({
            status: 'approved',
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            processedBy: 'system',
          });

        // Deduct from wallet
        const walletRef = admin.firestore()
          .collection(`companies/${companyId}/users/${withdrawalData.userId}/wallet`)
          .doc('main');

        await admin.firestore().runTransaction(async (transaction) => {
          const walletDoc = await transaction.get(walletRef);
          const walletData = walletDoc.data();

          if (walletData && walletData.availableBalance >= withdrawalData.amount) {
            transaction.update(walletRef, {
              availableBalance: walletData.availableBalance - withdrawalData.amount,
              withdrawnBalance: (walletData.withdrawnBalance || 0) + withdrawalData.amount,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        });
      }
    }
  }
}

function checkPayoutCycle(requestDate: Date, cycle: string): boolean {
  const now = new Date();
  const diffTime = now.getTime() - requestDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  switch (cycle) {
    case 'daily':
      return diffDays >= 1;
    case 'weekly':
      return diffDays >= 7;
    case 'monthly':
      return diffDays >= 30;
    case 'manual':
      return false;
    default:
      return false;
  }
}
