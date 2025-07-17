#!/usr/bin/env python3
"""
Test script to verify the date changes in form_fill_tool
"""

from datetime import datetime, timedelta
from agent.tools.form_fill_tool import form_fill_tool
import json

def test_date_changes():
    print("Testing date changes in form_fill_tool...")
    print("=" * 50)
    
    # Test multiple calls to see random behavior
    for i in range(3):
        print(f"\nTest {i+1}:")
        result = form_fill_tool({
            'description': f'테스트 채용공고 {i+1}',
            'current_form_data': {}
        })
        
        form_data = result['form_data']
        
        # Parse dates
        start_date = datetime.strptime(form_data['start_date'], "%Y-%m-%d %H:%M")
        end_date = datetime.strptime(form_data['end_date'], "%Y-%m-%d %H:%M")
        interview_date = datetime.fromisoformat(form_data['schedules'][0]['date'])
        
        current_date = datetime.now()
        
        # Calculate offsets (use date only for comparison)
        start_offset = (start_date.date() - current_date.date()).days
        end_offset = (end_date.date() - start_date.date()).days
        interview_offset = (interview_date.date() - end_date.date()).days
        
        print(f"  Current date: {current_date.strftime('%Y-%m-%d')}")
        print(f"  Start date: {start_date.strftime('%Y-%m-%d')} (offset: {start_offset} days)")
        print(f"  End date: {end_date.strftime('%Y-%m-%d')} (offset from start: {end_offset} days)")
        print(f"  Interview date: {interview_date.strftime('%Y-%m-%d')} (offset from end: {interview_offset} days)")
        
        # Verify constraints
        assert 1 <= start_offset <= 3, f"Start offset should be 1-3 days, got {start_offset}"
        assert end_offset == 14, f"End offset should be 14 days, got {end_offset}"
        assert 3 <= interview_offset <= 7, f"Interview offset should be 3-7 days, got {interview_offset}"
        
        print(f"  ✓ All constraints satisfied")
    
    print("\n" + "=" * 50)
    print("All tests passed! Date changes are working correctly.")

if __name__ == "__main__":
    test_date_changes() 