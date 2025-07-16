import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import ViewPostSidebar from '../../components/ViewPostSidebar';
import { interviewPanelApi } from '../../api/interviewPanelApi';
import api from '../../api/api';
import { FiUsers, FiClock, FiCheck, FiX } from 'react-icons/fi';

export default function InterviewPanelManagement() {
  const { jobPostId } = useParams();
  const [jobPost, setJobPost] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assignmentDetails, setAssignmentDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load job post information
  useEffect(() => {
    const loadJobPost = async () => {
      try {
        const response = await api.get(`/company/jobposts/${jobPostId}`);
        setJobPost(response.data);
      } catch (error) {
        console.error('공고 정보 로드 실패:', error);
        setError('공고 정보를 불러올 수 없습니다.');
      }
    };

    if (jobPostId) {
      loadJobPost();
    }
  }, [jobPostId]);

  // Load interview panel assignments
  useEffect(() => {
    const loadAssignments = async () => {
      try {
        setLoading(true);
        const assignmentsData = await interviewPanelApi.getJobPostAssignments(jobPostId);
        setAssignments(assignmentsData);

        // Load details for each assignment
        const detailsPromises = assignmentsData.map(async (assignment) => {
          const details = await interviewPanelApi.getAssignmentDetails(assignment.assignment_id);
          return { [assignment.assignment_id]: details };
        });

        const detailsResults = await Promise.all(detailsPromises);
        const detailsMap = detailsResults.reduce((acc, detail) => ({ ...acc, ...detail }), {});
        setAssignmentDetails(detailsMap);
      } catch (error) {
        console.error('면접관 배정 정보 로드 실패:', error);
        setError('면접관 배정 정보를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (jobPostId) {
      loadAssignments();
    }
  }, [jobPostId]);

  // Group assignments by schedule date
  const groupAssignmentsByScheduleDate = (assignments, assignmentDetails) => {
    const grouped = {};
    
    assignments.forEach(assignment => {
      const scheduleDate = assignment.schedule_date;
      if (!grouped[scheduleDate]) {
        grouped[scheduleDate] = [];
      }
      
      const details = assignmentDetails[assignment.assignment_id];
      if (details) {
        grouped[scheduleDate].push({
          ...assignment,
          details
        });
      }
    });
    
    return grouped;
  };

  // Group requests by status with assignment type info
  const groupRequestsByStatus = (assignmentGroup) => {
    const allRequests = assignmentGroup.flatMap(assignment => 
      assignment.details.requests.map(request => ({
        ...request,
        assignment_type: assignment.assignment_type
      }))
    );
    
    return {
      accepted: allRequests.filter(req => req.status === 'ACCEPTED'),
      pending: allRequests.filter(req => req.status === 'PENDING'),
      rejected: allRequests.filter(req => req.status === 'REJECTED')
    };
  };

  // Helper function to format assignment type
  const formatAssignmentType = (assignmentType) => {
    switch (assignmentType) {
      case 'SAME_DEPARTMENT':
        return '같은 부서';
      case 'HR_DEPARTMENT':
        return '인사팀';
      default:
        return assignmentType;
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[#f7faff] dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Navbar />
        <ViewPostSidebar jobPost={jobPost} />
        <div className="flex h-screen items-center justify-center ml-[90px]">
          <div className="text-lg">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-[#f7faff] dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Navbar />
        <ViewPostSidebar jobPost={jobPost} />
        <div className="flex h-screen items-center justify-center ml-[90px]">
          <div className="text-red-500 dark:text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f7faff] dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar />
      <ViewPostSidebar jobPost={jobPost} />
      
      <div className="ml-[90px] p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">면접관 편성 현황</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {jobPost?.title || '공고 제목을 불러오는 중...'}
            </p>
          </div>

          {/* Interview Schedule Cards */}
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <FiUsers className="mx-auto text-6xl text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-2">
                면접관 배정이 없습니다
              </h3>
              <p className="text-gray-400 dark:text-gray-500">
                아직 면접 일정에 대한 면접관 배정이 생성되지 않았습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupAssignmentsByScheduleDate(assignments, assignmentDetails)).map(([scheduleDate, assignmentGroup]) => {
                const groupedRequests = groupRequestsByStatus(assignmentGroup);
                const formattedDate = new Date(scheduleDate).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                // Calculate total required count and assignment types
                const totalRequiredCount = assignmentGroup.reduce((sum, assignment) => sum + assignment.required_count, 0);
                const assignmentTypes = [...new Set(assignmentGroup.map(assignment => assignment.assignment_type))];

                return (
                  <div key={scheduleDate} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                    {/* Schedule Header */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FiClock className="text-blue-600 dark:text-blue-400" size={20} />
                          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                            면접 일정: {formattedDate}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>배정 유형: {assignmentTypes.map(type => formatAssignmentType(type)).join(', ')}</span>
                          <span>필요 인원: {totalRequiredCount}명</span>
                          <span>배정 건수: {assignmentGroup.length}건</span>
                        </div>
                      </div>
                    </div>

                    {/* Interview Panel Status */}
                    <div className="p-6">
                      {/* Accepted Interviewers - Top Section */}
                      <div className="mb-6">
                        <div className="flex items-center space-x-2 mb-3">
                          <FiCheck className="text-green-600 dark:text-green-400" size={18} />
                          <h4 className="text-lg font-semibold text-green-900 dark:text-green-100">
                            정식 면접관 ({groupedRequests.accepted.length}명)
                          </h4>
                        </div>
                        {groupedRequests.accepted.length === 0 ? (
                          <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-gray-500 dark:text-gray-400">아직 수락한 면접관이 없습니다.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {groupedRequests.accepted.map((request) => (
                              <div key={request.request_id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="font-medium text-green-900 dark:text-green-100">
                                    {request.user_name}
                                  </div>
                                  <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                                    {formatAssignmentType(request.assignment_type)}
                                  </span>
                                </div>
                                <div className="text-sm text-green-700 dark:text-green-300">
                                  {request.user_email}
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  직급: {request.user_ranks || '정보 없음'}
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-400">
                                  응답일: {new Date(request.response_at).toLocaleDateString('ko-KR')}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Pending and Rejected - Bottom Section */}
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Pending Interviewers - Bottom Left */}
                        <div>
                          <div className="flex items-center space-x-2 mb-3">
                            <FiClock className="text-yellow-600 dark:text-yellow-400" size={18} />
                            <h4 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                              대기중 ({groupedRequests.pending.length}명)
                            </h4>
                          </div>
                          {groupedRequests.pending.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p className="text-gray-500 dark:text-gray-400">대기중인 면접관이 없습니다.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {groupedRequests.pending.map((request) => (
                                <div key={request.request_id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="font-medium text-yellow-900 dark:text-yellow-100">
                                      {request.user_name}
                                    </div>
                                    <span className="text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                                      {formatAssignmentType(request.assignment_type)}
                                    </span>
                                  </div>
                                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                                    {request.user_email}
                                  </div>
                                  <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                    직급: {request.user_ranks || '정보 없음'}
                                  </div>
                                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                    요청일: {new Date(request.created_at).toLocaleDateString('ko-KR')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Rejected Interviewers - Bottom Right */}
                        <div>
                          <div className="flex items-center space-x-2 mb-3">
                            <FiX className="text-red-600 dark:text-red-400" size={18} />
                            <h4 className="text-lg font-semibold text-red-900 dark:text-red-100">
                              거절 ({groupedRequests.rejected.length}명)
                            </h4>
                          </div>
                          {groupedRequests.rejected.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p className="text-gray-500 dark:text-gray-400">거절한 면접관이 없습니다.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {groupedRequests.rejected.map((request) => (
                                <div key={request.request_id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="font-medium text-red-900 dark:text-red-100">
                                      {request.user_name}
                                    </div>
                                    <span className="text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-1 rounded">
                                      {formatAssignmentType(request.assignment_type)}
                                    </span>
                                  </div>
                                  <div className="text-sm text-red-700 dark:text-red-300">
                                    {request.user_email}
                                  </div>
                                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                    직급: {request.user_ranks || '정보 없음'}
                                  </div>
                                  <div className="text-xs text-red-600 dark:text-red-400">
                                    거절일: {new Date(request.response_at).toLocaleDateString('ko-KR')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 