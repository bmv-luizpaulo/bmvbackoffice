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

    let isManager = false;
    let isDev = false;

    if (roleId) {
        try {
            const roleDoc = await db.collection('roles').doc(roleId).get();
            if (roleDoc.exists) {
                const roleData = roleDoc.data();
                isManager = roleData?.isManager === true;
                isDev = roleData?.isDev === true;
                functions.logger.log(`Role for ${userId} found: ${roleData?.name}. isManager=${isManager}, isDev=${isDev}`);
            } else {
                functions.logger.warn(`Role document with ID ${roleId} not found for user ${userId}. Using default claims.`);
            }
        } catch (error) {
            functions.logger.error(`Error fetching role for user ${userId}:`, error);
        }
    } else {
        functions.logger.log(`User ${userId} has no roleId. Using default claims.`);
    }
      
    const claims = { isManager, isDev };

    try {
        // Set the custom claims on the user's auth token.
        await admin.auth().setCustomUserClaims(userId, claims);
        
        // Update a field in the user's Firestore document to signal the client to refresh the token.
        await db.collection('users').doc(userId).set({
            _tokenRefreshed: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        functions.logger.log(`Successfully set custom claims for user ${userId}:`, claims);
        return { result: `Custom claims updated for user ${userId}` };
    } catch (error) {
        functions.logger.error(`Error setting custom claims or updating user doc for ${userId}:`, error);
        return null;
    }
  });

    