#!/usr/bin/env python3
"""
Database Reset Script for Edu-Resource LMS
This script connects to MongoDB and resets (drops) all collections in the database.
Use with caution - all data will be permanently deleted!
"""

import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/edu-resource')

def confirm_reset():
    """Ask for user confirmation before proceeding."""
    print("\n" + "="*60)
    print("⚠️  WARNING: DATABASE RESET ⚠️")
    print("="*60)
    print(f"\nThis will DELETE ALL DATA from: {MONGODB_URI}")
    print("\nThe following collections will be dropped:")
    print("  - users")
    print("  - courses")
    print("  - assignments")
    print("  - submissions")
    print("  - enrollments")
    print("  - messages")
    print("  - notifications")
    print("  - And any other collections in the database")
    print("\n" + "="*60)
    
    response = input("\nAre you sure you want to proceed? Type 'YES' to confirm: ")
    return response.strip() == 'YES'

def reset_database():
    """Connect to MongoDB and drop all collections."""
    try:
        # Connect to MongoDB
        print(f"\n📡 Connecting to MongoDB: {MONGODB_URI}")
        client = MongoClient(MONGODB_URI)
        
        # Extract database name from URI
        db_name = MONGODB_URI.split('/')[-1].split('?')[0]
        db = client[db_name]
        
        # Test connection
        client.admin.command('ping')
        print("✅ Successfully connected to MongoDB!")
        
        # Get all collection names
        collections = db.list_collection_names()
        
        if not collections:
            print("\n📭 Database is already empty. No collections to drop.")
            return True
        
        print(f"\n📋 Found {len(collections)} collection(s):")
        for coll in collections:
            print(f"   - {coll}")
        
        # Drop each collection
        print("\n🗑️  Dropping collections...")
        for collection_name in collections:
            db[collection_name].drop()
            print(f"   ✅ Dropped: {collection_name}")
        
        print("\n" + "="*60)
        print("✅ DATABASE RESET COMPLETE!")
        print("="*60)
        print(f"\nAll collections in '{db_name}' have been dropped.")
        print("You can now restart your application with a fresh database.")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False
    finally:
        if 'client' in locals():
            client.close()
            print("\n📴 MongoDB connection closed.")

def reset_with_seed():
    """Reset database and optionally run seed data."""
    reset_database()
    
    response = input("\nWould you like to create an admin user? (y/n): ")
    if response.lower() == 'y':
        print("\n💡 Run 'npm run create-admin' to create the admin user.")

def main():
    """Main entry point."""
    print("\n" + "="*60)
    print("     EDU-RESOURCE DATABASE RESET UTILITY")
    print("="*60)
    
    # Check for --force flag
    force = '--force' in sys.argv or '-f' in sys.argv
    
    if not force:
        if not confirm_reset():
            print("\n❌ Operation cancelled.")
            sys.exit(0)
    
    success = reset_database()
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
