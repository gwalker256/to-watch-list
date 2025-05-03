// =======================================
// INITIALIZE FIREBASE SERVICES
// =======================================
// Set up connection to Firebase using the configuration provided elsewhere
const app = firebase.initializeApp(window.firebaseConfig);
// Set up authentication service
const auth = firebase.auth();
// Set up database service
const db = firebase.firestore();

// =======================================
// GET HTML ELEMENTS FROM THE PAGE
// =======================================
// Elements for login/content toggling
const authContainer = document.getElementById('auth-container');
const contentContainer = document.getElementById('content-container');
const signInForm = document.getElementById('signInForm');
const signOutBtn = document.getElementById('signOutBtn');
const welcomeMessage = document.getElementById('welcome-message');

// =======================================
// TRACK APPLICATION STATE
// =======================================
// Keep track of which item is currently expanded in the list
let expandedItemId = null;
// Keep track of which item is currently being edited
let editingItemId = null;
// Flag to avoid setting up event listeners multiple times
let listenersSetup = false;

// =======================================
// AUTHENTICATION STATE LISTENER
// =======================================
// This runs whenever the user's login state changes (logs in or out)
auth.onAuthStateChanged(user => {
  if (user) {
    // User is signed in - show content and hide login form
    authContainer.style.display = 'none';
    contentContainer.style.display = 'block';
    welcomeMessage.textContent = `Welcome, ${user.email}!`;
    
    // Set up event listeners for the media lists if not already done
    if (!listenersSetup) {
      setupMediaListeners();
      listenersSetup = true;
    }
  } else {
    // User is signed out - show login form and hide content
    authContainer.style.display = 'block';
    contentContainer.style.display = 'none';
    listenersSetup = false;
  }
});

// =======================================
// LOGIN FORM HANDLER
// =======================================
// Handle the login form submission
signInForm.addEventListener('submit', async (e) => {
  // Prevent the form from refreshing the page
  e.preventDefault();
  
  // Get email and password from form
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    // Attempt to sign in with Firebase
    await auth.signInWithEmailAndPassword(email, password);
    // If successful, the onAuthStateChanged listener above will handle showing content
  } catch (error) {
    // Show error message if login fails
    alert('Sign in failed: ' + error.message);
  }
});

// =======================================
// SIGN OUT BUTTON HANDLER
// =======================================
signOutBtn.addEventListener('click', () => {
  // Sign the user out when they click the sign out button
  auth.signOut();
  // The onAuthStateChanged listener will handle showing the login form
});

// =======================================
// MEDIA LIST INITIALIZATION
// =======================================
// Set up both the movies and TV shows lists
function setupMediaListeners() {
  setupMediaCollection('movies', 'movies-list');
  setupMediaCollection('tvShows', 'tv-list');
}

// =======================================
// SETUP INDIVIDUAL MEDIA COLLECTION
// =======================================
// This function sets up a single collection (either movies or TV shows)
function setupMediaCollection(collectionName, listId) {
  // Get the HTML list element where items will be displayed
  const listElement = document.getElementById(listId);
  
  // Figure out which "Add" button we need based on the collection
  const addButtonId = `add-${collectionName === 'movies' ? 'movie' : 'tv'}`;
  
  // Replace the add button to clear any previous event listeners
  // (This is a clean way to ensure we don't have duplicate listeners)
  const oldAddButton = document.getElementById(addButtonId);
  const newAddButton = oldAddButton.cloneNode(true);
  oldAddButton.replaceWith(newAddButton);

  // =======================================
  // "ADD NEW ITEM" BUTTON HANDLER
  // =======================================
  newAddButton.addEventListener('click', async () => {
    // Determine which input fields to use based on collection type
    const prefix = collectionName === 'movies' ? 'movie' : 'tv';
    
    // Get the title from the input field and remove whitespace
    const title = document.getElementById(`${prefix}-title`).value.trim();
    if (!title) return; // Don't add items without a title
    
    try {
      // Add the new item to the Firebase database
      await db.collection(collectionName).add({
        value: title, // The display title
        value_lowercase: title.toLowerCase(), // Used for sorting
        genre: document.getElementById(`${prefix}-genre`).value,
        runtime: document.getElementById(`${prefix}-runtime`).value,
        additionalInfo: '' // Start with empty notes
      });
      
      // Clear the input fields after adding
      document.getElementById(`${prefix}-title`).value = '';
      document.getElementById(`${prefix}-genre`).value = '';
      document.getElementById(`${prefix}-runtime`).value = '';
    } catch (error) {
      console.error(`Error adding to ${collectionName}:`, error);
    }
  });

  // =======================================
  // REAL-TIME DATABASE LISTENER
  // =======================================
  // This watches the database for changes and updates the list in real-time
  db.collection(collectionName)
    .orderBy('value_lowercase') // Sort alphabetically
    .onSnapshot(snapshot => {
      // Clear the current list
      listElement.innerHTML = '';
      
      // Add each item from the database to the list
      snapshot.forEach(doc => {
        const data = doc.data();
        const itemElement = createMediaItemElement(collectionName, doc.id, data);
        listElement.appendChild(itemElement);
      });
    });
}

// =======================================
// CREATE LIST ITEM ELEMENT
// =======================================
// This creates the HTML for each media item in the list
function createMediaItemElement(collectionName, id, data) {
  // Check if this item should be expanded or in edit mode
  const isExpanded = expandedItemId === id;
  const isEditing = editingItemId === id;

  // Create the list item element
  const li = document.createElement('li');
  li.className = `media-item ${isExpanded ? 'expanded' : ''}`;
  li.dataset.id = id;

  // =======================================
  // EDITING MODE VIEW
  // =======================================
  if (isEditing) {
    // Create form for editing the item
    li.innerHTML = `
      <div class="edit-container">
        <input type="text" class="edit-input" value="${data.value}" placeholder="Title" />
        <input type="text" class="edit-input" value="${data.genre || ''}" placeholder="Genre" />
        <input type="text" class="edit-input" value="${data.runtime || ''}" placeholder="Length" />
        <input type="text" class="edit-input" value="${data.additionalInfo || ''}" placeholder="Notes" />
        <div class="edit-actions">
          <button class="save-btn">Save</button>
          <button class="delete-btn">Delete</button>
        </div>
      </div>
    `;

    // =======================================
    // SAVE BUTTON HANDLER
    // =======================================
    const saveBtn = li.querySelector('.save-btn');
    saveBtn.addEventListener('click', async (e) => {
      // Prevent the click from also triggering the item's click event
      e.stopPropagation();
      
      // Get all input values
      const inputs = li.querySelectorAll('.edit-input');
      const [title, genre, runtime, additionalInfo] = Array.from(inputs).map(i => i.value);
      
      // Only save if there's a title
      if (title.trim()) {
        try {
          // Update the item in the database
          await db.collection(collectionName).doc(id).update({
            value: title,
            value_lowercase: title.toLowerCase(),
            genre,
            runtime,
            additionalInfo
          });
          
          // Exit edit mode but keep the item expanded
          editingItemId = null;
          expandedItemId = id;
          setupMediaListeners(); // Refresh the list
        } catch (error) {
          console.error('Error updating document:', error);
        }
      }
    });

    // =======================================
    // DELETE BUTTON HANDLER
    // =======================================
    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async (e) => {
      // Prevent the click from also triggering the item's click event
      e.stopPropagation();
      
      try {
        // Delete the item from the database
        await db.collection(collectionName).doc(id).delete();
        // The real-time listener will automatically update the list
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    });
  } 
  // =======================================
  // NORMAL VIEW (NOT EDITING)
  // =======================================
  else {
    // Create the normal view of the item (collapsed or expanded)
    li.innerHTML = `
      <div class="item-content">
        <div class="item-header">
          <span class="item-title">${data.value}</span>
          ${isExpanded ? `<button class="edit-btn">Edit</button>` : ''}
        </div>
        <div class="item-details" style="${isExpanded ? 'display: block;' : 'display: none;'}">
          <div class="detail-row">
            <span class="detail-label">Genre: </span>
            <span class="detail-value">${data.genre || ''}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Length: </span>
            <span class="detail-value">
              ${/^\d+$/.test(data.runtime) ? `${data.runtime} mins` : (data.runtime || '')}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Notes: </span>
            <span class="detail-value">${data.additionalInfo || ''}</span>
          </div>
        </div>
      </div>
    `;

    // =======================================
    // ITEM CLICK HANDLER (EXPAND/COLLAPSE)
    // =======================================
    li.addEventListener('click', (e) => {
      // Don't toggle if the edit button was clicked
      if (e.target.classList.contains('edit-btn')) return;
      
      // If the item is already expanded, collapse it
      if (expandedItemId === id) {
        expandedItemId = null;
        li.classList.remove('expanded');
        li.querySelector('.item-details').style.display = 'none';
        li.querySelector('.edit-btn')?.remove();
      } 
      // Otherwise expand this item
      else {
        expandedItemId = id;
        li.classList.add('expanded');
        li.querySelector('.item-details').style.display = 'block';
        
        // Add edit button if it doesn't exist
        if (!li.querySelector('.edit-btn')) {
          const editBtn = document.createElement('button');
          editBtn.className = 'edit-btn';
          editBtn.textContent = 'Edit';
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editingItemId = id;
            setupMediaListeners(); // Refresh to show edit form
          });
          li.querySelector('.item-header').appendChild(editBtn);
        }
      }
    });

    // =======================================
    // EDIT BUTTON HANDLER
    // =======================================
    const editBtn = li.querySelector('.edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        // Prevent triggering the item's click event
        e.stopPropagation();
        // Enter edit mode for this item
        editingItemId = id;
        setupMediaListeners(); // Refresh to show edit form
      });
    }
  }

  return li;
}

// =======================================
// CLICK AWAY HANDLER (CLOSE EXPANDED/EDITING ITEMS)
// =======================================
// This closes item details when clicking elsewhere on the page
document.addEventListener('click', (e) => {
  // Check what was clicked
  const clickedMediaItem = e.target.closest('.media-item');
  const clickedEditInput = e.target.classList.contains('edit-input');
  const clickedEditButton = e.target.closest('.save-btn') || e.target.closest('.delete-btn');

  // If clicked outside any media item OR clicked in an edit field but not on buttons
  if (!clickedMediaItem || (clickedEditInput && !clickedEditButton)) {
    // Reset expanded and editing state
    expandedItemId = null;
    editingItemId = null;
    setupMediaListeners(); // Refresh the UI
  }
});