const { Firestore } = require('@google-cloud/firestore');
const fs = require('fs-extra');
const path = require('path');

// Configuration
const PROJECT_ID = 'things-to-watch-b75b6';
const EXPORT_PATH = './firestore-export';
const COLLECTIONS_TO_EXPORT = null;
const BATCH_SIZE = 300;

async function initializeFirestore() {
  const firestoreOptions = { 
    projectId: PROJECT_ID,
    timestampsInSnapshots: true
  };

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const credentials = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      firestoreOptions.credentials = credentials;
    } catch (error) {
      console.error('Error loading credentials:', error.message);
    }
  }
  
  return new Firestore(firestoreOptions);
}

async function exportCollection(firestore, collectionName) {
  console.log(`Starting export of ${collectionName}`);
  const exportData = [];
  let totalExported = 0;
  
  try {
    let query = firestore.collection(collectionName).limit(BATCH_SIZE);
    let lastDoc = null;

    do {
      const snapshot = await (lastDoc 
        ? query.startAfter(lastDoc).get()
        : query.get());

      if (snapshot.empty) break;

      snapshot.forEach(doc => {
        exportData.push({
          id: doc.id,
          data: doc.data()
        });
      });

      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      totalExported += snapshot.size;
      console.log(`Exported ${totalExported} documents from ${collectionName}...`);
      
    } while (true);

    await fs.ensureDir(EXPORT_PATH);
    await fs.writeFile(
      path.join(EXPORT_PATH, `${collectionName}.json`),
      JSON.stringify(exportData, null, 2)
    );
    
    console.log(`✅ Successfully exported ${totalExported} documents from ${collectionName}`);
    return totalExported;
    
  } catch (error) {
    console.error(`❌ Error exporting ${collectionName}:`, error.message);
    await fs.appendFile(
      path.join(EXPORT_PATH, 'export-errors.log'),
      `${new Date().toISOString()} - ${collectionName}: ${error.stack}\n\n`
    );
    return 0;
  }
}

async function main() {
  try {
    const firestore = await initializeFirestore();
    
    // Clear previous error log
    try {
      await fs.remove(path.join(EXPORT_PATH, 'export-errors.log'));
    } catch (error) {
      // Ignore if file doesn't exist
    }

    let collectionNames;
    if (COLLECTIONS_TO_EXPORT) {
      collectionNames = COLLECTIONS_TO_EXPORT;
    } else {
      const collections = await firestore.listCollections();
      collectionNames = collections.map(col => col.id);
      if (collectionNames.length === 0) {
        console.log('No collections found in Firestore.');
        return;
      }
    }

    console.log(`Starting export of ${collectionNames.length} collection(s):\n${collectionNames.join('\n')}`);

    let totalDocs = 0;
    let successful = 0;
    let failed = 0;

    for (const collectionName of collectionNames) {
      const count = await exportCollection(firestore, collectionName);
      if (count > 0) {
        successful++;
        totalDocs += count;
      } else {
        failed++;
      }
    }

    console.log('\n=== Export Summary ===');
    console.log(`✅ Successfully exported ${successful} collections (${totalDocs} documents)`);
    console.log(`❌ Failed to export ${failed} collections`);
    console.log(`📂 Export directory: ${path.resolve(EXPORT_PATH)}`);
    
  } catch (error) {
    console.error('❗ Fatal error during export process:', error.message);
    process.exit(1);
  }
}

// Run the script
main();