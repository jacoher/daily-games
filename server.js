const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create the participants table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      avatarUrl TEXT
    )`, (err) => {
      if (err) {
        console.error('Error creating table', err.message);
      }
    });
  }
});

// GET all participants
app.get('/api/participants', (req, res) => {
  const sql = 'SELECT * FROM participants';
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// POST a new participant
app.post('/api/participants', (req, res) => {
  const { name, avatarUrl } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  
  const sql = 'INSERT INTO participants (name, avatarUrl) VALUES (?, ?)';
  const params = [name, avatarUrl];
  
  db.run(sql, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
         return res.status(400).json({ error: 'Participant already exists' });
      }
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data: {
        id: this.lastID,
        name,
        avatarUrl
      }
    });
  });
});

// DELETE a participant by name
app.delete('/api/participants/:name', (req, res) => {
  const { name } = req.params;
  const sql = 'DELETE FROM participants WHERE name = ?';
  
  db.run(sql, name, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'deleted', changes: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
