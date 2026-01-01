const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const PROJECT_ID = 'binary-plan-2e2ae';

const fs = require('fs');
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Service account key file not found!');
  process.exit(1);
}

let app;
try {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
  });
} catch (error) {
  console.error('❌ Failed to initialize:', error.message);
  process.exit(1);
}

async function checkUser(email) {
  try {
    console.log(`\n🔍 Checking user: ${email}\n`);
    
    const user = await admin.auth().getUserByEmail(email);
    console.log('✅ User found:');
    console.log(`   UID: ${user.uid}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Email Verified: ${user.emailVerified}`);
    
    // Get custom claims
    const customClaims = user.customClaims || {};
    console.log('\n📋 Custom Claims:');
    if (Object.keys(customClaims).length === 0) {
      console.log('   ❌ No custom claims set!');
      console.log('   This is why you\'re getting permission denied.');
    } else {
      console.log('   Role:', customClaims.role || 'Not set');
      console.log('   Company ID:', customClaims.companyId || 'Not set');
      
      if (customClaims.role === 'company_admin' && !customClaims.companyId) {
        console.log('\n   ⚠️  Warning: Company Admin role but no Company ID!');
      }
    }
    
    return { user, customClaims };
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'companyadmin@binaryplan.com';

checkUser(email).then(() => {
  console.log('\n💡 If custom claims are missing:');
  console.log('   1. Run the create-admin script to set them');
  console.log('   2. User must sign out and sign in again');
  console.log('   3. Custom claims are in the ID token, refreshed on login');
  process.exit(0);
});
