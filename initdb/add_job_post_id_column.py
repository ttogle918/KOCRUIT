#!/usr/bin/env python3
"""
Script to add job_post_id column to schedule table
Run this script to fix the database schema issue
"""

import pymysql
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def add_job_post_id_column():
    """Add job_post_id column to schedule table"""
    
    # Database connection parameters
    db_config = {
        'host': 'kocruit-02.c5k2wi2q8g80.us-east-2.rds.amazonaws.com',
        'port': 3306,
        'user': 'admin',
        'password': 'kocruit1234!',
        'database': 'kocruit',
        'charset': 'utf8mb4'
    }
    
    try:
        # Connect to database
        connection = pymysql.connect(**db_config)
        cursor = connection.cursor()
        
        print("Connected to database successfully!")
        
        # Check if column already exists
        cursor.execute("SHOW COLUMNS FROM schedule LIKE 'job_post_id'")
        column_exists = cursor.fetchone()
        
        if column_exists:
            print("Column 'job_post_id' already exists in schedule table")
        else:
            # Add the column
            print("Adding job_post_id column to schedule table...")
            cursor.execute("""
                ALTER TABLE schedule 
                ADD COLUMN job_post_id INT,
                ADD FOREIGN KEY (job_post_id) REFERENCES jobpost(id)
            """)
            connection.commit()
            print("Successfully added job_post_id column to schedule table!")
        
        # Verify the table structure
        cursor.execute("DESCRIBE schedule")
        columns = cursor.fetchall()
        print("\nCurrent schedule table structure:")
        for column in columns:
            print(f"  {column[0]} - {column[1]}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()
            print("Database connection closed.")

if __name__ == "__main__":
    add_job_post_id_column() 