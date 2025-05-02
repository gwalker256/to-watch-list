// Import Firebase Admin SDK and other necessary modules
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Set the DEBUG environment variable to empty to silence unnecessary logs
process.env.DEBUG = '';

// Set the path to the service account credentials (relative to your script location)
const serviceAccountPath = './service-account.json';

// Check if the service account file exists
if (!fs.existsSync(serviceAccountPath)) {
  console.error("Service account file not found at:", serviceAccountPath);
  process.exit(1);
}

// Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to point to your service account file
process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;

// Initialize Firebase Admin SDK with the credentials directly from the service account file
admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

async function exportFirestore() {
  const db = admin.firestore();
  db._settings = { autoPaginate: false }; // To fix the auto-paginate warning

  // Fetch all collections in Firestore
  const collections = await db.listCollections();
  const data = {};

  // Loop through all collections, get their documents, and store them in an object
  for (const collection of collections) {
    const snapshot = await collection.get();
    data[collection.id] = snapshot.docs.map(doc => doc.data());
  }

  // Create the 'database-backups' folder if it doesn't exist
  const backupFolder = './database-backups';
  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder);
  }

  // Get the current timestamp to create a unique filename
  const timestamp = new Date().toISOString().replace(/[-T:.]/g, '_'); // Example: "2025_05_02_140300"
  const filename = `firestore-export-${timestamp}.json`;

  // Define the full path for the backup file inside the 'database-backups' folder
  const filePath = path.join(backupFolder, filename);

  // Write the exported data to a JSON file with the timestamped filename
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ Firestore export complete! File saved as ${filePath}`);
}

// Execute the Firestore export
exportFirestore().catch(console.error);
