import React, { useState } from 'react';
import { 
  extractFolderIdFromUrl, 
  extractVideoIdFromUrl,
  getDriveItemType, 
  processVideoUrl,
  validateDriveUrl 
} from '../../utils/googleDrive';

const GoogleDriveTest = () => {
  const [folderUrl, setFolderUrl] = useState('https://drive.google.com/file/d/1oIIDc7Zr0AKmKe7gvaNkZm8NRWRzwkLO/view?usp=drive_link');
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message, type = 'info') => {
    setTestResults(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testGoogleDriveFolder = async () => {
    setIsLoading(true);
    clearResults();
    
    try {
      addResult('🔍 구글 드라이브 폴더 테스트 시작...', 'info');
      addResult(`📁 입력된 URL: ${folderUrl}`, 'info');

      // 1. URL 유효성 검사
      addResult('1️⃣ URL 유효성 검사 중...', 'info');
      const isValid = validateDriveUrl(folderUrl);
      addResult(`URL 유효성: ${isValid ? '✅ 유효' : '❌ 유효하지 않음'}`, isValid ? 'success' : 'error');

      if (!isValid) {
        addResult('❌ 유효하지 않은 구글 드라이브 URL입니다.', 'error');
        return;
      }

      // 2. URL 타입 확인
      addResult('2️⃣ URL 타입 확인 중...', 'info');
      const itemType = getDriveItemType(folderUrl);
      addResult(`URL 타입: ${itemType}`, 'info');

      if (itemType === 'file') {
        addResult('✅ 개별 파일 URL입니다.', 'success');
      } else if (itemType === 'folder') {
        addResult('📁 폴더 URL입니다.', 'info');
      } else {
        addResult('❓ 알 수 없는 URL 타입입니다.', 'warning');
      }

      // 3. 파일/폴더 ID 추출
      addResult('3️⃣ 파일/폴더 ID 추출 중...', 'info');
      const fileId = extractVideoIdFromUrl(folderUrl);
      const folderId = extractFolderIdFromUrl(folderUrl);
      
      if (fileId) {
        addResult(`파일 ID: ${fileId}`, 'success');
      } else if (folderId) {
        addResult(`폴더 ID: ${folderId}`, 'success');
      } else {
        addResult('❌ ID를 추출할 수 없습니다.', 'error');
        return;
      }

      // 4. URL 처리 테스트
      addResult('4️⃣ URL 처리 테스트 중...', 'info');
      const processedUrl = await processVideoUrl(folderUrl);
      addResult(`처리된 URL: ${processedUrl || '처리 실패'}`, processedUrl ? 'success' : 'warning');

      // 5. 개별 파일 처리 테스트
      addResult('5️⃣ 개별 파일 처리 테스트...', 'info');
      
      if (itemType === 'file' && fileId) {
        addResult(`🎯 파일 ID: ${fileId}`, 'info');
        addResult('✅ 개별 파일 URL이 성공적으로 처리되었습니다.', 'success');
        
        // 직접 재생 가능한 URL 생성
        const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        addResult(`🔗 직접 재생 URL: ${directUrl}`, 'info');
        
        // 비디오 재생 테스트
        addResult('6️⃣ 비디오 재생 테스트...', 'info');
        addResult('💡 위의 직접 재생 URL을 브라우저에서 열어보세요.', 'info');
        addResult('💡 또는 AI 면접 시스템에서 이 URL을 사용할 수 있습니다.', 'info');
      } else if (itemType === 'folder') {
        addResult('📁 폴더 URL이므로 개별 파일을 찾아야 합니다.', 'warning');
        addResult('💡 폴더 내에서 59_김도원_AI면접.mp4 파일의 개별 공유 링크를 사용하세요.', 'info');
      }

      addResult('✅ 테스트 완료!', 'success');

    } catch (error) {
      addResult(`❌ 테스트 중 오류 발생: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔍 구글 드라이브 폴더 테스트
          </h1>

          {/* 입력 폼 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              구글 드라이브 폴더 URL
            </label>
            <input
              type="url"
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              테스트할 구글 드라이브 폴더 URL을 입력하세요.
            </p>
          </div>

          {/* 테스트 버튼 */}
          <div className="mb-6">
            <button
              onClick={testGoogleDriveFolder}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '테스트 중...' : '🔍 테스트 시작'}
            </button>
            <button
              onClick={clearResults}
              className="ml-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              결과 초기화
            </button>
          </div>

          {/* 테스트 결과 */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              테스트 결과
            </h2>
            
            {testResults.length === 0 ? (
              <p className="text-gray-500">테스트를 실행하면 결과가 여기에 표시됩니다.</p>
            ) : (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg text-sm ${
                      result.type === 'success' ? 'bg-green-100 text-green-800' :
                      result.type === 'error' ? 'bg-red-100 text-red-800' :
                      result.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}
                  >
                    <span className="font-mono text-xs text-gray-500">
                      {result.timestamp}
                    </span>
                    <div className="mt-1">{result.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 정보 섹션 */}
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ℹ️ 구글 드라이브 연동 정보
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">현재 구현된 기능:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>✅ 구글 드라이브 URL 유효성 검사</li>
                <li>✅ 폴더/파일 URL 타입 구분</li>
                <li>✅ 폴더 ID 추출</li>
                <li>✅ 공유 링크를 직접 재생 가능한 URL로 변환</li>
                <li>⚠️ 폴더 내 파일 목록 조회 (API 키 필요)</li>
              </ul>
              
              <h4 className="font-medium text-gray-900 mt-4 mb-2">권장 사용 방법:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>개별 파일 공유 링크 사용</li>
                <li>Google Drive API 키 설정 (폴더 내 파일 목록 조회 시)</li>
                <li>파일명 패턴 매칭을 통한 자동 검색</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleDriveTest; 