const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const PROJECT_ID = 'binary-plan-2e2ae';

// Check if service account file exists
const fs = require('fs');
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Service account key file not found!');
  process.exit(1);
}

// Initialize Firebase Admin
let app;
try {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
  });
  console.log('✅ Initialized Firebase Admin\n');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

// Get arguments
const USER_EMAIL = process.argv[2];
const PACKAGE_BV = parseFloat(process.argv[3]) || 1000; // Default 1000 BV
const COMPANY_ID = process.argv[4] || 'lbKqNZmGGYyCn7q0PHZj';

if (!USER_EMAIL) {
  console.error('❌ Missing user email');
  console.error('\n📝 Usage:');
  console.error('   node scripts/assign-package-to-user.js <user_email> <package_bv> [company_id]');
  console.error('\n📝 Example:');
  console.error('   node scripts/assign-package-to-user.js usera@test.com 1000');
  console.error('   node scripts/assign-package-to-user.js userb@test.com 1000');
  process.exit(1);
}

async function assignPackage() {
  try {
    const db = admin.firestore();
    
    // Find user by email
    console.log(`🔍 Finding user: ${USER_EMAIL}...\n`);
    const usersRef = db.collection(`companies/${COMPANY_ID}/users`);
    const snapshot = await usersRef.where('email', '==', USER_EMAIL).limit(1).get();
    
    if (snapshot.empty) {
      console.error(`❌ User not found: ${USER_EMAIL}`);
      process.exit(1);
    }
    
    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    const currentBV = userData.packageBV || 0;
    
    console.log('✅ Found user:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Name: ${userData.firstName} ${userData.lastName}`);
    console.log(`   Current Package BV: ${currentBV}`);
    console.log(`   Sponsor ID: ${userData.sponsorId || 'N/A'}\n`);
    
    // Update packageBV
    console.log(`📦 Assigning package (BV: ${PACKAGE_BV})...`);
    await userDoc.ref.update({
      packageBV: PACKAGE_BV,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`✅ Package assigned successfully!\n`);
    console.log('💰 Income Calculation:');
    console.log('   - Cloud Function will trigger automatically');
    console.log('   - Direct income will be calculated for sponsor');
    console.log('   - Binary tree will be updated');
    console.log('   - Binary matching income will be calculated if pairs exist\n');
    
    if (userData.sponsorId) {
      console.log(`📊 Sponsor (${userData.sponsorId}) will receive:`);
      console.log(`   - Direct Income: 10% of ${PACKAGE_BV} = $${(PACKAGE_BV * 0.1).toFixed(2)}`);
      console.log(`   - Binary Matching: Will be calculated when pairs are formed\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    console.error(error.stack);
    process.exit(1);
  }
}

assignPackage().then(() => process.exit(0));

