import { getApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let firestoreSingleton: Firestore | undefined;

function getOrInitializeAdminApp(): App {
  try {
    return getApp();
  } catch {
    return initializeApp();
  }
}

export function getServerFirestoreV1(): Firestore {
  firestoreSingleton ??= getFirestore(getOrInitializeAdminApp());
  return firestoreSingleton;
}
