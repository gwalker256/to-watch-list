const admin = require("firebase-admin");
const fs = require("fs");

// Initialize Firebase Admin using Application Default Credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

async function exportFirestore() {
  try {
    const db = admin.firestore();
    db._settings = { autoPaginate: false }; // Suppress pagination warning

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
    process.exit(1);
  }
}

exportFirestore().catch(console.error);
