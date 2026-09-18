const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models');

// Configure MongoDB Atlas / Local MongoDB URI
const getMongoUri = () => {
  return process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finewise';
};

let isConnected = false;

// Connect to MongoDB
const connectDb = async () => {
  if (isConnected) return mongoose.connection;

  const mongoUri = getMongoUri();
  const isAtlas = mongoUri.includes('mongodb+srv') || mongoUri.includes('mongodb.net');

  try {
    console.log(`[MongoDB] Connecting to ${isAtlas ? 'MongoDB Atlas Cluster' : 'MongoDB Instance'}...`);
    
    await mongoose.connect(mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`[MongoDB] Successfully connected to: ${isAtlas ? 'MongoDB Atlas' : mongoUri}`);

    return mongoose.connection;
  } catch (err) {
    console.error('\n======================================================');
    console.error('❌ MongoDB Connection Error:', err.message);
    console.error('======================================================');
    if (isAtlas) {
      console.error('👉 Please verify your MongoDB Atlas connection settings in .env:');
      console.error('   1. Check your database username & password');
      console.error('   2. Verify Network Access / IP Whitelist in MongoDB Atlas (e.g. 0.0.0.0/0 for everywhere)');
      console.error('   3. Ensure connection string format: mongodb+srv://<user>:<password>@cluster.mongodb.net/finewise?retryWrites=true&w=majority');
    } else {
      console.error('👉 If connecting to MongoDB Atlas, add your connection string to .env:');
      console.error('   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/finewise?retryWrites=true&w=majority');
    }
    console.error('======================================================\n');
    throw err;
  }
};

// Listen to connection events
mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[MongoDB] Connection lost. Attempting auto-reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error event:', err.message);
});

// Initialize database & seed defaults
const initDb = async () => {
  await connectDb();

  // Seed default Superior account if none exists
  try {
    const existingSuperior = await User.findOne({ role: 'superior' });
    if (!existingSuperior) {
      const hashedPassword = await bcrypt.hash('SuperiorPassword123', 10);
      await User.create({
        username: 'superior',
        password: hashedPassword,
        role: 'superior'
      });
      console.log('✅ Seeded default Superior Administrator account (Username: superior | Password: SuperiorPassword123)');
    }
  } catch (seedErr) {
    console.error('[MongoDB] Superior account seed check error:', seedErr.message);
  }

  console.log('✅ MongoDB models and indexes ready.');
  return mongoose.connection;
};

module.exports = {
  mongoose,
  connectDb,
  initDb
};
