const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

const path = require('path');

// Load environment variables
dotenv.config();

// Fallback: Check root directory if not found
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

// Import models
const User = require('../models/User');

// Normalize URI variable
const dbUri = (process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();

// Main execution function
const run = async () => {
  try {
    console.log('Attempting to connect to MongoDB for seeding...');

    // Connect to MongoDB
    if (!dbUri) {
      console.error('Error: No MongoDB connection string found (MONGO_URI or MONGODB_URI is undefined)');
      process.exit(1);
    }

    await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB. Starting seeding process...');
    await createInstructorUser();

    // Close connection and exit
    await mongoose.connection.close();
    console.log('Database connection closed. Seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding process failed:', error);
    process.exit(1);
  }
};

const createInstructorUser = async () => {
  // Check if instructor user already exists
  const instructorEmail = process.env.ADMIN_EMAIL;
  const instructorPassword = process.env.ADMIN_PASSWORD;

  let user = await User.findOne({ email: instructorEmail });

  if (user) {
    console.log('Instructor user already exists. Updating...');
    user.firstName = 'Teacher';
    user.role = 'instructor';
    user.password = instructorPassword; // Will be hashed by pre-save middleware
    user.isApproved = true;
    user.isActive = true;

    // Ensure instructor profile exists
    if (!user.instructorProfile) {
      user.instructorProfile = {
        qualification: 'Master of Education',
        experience: 10,
        specialization: ['Web Development', 'Physics'],
        bio: 'Lead Instructor'
      };
    }
  } else {
    console.log('Creating new instructor user...');
    user = new User({
      firstName: 'Teacher',
      lastName: 'User',
      email: instructorEmail,
      password: instructorPassword,
      role: 'instructor',
      isApproved: true,
      isActive: true,
      instructorProfile: {
        qualification: 'Master of Education',
        experience: 10,
        specialization: ['Web Development', 'Physics'],
        bio: 'Lead Instructor'
      }
    });
  }

  await user.save();

  console.log('Instructor user seeded successfully!');
  console.log(`Email: ${instructorEmail}`);
  console.log(`Password: ${instructorPassword}`);
  console.log('You can now log in as the instructor.');
};

run();
