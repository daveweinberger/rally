import { initializeApp } from 'firebase/app';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Load values from Vite env vars, fallback to placeholders for local dev
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rally-quest.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rally-quest",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rally-quest.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "placeholder-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "placeholder-app-id",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "placeholder-measurement-id"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, 'us-central1');

// Initialize App Check if site key is provided and we aren't using the emulator
if (typeof window !== 'undefined') {
  const siteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
  const isEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true';
  
  if (siteKey && !isEmulator) {
    if (import.meta.env.DEV) {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true
    });
    console.log("Firebase App Check initialized successfully");
  } else {
    console.warn("VITE_FIREBASE_APP_CHECK_SITE_KEY is not defined. App Check is disabled.");
  }
}

let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
    console.log("Firebase Analytics initialized successfully");
  } else {
    console.log("Firebase Analytics is not supported in this environment");
  }
}).catch((err) => {
  console.error("Firebase Analytics failed to initialize:", err);
});

// Connect to functions emulator if running locally and explicitly requested
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
  console.log("Connecting Firebase Functions client to emulator on localhost:5001");
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export { app, functions, analytics };
