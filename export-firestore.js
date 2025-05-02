const admin = require("firebase-admin");
const fs = require("fs");

process.env.DEBUG = ''; // Silence logs

// Ensure that FIREBASE_SERVICE_ACCOUNT is available in environment
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("Error: FIREBASE_SERVICE_ACCOUNT is not set.");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function exportFirestore() {
  try {
    const db = admin.firestore();
    db._settings = { autoPaginate: false }; // Fix warning

    const collections = await db.listCollections();
    const data = {};

    for (const collection of collections) {
      const snapshot = await collection.get();
      data[collection.id] = snapshot.docs.map(doc => doc.data());
    }

    fs.writeFileSync("firestore-export.json", JSON.stringify(data, null, 2));
    console.log("✅ Firestore export complete!");
  } catch (error) {
    console.error("Error during Firestore export:", error);
    process.exit(1); // Exit with an error status
  }
}

exportFirestore().catch(console.error);
