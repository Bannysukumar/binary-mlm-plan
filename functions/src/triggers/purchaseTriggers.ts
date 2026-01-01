import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { calculateDirectIncome } from '../income/directIncome';
import { calculateRepurchaseIncome } from '../income/repurchaseIncome';
import { updateBinaryTree } from '../binary/binaryTree';

/**
 * Triggered when a user's packageBV is updated (indicating a purchase/repurchase)
 * Automatically calculates and distributes income
 */
export async function onUserPackageUpdate(
  change: functions.Change<functions.firestore.QueryDocumentSnapshot>,
  context: functions.EventContext
) {
  const companyId = context.params.companyId;
  const userId = context.params.userId;
  
  const beforeData = change.before.data();
  const afterData = change.after.data();
  
  const beforeBV = beforeData.packageBV || 0;
  const afterBV = afterData.packageBV || 0;
  
  // Only process if packageBV increased (new purchase)
  if (afterBV <= beforeBV) {
    return null;
  }
  
  const purchaseAmount = afterBV - beforeBV;
  
  try {
    // Get MLM config
    const configDoc = await admin.firestore()
      .collection(`companies/${companyId}/mlmConfig`)
      .doc('main')
      .get();
    
    if (!configDoc.exists) {
      console.log(`[v0] No MLM config found for company ${companyId}`);
      return null;
    }
    
    const config = configDoc.data();
    
    // Calculate direct income if enabled
    if (config?.directIncome?.enabled) {
      await calculateDirectIncome(companyId, userId);
    }
    
    // Calculate repurchase income if enabled and threshold met
    if (config?.repurchaseIncome?.enabled && purchaseAmount >= (config.repurchaseIncome.repurchaseBV || 0)) {
      await calculateRepurchaseIncome(companyId, userId, purchaseAmount);
    }
    
    // Calculate binary income (runs daily but can be triggered here for immediate update)
    // Binary income is calculated based on pair matching, not individual purchases
    // So we just update the binary tree structure here
    
    // Update binary tree with new volume
    await updateBinaryTree(companyId, userId);
    
    console.log(`[v0] Income calculated for purchase of ${purchaseAmount} by user ${userId}`);
    
  } catch (error) {
    console.error(`[v0] Error processing purchase for user ${userId}:`, error);
    // Don't throw - allow user update to complete even if income calculation fails
  }
  
  return null;
}

