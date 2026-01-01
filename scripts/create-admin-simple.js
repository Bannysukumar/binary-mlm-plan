const admin = require('firebase-admin');

// Simple script to create admin - modify email and password here
const ADMIN_EMAIL = process.argv[2] || 'admin@example.com';
const ADMIN_PASSWORD = process.argv[3] || 'Admin123!@#';
const ROLE = process.argv[4] || 'super_admin'; // super_admin, company_admin, user
const COMPANY_ID = process.argv[5] || null; // Required for company_admin and user

// Initialize Firebase Admin
let app;
try {
  // Try to use application default credentials with explicit project ID
  app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'binary-plan-2e2ae',
  });
  console.log('✅ Initialized Firebase Admin');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin');
  console.error('Make sure you are logged in: firebase login --no-localhost');
  console.error('Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
  console.error('Error:', error.message);
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
    console.log('\n⚠️  User must sign out and sign in again for claims to take effect.');
    console.log('\n📝 Usage:');
    console.log('   Interactive: node scripts/create-admin.js');
    console.log('   Simple: node scripts/create-admin-simple.js <email> <password> [role] [companyId]');
    console.log('   Example: node scripts/create-admin-simple.js admin@test.com password123 super_admin');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure you are logged in: firebase login --no-localhost');
    console.error('   2. Check that Firebase Admin SDK is installed: npm install firebase-admin');
    console.error('   3. Verify your Firebase project is correct');
    process.exit(1);
  }
}

createAdmin().then(() => process.exit(0));
