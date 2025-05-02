const admin = require("firebase-admin");
const fs = require("fs");

process.env.DEBUG = ''; // Silence logs

admin.initializeApp({
  credential: admin.credential.cert(require("./service-account.json")),
});

async function exportFirestore() {
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
}

exportFirestore().catch(console.error);