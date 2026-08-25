document.addEventListener('DOMContentLoaded', function () {
  
  const firebaseConfig = {
    apiKey: "AIzaSyD-riUyDMLCRNLj0X24zoj2lczkP67fGeU",
    authDomain: "mashonka-50c0c.firebaseapp.com",
    databaseURL: "https://mashonka-50c0c-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "mashonka-50c0c",
    storageBucket: "mashonka-50c0c.firebasestorage.app",
    messagingSenderId: "423090740043",
    appId: "1:423090740043:web:79e28c8e019c4291d2e6ce"
  };

  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  
});
