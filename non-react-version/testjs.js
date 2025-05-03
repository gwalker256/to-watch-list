// =======================================
// INITIALIZE FIREBASE SERVICES
// =======================================
// Set up connection to Firebase using the configuration provided elsewhere
// Firebase is a cloud service that helps store and sync data
const app = firebase.initializeApp(window.firebaseConfig);

// Set up authentication service - this handles user login/logout
const auth = firebase.auth();

// Set up database service - this is where we'll store the movie and TV show data
const db = firebase.firestore();

// =======================================
// GET HTML ELEMENTS FROM THE PAGE
// =======================================
// Elements for login/content toggling
const authContainer = document.getElementById("auth-container");
const contentContainer = document.getElementById("content-container");
const signInForm = document.getElementById("signInForm");
const signOutBtn = document.getElementById("signOutBtn");
const welcomeMessage = document.getElementById("welcome-message");

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
auth.onAuthStateChanged((user) => {
  if (user) {
    // User is signed in - show content and hide login form
    authContainer.style.display = "none";
    contentContainer.style.display = "block";
    welcomeMessage.textContent = `Welcome, ${user.email}!`;

    // Set up event listeners for the media lists if not already done
    if (!listenersSetup) {
      setupMediaListeners();
      listenersSetup = true;
    }
  } else {
    // User is signed out - show login form and hide content
    authContainer.style.display = "block";
    contentContainer.style.display = "none";
    listenersSetup = false;
  }
});

// =======================================
// LOGIN FORM HANDLER
// =======================================
// Handle the login form submission
signInForm.addEventListener("submit", async (e) => {
  // Prevent the form from refreshing the page
  e.preventDefault();

  // Get email and password from form
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    // The "async" keyword above and "await" keyword below are for asynchronous code
    // This means the code waits for Firebase to verify the login before continuing
    // Attempt to sign in with Firebase
    await auth.signInWithEmailAndPassword(email, password);
    // If successful, the onAuthStateChanged listener above will handle showing content
  } catch (error) {
    // Show error message if login fails
    alert("Sign in failed: " + error.message);
  }
});

// =======================================
// SIGN OUT BUTTON HANDLER
// =======================================
signOutBtn.addEventListener("click", () => {
  // Sign the user out when they click the sign out button
  auth.signOut();
  // The onAuthStateChanged listener will handle showing the login form
});

// =======================================
// MEDIA LIST INITIALIZATION
// =======================================
// Set up both the movies and TV shows lists
function setupMediaListeners() {
  setupMediaCollection("movies", "movies-list");
  setupMediaCollection("tvShows", "tv-list");
}

// =======================================
// SETUP INDIVIDUAL MEDIA COLLECTION
// =======================================
// This function sets up a single collection (either movies or TV shows)
function setupMediaCollection(collectionName, listId) {
  // Get the HTML list element where items will be displayed
  const listElement = document.getElementById(listId);

  // Figure out which "Add" button we need based on the collection
  let addButtonId;
  if (collectionName === "movies") {
    addButtonId = "add-movie";
  } else {
    addButtonId = "add-tv";
  }

  // Replace the add button to clear any previous event listeners
  // (This is a clean way to ensure we don't have duplicate listeners)
  const oldAddButton = document.getElementById(addButtonId);
  const newAddButton = oldAddButton.cloneNode(true);
  oldAddButton.replaceWith(newAddButton);

  // =======================================
  // "ADD NEW ITEM" BUTTON HANDLER
  // =======================================
  newAddButton.addEventListener("click", async () => {
    // Determine which input fields to use based on collection type
    let prefix;
    if (collectionName === "movies") {
      prefix = "movie";
    } else {
      prefix = "tv";
    }

    // Get the title from the input field and remove whitespace
    const titleInputId = prefix + "-title";
    const title = document.getElementById(titleInputId).value.trim();
    if (!title) return; // Don't add items without a title

    try {
      // Get the genre and runtime values
      const genreInputId = prefix + "-genre";
      const runtimeInputId = prefix + "-runtime";
      const genreValue = document.getElementById(genreInputId).value;
      const runtimeValue = document.getElementById(runtimeInputId).value;

      // Add the new item to the Firebase database
      await db.collection(collectionName).add({
        value: title, // The display title
        value_lowercase: title.toLowerCase(), // Used for sorting
        genre: genreValue,
        runtime: runtimeValue,
        additionalInfo: "", // Start with empty notes
      });

      // Clear the input fields after adding
      document.getElementById(titleInputId).value = "";
      document.getElementById(genreInputId).value = "";
      document.getElementById(runtimeInputId).value = "";
    } catch (error) {
      console.error(`Error adding to ${collectionName}:`, error);
    }
  });

  // =======================================
  // REAL-TIME DATABASE LISTENER
  // =======================================
  // This watches the database for changes and updates the list in real-time
  db.collection(collectionName)
    .orderBy("value_lowercase") // Sort alphabetically
    .onSnapshot((snapshot) => {
      // Clear the current list
      listElement.innerHTML = "";

      // Add each item from the database to the list
      snapshot.forEach((doc) => {
        const data = doc.data();
        const itemElement = createMediaItemElement(
          collectionName,
          doc.id,
          data
        );
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
  // isExpanded will be true if this item's ID matches the currently expanded item ID
  const isExpanded = expandedItemId === id;
  // isEditing will be true if this item's ID matches the currently editing item ID
  const isEditing = editingItemId === id;

  // Create the list item element
  const li = document.createElement("li");
  li.className = `media-item ${isExpanded ? "expanded" : ""}`;
  li.dataset.id = id;

  // =======================================
  // EDITING MODE VIEW
  // =======================================
  if (isEditing) {
    // Create container for the edit form
    const editContainer = document.createElement("div");
    editContainer.className = "edit-container";

    // Create input for title
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "edit-input";
    titleInput.value = data.value;
    titleInput.placeholder = "Title";
    editContainer.appendChild(titleInput);

    // Create input for genre
    const genreInput = document.createElement("input");
    genreInput.type = "text";
    genreInput.className = "edit-input";
    genreInput.value = data.genre || "";
    genreInput.placeholder = "Genre";
    editContainer.appendChild(genreInput);

    // Create input for runtime
    const runtimeInput = document.createElement("input");
    runtimeInput.type = "text";
    runtimeInput.className = "edit-input";
    runtimeInput.value = data.runtime || "";
    runtimeInput.placeholder = "Length";
    editContainer.appendChild(runtimeInput);

    // Create input for additional info
    const notesInput = document.createElement("input");
    notesInput.type = "text";
    notesInput.className = "edit-input";
    notesInput.value = data.additionalInfo || "";
    notesInput.placeholder = "Notes";
    editContainer.appendChild(notesInput);

    // Create container for buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "edit-actions";

    // Create save button
    const saveBtn = document.createElement("button");
    saveBtn.className = "save-btn";
    saveBtn.textContent = "Save";
    buttonContainer.appendChild(saveBtn);

    // Create delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    buttonContainer.appendChild(deleteBtn);

    // Add buttons to the form
    editContainer.appendChild(buttonContainer);

    // Add complete form to the list item
    li.appendChild(editContainer);

    // =======================================
    // SAVE BUTTON HANDLER
    // =======================================
    saveBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const inputs = li.querySelectorAll(".edit-input");
      const inputsArray = [];
      for (let i = 0; i < inputs.length; i++) {
        inputsArray.push(inputs[i]);
      }
      const title = inputsArray[0].value;
      const genre = inputsArray[1].value;
      const runtime = inputsArray[2].value;
      const additionalInfo = inputsArray[3].value;

      if (title.trim()) {
        try {
          await db.collection(collectionName).doc(id).update({
            value: title,
            value_lowercase: title.toLowerCase(),
            genre,
            runtime,
            additionalInfo,
          });
          editingItemId = null;
          expandedItemId = id;
          setupMediaListeners(); // Refresh the list
        } catch (error) {
          console.error("Error updating document:", error);
        }
      }
    });

    // =======================================
    // DELETE BUTTON HANDLER
    // =======================================
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await db.collection(collectionName).doc(id).delete();
        // List auto-updates from real-time listener
      } catch (error) {
        console.error("Error deleting document:", error);
      }
    });
  }
  // =======================================
  // NORMAL VIEW (NOT EDITING)
  // =======================================
  else {
    // Create the normal view of the item (collapsed or expanded)
    // Start by creating the container elements
    const itemContent = document.createElement("div");
    itemContent.className = "item-content";

    const itemHeader = document.createElement("div");
    itemHeader.className = "item-header";

    // Add the title
    const titleSpan = document.createElement("span");
    titleSpan.className = "item-title";
    titleSpan.textContent = data.value;
    itemHeader.appendChild(titleSpan);

    // Add edit button if expanded
    if (isExpanded) {
      const editButton = document.createElement("button");
      editButton.className = "edit-btn";
      editButton.textContent = "Edit";
      itemHeader.appendChild(editButton);
    }

    // Create the details section
    const itemDetails = document.createElement("div");
    itemDetails.className = "item-details";
    // Set visibility based on expanded state
    if (isExpanded) {
      itemDetails.style.display = "block";
    } else {
      itemDetails.style.display = "none";
    }

    // Add genre info
    const genreRow = document.createElement("div");
    genreRow.className = "detail-row";

    const genreLabel = document.createElement("span");
    genreLabel.className = "detail-label";
    genreLabel.textContent = "Genre: ";

    const genreValue = document.createElement("span");
    genreValue.className = "detail-value";
    // Use default empty string if genre is missing
    if (data.genre) {
      genreValue.textContent = data.genre;
    } else {
      genreValue.textContent = "";
    }

    genreRow.appendChild(genreLabel);
    genreRow.appendChild(genreValue);
    itemDetails.appendChild(genreRow);

    // Add runtime/length info
    const runtimeRow = document.createElement("div");
    runtimeRow.className = "detail-row";

    const runtimeLabel = document.createElement("span");
    runtimeLabel.className = "detail-label";
    runtimeLabel.textContent = "Length: ";

    const runtimeValue = document.createElement("span");
    runtimeValue.className = "detail-value";

    // Format runtime based on whether it's just numbers
    if (data.runtime) {
      if (isOnlyNumbers(data.runtime)) {
        runtimeValue.textContent = data.runtime + " mins";
      } else {
        runtimeValue.textContent = data.runtime;
      }
    } else {
      runtimeValue.textContent = "";
    }

    runtimeRow.appendChild(runtimeLabel);
    runtimeRow.appendChild(runtimeValue);
    itemDetails.appendChild(runtimeRow);

    // Add notes info
    const notesRow = document.createElement("div");
    notesRow.className = "detail-row";

    const notesLabel = document.createElement("span");
    notesLabel.className = "detail-label";
    notesLabel.textContent = "Notes: ";

    const notesValue = document.createElement("span");
    notesValue.className = "detail-value";
    // Use default empty string if notes are missing
    if (data.additionalInfo) {
      notesValue.textContent = data.additionalInfo;
    } else {
      notesValue.textContent = "";
    }

    notesRow.appendChild(notesLabel);
    notesRow.appendChild(notesValue);
    itemDetails.appendChild(notesRow);

    // Add all elements to the list item
    itemContent.appendChild(itemHeader);
    itemContent.appendChild(itemDetails);
    li.appendChild(itemContent);

    // =======================================
    // ITEM CLICK HANDLER (EXPAND/COLLAPSE)
    // =======================================
    li.addEventListener("click", (e) => {
      // Don't toggle if the edit button was clicked
      if (e.target.classList.contains("edit-btn")) return;

      // If the item is already expanded, collapse it
      if (expandedItemId === id) {
        expandedItemId = null;
        li.classList.remove("expanded");
        li.querySelector(".item-details").style.display = "none";
        // Find the edit button if it exists
        const editButtonToRemove = li.querySelector(".edit-btn");
        // Remove it if it exists
        if (editButtonToRemove !== null) {
          editButtonToRemove.remove();
        }
      }
      // Otherwise expand this item
      else {
        expandedItemId = id;
        li.classList.add("expanded");
        li.querySelector(".item-details").style.display = "block";

        // Try to find an existing edit button
        const existingEditBtn = li.querySelector(".edit-btn");

        // Add edit button if none exists yet
        if (existingEditBtn === null) {
          const editBtn = document.createElement("button");
          editBtn.className = "edit-btn";
          editBtn.textContent = "Edit";

          // Add click listener to the edit button
          editBtn.addEventListener("click", (e) => {
            // Stop the click from also expanding/collapsing the item
            e.stopPropagation();

            // Set this item to edit mode
            editingItemId = id;

            // Refresh the list to show edit form
            setupMediaListeners();
          });

          // Add the button to the header section
          const headerSection = li.querySelector(".item-header");
          headerSection.appendChild(editBtn);
        }
      }
    });
  }

  return li;
}

// =======================================
// HELPER FUNCTION FOR CHECKING IF STRING CONTAINS ONLY NUMBERS
// =======================================
// This function checks if a string contains only numbers (0-9)
function isOnlyNumbers(text) {
  // If text is empty or not a string, return false
  if (!text || typeof text !== "string") {
    return false;
  }

  // Check each character in the string
  for (let i = 0; i < text.length; i++) {
    // Get the character code
    const charCode = text.charCodeAt(i);
    // Check if character is not a number (0-9)
    // Number 0 has character code 48, number 9 has character code 57
    if (charCode < 48 || charCode > 57) {
      return false;
    }
  }

  // If we reached here, all characters are numbers
  return true;
}

// =======================================
// CLICK AWAY HANDLER (CLOSE EXPANDED/EDITING ITEMS)
// =======================================
// This closes item details when clicking elsewhere on the page
document.addEventListener("click", (e) => {
  // First, check if the click was on a media item
  const clickedMediaItem = e.target.closest(".media-item");

  // Second, check if the click was on an edit input field
  const clickedEditInput = e.target.classList.contains("edit-input");

  // Third, check if the click was on an edit button (save or delete)
  // We check if the click was on or inside these buttons
  const clickedSaveButton = e.target.closest(".save-btn");
  const clickedDeleteButton = e.target.closest(".delete-btn");
  const clickedEditButton = clickedSaveButton || clickedDeleteButton;

  // Now determine if we should close all expanded items:
  // Case 1: Click was completely outside any media item - close everything
  // Case 2: Click was on an edit input but not on buttons - keep open
  const shouldCloseExpandedItems =
    !clickedMediaItem || (clickedEditInput && !clickedEditButton);

  if (shouldCloseExpandedItems) {
    // Reset expanded and editing state
    expandedItemId = null;
    editingItemId = null;
    setupMediaListeners(); // Refresh the UI
  }
});
