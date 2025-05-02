// ...imports remain unchanged
import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from './firebase';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import './App.css';

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
          <input
            type="text"
            value={editData.additionalInfo}
            onChange={(e) => handleEditChange('additionalInfo', e.target.value)}
            placeholder="Notes"
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
                  handleEdit(item.id, item.value, item.genre, item.runtime, item.additionalInfo);
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
              <div className="detail-row">
                <span className="detail-label">Notes: </span>
                <span className="detail-value">{item.additionalInfo || ''}</span>
              </div>
            </div>
          )}
        </>
      )}
    </li>
  );
};


// AddItemForm remains unchanged (no additionalInfo field)
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
  const [movieList, setMovieList] = useState([]);
  const [tvShowList, setTvShowList] = useState([]);

  const [movieInputs, setMovieInputs] = useState({ title: '', genre: '', runtime: '' });
  const [tvShowInputs, setTvShowInputs] = useState({ title: '', genre: '', runtime: '' });

  const [user, setUser] = useState(null);
  const [authInputs, setAuthInputs] = useState({ email: '', password: '' });

  const [editingMovieId, setEditingMovieId] = useState(null);
  const [editingTvShowId, setEditingTvShowId] = useState(null);
  const [editedMovie, setEditedMovie] = useState({ title: '', genre: '', runtime: '', additionalInfo: '' });
  const [editedTvShow, setEditedTvShow] = useState({ title: '', genre: '', runtime: '', additionalInfo: '' });

  const [expandedItem, setExpandedItem] = useState(null);

  const auth = getAuth();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, setUser);

    const setupListListener = (collectionName, setterFn) => {
      const q = query(collection(db, collectionName), orderBy('value_lowercase'));
      return onSnapshot(q, (snapshot) => {
        setterFn(snapshot.docs.map((doc) => ({ 
          id: doc.id, 
          value: doc.data().value, 
          genre: doc.data().genre, 
          runtime: doc.data().runtime,
          additionalInfo: doc.data().additionalInfo || ''
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

  const toggleExpand = (id) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const safeStr = (value) => value || '';

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

  const handleAddMovie = async () => {
    try {
      const { title, genre, runtime } = movieInputs;
      await addDoc(collection(db, 'movies'), {
        value: title,
        value_lowercase: title.toLowerCase(),
        genre,
        runtime,
        additionalInfo: ''
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

  const handleEditMovie = (id, currentValue, currentGenre, currentRuntime, currentAdditionalInfo) => {
    setEditingMovieId(id);
    setEditedMovie({
      title: safeStr(currentValue),
      genre: safeStr(currentGenre),
      runtime: safeStr(currentRuntime),
      additionalInfo: safeStr(currentAdditionalInfo)
    });
    setExpandedItem(id);
  };

  const handleEditMovieChange = (field, value) => {
    setEditedMovie({ ...editedMovie, [field]: value });
  };

  const handleSaveMovieEdit = async () => {
    try {
      const { title, genre, runtime, additionalInfo } = editedMovie;
      await updateDoc(doc(db, 'movies', editingMovieId), {
        value: title,
        value_lowercase: title.toLowerCase(),
        genre,
        runtime,
        additionalInfo
      });
      setEditingMovieId(null);
      setEditedMovie({ title: '', genre: '', runtime: '', additionalInfo: '' });
      setExpandedItem(null);
    } catch (error) {
      console.error("Error updating movie:", error);
    }
  };

  const handleAddTvShow = async () => {
    try {
      const { title, genre, runtime } = tvShowInputs;
      await addDoc(collection(db, 'tvShows'), {
        value: title,
        value_lowercase: title.toLowerCase(),
        genre,
        runtime,
        additionalInfo: ''
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

  const handleEditTvShow = (id, currentValue, currentGenre, currentRuntime, currentAdditionalInfo) => {
    setEditingTvShowId(id);
    setEditedTvShow({
      title: safeStr(currentValue),
      genre: safeStr(currentGenre),
      runtime: safeStr(currentRuntime),
      additionalInfo: safeStr(currentAdditionalInfo)
    });
    setExpandedItem(id);
  };

  const handleEditTvShowChange = (field, value) => {
    setEditedTvShow({ ...editedTvShow, [field]: value });
  };

  const handleSaveTvShowEdit = async () => {
    try {
      const { title, genre, runtime, additionalInfo } = editedTvShow;
      await updateDoc(doc(db, 'tvShows', editingTvShowId), {
        value: title,
        value_lowercase: title.toLowerCase(),
        genre,
        runtime,
        additionalInfo
      });
      setEditingTvShowId(null);
      setEditedTvShow({ title: '', genre: '', runtime: '', additionalInfo: '' });
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
                    editData={editedMovie}
                    handleEditChange={handleEditMovieChange}
                    handleSaveEdit={handleSaveMovieEdit}
                  />
                ))}
              </ul>
            </div>

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
                    editData={editedTvShow}
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
