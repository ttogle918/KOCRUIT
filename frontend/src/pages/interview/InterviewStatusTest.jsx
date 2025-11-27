import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/api';

const InterviewStatusTest = () => {
  const { jobPostId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testResults, setTestResults] = useState({});

  const runTests = async () => {
    setLoading(true);
    setError(null);
    const results = {};

    try {
      console.log('🧪 면접 상태 API 테스트 시작...');

      // 1. AI 면접 지원자 목록 테스트
      try {
        console.log('1️⃣ AI 면접 지원자 목록 테스트...');
        const aiRes = await api.get(`/applications/job/${jobPostId}/applicants-with-ai-interview`);
        results.aiInterview = {
          success: true,
          count: aiRes.data?.length || 0,
          data: aiRes.data || []
        };
        console.log('✅ AI 면접 지원자:', aiRes.data?.length || 0, '명');
      } catch (err) {
        results.aiInterview = {
          success: false,
          error: err.message,
          status: err.response?.status
        };
        console.error('❌ AI 면접 지원자 조회 실패:', err);
      }

      // 2. 실무진 면접 지원자 목록 테스트
      try {
        console.log('2️⃣ 실무진 면접 지원자 목록 테스트...');
        const practicalRes = await api.get(`/applications/job/${jobPostId}/applicants-with-practical-interview`);
        results.practicalInterview = {
          success: true,
          count: practicalRes.data?.applicants?.length || 0,
          data: practicalRes.data || {}
        };
        console.log('✅ 실무진 면접 지원자:', practicalRes.data?.applicants?.length || 0, '명');
      } catch (err) {
        results.practicalInterview = {
          success: false,
          error: err.message,
          status: err.response?.status
        };
        console.error('❌ 실무진 면접 지원자 조회 실패:', err);
      }

      // 3. 임원진 면접 지원자 목록 테스트
      try {
        console.log('3️⃣ 임원진 면접 지원자 목록 테스트...');
        const executiveRes = await api.get(`/applications/job/${jobPostId}/applicants-with-executive-interview`);
        results.executiveInterview = {
          success: true,
          count: executiveRes.data?.applicants?.length || 0,
          data: executiveRes.data || {}
        };
        console.log('✅ 임원진 면접 지원자:', executiveRes.data?.applicants?.length || 0, '명');
      } catch (err) {
        results.executiveInterview = {
          success: false,
          error: err.message,
          status: err.response?.status
        };
        console.error('❌ 임원진 면접 지원자 조회 실패:', err);
      }

      // 4. 전체 지원자 목록 테스트
      try {
        console.log('4️⃣ 전체 지원자 목록 테스트...');
        const allRes = await api.get(`/applications/job/${jobPostId}/applicants`);
        results.allApplicants = {
          success: true,
          count: allRes.data?.length || 0,
          data: allRes.data || []
        };
        console.log('✅ 전체 지원자:', allRes.data?.length || 0, '명');
      } catch (err) {
        results.allApplicants = {
          success: false,
          error: err.message,
          status: err.response?.status
        };
        console.error('❌ 전체 지원자 조회 실패:', err);
      }

      setTestResults(results);
      console.log('🎯 모든 테스트 완료!');

    } catch (err) {
      setError('테스트 실행 중 오류가 발생했습니다: ' + err.message);
      console.error('테스트 실행 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderTestResult = (key, result) => {
    if (!result) return null;

    return (
      <div key={key} className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2 capitalize">
          {key.replace(/([A-Z])/g, ' $1').trim()}
        </h3>
        
        {result.success ? (
          <div className="text-green-600">
            <p>✅ 성공</p>
            <p>지원자 수: {result.count}명</p>
            {result.data && result.data.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">지원자 목록:</p>
                <ul className="list-disc list-inside ml-4">
                  {result.data.slice(0, 5).map((applicant, index) => (
                    <li key={index}>
                      {applicant.name || applicant.user?.name || 'Unknown'} 
                      (ID: {applicant.id || applicant.application_id || applicant.user_id})
                      {applicant.ai_interview_status && ` - AI: ${applicant.ai_interview_status}`}
                      {applicant.practical_interview_status && ` - 실무진: ${applicant.practical_interview_status}`}
                      {applicant.executive_interview_status && ` - 임원진: ${applicant.executive_interview_status}`}
                    </li>
                  ))}
                </ul>
                {result.data.length > 5 && (
                  <p className="text-sm text-gray-500">... 및 {result.data.length - 5}명 더</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-red-600">
            <p>❌ 실패</p>
            <p>오류: {result.error}</p>
            {result.status && <p>상태 코드: {result.status}</p>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">🧪 면접 상태 API 테스트</h1>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          공고 ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{jobPostId}</span>
        </p>
        
        <button
          onClick={runTests}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? '테스트 중...' : '테스트 실행'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {Object.keys(testResults).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">테스트 결과</h2>
          
          {renderTestResult('aiInterview', testResults.aiInterview)}
          {renderTestResult('practicalInterview', testResults.practicalInterview)}
          {renderTestResult('executiveInterview', testResults.executiveInterview)}
          {renderTestResult('allApplicants', testResults.allApplicants)}
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">💡 문제 해결 가이드</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>AI 면접 합격자가 없으면 실무진 면접 페이지에 지원자가 표시되지 않습니다.</li>
          <li>실무진 면접 합격자가 없으면 임원진 면접 페이지에 지원자가 표시되지 않습니다.</li>
          <li>모든 면접 상태가 PENDING인 경우, 면접을 시작하지 않은 상태입니다.</li>
          <li>API 응답에서 지원자 수가 0인 경우, 해당 조건을 만족하는 지원자가 없습니다.</li>
        </ul>
      </div>
    </div>
  );
};

export default InterviewStatusTest;
