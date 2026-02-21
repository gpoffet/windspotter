import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Callable Cloud Function: listUsers
 * Returns all Firebase Auth users. Admin only.
 */
export const listUsers = onCall(
  { region: 'europe-west6', cors: true, invoker: 'public' },
  async (request) => {
    if (!request.auth?.token.admin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const listResult = await getAuth().listUsers(1000);

    return listResult.users.map((user) => ({
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      createdAt: user.metadata.creationTime ?? null,
      isAdmin: user.customClaims?.admin === true,
    }));
  },
);

/**
 * Callable Cloud Function: deleteUser
 * Deletes a Firebase Auth user and their Firestore data. Admin only.
 */
export const deleteUser = onCall(
  { region: 'europe-west6', cors: true, invoker: 'public' },
  async (request) => {
    if (!request.auth?.token.admin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { uid } = request.data as { uid: string };

    if (!uid || typeof uid !== 'string') {
      throw new HttpsError('invalid-argument', 'uid is required');
    }

    // Prevent self-deletion
    if (uid === request.auth.uid) {
      throw new HttpsError('invalid-argument', 'Cannot delete your own account');
    }

    const db = getFirestore();

    // Delete Firestore user data
    const userSettingsRef = db.doc(`users/${uid}/settings/preferences`);
    const userSettingsSnap = await userSettingsRef.get();
    if (userSettingsSnap.exists) {
      await userSettingsRef.delete();
    }

    // Delete the user document itself (if it exists)
    const userDocRef = db.doc(`users/${uid}`);
    const userDocSnap = await userDocRef.get();
    if (userDocSnap.exists) {
      await userDocRef.delete();
    }

    // Delete Firebase Auth user
    await getAuth().deleteUser(uid);

    return { success: true };
  },
);
