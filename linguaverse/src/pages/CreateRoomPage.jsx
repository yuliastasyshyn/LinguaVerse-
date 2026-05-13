// CreateRoomPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateRoomPage.css'; // створимо окремий CSS або додамо стилі нижче

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [formData, setFormData] = useState({
    name: '',
    level: 'B1',
    topic: 'General',
    language: 'English',
    maxParticipants: 10,
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:4000/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        // Успішно створено – переходимо на сторінку кімнат
        navigate('/rooms');
      } else {
        setError(data.message || 'Failed to create room');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-room-page">
      <div className="create-room-card">
        <h1 className="create-room-title">Create a New Room</h1>
        <p className="create-room-subtitle">Set up your conversation space</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="create-room-form">
          <div className="form-group">
            <label>Room Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., English Breakfast Club"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Level</label>
              <select name="level" value={formData.level} onChange={handleChange}>
                <option>A1</option>
                <option>A2</option>
                <option>B1</option>
                <option>B2</option>
                <option>C1</option>
              </select>
            </div>

            <div className="form-group">
              <label>Topic</label>
              <select name="topic" value={formData.topic} onChange={handleChange}>
                <option>General</option>
                <option>Daily Life</option>
                <option>Movies</option>
                <option>Technology</option>
                <option>Travel</option>
                <option>Business</option>
                <option>Food</option>
                <option>Sports</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Language</label>
              <select name="language" value={formData.language} onChange={handleChange}>
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>Italian</option>
                <option>German</option>
                <option>Portuguese</option>
              </select>
            </div>

            <div className="form-group">
              <label>Max Participants</label>
              <input
                type="number"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                min="2"
                max="50"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description (optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="What's this room about?"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => navigate('/rooms')}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}