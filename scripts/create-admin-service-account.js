const admin = require('firebase-admin');
const path = require('path');

// This script uses a service account key file
// Download it from: Firebase Console > Project Settings > Service Accounts > Generate new private key
// Save it as: scripts/serviceAccountKey.json

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const PROJECT_ID = 'binary-plan-2e2ae';

// Check if service account file exists
const fs = require('fs');
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Service account key file not found!');
  console.error(`   Expected location: ${SERVICE_ACCOUNT_PATH}`);
  console.error('\n📝 To get the service account key:');
  console.error('   1. Go to: https://console.firebase.google.com/project/binary-plan-2e2ae/settings/serviceaccounts/adminsdk');
  console.error('   2. Click "Generate new private key"');
  console.error('   3. Save the JSON file as: scripts/serviceAccountKey.json');
  console.error('   4. Run this script again');
  process.exit(1);
}

// Initialize Firebase Admin with service account
let app;
try {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
  });
  console.log('✅ Initialized Firebase Admin with service account');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin');
  console.error('Error:', error.message);
  process.exit(1);
}

// Get arguments
const ADMIN_EMAIL = process.argv[2];
const ADMIN_PASSWORD = process.argv[3];
const ROLE = process.argv[4] || 'super_admin';
const COMPANY_ID = process.argv[5] || null;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('\n❌ Missing required arguments');
  console.error('\n📝 Usage:');
  console.error('   node scripts/create-admin-service-account.js <email> <password> [role] [companyId]');
  console.error('\n📝 Examples:');
  console.error('   # Super Admin:');
  console.error('   node scripts/create-admin-service-account.js admin@example.com password123 super_admin');
  console.error('\n   # Company Admin:');
  console.error('   node scripts/create-admin-service-account.js company@example.com password123 company_admin COMPANY_ID');
  console.error('\n   # User:');
  console.error('   node scripts/create-admin-service-account.js user@example.com password123 user COMPANY_ID');
  process.exit(1);
}

async function createAdmin() {
  try {
    console.log('\n🔐 Creating Admin User...\n');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Role: ${ROLE}`);
    if (COMPANY_ID) {
      console.log(`Company ID: ${COMPANY_ID}`);
    }
    console.log('');

    // Check if user exists
    let user;
    try {
      user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
      console.log(`✅ User already exists: ${user.uid}`);
      console.log('Updating user...');
      
      // Update password
      await admin.auth().updateUser(user.uid, {
        password: ADMIN_PASSWORD
      });
      console.log('✅ Password updated');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('📝 Creating new user...');
        user = await admin.auth().createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          emailVerified: false,
        });
        console.log(`✅ User created: ${user.uid}`);
      } else {
        throw error;
      }
    }

    // Set custom claims
    const customClaims = COMPANY_ID 
      ? { role: ROLE, companyId: COMPANY_ID }
      : { role: ROLE };

    await admin.auth().setCustomUserClaims(user.uid, customClaims);
    console.log(`✅ Custom claims set:`, customClaims);

    // Verify
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('\n📋 User Details:');
    console.log(`   UID: ${updatedUser.uid}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Role: ${updatedUser.customClaims?.role}`);
    if (updatedUser.customClaims?.companyId) {
      console.log(`   Company ID: ${updatedUser.customClaims.companyId}`);
    }

    console.log('\n✅ Admin user created successfully!');
    console.log('\n⚠️  IMPORTANT: User must sign out and sign in again for claims to take effect.');
    console.log('\n🔗 Login at: http://localhost:3000/login');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error.errorInfo) {
      console.error(`   Error Info:`, error.errorInfo);
    }
    process.exit(1);
  }
}

createAdmin().then(() => process.exit(0));
