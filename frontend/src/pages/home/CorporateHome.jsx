import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/SideBar';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../layout/Layout';
import api from '../../api/api';

export default function CorpHome() {
  const [jobPosts, setJobPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  return (
    <Layout title="회사명">
      <div className="flex flex-1 px-8 gap-6">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-6xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="flex gap-4 mb-6">
              <button className="px-4 py-2 rounded bg-blue-100 text-blue-700 font-semibold">자사 공고 목록</button>
              <Link to="/postrecruitment">
                <button className="px-4 py-2 rounded bg-gray-100 text-gray-700 font-semibold">+공고 등록</button>
              </Link>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4">로딩 중...</div>
              ) : error ? (
                <div className="text-red-500 text-center py-4">{error}</div>
              ) : jobPosts.length === 0 ? (
                <div className="text-center py-4 text-gray-500">등록된 공고가 없습니다</div>
              ) : (
                jobPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/viewpost/${post.id}`)}
                    className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition"
                  >
                    {post.title}
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