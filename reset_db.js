/**
 * Database Reset Script for Edu-Resource LMS
 * This script connects to MongoDB and resets (drops) all collections in the database.
 * Use with caution - all data will be permanently deleted!
 * 
 * Usage: node reset_db.js
 * Force mode: node reset_db.js --force
 */

const path = require('path');
const readline = require('readline');

// Use mongoose from backend's node_modules
const mongoose = require('./backend/node_modules/mongoose');

// Load environment variables from .env file
require('./backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/edu-resource';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function confirmReset() {
  console.log('\n' + '='.repeat(60));
  console.log('⚠️  WARNING: DATABASE RESET ⚠️');
  console.log('='.repeat(60));
  console.log(`\nThis will DELETE ALL DATA from: ${MONGODB_URI}`);
  console.log('\nAll collections in the database will be dropped.');
  console.log('\n' + '='.repeat(60));

  const response = await askQuestion("\nAre you sure you want to proceed? Type 'YES' to confirm: ");
  return response.trim() === 'YES';
}

async function resetDatabase() {
  try {
    // Connect to MongoDB
    console.log(`\n📡 Connecting to MongoDB: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Successfully connected to MongoDB!');

    const db = mongoose.connection.db;

    // Get all collection names
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log('\n📭 Database is already empty. No collections to drop.');
      return true;
    }

    console.log(`\n📋 Found ${collections.length} collection(s):`);
    collections.forEach((coll) => {
      console.log(`   - ${coll.name}`);
    });

    // Drop each collection
    console.log('\n🗑️  Dropping collections...');
    for (const collection of collections) {
      await db.dropCollection(collection.name);
      console.log(`   ✅ Dropped: ${collection.name}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE RESET COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nAll collections have been dropped.');
    console.log('You can now restart your application with a fresh database.');
    console.log('\n💡 Run "npm run create-admin" to create the admin user.');

    return true;
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    return false;
  } finally {
    await mongoose.connection.close();
    console.log('\n📴 MongoDB connection closed.');
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('     EDU-RESOURCE DATABASE RESET UTILITY');
  console.log('='.repeat(60));

  // Check for --force flag
  const force = process.argv.includes('--force') || process.argv.includes('-f');

  if (!force) {
    const confirmed = await confirmReset();
    if (!confirmed) {
      console.log('\n❌ Operation cancelled.');
      rl.close();
      process.exit(0);
    }
  }

  rl.close();
  const success = await resetDatabase();
  process.exit(success ? 0 : 1);
}

main();
