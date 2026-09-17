// VTC PLUS — Firebase configuration

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyABNLn0CJcxH_skC9QqRsKLbY_tvP5hvV0",
  authDomain: "vtc-plus-a6242.firebaseapp.com",
  projectId: "vtc-plus-a6242",
  storageBucket: "vtc-plus-a6242.firebasestorage.app",
  messagingSenderId: "500809490080",
  appId: "1:500809490080:web:111996fe837bad8bcdb3c5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
