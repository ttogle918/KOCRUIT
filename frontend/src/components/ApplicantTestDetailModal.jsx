import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

const ApplicantTestDetailModal = ({ isOpen, onClose, applicantId, jobPostId }) => {
  const [testDetails, setTestDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && applicantId && jobPostId) {
      fetchTestDetails();
    }
  }, [isOpen, applicantId, jobPostId]);

  const fetchTestDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`/report/job-aptitude/applicant/${applicantId}?job_post_id=${jobPostId}`);
      setTestDetails(response.data);
    } catch (err) {
      console.error('Error fetching test details:', err);
      
      if (err.response) {
        // 서버에서 응답이 왔지만 에러 상태인 경우
        const errorMessage = err.response.data?.detail || err.response.data?.message || '알 수 없는 오류';
        setError(`필기시험 상세 정보를 불러오는데 실패했습니다. (${err.response.status}: ${errorMessage})`);
      } else if (err.request) {
        // 요청은 보냈지만 응답을 받지 못한 경우
        setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      } else {
        // 요청 자체를 보내지 못한 경우
        setError('필기시험 상세 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            필기시험 상세 결과
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {testDetails && (
          <div className="space-y-6">
            {/* 지원자 정보 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">
                지원자 정보
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-gray-600">이름</span>
                  <p className="font-medium">{testDetails.applicant_info.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">총점</span>
                  <p className="font-medium text-blue-600">
                    {testDetails.applicant_info.total_score}점 / {testDetails.applicant_info.max_total_score}점
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">정답률</span>
                  <p className="font-medium text-green-600">
                    {testDetails.applicant_info.accuracy_rate}%
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">평가일</span>
                  <p className="font-medium">{testDetails.applicant_info.evaluation_date}</p>
                </div>
              </div>
            </div>

            {/* 문항별 상세 결과 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                문항별 상세 결과 ({testDetails.applicant_info.correct_count}/{testDetails.applicant_info.total_questions} 정답)
              </h3>
              <div className="space-y-4">
                {testDetails.question_details.map((question, index) => (
                  <div
                    key={question.question_id}
                    className={`border rounded-lg p-4 ${
                      question.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                                         <div className="flex justify-between items-start mb-3">
                       <div className="flex items-center space-x-2">
                         <span className="text-sm font-medium text-gray-600">
                           문항 {index + 1}
                         </span>
                         {/* 점수별 채점 표시 */}
                         {question.score === question.max_score ? (
                           <span className="text-red-600 text-lg">●</span>
                         ) : question.score === 0 ? (
                           <span className="text-red-600 text-lg">✗</span>
                         ) : (
                           <span className="text-red-600 text-lg">▲</span>
                         )}
                         <span className={`px-2 py-1 rounded text-xs font-medium ${
                           question.is_correct 
                             ? 'bg-green-100 text-green-800' 
                             : 'bg-red-100 text-red-800'
                         }`}>
                           {question.is_correct ? '정답' : '오답'}
                         </span>
                         <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                           {question.question_type}
                         </span>
                       </div>
                       <div className="text-right">
                         <span className="text-sm text-gray-600">점수</span>
                         <p className={`font-bold ${
                           question.is_correct ? 'text-green-600' : 'text-red-600'
                         }`}>
                           {question.score}점 / {question.max_score}점
                         </p>
                       </div>
                     </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600 block mb-1">
                          문제
                        </span>
                        <p className="text-gray-800 bg-white p-3 rounded border">
                          {question.question_text}
                        </p>
                      </div>

                                             <div>
                         <span className="text-sm font-medium text-gray-600 block mb-1">
                           지원자 답변
                         </span>
                         <p className={`p-3 rounded border ${
                           question.is_correct 
                             ? 'bg-green-100 border-green-300 text-green-800' 
                             : 'bg-red-100 border-red-300 text-red-800'
                         }`}>
                           {question.user_answer || '답변 없음'}
                         </p>
                       </div>

                      {question.feedback && (
                        <div>
                          <span className="text-sm font-medium text-gray-600 block mb-1">
                            피드백
                          </span>
                          <p className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded">
                            {question.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicantTestDetailModal; 