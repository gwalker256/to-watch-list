import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from './firebase';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import './App.css';

function App() {
  const [movieList, setMovieList] = useState([]);
  const [tvShowList, setTvShowList] = useState([]);
  const [movieInput, setMovieInput] = useState('');
  const [tvShowInput, setTvShowInput] = useState('');
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [editingTvShowId, setEditingTvShowId] = useState(null);
  const [editedMovieValue, setEditedMovieValue] = useState('');
  const [editedTvShowValue, setEditedTvShowValue] = useState('');

  const auth = getAuth();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const qMovies = query(collection(db, 'movies'), orderBy('value_lowercase'));
    const unsubscribeMovies = onSnapshot(qMovies, (snapshot) => {
      setMovieList(snapshot.docs.map((doc) => ({ id: doc.id, value: doc.data().value })));
    });

    const qTvShows = query(collection(db, 'tvShows'), orderBy('value_lowercase'));
    const unsubscribeTvShows = onSnapshot(qTvShows, (snapshot) => {
      setTvShowList(snapshot.docs.map((doc) => ({ id: doc.id, value: doc.data().value })));
    });

    return () => {
      unsubscribeMovies();
      unsubscribeTvShows();
      unsubscribeAuth();
    };
  }, [auth]);

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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error.message);
    }
  };

  const handleAddMovie = async () => {
    if (movieInput.trim() !== '') {
      await addDoc(collection(db, 'movies'), { 
        value: movieInput.trim(),
        value_lowercase: movieInput.trim().toLowerCase()
      });
      setMovieInput('');
    }
  };

  const handleAddTvShow = async () => {
    if (tvShowInput.trim() !== '') {
      await addDoc(collection(db, 'tvShows'), { 
        value: tvShowInput.trim(),
        value_lowercase: tvShowInput.trim().toLowerCase()
      });
      setTvShowInput('');
    }
  };

  const handleRemoveMovie = async (id) => {
    await deleteDoc(doc(db, 'movies', id));
  };

  const handleRemoveTvShow = async (id) => {
    await deleteDoc(doc(db, 'tvShows', id));
  };

  const handleEditMovie = (id, currentValue) => {
    setEditingMovieId(id);
    setEditedMovieValue(currentValue);
  };

  const handleSaveMovieEdit = async () => {
    if (editedMovieValue.trim() !== '') {
      await updateDoc(doc(db, 'movies', editingMovieId), { 
        value: editedMovieValue.trim(),
        value_lowercase: editedMovieValue.trim().toLowerCase()
      });
      setEditingMovieId(null);
      setEditedMovieValue('');
    }
  };

  const handleEditTvShow = (id, currentValue) => {
    setEditingTvShowId(id);
    setEditedTvShowValue(currentValue);
  };

  const handleSaveTvShowEdit = async () => {
    if (editedTvShowValue.trim() !== '') {
      await updateDoc(doc(db, 'tvShows', editingTvShowId), { 
        value: editedTvShowValue.trim(),
        value_lowercase: editedTvShowValue.trim().toLowerCase()
      });
      setEditingTvShowId(null);
      setEditedTvShowValue('');
    }
  };

  return (
    <div className="App">
      <h1>To Watch List</h1>

      {user ? (
        <div>
          <div className="welcome-container">
            <p>Welcome, {user.email}!</p>
            <button className="sign-out" onClick={handleSignOut}>Sign Out</button>
          </div>

          <div className="lists-container">
            {/* Movie List Section */}
            <div className="list-section">
              <h2>Movies</h2>
              <div className="input-container">
                <input
                  type="text"
                  value={movieInput}
                  onChange={(e) => setMovieInput(e.target.value)}
                  placeholder="Add a movie"
                />
                <button onClick={handleAddMovie}>Add Movie</button>
              </div>
              <ul>
                {movieList.map((item) => (
                  <li key={item.id}>
                    {editingMovieId === item.id ? (
                      <>
                        <input
                          type="text"
                          value={editedMovieValue}
                          onChange={(e) => setEditedMovieValue(e.target.value)}
                        />
                        <div className="button-container">
                          <button className="save-btn" onClick={handleSaveMovieEdit}>Save</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="content-wrapper">{item.value}</div>
                        <div className="button-container">
                          <button className="edit-btn" onClick={() => handleEditMovie(item.id, item.value)}>Edit</button>
                          <button className="remove-btn" onClick={() => handleRemoveMovie(item.id)}>❌</button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* TV Show List Section */}
            <div className="list-section">
              <h2>TV Shows</h2>
              <div className="input-container">
                <input
                  type="text"
                  value={tvShowInput}
                  onChange={(e) => setTvShowInput(e.target.value)}
                  placeholder="Add a TV show"
                />
                <button onClick={handleAddTvShow}>Add TV Show</button>
              </div>
              <ul>
                {tvShowList.map((item) => (
                  <li key={item.id}>
                    {editingTvShowId === item.id ? (
                      <>
                        <input
                          type="text"
                          value={editedTvShowValue}
                          onChange={(e) => setEditedTvShowValue(e.target.value)}
                        />
                        <div className="button-container">
                          <button className="save-btn" onClick={handleSaveTvShowEdit}>Save</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="content-wrapper">{item.value}</div>
                        <div className="button-container">
                          <button className="edit-btn" onClick={() => handleEditTvShow(item.id, item.value)}>Edit</button>
                          <button className="remove-btn" onClick={() => handleRemoveTvShow(item.id)}>❌</button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="auth-container">
          <h2>Sign In</h2>
          <form onSubmit={handleSignIn}>
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
            <button type="submit">Sign In</button>
          </form>
        </div>
      )}
    </div>
  );
}



export default App;