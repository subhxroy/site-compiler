import { adminAuth, adminDb } from '../lib/firebase/admin';

async function main() {
  const email = 'testuser@sitecompiler.dev';
  const password = 'TestUser12345!';
  const displayName = 'Strix Test User';

  console.log(`[Create Test User] Checking if user ${email} already exists...`);

  let userRecord;
  try {
    userRecord = await adminAuth.getUserByEmail(email);
    console.log(`[Create Test User] User already exists (UID: ${userRecord.uid}). Updating password...`);
    userRecord = await adminAuth.updateUser(userRecord.uid, {
      password,
      displayName,
      emailVerified: true,
    });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'auth/user-not-found') {
      console.log(`[Create Test User] User not found. Creating new Firebase Auth user...`);
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });
    } else {
      throw err;
    }
  }

  // Sync user record into Firestore
  const userRef = adminDb.collection('users').doc(userRecord.uid);
  await userRef.set({
    uid: userRecord.uid,
    email,
    displayName,
    role: 'user',
    canExport: true,
    status: 'active',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }, { merge: true });

  console.log('\n========================================');
  console.log('✅ TEST USER CREATED / UPDATED SUCCESSFULLY');
  console.log('========================================');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`UID:      ${userRecord.uid}`);
  console.log(`Role:     user`);
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('Failed to create test user:', err);
  process.exit(1);
});
