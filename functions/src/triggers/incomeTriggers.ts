import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export async function onIncomeTransactionCreate(
  snapshot: functions.firestore.QueryDocumentSnapshot,
  context: functions.EventContext
) {
  const companyId = context.params.companyId;
  const transactionId = context.params.transactionId;
  const transactionData = snapshot.data();

  // Update user wallet when income is credited
  if (transactionData.status === 'credited') {
    const walletRef = admin.firestore()
      .collection(`companies/${companyId}/users/${transactionData.userId}/wallet`)
      .doc('main');

    await admin.firestore().runTransaction(async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      const walletData = walletDoc.data();

      if (walletData) {
        transaction.update(walletRef, {
          totalEarnings: (walletData.totalEarnings || 0) + transactionData.amount,
          availableBalance: (walletData.availableBalance || 0) + transactionData.amount,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    // Update transaction with credited timestamp
    await admin.firestore()
      .collection(`companies/${companyId}/incomeTransactions`)
      .doc(transactionId)
      .update({
        creditedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }

  return null;
}
