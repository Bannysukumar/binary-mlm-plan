const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
// Try to use application default credentials first (for Firebase CLI)
// Otherwise, you'll need to set GOOGLE_APPLICATION_CREDENTIALS environment variable
// or use a service account key file

let app;
try {
  // Try to initialize with default credentials (works when logged in via firebase login)
  app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'binary-plan-2e2ae',
  });
  console.log('✅ Initialized Firebase Admin with application default credentials');
} catch (error) {
  console.error('❌ Failed to initialize with default credentials');
  console.error('Please either:');
  console.error('1. Run: firebase login --no-localhost');
  console.error('2. Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
  console.error('3. Or modify this script to use a service account key file');
  console.error('Error:', error.message);
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    console.log('\n🔐 Admin User Creation Script\n');
    console.log('This script will create a new admin user or update an existing user.\n');

    // Get email
    const email = await question('Enter email address: ');
    if (!email) {
      console.error('❌ Email is required');
      process.exit(1);
    }

    // Get password
    const password = await question('Enter password (min 6 characters): ');
    if (!password || password.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      process.exit(1);
    }

    // Get role
    console.log('\nSelect role:');
    console.log('1. Super Admin (Platform Owner)');
    console.log('2. Company Admin (requires Company ID)');
    console.log('3. User (requires Company ID)');
    const roleChoice = await question('Enter choice (1-3): ');

    let role, companyId;

    if (roleChoice === '1') {
      role = 'super_admin';
      companyId = null;
    } else if (roleChoice === '2') {
      role = 'company_admin';
      companyId = await question('Enter Company ID: ');
      if (!companyId) {
        console.error('❌ Company ID is required for Company Admin');
        process.exit(1);
      }
    } else if (roleChoice === '3') {
      role = 'user';
      companyId = await question('Enter Company ID: ');
      if (!companyId) {
        console.error('❌ Company ID is required for User');
        process.exit(1);
      }
    } else {
      console.error('❌ Invalid choice');
      process.exit(1);
    }

    // Check if user exists
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log(`\n✅ User already exists: ${user.uid}`);
      console.log('Updating user...');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('\n📝 Creating new user...');
        user = await admin.auth().createUser({
          email: email,
          password: password,
          emailVerified: false,
        });
        console.log(`✅ User created: ${user.uid}`);
      } else {
        throw error;
      }
    }

    // Update password if user exists
    if (user && password) {
      await admin.auth().updateUser(user.uid, {
        password: password
      });
      console.log('✅ Password updated');
    }

    // Set custom claims
    const customClaims = companyId 
      ? { role, companyId }
      : { role };

    await admin.auth().setCustomUserClaims(user.uid, customClaims);
    console.log(`✅ Custom claims set:`, customClaims);

    // Verify claims
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('\n📋 User Details:');
    console.log(`   UID: ${updatedUser.uid}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Role: ${updatedUser.customClaims?.role || 'Not set'}`);
    if (updatedUser.customClaims?.companyId) {
      console.log(`   Company ID: ${updatedUser.customClaims.companyId}`);
    }
    console.log(`   Email Verified: ${updatedUser.emailVerified}`);

    console.log('\n✅ Admin user setup complete!');
    console.log('\n⚠️  Important: User must sign out and sign in again for claims to take effect.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

createAdmin().then(() => process.exit(0));
