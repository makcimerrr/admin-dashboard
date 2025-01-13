import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyCpug3QtHI3mJueKnyx7h9h6OBmFKKLhvY',
  authDomain: 'deck-177ba.firebaseapp.com',
  projectId: 'deck-177ba',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: '1:720950732730:android:0677103edb013142badf83',
};

export const firebaseApp = initializeApp(firebaseConfig);