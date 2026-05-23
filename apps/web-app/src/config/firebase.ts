import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {getEnvVariable} from "@/utils";

const VITE_FIREBASE_API_KEY = getEnvVariable("VITE_FIREBASE_API_KEY");
const VITE_FIREBASE_AUTH_DOMAIN = getEnvVariable("VITE_FIREBASE_AUTH_DOMAIN");
const VITE_FIREBASE_PROJECT_ID = getEnvVariable("VITE_FIREBASE_PROJECT_ID");
const VITE_FIREBASE_STORAGE_BUCKET = getEnvVariable("VITE_FIREBASE_STORAGE_BUCKET");
const VITE_FIREBASE_MESSAGING_SENDER_ID = getEnvVariable("VITE_FIREBASE_MESSAGING_SENDER_ID");
const VITE_FIREBASE_APP_ID = getEnvVariable("VITE_FIREBASE_APP_ID");

const firebaseConfig = {
    apiKey: VITE_FIREBASE_API_KEY,
    authDomain: VITE_FIREBASE_AUTH_DOMAIN,
    projectId: VITE_FIREBASE_PROJECT_ID,
    storageBucket: VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
