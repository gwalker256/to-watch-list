import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from './firebase';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import './App.css';

// Component for movie/show item display
const MediaItem = ({ item, expandedItem, toggleExpand, handleEdit, handleRemove, editMode, editData, handleEditChange, handleSaveEdit }) => {
  return (
    <li 
      key={item.id} 
      className={expandedItem === item.id ? 'expanded' : ''}
      onClick={() => toggleExpand(item.id)}
    >
      {editMode ? (
        <div className="edit-container" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editData.title}
            onChange={(e) => handleEditChange('title', e.target.value)}
            placeholder="Title"
          />
          <input
            type="text"
            value={editData.genre}
            onChange={(e) => handleEditChange('genre', e.target.value)}
            placeholder="Genre"
          />
          <input
            type="text"
            value={editData.runtime}
            onChange={(e) => handleEditChange('runtime', e.target.value)}
            placeholder="Length"
          />
          <button className="save-btn" onClick={handleSaveEdit}>Save</button>
        </div>
      ) : (
        <>
          <div className="item-header">
            <span className="item-title">{item.value}</span>
            <div className="button-container" onClick={(e) => e.stopPropagation()}>
              <button 
                className="edit-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(item.id, item.value, item.genre, item.runtime);
                }}
              >
                Edit
              </button>
              <button 
                className="remove-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(item.id);
                }}
              >
                ❌
              </button>
            </div>
          </div>
          {expandedItem === item.id && (
            <div className="item-details">
              <div className="detail-row">
                <span className="detail-label">Genre: </span>
                <span className="detail-value">{item.genre}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Length: </span>
                <span className="detail-value">{item.runtime} minutes</span>
              </div>
            </div>
          )}
        </>
      )}
    </li>
  );
};

// Component for adding new items
const AddItemForm = ({ inputs, setInputs, handleAdd, type }) => {
  const handleChange = (field, value) => {
    setInputs({ ...inputs, [field]: value });
  };

  return (
    <div className="input-container">
      <input
        type="text"
        value={inputs.title}
        onChange={(e) => handleChange('title', e.target.value)}
        placeholder="Title"
      />
      <input
        type="text"
        value={inputs.genre}
        onChange={(e) => handleChange('genre', e.target.value)}
        placeholder="Genre"
      />
      <input
        type="text"
        value={inputs.runtime}
        onChange={(e) => handleChange('runtime', e.target.value)}
        placeholder="Length"
      />
      <button onClick={handleAdd}>Add {type}</button>
    </div>
  );
};

function App() {
  // State for lists
  const [movieList, setMovieList] = useState([]);
  const [tvShowList, setTvShowList] = useState([]);
  
  // State for inputs
  const [movieInputs, setMovieInputs] = useState({ title: '', genre: '', runtime: '' });
  const [tvShowInputs, setTvShowInputs] = useState({ title: '', genre: '', runtime: '' });
  
  // State for authentication
  const [user, setUser] = useState(null);
  const [authInputs, setAuthInputs] = useState({ email: '', password: '' });
  
  // State for editing
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [editingTvShowId, setEditingTvShowId] = useState(null);
  const [editedMovie, setEditedMovie] = useState({ title: '', genre: '', runtime: '' });
  const [editedTvShow, setEditedTvShow] = useState({ title: '', genre: '', runtime: '' });
  
  // State for UI
  const [expandedItem, setExpandedItem] = useState(null);

  const auth = getAuth();

  // Firebase data listeners
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, setUser);

    const setupListListener = (collectionName, setterFn) => {
      const q = query(collection(db, collectionName), orderBy('value_lowercase'));
      return onSnapshot(q, (snapshot) => {
        setterFn(snapshot.docs.map((doc) => ({ 
          id: doc.id, 
          value: doc.data().value, 
          genre: doc.data().genre, 
          runtime: doc.data().runtime 
        })));
      });
    };

    const unsubscribeMovies = setupListListener('movies', setMovieList);
    const unsubscribeTvShows = setupListListener('tvShows', setTvShowList);

    return () => {
      unsubscribeMovies();
      unsubscribeTvShows();
      unsubscribeAuth();
    };
  }, [auth]);

  // Generic helper functions
  const toggleExpand = (id) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const safeStr = (value) => value || '';

  // Authentication handlers
  const handleAuthChange = (field, value) => {
    setAuthInputs({ ...authInputs, [field]: value });
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, authInputs.email, authInputs.password);
      setAuthInputs({ email: '', password: '' });
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

  // Movie handlers
  const handleAddMovie = async () => {
    try {
      const title = safeStr(movieInputs.title);
      const genre = safeStr(movieInputs.genre);
      const runtime = safeStr(movieInputs.runtime);

      await addDoc(collection(db, 'movies'), { 
        value: title,
        value_lowercase: title.toLowerCase(),
        genre,
        runtime
      });
      
      setMovieInputs({ title: '', genre: '', runtime: '' });
    } catch (error) {
      console.error("Error adding movie:", error);
    }
  };

  const handleRemoveMovie = async (id) => {
    try {
      await deleteDoc(doc(db, 'movies', id));
    } catch (error) {
      console.error("Error removing movie:", error);
    }
  };

  const handleEditMovie = (id, currentValue, currentGenre, currentRuntime) => {
    setEditingMovieId(id);
    setEditedMovie({
      title: safeStr(currentValue),
      genre: safeStr(currentGenre),
      runtime: safeStr(currentRuntime)
    });
    setExpandedItem(id);
  };

  const handleEditMovieChange = (field, value) => {
    setEditedMovie({ ...editedMovie, [field]: value });
  };

  const handleSaveMovieEdit = async () => {
    try {
      const title = safeStr(editedMovie.title);
      const genre = safeStr(editedMovie.genre);
      const runtime = safeStr(editedMovie.runtime);

      await updateDoc(doc(db, 'movies', editingMovieId), { 
        value: title,
        value_lowercase: title.toLowerCase(),
        genre,
        runtime
      });
      
      setEditingMovieId(null);
      setEditedMovie({ title: '', genre: '', runtime: '' });
      setExpandedItem(null);
    } catch (error) {
      console.error("Error updating movie:", error);
    }
  };

  // TV Show handlers
  const handleAddTvShow = async () => {
    try {
      const title = safeStr(tvShowInputs.title);
      const genre = safeStr(tvShowInputs.genre);
      const runtime = safeStr(tvShowInputs.runtime);

      await addDoc(collection(db, 'tvShows'), { 
        value: title,
        value_lowercase: title.toLowerCase(),
        genre,
        runtime
      });
      
      setTvShowInputs({ title: '', genre: '', runtime: '' });
    } catch (error) {
      console.error("Error adding TV show:", error);
    }
  };

  const handleRemoveTvShow = async (id) => {
    try {
      await deleteDoc(doc(db, 'tvShows', id));
    } catch (error) {
      console.error("Error removing TV show:", error);
    }
  };

  const handleEditTvShow = (id, currentValue, currentGenre, currentRuntime) => {
    setEditingTvShowId(id);
    setEditedTvShow({
      title: safeStr(currentValue),
      genre: safeStr(currentGenre),
      runtime: safeStr(currentRuntime)
    });
    setExpandedItem(id);
  };

  const handleEditTvShowChange = (field, value) => {
    setEditedTvShow({ ...editedTvShow, [field]: value });
  };

  const handleSaveTvShowEdit = async () => {
    try {
      const title = safeStr(editedTvShow.title);
      const genre = safeStr(editedTvShow.genre);
      const runtime = safeStr(editedTvShow.runtime);

      await updateDoc(doc(db, 'tvShows', editingTvShowId), { 
        value: title,
        value_lowercase: title.toLowerCase(),
        genre,
        runtime
      });
      
      setEditingTvShowId(null);
      setEditedTvShow({ title: '', genre: '', runtime: '' });
      setExpandedItem(null);
    } catch (error) {
      console.error("Error updating TV show:", error);
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
              <AddItemForm 
                inputs={movieInputs}
                setInputs={setMovieInputs}
                handleAdd={handleAddMovie}
                type="Movie"
              />
              <ul>
                {movieList.map((item) => (
                  <MediaItem
                    key={item.id}
                    item={item}
                    expandedItem={expandedItem}
                    toggleExpand={toggleExpand}
                    handleEdit={handleEditMovie}
                    handleRemove={handleRemoveMovie}
                    editMode={editingMovieId === item.id}
                    editData={{ 
                      title: editedMovie.title, 
                      genre: editedMovie.genre, 
                      runtime: editedMovie.runtime 
                    }}
                    handleEditChange={handleEditMovieChange}
                    handleSaveEdit={handleSaveMovieEdit}
                  />
                ))}
              </ul>
            </div>

            {/* TV Show List Section */}
            <div className="list-section">
              <h2>TV Shows</h2>
              <AddItemForm 
                inputs={tvShowInputs}
                setInputs={setTvShowInputs}
                handleAdd={handleAddTvShow}
                type="TV Show"
              />
              <ul>
                {tvShowList.map((item) => (
                  <MediaItem
                    key={item.id}
                    item={item}
                    expandedItem={expandedItem}
                    toggleExpand={toggleExpand}
                    handleEdit={handleEditTvShow}
                    handleRemove={handleRemoveTvShow}
                    editMode={editingTvShowId === item.id}
                    editData={{ 
                      title: editedTvShow.title, 
                      genre: editedTvShow.genre, 
                      runtime: editedTvShow.runtime 
                    }}
                    handleEditChange={handleEditTvShowChange}
                    handleSaveEdit={handleSaveTvShowEdit}
                  />
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
              value={authInputs.email}
              onChange={(e) => handleAuthChange('email', e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={authInputs.password}
              onChange={(e) => handleAuthChange('password', e.target.value)}
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