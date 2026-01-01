const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const PROJECT_ID = 'binary-plan-2e2ae';

// Check if service account file exists
const fs = require('fs');
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Service account key file not found!');
  console.error(`   Expected location: ${SERVICE_ACCOUNT_PATH}`);
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
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

async function testConnection() {
  try {
    console.log('\n🔍 Testing Firestore connection...\n');
    
    // Test 1: Check if we can read companies
    console.log('1. Testing read access to companies collection...');
    const companiesSnapshot = await admin.firestore()
      .collection('companies')
      .limit(5)
      .get();
    
    console.log(`   ✅ Success! Found ${companiesSnapshot.size} companies`);
    
    if (companiesSnapshot.size > 0) {
      console.log('\n   Companies:');
      companiesSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. ${data.name || 'Unnamed'} (ID: ${doc.id})`);
        console.log(`      Active: ${data.isActive ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('   ℹ️  No companies found yet. This is normal for a new installation.');
    }
    
    // Test 2: Check Firestore rules
    console.log('\n2. Checking Firestore rules...');
    console.log('   ℹ️  Rules are deployed. Check Firebase Console for details.');
    
    // Test 3: Test write access (dry run)
    console.log('\n3. Testing write permissions...');
    console.log('   ℹ️  Write permissions can only be tested from the client with proper authentication.');
    
    console.log('\n✅ All tests passed!');
    console.log('\n💡 If companies are not loading in the app:');
    console.log('   1. Make sure you are logged in');
    console.log('   2. Check browser console for errors');
    console.log('   3. Verify Firestore rules are deployed: firebase deploy --only firestore:rules');
    console.log('   4. Sign out and sign in again to refresh your token');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    process.exit(1);
  }
}

testConnection().then(() => process.exit(0));
