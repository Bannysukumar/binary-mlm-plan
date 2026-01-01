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

const COMPANY_ID = 'lbKqNZmGGYyCn7q0PHZj';
const SPONSOR_ID = 'JGwVU6DbLYX8RBa828FiVFxCGv93';

const usersToCreate = [
  {
    email: 'usera@test.com',
    password: 'password123',
    placementSide: 'left',
    firstName: 'User',
    lastName: 'A'
  },
  {
    email: 'userb@test.com',
    password: 'password123',
    placementSide: 'right',
    firstName: 'User',
    lastName: 'B'
  }
];

async function createUsers() {
  try {
    const db = admin.firestore();
    
    // Verify company exists
    const companyDoc = await db.collection('companies').doc(COMPANY_ID).get();
    if (!companyDoc.exists) {
      console.error(`❌ Company ${COMPANY_ID} not found`);
      process.exit(1);
    }
    
    console.log(`✅ Found company: ${companyDoc.data().name}\n`);
    
    for (const userData of usersToCreate) {
      console.log(`📝 Creating ${userData.email} (${userData.placementSide.toUpperCase()} placement)...`);
      
      let user;
      try {
        user = await admin.auth().getUserByEmail(userData.email);
        console.log(`   ⚠️  User already exists: ${user.uid}`);
        console.log('   Updating password...');
        
        await admin.auth().updateUser(user.uid, {
          password: userData.password
        });
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          user = await admin.auth().createUser({
            email: userData.email,
            password: userData.password,
            emailVerified: false,
          });
          console.log(`   ✅ Auth user created: ${user.uid}`);
        } else {
          throw error;
        }
      }
      
      // Set custom claims
      await admin.auth().setCustomUserClaims(user.uid, {
        role: 'user',
        companyId: COMPANY_ID
      });
      console.log(`   ✅ Custom claims set`);
      
      // Create/update user document
      const userRef = db.collection(`companies/${COMPANY_ID}/users`).doc(user.uid);
      const userDoc = await userRef.get();
      
      const userDocumentData = {
        id: user.uid,
        companyId: COMPANY_ID,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'user',
        sponsorId: SPONSOR_ID,
        placementSide: userData.placementSide,
        placementId: SPONSOR_ID,
        status: 'active',
        kycStatus: 'pending',
        blockedIncome: false,
        blockedWithdrawals: false,
        packageBV: 0,
        registrationDate: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      if (userDoc.exists) {
        await userRef.update(userDocumentData);
        console.log(`   ✅ User document updated`);
      } else {
        await userRef.set(userDocumentData);
        console.log(`   ✅ User document created`);
      }
      
      // Initialize wallet (if not exists)
      const walletRef = db.collection(`companies/${COMPANY_ID}/users/${user.uid}/wallet`).doc('main');
      const walletDoc = await walletRef.get();
      if (!walletDoc.exists) {
        await walletRef.set({
          userId: user.uid,
          companyId: COMPANY_ID,
          totalEarnings: 0,
          availableBalance: 0,
          lockedBalance: 0,
          withdrawnBalance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          currency: 'USD',
          isFrozen: false,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`   ✅ Wallet initialized`);
      }
      
      // Initialize binary tree position (if not exists)
      const treeRef = db.collection(`companies/${COMPANY_ID}/users/${user.uid}/binaryTree`).doc('position');
      const treeDoc = await treeRef.get();
      if (!treeDoc.exists) {
        await treeRef.set({
          userId: user.uid,
          left: undefined,
          right: undefined,
          leftVolume: 0,
          rightVolume: 0,
        });
        console.log(`   ✅ Binary tree position initialized`);
      }
      
      console.log(`   ✅ ${userData.email} setup complete!\n`);
    }
    
    // Update sponsor's binary tree
    console.log('🔄 Updating sponsor binary tree...');
    const { updateBinaryTree } = require('../functions/src/binary/binaryTree');
    try {
      await updateBinaryTree(COMPANY_ID, SPONSOR_ID);
      console.log('   ✅ Sponsor binary tree updated\n');
    } catch (error) {
      console.log(`   ⚠️  Could not update binary tree automatically: ${error.message}`);
      console.log('   ℹ️  Cloud Function will update it automatically\n');
    }
    
    console.log('✅ All users created successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Sponsor: sponsor@test.com (${SPONSOR_ID})`);
    console.log(`   User A: usera@test.com (LEFT)`);
    console.log(`   User B: userb@test.com (RIGHT)\n`);
    console.log('🔗 Next Steps:');
    console.log('   1. Refresh the team page in your browser');
    console.log('   2. You should see:');
    console.log('      - Total Team Members: 2');
    console.log('      - Left Leg Members: 1');
    console.log('      - Right Leg Members: 1\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    console.error(error.stack);
    process.exit(1);
  }
}

createUsers().then(() => process.exit(0));

