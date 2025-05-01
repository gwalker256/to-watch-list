import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from './firebase'; // Import Firebase functions
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'; // Firebase Auth functions
import './App.css'; // Import your CSS


function App() {
  const [movieList, setMovieList] = useState([]);
  const [tvShowList, setTvShowList] = useState([]);
  const [movieInput, setMovieInput] = useState('');
  const [tvShowInput, setTvShowInput] = useState('');
  const [user, setUser] = useState(null); // Store the logged-in user
  const [email, setEmail] = useState(''); // Store email
  const [password, setPassword] = useState(''); // Store password
  const [isSignUp, setIsSignUp] = useState(false); // Track if user is signing up or logging in
  const [editingMovieId, setEditingMovieId] = useState(null); // Track which movie is being edited
  const [editingTvShowId, setEditingTvShowId] = useState(null); // Track which TV show is being edited
  const [editedMovieValue, setEditedMovieValue] = useState(''); // Store edited movie value
  const [editedTvShowValue, setEditedTvShowValue] = useState(''); // Store edited TV show value

  const auth = getAuth(); // Firebase authentication

  // Fetch data from Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const qMovies = query(collection(db, 'movies'), orderBy('value'));
    const unsubscribeMovies = onSnapshot(qMovies, (snapshot) => {
      setMovieList(snapshot.docs.map((doc) => ({ id: doc.id, value: doc.data().value })));
    });

    const qTvShows = query(collection(db, 'tvShows'), orderBy('value'));
    const unsubscribeTvShows = onSnapshot(qTvShows, (snapshot) => {
      setTvShowList(snapshot.docs.map((doc) => ({ id: doc.id, value: doc.data().value })));
    });

    return () => {
      unsubscribeMovies();
      unsubscribeTvShows();
      unsubscribeAuth();
    };
  }, [auth]);

  // Sign up handler
  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error("Error signing up:", error.message);
    }
  };

  // Sign in handler
  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error("Error signing in:", error.message);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error.message);
    }
  };

  // Add new movie
  const handleAddMovie = async () => {
    if (movieInput.trim() !== '') {
      await addDoc(collection(db, 'movies'), { value: movieInput.trim() });
      setMovieInput('');
    }
  };

  // Add new TV show
  const handleAddTvShow = async () => {
    if (tvShowInput.trim() !== '') {
      await addDoc(collection(db, 'tvShows'), { value: tvShowInput.trim() });
      setTvShowInput('');
    }
  };

  // Remove movie
  const handleRemoveMovie = async (id) => {
    await deleteDoc(doc(db, 'movies', id));
  };

  // Remove TV show
  const handleRemoveTvShow = async (id) => {
    await deleteDoc(doc(db, 'tvShows', id));
  };

  // Edit movie
  const handleEditMovie = (id, currentValue) => {
    setEditingMovieId(id);
    setEditedMovieValue(currentValue);
  };

  // Save edited movie
  const handleSaveMovieEdit = async () => {
    if (editedMovieValue.trim() !== '') {
      await updateDoc(doc(db, 'movies', editingMovieId), { value: editedMovieValue.trim() });
      setEditingMovieId(null); // Reset editing state
      setEditedMovieValue(''); // Clear input
    }
  };

  // Edit TV show
  const handleEditTvShow = (id, currentValue) => {
    setEditingTvShowId(id);
    setEditedTvShowValue(currentValue);
  };

  // Save edited TV show
  const handleSaveTvShowEdit = async () => {
    if (editedTvShowValue.trim() !== '') {
      await updateDoc(doc(db, 'tvShows', editingTvShowId), { value: editedTvShowValue.trim() });
      setEditingTvShowId(null); // Reset editing state
      setEditedTvShowValue(''); // Clear input
    }
  };

  return (
    <div className="App">
      <h1>To-Watch List</h1>

      {user ? (
        <div>
          <p>Welcome, {user.email}!</p>
          <button onClick={handleSignOut}>Sign Out</button>

          <div className="lists-container">
            {/* Movie List Section */}
            <div className="list-section">
              <h2>Movies</h2>
              <input
                type="text"
                value={movieInput}
                onChange={(e) => setMovieInput(e.target.value)}
                placeholder="Add a movie"
              />
              <button onClick={handleAddMovie}>Add Movie</button>
              <ul>
                {movieList.map((item) => (
                  <li key={item.id}>
                    {editingMovieId === item.id ? (
                      <input
                        type="text"
                        value={editedMovieValue}
                        onChange={(e) => setEditedMovieValue(e.target.value)}
                      />
                    ) : (
                      item.value
                    )}
                    <button className="remove-btn" onClick={() => handleRemoveMovie(item.id)}>❌</button>
                    {editingMovieId === item.id ? (
                      <button onClick={handleSaveMovieEdit}>Save</button>
                    ) : (
                      <button onClick={() => handleEditMovie(item.id, item.value)}>Edit</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* TV Show List Section */}
            <div className="list-section">
              <h2>TV Shows</h2>
              <input
                type="text"
                value={tvShowInput}
                onChange={(e) => setTvShowInput(e.target.value)}
                placeholder="Add a TV show"
              />
              <button onClick={handleAddTvShow}>Add TV Show</button>
              <ul>
                {tvShowList.map((item) => (
                  <li key={item.id}>
                    {editingTvShowId === item.id ? (
                      <input
                        type="text"
                        value={editedTvShowValue}
                        onChange={(e) => setEditedTvShowValue(e.target.value)}
                      />
                    ) : (
                      item.value
                    )}
                    <button className="remove-btn" onClick={() => handleRemoveTvShow(item.id)}>❌</button>
                    {editingTvShowId === item.id ? (
                      <button onClick={handleSaveTvShowEdit}>Save</button>
                    ) : (
                      <button onClick={() => handleEditTvShow(item.id, item.value)}>Edit</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h2>{isSignUp ? "Sign Up" : "Sign In"}</h2>
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">{isSignUp ? "Sign Up" : "Sign In"}</button>
          </form>

          <button onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
