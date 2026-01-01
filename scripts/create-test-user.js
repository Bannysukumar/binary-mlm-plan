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
  console.log('✅ Initialized Firebase Admin');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

// Get arguments
const USER_EMAIL = process.argv[2] || 'sponsor@test.com';
const USER_PASSWORD = process.argv[3] || 'password123';
const COMPANY_ID = process.argv[4] || null;
const SPONSOR_ID = process.argv[5] || null; // Optional sponsor ID
const PLACEMENT_SIDE = process.argv[6] || null; // Optional placement side: 'left' or 'right'

async function createTestUser() {
  try {
    console.log('\n🔍 Finding company...\n');
    
    const db = admin.firestore();
    let companyQuery = db.collection('companies');
    
    if (COMPANY_ID) {
      companyQuery = companyQuery.where('__name__', '==', COMPANY_ID);
    } else {
      companyQuery = companyQuery.orderBy('createdAt', 'desc').limit(1);
    }
    
    const snapshot = await companyQuery.get();
    
    if (snapshot.empty) {
      console.error('❌ No companies found');
      process.exit(1);
    }
    
    const companyDoc = snapshot.docs[0];
    const companyData = companyDoc.data();
    const finalCompanyId = COMPANY_ID || companyDoc.id;
    
    console.log('✅ Found company:');
    console.log(`   ID: ${finalCompanyId}`);
    console.log(`   Name: ${companyData.name}`);
    console.log('');
    
    // Create Firebase Auth user
    console.log('🔐 Creating user account...\n');
    console.log(`Email: ${USER_EMAIL}`);
    console.log(`Role: user`);
    console.log(`Company ID: ${finalCompanyId}`);
    if (SPONSOR_ID) {
      console.log(`Sponsor ID: ${SPONSOR_ID}`);
    }
    if (PLACEMENT_SIDE) {
      console.log(`Placement Side: ${PLACEMENT_SIDE.toUpperCase()}`);
    }
    console.log('');
    
    let user;
    try {
      user = await admin.auth().getUserByEmail(USER_EMAIL);
      console.log(`✅ User already exists: ${user.uid}`);
      console.log('Updating user...');
      
      await admin.auth().updateUser(user.uid, {
        password: USER_PASSWORD
      });
      console.log('✅ Password updated');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('📝 Creating new user...');
        user = await admin.auth().createUser({
          email: USER_EMAIL,
          password: USER_PASSWORD,
          emailVerified: false,
        });
        console.log(`✅ User created: ${user.uid}`);
      } else {
        throw error;
      }
    }
    
    // Set custom claims
    const customClaims = {
      role: 'user',
      companyId: finalCompanyId
    };
    
    await admin.auth().setCustomUserClaims(user.uid, customClaims);
    console.log(`✅ Custom claims set:`, customClaims);
    
    // Create user document in Firestore
    const userRef = db.collection(`companies/${finalCompanyId}/users`).doc(user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      const userData = {
        id: user.uid,
        companyId: finalCompanyId,
        email: USER_EMAIL,
        firstName: USER_EMAIL.split('@')[0].split('.')[0] || 'Test',
        lastName: 'User',
        role: 'user',
        sponsorId: SPONSOR_ID || null,
        status: 'active',
        kycStatus: 'pending',
        blockedIncome: false,
        blockedWithdrawals: false,
        packageBV: 0,
        registrationDate: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      // Add placement side if provided
      if (PLACEMENT_SIDE && (PLACEMENT_SIDE === 'left' || PLACEMENT_SIDE === 'right')) {
        userData.placementSide = PLACEMENT_SIDE;
        userData.placementId = SPONSOR_ID || null;
      }
      
      await userRef.set(userData);
      console.log('✅ User document created in Firestore');
    } else {
      console.log('✅ User document already exists');
    }
    
    // Verify
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('\n📋 User Details:');
    console.log(`   UID: ${updatedUser.uid}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Role: ${updatedUser.customClaims?.role}`);
    console.log(`   Company ID: ${updatedUser.customClaims?.companyId}`);
    
    console.log('\n✅ Test user created successfully!');
    console.log('\n⚠️  IMPORTANT: User must sign out and sign in again for claims to take effect.');
    console.log('\n🔗 Login at: http://localhost:3000/login');
    console.log(`\n📧 Login Credentials:`);
    console.log(`   Email: ${USER_EMAIL}`);
    console.log(`   Password: ${USER_PASSWORD}`);
    console.log(`   Company: ${companyData.name} (${finalCompanyId})`);
    console.log(`   User ID: ${user.uid}`);
    console.log(`\n🔗 Referral Link:`);
    console.log(`   http://localhost:3000/register?sponsor=${user.uid}&company=${finalCompanyId}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    process.exit(1);
  }
}

createTestUser().then(() => process.exit(0));

