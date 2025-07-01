import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../layout/Layout';
import api from '../../api/api';

function Home() {
  const [jobPosts, setJobPosts] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [jobPage, setJobPage] = useState(1);
  const [companyPage, setCompanyPage] = useState(1);
  const jobpost_itemsPerPage = 9;
  const company_itemsPerPage = 6;

  useEffect(() => {
    api.get('/jobs/common/jobposts')
      .then((res) => setJobPosts(res.data))
      .catch((err) => console.error('공고 목록 요청 실패:', err));

    api.get('/companies/common/company')
      .then((res) => setCompanies(res.data))
      .catch((err) => console.error('기업 목록 요청 실패:', err));
  }, []);

  const jobStart = (jobPage - 1) * jobpost_itemsPerPage;
  const jobCurrent = jobPosts.slice(jobStart, jobStart + jobpost_itemsPerPage);
  const companyStart = (companyPage - 1) * company_itemsPerPage;
  const companyCurrent = companies.slice(companyStart, companyStart + company_itemsPerPage);

  const jobTotalPages = Math.ceil(jobPosts.length / jobpost_itemsPerPage);
  const companyTotalPages = Math.ceil(companies.length / company_itemsPerPage);

  const renderPageButtons = (totalPages, currentPage, onClick) => {
    const pageNumbers = [];
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex justify-center mt-4 space-x-2">
        <button
          onClick={() => onClick(Math.max(1, currentPage - 1))}
          className="px-3 py-1 rounded border bg-white text-blue-600 border-blue-500 hover:bg-blue-100"
        >
          «
        </button>
        {pageNumbers.map(page => (
          <button
            key={page}
            onClick={() => onClick(page)}
            className={`px-3 py-1 rounded border ${page === currentPage
              ? 'bg-blue-500 text-white'
              : 'bg-white text-blue-600 border-blue-500 hover:bg-blue-100'}`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onClick(Math.min(totalPages, currentPage + 1))}
          className="px-3 py-1 rounded border bg-white text-blue-600 border-blue-500 hover:bg-blue-100"
        >
          »
        </button>
      </div>
    );
  };

  return (
    <Layout title="홈페이지">
      <div className="grid md:grid-cols-2 gap-8 px-12">
        {/* 🔹 신규 공고 목록 */}
        <div>
          <h5 className="text-lg font-semibold mb-3">
            <Link to="/joblist" className="no-underline hover:underline">📢 신규 공고 목록</Link>
          </h5>
          {jobCurrent.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-300">공고가 없습니다.</p>
          ) : (
            jobCurrent.map((job, index) => (
            <Link
              to={`/common/jobposts/${job.id}`} // 상세 페이지 링크
              key={job.id}
              className="rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-900"
            >
              <div key={index} className="bg-white dark:bg-gray-600 shadow rounded p-4 mb-3 text-gray-900 dark:text-white">
                {`<<${job.companyName}>> ${job.title}`}
              </div>
            </Link>
            ))
          )}
          {renderPageButtons(jobTotalPages, jobPage, setJobPage)}
        </div>

         {/* 🔹 연계 기업 목록 */}
        <div>
          <h5 className="text-lg font-semibold mb-3">
            <Link to="/common/company" className="no-underline hover:underline">🤝 연계 기업 목록</Link>
          </h5>
          <div className="grid grid-cols-2 gap-4">
            {companyCurrent.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-300">기업 목록이 없습니다.</p>
            ) : (
              companyCurrent.map((company, idx) => (
                <Link
                  to={`/common/company/${company.id}`} // 상세 페이지 링크
                  key={company.id}
                  className="rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-900"
                >
                  <div key={company.id || idx} className="bg-white dark:bg-gray-600 shadow rounded overflow-hidden">
                    <div className="bg-gradient-to-br from-blue-500 to-green-400 dark:from-blue-800 dark:to-green-700 flex justify-center items-center h-40 p-4">
                      <p className="text-white text-2xl font-bold text-center break-words">{company.name}</p>
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-gray-700 dark:text-white">{company.name}</p>
                    </div>
                  </div>
                </Link> 
              ))
            )}
          </div>
          {renderPageButtons(companyTotalPages, companyPage, setCompanyPage)}
        </div>
      </div>
    </Layout>
  );
}

export default Home;
