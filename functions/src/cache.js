import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize firebase admin if not done already
const app = getApps().length === 0 ? initializeApp() : getApp();
const db = getFirestore(app);

const COLLECTION_NAME = 'caches';

/**
 * Get item from cache
 * @param {string} key 
 * @returns {Promise<any|null>}
 */
export async function getCache(key) {
  try {
    const docRef = db.collection(COLLECTION_NAME).doc(key);
    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }
    const data = doc.data();
    const expiresAt = data.expiresAt;
    
    // Check if expired
    if (expiresAt && expiresAt.toDate() < new Date()) {
      // Proactively delete expired cache asynchronously
      docRef.delete().catch(() => {});
      return null;
    }
    return data.value;
  } catch (error) {
    console.error(`Cache read error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set item in cache with TTL in seconds
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlSeconds 
 */
export async function setCache(key, value, ttlSeconds) {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const docRef = db.collection(COLLECTION_NAME).doc(key);
    await docRef.set({
      value,
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error(`Cache write error for key ${key}:`, error);
  }
}
