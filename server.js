const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./database');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/client');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static front-end assets
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/admin', adminRoutes);

// Fallback to landing page for all other page requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database then start server
const startServer = async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`Finewise AI Server is running on port ${PORT}`);
      console.log(`Access the application at: http://localhost:${PORT}`);
      console.log(`==================================================`);
    });
  } catch (err) {
    console.error('Failed to initialize database or start server:', err);
    process.exit(1);
  }
};

startServer();
