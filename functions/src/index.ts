import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

admin.initializeApp();

const db = admin.firestore();

/**
 * This function is triggered when a user document is written (created or updated).
 * It reads the user's roleId, finds the corresponding role document, and then
 * sets custom claims (isManager, isDev) on the user's auth token.
 */
export const processUserRoleChange = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const { userId } = context.params;
    const userData = change.after.data();

    // If the document is deleted, do nothing.
    if (!userData) {
      functions.logger.log(`User document ${userId} deleted. No claims to update.`);
      return null;
    }

    const roleId = userData.roleId;

    // If roleId is not set, we can't determine claims.
    if (!roleId) {
      functions.logger.log(`User ${userId} has no roleId. Setting default claims.`);
      try {
        await admin.auth().setCustomUserClaims(userId, { isManager: false, isDev: false });
        return { result: `Custom claims set to default for user ${userId}` };
      } catch (error) {
        functions.logger.error(`Error setting default claims for user ${userId}:`, error);
        return null;
      }
    }

    try {
      const roleDoc = await db.collection('roles').doc(roleId).get();
      let isManager = false;
      let isDev = false;

      if (roleDoc.exists) {
        const roleData = roleDoc.data();
        isManager = roleData?.isManager === true;
        isDev = roleData?.isDev === true;
        functions.logger.log(`Role for ${userId} found: ${roleData?.name}. isManager=${isManager}, isDev=${isDev}`);
      } else {
        functions.logger.warn(`Role document with ID ${roleId} not found for user ${userId}.`);
      }
      
      const claims = { isManager, isDev };

      // Set the custom claims on the user's auth token.
      await admin.auth().setCustomUserClaims(userId, claims);

      functions.logger.log(`Successfully set custom claims for user ${userId}:`, claims);
      return { result: `Custom claims updated for user ${userId}` };
    } catch (error) {
      functions.logger.error(`Error processing user role change for ${userId}:`, error);
      return null;
    }
  });
