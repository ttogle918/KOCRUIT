import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { getDefaultSettingsButton } from '../../components/SettingsMenu';
import api from '../../api/api';
import ViewPostSidebar from '../../components/ViewPostSidebar';

function ViewPost() {
  const navigate = useNavigate();
  const { jobPostId } = useParams();
  const { user } = useAuth();
  const isAdminOrManager = user && (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER);
  
  const [jobPost, setJobPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobPost = async () => {
      try {
        const response = await api.get(`/company/jobposts/${jobPostId}`);
        console.log('Job Post Data:', response.data);
        setJobPost(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching job post:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (jobPostId) {
      fetchJobPost();
    }
  }, [jobPostId]);

  const handleDelete = async () => {
    if (window.confirm('이 공고를 삭제하시겠습니까?')) {
      try {
        await api.delete(`/company/jobposts/${jobPostId}`);
        alert('공고가 삭제되었습니다.');
        navigate(-1);
      } catch (err) {
        console.error('Error deleting job post:', err);
        alert('공고 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleEdit = () => {
    navigate(`/editpost/${jobPostId}`);
  };

  const settingsButton = getDefaultSettingsButton({
    onEdit: handleEdit,
    onDelete: handleDelete,
    isVisible: isAdminOrManager
  });

  if (loading) {
    return (
      <>
        <ViewPostSidebar jobPost={null} />
        <Layout title="로딩 중...">
          <div className="flex justify-center items-center h-screen">
            <div className="text-xl">로딩 중...</div>
          </div>
        </Layout>
      </>
    );
  }

  if (error) {
    return (
      <>
        <ViewPostSidebar jobPost={null} />
        <Layout title="오류">
          <div className="flex justify-center items-center h-screen">
            <div className="text-xl text-red-500">{error}</div>
          </div>
        </Layout>
      </>
    );
  }

  if (!jobPost) {
    return (
      <>
        <ViewPostSidebar jobPost={null} />
        <Layout title="공고 없음">
          <div className="flex justify-center items-center h-screen">
            <div className="text-xl">존재하지 않는 공고입니다.</div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <ViewPostSidebar jobPost={jobPost} />
      <Layout title="채용공고 상세보기" settingsButton={settingsButton}>
        <div className="min-h-screen bg-[#eef6ff] dark:bg-gray-900 p-6 mx-auto max-w-screen-xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4 text-center space-y-2">
                <h2 className="text-2xl font-semibold text-gray-900 border-b border-gray-300 dark:border-gray-600 pb-2 dark:text-white">{jobPost.title}</h2>
                <p className="text-md text-gray-900 dark:text-gray-300">{jobPost.department}</p>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4">
                  <h4 className="text-lg font-semibold text-gray-900 ml-4 pb-2 dark:text-white">지원자격</h4>
                  <div className="text-gray-900 dark:text-white border-t border-gray-300 dark:border-gray-600 pt-2 px-4 whitespace-pre-wrap">{jobPost.qualifications}</div>
                </div>
                <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4">
                  <h4 className="text-lg font-semibold text-gray-900 ml-4 pb-2 dark:text-white">근무조건</h4>
                  <div className="text-gray-900 dark:text-white border-t border-gray-300 dark:border-gray-600 pt-2 px-4 whitespace-pre-wrap">{jobPost.conditions}</div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4">
                <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white">모집분야 및 자격요건</h4>
                <div className="text-gray-900 dark:text-white border-t border-gray-300 dark:border-gray-600 pt-2 px-4 whitespace-pre-wrap">{jobPost.job_details}</div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4">
                <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white">전형절차</h4>
                <div className="text-gray-900 dark:text-white border-t border-gray-300 dark:border-gray-600 pt-2 px-4 whitespace-pre-wrap">{jobPost.procedures}</div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4 text-gray-900 dark:text-white">
                <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white">모집 정보</h4>
                <div className="border-t border-gray-300 dark:border-gray-600 px-4 pt-3 space-y-3">
                  <p><strong>모집 인원:</strong> {jobPost.headcount}명</p>
                  <p><strong>근무지역:</strong> {jobPost.location}</p>
                  <p><strong>고용형태:</strong> {jobPost.employment_type}</p>
                  <p><strong>기간:</strong> {jobPost.start_date} ~ {jobPost.end_date}</p>
                </div>
              </div>

              {jobPost.teamMembers && (
                <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4 text-gray-900 dark:text-white">
                  <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white">채용팀 편성</h4>
                  <div className="border-t border-gray-300 dark:border-gray-600 px-4 pt-3 space-y-3">
                    {jobPost.teamMembers.map((member, idx) => (
                      <p key={idx} className="text-gray-900 dark:text-white">• {member.email} ({member.role})</p>
                    ))}
                  </div>
                </div>
              )}

              {jobPost.interview_schedules && jobPost.interview_schedules.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4 text-gray-900 dark:text-white">
                  <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white">면접 일정</h4>
                  <div className="border-t border-gray-300 dark:border-gray-600 px-4 pt-3 space-y-3">
                    {jobPost.interview_schedules.map((schedule, idx) => {
                      const scheduleDate = new Date(schedule.scheduled_at);
                      const formattedDate = scheduleDate.toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                      const formattedTime = scheduleDate.toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      });
                      
                      return (
                        <div key={idx} className="border-b border-gray-200 dark:border-gray-600 pb-2 last:border-b-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {formattedDate} {formattedTime}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                📍 {schedule.location}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              schedule.status === 'SCHEDULED' 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : schedule.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {schedule.status === 'SCHEDULED' ? '예정' : 
                               schedule.status === 'COMPLETED' ? '완료' : 
                               schedule.status === 'CANCELLED' ? '취소' : schedule.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="flex justify-center mt-10">
            <button
              onClick={() => navigate(`/applicantlist/${jobPostId}`)}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-6 py-3 rounded text-lg"
            >
              지원자 조회
            </button>
          </div>
        </div>
      </Layout>
    </>
  );
}

export default ViewPost;
