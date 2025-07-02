import Layout from '../../layout/Layout';
import React, { useEffect, useState } from 'react';
import api from '../../api/api';
import { Link } from 'react-router-dom';

function JobList() {
  // const jobs = [
  //   "〈소프트캠프〉 보안SW 개발자 신입/경력사원 모집(C, C++)",
  //   "〈소프트캠프〉 [신입/경력] 보안SW 일반기술영업 채용",
  //   "〈부스트캠프〉 [신입/경력] 디자이너 UX 개발자 채용",
  //   "〈KOSA〉 [신입/경력] 관리자 채용 - 디자인팀",
  //   "〈KOSA〉 [신입/경력] 관리자 채용 - 디자인팀",
  //   "〈KOSA〉 [신입/경력] 관리자 채용 - 디자인팀"
  // ];

  const [jobPosts, setJobPosts] = useState([]);

  useEffect(() => {
    api.get('/public/jobposts') // ✅ 백엔드 주소 맞게 수정!
      .then((res) => {
        console.log("공고 목록:", res.data); // ✅ 콘솔에 찍히는지 확인
        setJobPosts(res.data);
      })
      .catch(error => {
        console.error('❌ 요청 실패:', error);
        if (error.response) {
          console.error('❌ 응답 상태:', error.response.status);
          console.error('❌ 응답 데이터:', error.response.data);
        }
      });
  }, []);

  return (
    <Layout title="전체 공고 목록">
      <div className="min-h-screen bg-[#eef6ff] dark:bg-black">
        <div className="max-w-3xl mx-auto pt-10 px-4">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">📢 전체 공고 목록</h3>
          {jobPosts.map((job, idx) => (
        
            <Link
              to={`/common/jobposts/${job.id}`} // 상세 페이지 링크
              key={job.id}
              className="rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-900"
            >
              <div key={idx} className="bg-white dark:bg-gray-900 shadow rounded-lg p-4 mb-3 text-gray-900 dark:text-white">
                {job.title}
              </div>
            </Link>
            
          ))}
        </div>
      </div>
    </Layout>
  );
}

export default JobList;
