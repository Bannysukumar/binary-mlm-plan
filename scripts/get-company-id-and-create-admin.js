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
  console.log('✅ Initialized Firebase Admin');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

// Get arguments
const ADMIN_EMAIL = process.argv[2] || 'newcompany@test.com';
const ADMIN_PASSWORD = process.argv[3] || 'password123';
const COMPANY_NAME = process.argv[4] || null; // Optional: filter by company name

async function getCompanyAndCreateAdmin() {
  try {
    console.log('\n🔍 Finding company...\n');
    
    const db = admin.firestore();
    let companyQuery = db.collection('companies');
    
    // If company name provided, filter by it
    if (COMPANY_NAME) {
      companyQuery = companyQuery.where('name', '==', COMPANY_NAME);
    }
    
    const snapshot = await companyQuery.orderBy('createdAt', 'desc').limit(1).get();
    
    if (snapshot.empty) {
      console.error('❌ No companies found');
      process.exit(1);
    }
    
    const companyDoc = snapshot.docs[0];
    const companyData = companyDoc.data();
    const COMPANY_ID = companyDoc.id;
    
    console.log('✅ Found company:');
    console.log(`   ID: ${COMPANY_ID}`);
    console.log(`   Name: ${companyData.name}`);
    console.log(`   Code: ${companyData.code || 'N/A'}`);
    console.log(`   Admin Email: ${companyData.adminEmail || 'N/A'}`);
    console.log(`   Status: ${companyData.status || 'N/A'}`);
    console.log('');
    
    // Create admin user
    console.log('🔐 Creating admin user...\n');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Role: company_admin`);
    console.log(`Company ID: ${COMPANY_ID}`);
    console.log('');
    
    // Check if user exists
    let user;
    try {
      user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
      console.log(`✅ User already exists: ${user.uid}`);
      console.log('Updating user...');
      
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
    const customClaims = {
      role: 'company_admin',
      companyId: COMPANY_ID
    };
    
    await admin.auth().setCustomUserClaims(user.uid, customClaims);
    console.log(`✅ Custom claims set:`, customClaims);
    
    // Verify
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('\n📋 User Details:');
    console.log(`   UID: ${updatedUser.uid}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Role: ${updatedUser.customClaims?.role}`);
    console.log(`   Company ID: ${updatedUser.customClaims?.companyId}`);
    
    console.log('\n✅ Admin user created successfully!');
    console.log('\n⚠️  IMPORTANT: User must sign out and sign in again for claims to take effect.');
    console.log('\n🔗 Login at: http://localhost:3000/login');
    console.log(`\n📧 Login Credentials:`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Company: ${companyData.name} (${COMPANY_ID})`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    process.exit(1);
  }
}

getCompanyAndCreateAdmin().then(() => process.exit(0));

