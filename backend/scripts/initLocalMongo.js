const mongoose = require('mongoose');

// Connect to local MongoDB
const MONGODB_URI = 'mongodb://localhost:27017/edu-resource';

console.log('Attempting to connect to MongoDB at:', MONGODB_URI);

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB successfully!');
  seedData();
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Define a simple User schema if not importing (or import it if available)
// Ideally we import the existing model, but for a standalone test script within the codebase, 
// we should try to use the existing model structure to be consistent.
// However, `require('../models/User')` depends on the file structure.
// Based on file list, `backend/scripts/initLocalMongo.js` is correct relative path to `backend/models/User`.

const User = require('../models/User');

const seedData = async () => {
  try {
    const instructorEmail = 'local_instructor@example.com';
    
    // Check if user exists
    let user = await User.findOne({ email: instructorEmail });

    if (user) {
      console.log('Test user already exists.');
    } else {
      console.log('Creating new test instructor user...');
      user = new User({
        firstName: 'Local',
        lastName: 'Instructor',
        email: instructorEmail,
        password: 'password123', // In a real app, this should be hashed, but User model might handle it in pre-save
        role: 'instructor',
        isApproved: true,
        isActive: true,
        instructorProfile: {
          qualification: 'PhD in Testing',
          experience: 5,
          specialization: ['Database'],
          bio: 'I test databases.'
        }
      });
      await user.save();
      console.log('Test instructor user created successfully!');
    }
    
    // List all users to verify
    const users = await User.find({}, 'email firstName rule');
    console.log('Current users in DB:', users.length);
    users.forEach(u => console.log(` - ${u.firstName} (${u.email})`));

    console.log('Seeding complete. Exiting...');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};
