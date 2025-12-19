import React from 'react';
import { FiUser } from 'react-icons/fi';

const InterviewApplicantsTab = ({ 
  paginatedApplicants, 
  handleRowClick, 
  handleViewDetails, 
  handleEvaluate, 
  handleReAnalyze,
  getStatusBadge,
  getOverallStatusBadge,
  totalPages,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  filteredCount,
  StageName
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">지원자 전체 프로세스 추적</h2>
        <p className="text-sm text-gray-600">전체 채용 프로세스에서 지원자의 진행 현황을 확인할 수 있습니다.</p>
      </div>

      {filteredCount === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-gray-500 text-lg mb-2">지원자가 없습니다</p>
          <p className="text-gray-400 text-sm">조건에 맞는 지원자가 없습니다</p>
        </div>
      ) : (
        <div className="relative">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">지원자 정보</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">직무 공고</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI 면접</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">실무진 면접</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">임원진 면접</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedApplicants.map((applicant) => (
                    <tr 
                      key={applicant.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(applicant)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <FiUser className="text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{applicant.name}</div>
                            <div className="text-sm text-gray-500">{applicant.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{applicant.jobPostingTitle || applicant.job_posting_title || '공공기관 IT사업 PM/PL 모집'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            통과
                          </span>
                          {(applicant.ai_score || applicant.aiScore || applicant.ai_score) && (
                            <span className="text-xs text-blue-600 font-medium ml-1">
                              {applicant.ai_score || applicant.aiScore || applicant.ai_score}점
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            통과
                          </span>
                          {(applicant.practicalInterviewScore || applicant.practical_interview_score) && (
                            <span className="text-xs text-green-600 font-medium ml-1">
                              {applicant.practicalInterviewScore || applicant.practical_interview_score}점
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            통과
                          </span>
                          {(applicant.executiveInterviewScore || applicant.executive_interview_score) && (
                            <span className="text-xs text-orange-600 font-medium ml-1">
                              {applicant.executiveInterviewScore || applicant.executive_interview_score}점
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getOverallStatusBadge(applicant.overallStatus || applicant.overall_status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleViewDetails(applicant); }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            보기
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEvaluate(applicant); }}
                            className="text-green-600 hover:text-green-900"
                          >
                            평가
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReAnalyze(applicant); }}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            재분석
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> -{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredCount)}
                    </span>{' '}
                    / <span className="font-medium">{filteredCount}</span> 결과
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-3 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InterviewApplicantsTab;
