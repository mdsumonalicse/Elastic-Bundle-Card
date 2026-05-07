import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, collection, addDoc, query, where, onSnapshot, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); 

// Helper to get or create a unique ID for this browser
export function getGuestId() {
  let guestId = localStorage.getItem('garment_guest_id');
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem('garment_guest_id', guestId);
  }
  return guestId;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Critical readiness check
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export { collection, addDoc, query, where, onSnapshot, deleteDoc, setDoc, updateDoc, doc };
