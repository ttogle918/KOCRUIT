import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../layout/Layout';
import api from '../../api/api';

export default function CorpHome() {
  const [jobPosts, setJobPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('recruiting'); // 'scheduled', 'recruiting', 'selecting', 'closed'
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobPosts = async () => {
      try {
        const jobPostsResponse = await api.get('/company/jobposts/');
        setJobPosts(jobPostsResponse.data);
      } catch (err) {
        console.error('Error fetching job posts:', err);
        setError('채용공고를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchJobPosts();
  }, []);

  // 상태별 공고 분류 (DB 상태 기반)
  const categorizeJobPostsByStatus = () => {
    const scheduledPosts = jobPosts.filter(post => post.status === 'SCHEDULED');
    const recruitingPosts = jobPosts.filter(post => post.status === 'RECRUITING');
    const selectingPosts = jobPosts.filter(post => post.status === 'SELECTING');
    const closedPosts = jobPosts.filter(post => post.status === 'CLOSED');

    return { scheduledPosts, recruitingPosts, selectingPosts, closedPosts };
  };

  const { scheduledPosts, recruitingPosts, selectingPosts, closedPosts } = categorizeJobPostsByStatus();
  
  // 현재 탭에 따른 공고 선택
  const getCurrentPosts = () => {
    switch (activeTab) {
      case 'scheduled':
        return scheduledPosts;
      case 'recruiting':
        return recruitingPosts;
      case 'selecting':
        return selectingPosts;
      case 'closed':
        return closedPosts;
      default:
        return scheduledPosts;
    }
  };

  const currentPosts = getCurrentPosts();

  // DB 상태 기반으로 공고가 이미 분류되어 있음

  return (
    <Layout title="회사명">
      <div className="flex flex-1 px-8 gap-6">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-6xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="flex gap-4 mb-6">
              <button 
                className={`px-4 py-2 rounded font-semibold transition ${
                  activeTab === 'recruiting' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setActiveTab('recruiting')}
              >
                모집중 ({recruitingPosts.length})
              </button>
              <button 
                className={`px-4 py-2 rounded font-semibold transition ${
                  activeTab === 'selecting' 
                    ? 'bg-orange-100 text-orange-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setActiveTab('selecting')}
              >
                선발중 ({selectingPosts.length})
              </button>
              <button 
                className={`px-4 py-2 rounded font-semibold transition ${
                  activeTab === 'closed' 
                    ? 'bg-gray-100 text-gray-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setActiveTab('closed')}
              >
                마감 ({closedPosts.length})
              </button>
              <button 
                className={`px-4 py-2 rounded font-semibold transition ${
                  activeTab === 'scheduled' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setActiveTab('scheduled')}
              >
                예정 ({scheduledPosts.length})
              </button>
              <Link to="/postrecruitment">
                <button className="px-4 py-2 rounded bg-gray-100 text-gray-700 font-semibold">+공고 등록</button>
              </Link>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4">로딩 중...</div>
              ) : error ? (
                <div className="text-red-500 text-center py-4">{error}</div>
              ) : currentPosts.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  {activeTab === 'scheduled' ? '예정인 공고가 없습니다' :
                   activeTab === 'recruiting' ? '모집중인 공고가 없습니다' : 
                   activeTab === 'selecting' ? '선발중인 공고가 없습니다' : 
                   '마감된 공고가 없습니다'}
                </div>
              ) : (
                currentPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/viewpost/${post.id}`)}
                    className={`rounded-lg p-4 cursor-pointer transition ${
                      activeTab === 'scheduled'
                        ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                        : activeTab === 'selecting' 
                        ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30' 
                        : activeTab === 'closed'
                        ? 'bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900/30'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{post.title}</span>
                      {activeTab === 'scheduled' && (
                        <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded">
                          예정
                        </span>
                      )}
                      {activeTab === 'selecting' && (
                        <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                          선발중
                        </span>
                      )}
                      {activeTab === 'closed' && (
                        <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30 px-2 py-1 rounded">
                          마감됨
                        </span>
                      )}
                    </div>
                    {/* 예정 탭: 모집 시작일 및 안내 */}
                    {activeTab === 'scheduled' && (
                      <>
                        {post.start_date && (
                          <div className="text-sm text-purple-600 mt-1">
                            모집 시작일: {new Date(post.start_date).toLocaleDateString('ko-KR')}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">이 공고는 아직 모집이 시작되지 않았습니다.</div>
                      </>
                    )}
                    {/* 모집중 탭: 모집 마감일 */}
                    {activeTab === 'recruiting' && post.end_date && (
                      <div className="text-sm text-gray-500 mt-1">
                        모집 마감일: {new Date(post.end_date).toLocaleDateString('ko-KR')}
                      </div>
                    )}
                    {/* 선발중 탭: 지원자/선발인원 */}
                    {activeTab === 'selecting' && (
                      <div className="text-sm text-orange-600 mt-1">
                        지원자 {post.applicant_count ?? '-'}명 / {post.headcount ?? '-'}명 선발
                      </div>
                    )}
                    {/* 마감 탭: 최종 합격자, 마감일, 지원자수 */}
                    {activeTab === 'closed' && (
                      <div className="text-sm text-gray-600 mt-1 space-y-1">
                        <div>최종 합격자: {post.final_selected_count ?? '-' }명</div>
                        {post.end_date && (
                          <div>마감일: {new Date(post.end_date).toLocaleDateString('ko-KR')}</div>
                        )}
                        <div>지원자 수: {post.applicant_count ?? '-' }명</div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}