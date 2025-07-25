#!/usr/bin/env python3
"""
실시간 면접 시스템 테스트 스크립트
"""

import asyncio
import websockets
import json
import base64
import time
from datetime import datetime

async def test_realtime_interview():
    """실시간 면접 시스템 테스트"""
    
    # WebSocket 연결
    session_id = f"test_session_{int(time.time())}"
    uri = f"ws://kocruit_fastapi:8000/api/v1/realtime-interview/ws/interview/{session_id}"
    
    print(f"🔄 WebSocket 연결 시도: {uri}")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket 연결 성공!")
            
            # 1. 화자 메모 테스트
            print("\n📝 화자 메모 테스트...")
            note_message = {
                "type": "speaker_note",
                "speaker": "면접관_1",
                "note": "지원자의 기술적 배경이 인상적입니다.",
                "timestamp": time.time()
            }
            await websocket.send(json.dumps(note_message))
            
            response = await websocket.recv()
            print(f"📨 메모 응답: {response}")
            
            # 2. 평가 요청 테스트
            print("\n⭐ 평가 요청 테스트...")
            eval_message = {
                "type": "evaluation_request"
            }
            await websocket.send(json.dumps(eval_message))
            
            response = await websocket.recv()
            print(f"📨 평가 응답: {response}")
            
            # 3. 가짜 오디오 청크 테스트
            print("\n🎤 가짜 오디오 청크 테스트...")
            fake_audio = base64.b64encode(b"fake_audio_data").decode('utf-8')
            audio_message = {
                "type": "audio_chunk",
                "audio_data": fake_audio,
                "timestamp": time.time()
            }
            await websocket.send(json.dumps(audio_message))
            
            response = await websocket.recv()
            print(f"📨 오디오 처리 응답: {response}")
            
            # 4. 세션 종료 테스트
            print("\n🔚 세션 종료 테스트...")
            end_message = {
                "type": "session_end"
            }
            await websocket.send(json.dumps(end_message))
            
            response = await websocket.recv()
            print(f"📨 세션 종료 응답: {response}")
            
            print("\n✅ 모든 테스트 완료!")
            
    except Exception as e:
        print(f"❌ 테스트 실패: {e}")

async def test_session_status():
    """세션 상태 조회 테스트"""
    import aiohttp
    
    session_id = f"test_session_{int(time.time())}"
    url = f"http://kocruit_fastapi:8000/api/v1/realtime-interview/interview/session/{session_id}/status"
    
    print(f"\n🔄 세션 상태 조회 테스트: {url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 404:
                    print("✅ 예상된 404 응답 (존재하지 않는 세션)")
                else:
                    data = await response.json()
                    print(f"📨 세션 상태: {data}")
    except Exception as e:
        print(f"❌ 세션 상태 조회 실패: {e}")

def main():
    """메인 함수"""
    print("🚀 실시간 면접 시스템 테스트 시작")
    print("=" * 50)
    
    # 백엔드 서버가 실행 중인지 확인
    print("⚠️  백엔드 서버가 실행 중인지 확인하세요:")
    print("   docker-compose up -d")
    print("   또는")
    print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    print()
    
    # 테스트 실행
    asyncio.run(test_realtime_interview())
    asyncio.run(test_session_status())
    
    print("\n" + "=" * 50)
    print("🏁 테스트 완료!")

if __name__ == "__main__":
    main() 