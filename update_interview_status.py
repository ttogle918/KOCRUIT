#!/usr/bin/env python3
"""
Update interview_status from NOT_SCHEDULED to AI_INTERVIEW_NOT_SCHEDULED
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import get_db
from app.models.application import Application
from sqlalchemy import text

def update_interview_status():
    """Update interview_status values in database"""
    db = next(get_db())
    
    try:
        # Update NOT_SCHEDULED to AI_INTERVIEW_NOT_SCHEDULED
        result = db.execute(
            text("UPDATE application SET interview_status = 'AI_INTERVIEW_NOT_SCHEDULED' WHERE interview_status = 'NOT_SCHEDULED'")
        )
        db.commit()
        
        print(f"Updated {result.rowcount} rows")
        
        # Verify the update
        result = db.execute(text("SELECT interview_status, COUNT(*) as count FROM application GROUP BY interview_status"))
        rows = result.fetchall()
        
        print("\nCurrent interview_status distribution:")
        for row in rows:
            print(f"  {row[0]}: {row[1]}")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_interview_status() 