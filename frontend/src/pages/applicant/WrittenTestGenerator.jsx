import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import WrittenTestEditor from '../../components/WrittenTestEditor';
import { generateWrittenTest, submitWrittenTest } from '../../api/writtenTestApi';
import { getPublicJobPosts } from '../../api/jobApi';
import Layout from '../../layout/Layout';
import ViewPostSidebar from '../../components/ViewPostSidebar';

const WrittenTestGenerator = () => {
  const navigate = useNavigate();
  const [jobPosts, setJobPosts] = useState([]);
  const [selectedJobPostId, setSelectedJobPostId] = useState('');
  const [selectedJobPost, setSelectedJobPost] = useState(null);
  const [testType, setTestType] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 공고 리스트 불러오기
  useEffect(() => {
    const fetchJobPosts = async () => {
      try {
        const data = await getPublicJobPosts();
        setJobPosts(data);
      } catch (e) {
        setError('공고 목록 불러오기 실패: ' + (e?.message || '알 수 없는 오류'));
      }
    };
    fetchJobPosts();
  }, []);

  // 선택된 공고 정보 추출
  useEffect(() => {
    if (!selectedJobPostId) {
      setSelectedJobPost(null);
      return;
    }
    const found = jobPosts.find(j => String(j.id) === String(selectedJobPostId));
    setSelectedJobPost(found || null);
  }, [selectedJobPostId, jobPosts]);

  // 공고가 바뀔 때마다 질문/상태 초기화
  useEffect(() => {
    setQuestions([]);
    setTestType('');
    setSuccess(false);
    setError('');
  }, [selectedJobPostId]);

  // 문제 생성 요청
  const handleGenerate = async () => {
    if (!selectedJobPostId) return;
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const res = await generateWrittenTest({ jobPostId: selectedJobPostId });
      setQuestions(res.questions);
      setTestType(res.testType);
    } catch (e) {
      setError('문제 생성 실패: ' + (e?.message || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  };

  // 문제 제출 요청
  const handleSubmit = async (editedQuestions) => {
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await submitWrittenTest({ jobPostId: selectedJobPostId, questions: editedQuestions });
      setSuccess(true);
    } catch (e) {
      setError('문제 제출 실패: ' + (e?.message || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <ViewPostSidebar jobPost={selectedJobPost} />
      <div className="min-h-screen bg-[#eef6ff] py-8 px-4" style={{ marginLeft: 90 }}>
        <div className="max-w-4xl mx-auto">
          <div className="w-full bg-white rounded-xl shadow-lg p-10">
            <h1 className="text-3xl font-bold mb-6 text-center">필기 문제 생성/제출</h1>
          <div className="flex flex-col md:flex-row md:items-end md:gap-6 mb-6">
            <div className="flex-1 mb-4 md:mb-0">
              <label className="block mb-1 font-medium">공고 선택</label>
              <select
                className="w-full border rounded p-2"
                value={selectedJobPostId}
                onChange={e => setSelectedJobPostId(e.target.value)}
                disabled={loading || jobPosts.length === 0}
              >
                <option value="">공고를 선택하세요</option>
                {jobPosts.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.title}{j.department ? ` (${j.department})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 min-w-[160px]"
              onClick={handleGenerate}
              disabled={loading || !selectedJobPostId}
            >
              {loading ? '생성 중...' : 'AI로 문제 생성하기'}
            </button>
          </div>
          {selectedJobPost && (
            <div className="mb-4 text-gray-700 text-center">
              공고: <b>{selectedJobPost.title}</b>{selectedJobPost.department ? ` (${selectedJobPost.department})` : ''}
            </div>
          )}
          {error && <div className="text-red-500 mb-4 text-center">{error}</div>}
          {success && <div className="text-green-600 mb-4 text-center">문제 제출이 완료되었습니다!</div>}
          {questions.length > 0 && (
            <div className="mt-8">
              <WrittenTestEditor
                questions={questions}
                testType={testType}
                onSubmit={handleSubmit}
                loading={loading}
              />
            </div>
          )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default WrittenTestGenerator; 