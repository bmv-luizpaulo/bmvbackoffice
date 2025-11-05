import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// Atualiza os custom claims de um usuário quando seu cargo é alterado.
export const onUserRoleChange = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const userId = context.params.userId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Verifica se o roleId mudou
    if (beforeData.roleId === afterData.roleId) {
      functions.logger.log(`Role for user ${userId} has not changed.`);
      return null;
    }

    const roleId = afterData.roleId;
    let isManager = false;
    let isDev = false;

    if (roleId) {
      try {
        const roleDoc = await db.collection("roles").doc(roleId).get();
        if (roleDoc.exists) {
          const roleData = roleDoc.data();
          isManager = roleData?.isManager === true;
          isDev = roleData?.isDev === true;
        } else {
          functions.logger.warn(`Role document ${roleId} not found.`);
        }
      } catch (error) {
        functions.logger.error(
          `Error fetching role ${roleId} for user ${userId}:`,
          error
        );
        return null;
      }
    }

    try {
      // Define os custom claims no Firebase Auth
      await admin.auth().setCustomUserClaims(userId, { isManager, isDev });
      functions.logger.log(
        `Successfully set custom claims for user ${userId}:`,
        { isManager, isDev }
      );

      // Dispara a atualização do token no cliente
      await db.collection("users").doc(userId).update({
        _tokenRefreshed: admin.firestore.FieldValue.serverTimestamp(),
      });
      functions.logger.log(`Triggered token refresh for user ${userId}.`);
    } catch (error) {
      functions.logger.error(
        `Error setting custom claims for user ${userId}:`,
        error
      );
    }
    return null;
  });
