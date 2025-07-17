import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import ViewPostSidebar from '../../components/ViewPostSidebar';
import { interviewPanelApi } from '../../api/interviewPanelApi';
import api from '../../api/api';
import { FiUsers, FiClock, FiCheck, FiX, FiTrash2, FiPlus, FiSearch, FiUserPlus } from 'react-icons/fi';

export default function InterviewPanelManagement() {
  const { jobPostId } = useParams();
  const [jobPost, setJobPost] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assignmentDetails, setAssignmentDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Interviewer management states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentAssignmentGroup, setCurrentAssignmentGroup] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyMembers, setCompanyMembers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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

  // Load current user information for department detection
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await api.get('/auth/me');
        setCurrentUser(response.data);
      } catch (error) {
        console.error('현재 사용자 정보 로드 실패:', error);
      }
    };

    loadCurrentUser();
  }, []);

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

  // Load company members for search
  const loadCompanyMembers = async (search = '') => {
    if (!jobPost?.company_id) return;
    
    setSearchLoading(true);
    try {
      const members = await interviewPanelApi.searchCompanyMembers(jobPost.company_id, search);
      setCompanyMembers(members);
    } catch (error) {
      console.error('회사 멤버 로드 실패:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search term change with debounce
  useEffect(() => {
    if (!showInviteModal) return;
    
    const timeoutId = setTimeout(() => {
      loadCompanyMembers(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, showInviteModal, jobPost?.company_id]);

  // Cancel interview request
  const handleCancelRequest = async (requestId) => {
    try {
      await interviewPanelApi.cancelRequest(requestId);
      // Reload assignments to refresh the data
      const assignmentsData = await interviewPanelApi.getJobPostAssignments(jobPostId);
      setAssignments(assignmentsData);

      // Reload details for each assignment
      const detailsPromises = assignmentsData.map(async (assignment) => {
        const details = await interviewPanelApi.getAssignmentDetails(assignment.assignment_id);
        return { [assignment.assignment_id]: details };
      });

      const detailsResults = await Promise.all(detailsPromises);
      const detailsMap = detailsResults.reduce((acc, detail) => ({ ...acc, ...detail }), {});
      setAssignmentDetails(detailsMap);
    } catch (error) {
      console.error('면접관 요청 취소 실패:', error);
      alert('면접관 요청 취소에 실패했습니다.');
    }
  };

  // Invite new interviewer
  const handleInviteInterviewer = async (member) => {
    try {
      const classification = getMemberClassification(member);
      
      if (!classification.canInvite) {
        alert(`${classification.label} 소속 멤버는 초대할 수 없습니다.`);
        return;
      }

      const appropriateAssignment = getAppropriateAssignment(member);
      
      if (!appropriateAssignment) {
        alert('적절한 면접관 배정을 찾을 수 없습니다.');
        return;
      }

      await interviewPanelApi.inviteInterviewer(appropriateAssignment.assignment_id, member.id);
      setShowInviteModal(false);
      setSearchTerm('');
      
      // Reload assignments to refresh the data
      const assignmentsData = await interviewPanelApi.getJobPostAssignments(jobPostId);
      setAssignments(assignmentsData);

      const detailsPromises = assignmentsData.map(async (assignment) => {
        const details = await interviewPanelApi.getAssignmentDetails(assignment.assignment_id);
        return { [assignment.assignment_id]: details };
      });

      const detailsResults = await Promise.all(detailsPromises);
      const detailsMap = detailsResults.reduce((acc, detail) => ({ ...acc, ...detail }), {});
      setAssignmentDetails(detailsMap);
    } catch (error) {
      console.error('면접관 초대 실패:', error);
      alert('면접관 초대에 실패했습니다.');
    }
  };

  // Get all invited user IDs for current assignment group to filter out duplicates
  const getInvitedUserIds = (assignmentGroup) => {
    const allRequests = assignmentGroup.flatMap(assignment => 
      assignment.details.requests || []
    );
    return allRequests.map(request => request.user_id);
  };

  // Open invite modal
  const openInviteModal = (assignmentGroup) => {
    setCurrentAssignmentGroup(assignmentGroup);
    setShowInviteModal(true);
    setSearchTerm('');
  };

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

  // Get job post department (from current user or job post)
  const getJobPostDepartment = () => {
    if (!currentUser && !jobPost) return null;
    
    // Try multiple possible field names for department
    const possibleFields = [
      currentUser?.department_name,
      currentUser?.department,
      currentUser?.dept,
      jobPost?.department,
      jobPost?.department_name
    ];
    
    return possibleFields.find(field => field && typeof field === 'string') || null;
  };

  // Determine if member belongs to HR department
  const isHRDepartment = (memberDepartment) => {
    if (!memberDepartment) return false;
    const dept = memberDepartment.toLowerCase();
    return dept.includes('인사') || dept.includes('hr') || dept.includes('채용') || dept.includes('인력');
  };

  // Determine if member belongs to same department as job post
  const isSameDepartment = (memberDepartment) => {
    const jobDepartment = getJobPostDepartment();
    if (!memberDepartment || !jobDepartment) return false;
    
    return memberDepartment.trim().toLowerCase() === jobDepartment.trim().toLowerCase();
  };

  // Get appropriate assignment for a member
  const getAppropriateAssignment = (member) => {
    if (!currentAssignmentGroup) return null;
    
    // Check if member is HR
    if (isHRDepartment(member.department)) {
      return currentAssignmentGroup.find(assignment => assignment.assignment_type === 'HR_DEPARTMENT');
    }
    
    // Check if member is from same department
    if (isSameDepartment(member.department)) {
      return currentAssignmentGroup.find(assignment => assignment.assignment_type === 'SAME_DEPARTMENT');
    }
    
    // No appropriate assignment found
    return null;
  };

  // Get display label for member's department classification
  const getMemberClassification = (member) => {
    if (isHRDepartment(member.department)) {
      return { label: '인사팀', canInvite: true, type: 'hr' };
    }
    
    if (isSameDepartment(member.department)) {
      return { label: '같은 부서', canInvite: true, type: 'same' };
    }
    
    if (!member.department) {
      return { label: '부서 미확인', canInvite: false, type: 'unknown' };
    }
    
    return { label: '다른 부서', canInvite: false, type: 'other' };
  };

  // Sort members by priority: same department first, then HR, then others
  const getSortedMembers = (members) => {
    return [...members].sort((a, b) => {
      const aClassification = getMemberClassification(a);
      const bClassification = getMemberClassification(b);
      
      // Priority order: same > hr > other > unknown
      const priorityOrder = { same: 0, hr: 1, other: 2, unknown: 3 };
      
      const aPriority = priorityOrder[aClassification.type];
      const bPriority = priorityOrder[bClassification.type];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same priority, sort by name alphabetically
      return a.name.localeCompare(b.name);
    });
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
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <FiClock className="text-yellow-600 dark:text-yellow-400" size={18} />
                              <h4 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                                대기중 ({groupedRequests.pending.length}명)
                              </h4>
                            </div>
                            <button
                              onClick={() => openInviteModal(assignmentGroup)}
                              className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                              title="새 면접관 초대"
                            >
                              <FiUserPlus size={14} />
                              <span>초대</span>
                            </button>
                          </div>
                          {groupedRequests.pending.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p className="text-gray-500 dark:text-gray-400">대기중인 면접관이 없습니다.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {groupedRequests.pending.map((request) => (
                                <div key={request.request_id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                  <div className="flex items-start justify-between mb-1">
                                    <div className="flex-1">
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
                                    <button
                                      onClick={() => handleCancelRequest(request.request_id)}
                                      className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                                      title="초청 취소"
                                    >
                                      <FiTrash2 size={14} />
                                    </button>
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

      {/* Invite Interviewer Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    새 면접관 초대
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {getJobPostDepartment() ? `${getJobPostDepartment()} 부서 기준으로 자동 분류됩니다` : '부서 정보를 확인할 수 없습니다'}
                  </p>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Search Bar */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400" size={18} />
                </div>
                <input
                  type="text"
                  placeholder="이름이나 이메일로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Search Results */}
              <div className="max-h-64 overflow-y-auto">
                {searchLoading ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    검색 중...
                  </div>
                ) : companyMembers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    {searchTerm ? '검색 결과가 없습니다.' : '검색어를 입력해주세요.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getSortedMembers(companyMembers)
                      .filter(member => {
                        // Filter out already invited members
                        const invitedUserIds = currentAssignmentGroup ? getInvitedUserIds(currentAssignmentGroup) : [];
                        return !invitedUserIds.includes(member.id);
                      })
                      .map((member) => {
                        const classification = getMemberClassification(member);
                        const appropriateAssignment = classification.canInvite ? getAppropriateAssignment(member) : null;
                        
                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {member.name}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  classification.type === 'hr'
                                    ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-200'
                                    : classification.type === 'same'
                                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200'
                                      : classification.type === 'other'
                                        ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-200'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}>
                                  {classification.label}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {member.email}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                {member.department && `${member.department} • `}
                                {member.ranks || '직급 정보 없음'}
                              </div>
                            </div>
                            <button
                              onClick={() => handleInviteInterviewer(member)}
                              disabled={!classification.canInvite}
                              className={`px-4 py-2 text-sm rounded transition-colors ${
                                classification.canInvite
                                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                              }`}
                              title={classification.canInvite ? `${classification.label}으로 초대` : '초대할 수 없습니다'}
                            >
                              초대
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 space-y-1">
                <p>• <span className="text-blue-600 dark:text-blue-400">같은 부서</span>: {getJobPostDepartment() || '부서명 확인 불가'} 부서 소속 멤버 (초대 가능)</p>
                <p>• <span className="text-purple-600 dark:text-purple-400">인사팀</span>: 인사, HR, 채용 관련 부서 소속 멤버 (초대 가능)</p>
                <p>• <span className="text-orange-600 dark:text-orange-400">다른 부서</span>: 기타 부서 소속 멤버 (초대 불가)</p>
                <p>• <span className="text-gray-600 dark:text-gray-400">부서 미확인</span>: 부서 정보가 없는 멤버 (초대 불가)</p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 