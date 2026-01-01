const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const PROJECT_ID = 'binary-plan-2e2ae';

const fs = require('fs');
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Service account key file not found!');
  console.error('Please download the service account key and place it in: scripts/serviceAccountKey.json');
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

async function changePassword(email, newPassword) {
  try {
    console.log(`\n🔐 Changing password for: ${email}\n`);
    
    const user = await admin.auth().getUserByEmail(email);
    
    await admin.auth().updateUser(user.uid, {
      password: newPassword,
    });
    
    console.log('✅ Password changed successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   New Password: ${newPassword}`);
    
    return { success: true, email, password: newPassword };
  } catch (error) {
    console.error('❌ Error changing password:', error.message);
    return { success: false, error: error.message };
  }
}

async function createUser(email, password, role, companyId) {
  try {
    console.log(`\n👤 Creating user: ${email}\n`);
    
    // Check if user already exists
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log('⚠️  User already exists. Updating...');
    } catch (error) {
      // User doesn't exist, create new
      user = await admin.auth().createUser({
        email,
        password,
        emailVerified: false,
      });
      console.log('✅ User created in Firebase Auth');
    }
    
    // Update password if user exists
    if (user) {
      await admin.auth().updateUser(user.uid, {
        password,
      });
    }
    
    // Set custom claims
    const customClaims = {
      role: role,
    };
    
    if (role === 'company_admin' || role === 'user') {
      if (!companyId) {
        throw new Error('Company ID is required for company_admin and user roles');
      }
      customClaims.companyId = companyId;
    }
    
    await admin.auth().setCustomUserClaims(user.uid, customClaims);
    console.log('✅ Custom claims set:', customClaims);
    
    // Create user document in Firestore if it's a user role
    if (role === 'user' && companyId) {
      const db = admin.firestore();
      const userRef = db.collection(`companies/${companyId}/users`).doc(user.uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        await userRef.set({
          id: user.uid,
          companyId: companyId,
          email: email,
          firstName: 'New',
          lastName: 'User',
          role: 'user',
          isActive: false, // Admin needs to activate
          isKycVerified: false,
          packageBV: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ User document created in Firestore');
      } else {
        console.log('⚠️  User document already exists in Firestore');
      }
    }
    
    console.log('\n✅ User setup complete!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${role}`);
    if (companyId) {
      console.log(`   Company ID: ${companyId}`);
    }
    
    return { success: true, email, password, role, companyId };
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  const command = process.argv[2];
  
  if (command === 'change-password') {
    const email = process.argv[3];
    const newPassword = process.argv[4];
    
    if (!email || !newPassword) {
      console.error('Usage: node scripts/manage-users.js change-password <email> <newPassword>');
      process.exit(1);
    }
    
    await changePassword(email, newPassword);
  } else if (command === 'create-user') {
    const email = process.argv[3];
    const password = process.argv[4];
    const role = process.argv[5];
    const companyId = process.argv[6];
    
    if (!email || !password || !role) {
      console.error('Usage: node scripts/manage-users.js create-user <email> <password> <role> [companyId]');
      console.error('Roles: super_admin, company_admin, user');
      process.exit(1);
    }
    
    if ((role === 'company_admin' || role === 'user') && !companyId) {
      console.error('Company ID is required for company_admin and user roles');
      process.exit(1);
    }
    
    await createUser(email, password, role, companyId);
  } else {
    console.error('Usage:');
    console.error('  Change password: node scripts/manage-users.js change-password <email> <newPassword>');
    console.error('  Create user: node scripts/manage-users.js create-user <email> <password> <role> [companyId]');
    process.exit(1);
  }
  
  process.exit(0);
}

main();
