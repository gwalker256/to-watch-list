import React, { useState, useEffect, memo, useCallback } from 'react';
import { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from './firebase';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import './App.css';

const safeStr = (value) => value || '';

const MediaItem = memo(({ 
  item, 
  expandedItem, 
  toggleExpand, 
  handleEdit, 
  handleRemove, 
  editMode, 
  editData, 
  handleEditChange, 
  handleSaveEdit 
}) => {
  const handleItemClick = (e) => {
    // Only toggle if not clicking a button or input
    if (!e.target.closest('button') && !e.target.closest('input')) {
      toggleExpand(item.id);
    }
  };

  return (
    <li 
      className={`media-item ${expandedItem === item.id ? 'expanded' : ''}`}
      onClick={handleItemClick}
    >
      {editMode ? (
        <div className="edit-container">
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
          <div className="edit-actions">
            <button className="save-btn" onClick={handleSaveEdit}>Save</button>
            <button 
              className="delete-btn" 
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(item.id);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="item-content">
            <div className="item-header">
              <span className="item-title">{item.value}</span>
              <div className="button-container">
                <button 
                  className="edit-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(item.id, item.value, item.genre, item.runtime, item.additionalInfo);
                  }}
                >
                  Edit
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
                  <span className="detail-value">
                    {/^\d+$/.test(item.runtime) ? `${item.runtime} mins` : item.runtime}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Notes: </span>
                  <span className="detail-value">{item.additionalInfo || ''}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </li>
  );
});

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

const MediaList = ({ 
  title, 
  items, 
  expandedItem, 
  toggleExpand, 
  inputs, 
  setInputs, 
  handleAdd, 
  handleRemove, 
  editingId, 
  editData, 
  handleEdit, 
  handleEditChange, 
  handleSaveEdit 
}) => (
  <div className="list-section">
    <h2>{title}</h2>
    <AddItemForm 
      inputs={inputs}
      setInputs={setInputs}
      handleAdd={handleAdd}
      type={title === "Movies" ? "Movie" : "TV Show"}
    />
    <ul>
      {items.map((item) => (
        <MediaItem
          key={item.id}
          item={item}
          expandedItem={expandedItem}
          toggleExpand={toggleExpand}
          handleEdit={handleEdit}
          handleRemove={handleRemove}
          editMode={editingId === item.id}
          editData={editData}
          handleEditChange={handleEditChange}
          handleSaveEdit={handleSaveEdit}
        />
      ))}
    </ul>
  </div>
);

const AuthForm = ({ authInputs, handleAuthChange, handleSignIn }) => (
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
);

const useMediaData = (collectionName) => {
  const [items, setItems] = useState([]);
  const [inputs, setInputs] = useState({ title: '', genre: '', runtime: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ title: '', genre: '', runtime: '', additionalInfo: '' });

  const handleAdd = useCallback(async () => {
    if (!inputs.title.trim()) return;
    try {
      const { title, genre, runtime } = inputs;
      await addDoc(collection(db, collectionName), {
        value: title,
        value_lowercase: title.toLowerCase(),
        genre,
        runtime,
        additionalInfo: ''
      });
      setInputs({ title: '', genre: '', runtime: '' });
    } catch (error) {
      console.error(`Error adding to ${collectionName}:`, error);
    }
  }, [collectionName, inputs]);

  const handleRemove = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      console.error(`Error removing from ${collectionName}:`, error);
    }
  }, [collectionName]);

  const handleEdit = useCallback((id, currentValue, currentGenre, currentRuntime, currentAdditionalInfo) => {
    setEditingId(id);
    setEditData({
      title: safeStr(currentValue),
      genre: safeStr(currentGenre),
      runtime: safeStr(currentRuntime),
      additionalInfo: safeStr(currentAdditionalInfo)
    });
  }, []);

  const handleEditChange = useCallback((field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editData.title.trim()) return;
    try {
      const { title, genre, runtime, additionalInfo } = editData;
      await updateDoc(doc(db, collectionName, editingId), {
        value: title,
        value_lowercase: title.toLowerCase(),
        genre,
        runtime,
        additionalInfo
      });
      setEditingId(null);
      setEditData({ title: '', genre: '', runtime: '', additionalInfo: '' });
    } catch (error) {
      console.error(`Error updating in ${collectionName}:`, error);
    }
  }, [collectionName, editData, editingId]);

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy('value_lowercase'));
    return onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [collectionName]);

  return {
    items,
    inputs,
    setInputs,
    editingId,
    setEditingId,
    editData,
    handleAdd,
    handleRemove,
    handleEdit,
    handleEditChange,
    handleSaveEdit
  };
};

function App() {
  const [expandedItem, setExpandedItem] = useState(null);
  const [user, setUser] = useState(null);
  const [authInputs, setAuthInputs] = useState({ email: '', password: '' });
  const auth = getAuth();

  const toggleExpand = useCallback((id) => {
    setExpandedItem(prevId => prevId === id ? null : id);
  }, []);

  const movies = useMediaData('movies');
  const tvShows = useMediaData('tvShows');

  // Fixed click-away logic
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.media-item')) {
        setExpandedItem(null);
        movies.setEditingId(null);
        tvShows.setEditingId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [movies, tvShows]);

  const handleAuthChange = useCallback((field, value) => {
    setAuthInputs(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSignIn = useCallback(async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, authInputs.email, authInputs.password);
      setAuthInputs({ email: '', password: '' });
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  }, [auth, authInputs]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, [auth]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, [auth]);

  return (
<div className="App">
  <h1>To Watch List</h1>
  {user ? (
    <>
      <div className="welcome-container">
        <p>Welcome, {user.email}!</p>
      </div>
      <div className="lists-container">
        <MediaList
          title="Movies"
          items={movies.items}
          expandedItem={expandedItem}
          toggleExpand={toggleExpand}
          inputs={movies.inputs}
          setInputs={movies.setInputs}
          handleAdd={movies.handleAdd}
          handleRemove={movies.handleRemove}
          editingId={movies.editingId}
          editData={movies.editData}
          handleEdit={movies.handleEdit}
          handleEditChange={movies.handleEditChange}
          handleSaveEdit={movies.handleSaveEdit}
        />
        <MediaList
          title="TV Shows"
          items={tvShows.items}
          expandedItem={expandedItem}
          toggleExpand={toggleExpand}
          inputs={tvShows.inputs}
          setInputs={tvShows.setInputs}
          handleAdd={tvShows.handleAdd}
          handleRemove={tvShows.handleRemove}
          editingId={tvShows.editingId}
          editData={tvShows.editData}
          handleEdit={tvShows.handleEdit}
          handleEditChange={tvShows.handleEditChange}
          handleSaveEdit={tvShows.handleSaveEdit}
        />
      </div>
      <div className="sign-out-container">
        <button className="sign-out" onClick={handleSignOut}>Sign Out</button>
      </div>
    </>
  ) : (
    <AuthForm
      authInputs={authInputs}
      handleAuthChange={handleAuthChange}
      handleSignIn={handleSignIn}
    />
  )}
</div>

  );
}

export default App;