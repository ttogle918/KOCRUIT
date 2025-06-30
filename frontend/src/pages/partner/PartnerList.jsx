// components/PartnerList.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../../layout/Layout';
import api from '../../api/api';
import { Link } from 'react-router-dom';

const ITEMS_PER_PAGE = 6;

function PartnerList() {
  const [companies, setCompanies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(companies.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentCompanies = companies.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  useEffect(() => {
    api.get('/common/company/')
      .then(res => {
        console.log("기업 리스트:", res.data);
        setCompanies(res.data);
      })
      .catch(err => console.error('기업 목록 불러오기 실패:', err));
  }, []);

  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  
  return (
    <Layout title="연계 기업 전체 목록">
      <div className="min-h-screen bg-[#eef6ff] dark:bg-black">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">🤝 연계 기업 전체 목록</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {currentCompanies.length === 0 ? (
              <p className="text-center text-xl font-semibold text-gray-600 dark:text-white">기업 목록이 없습니다.</p>
            ) : (
              currentCompanies.map((company) => (
                <Link
                  to={`/common/company/${company.id}`} // 상세 페이지 링크
                  key={company.id}
                  className="rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-900"
                >
                  <div className="bg-gradient-to-br from-blue-500 to-green-400 dark:from-blue-800 dark:to-green-700 flex justify-center items-center h-40 p-4">
                    <p className="text-white text-2xl font-bold text-center break-words">{company.name}</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 text-center">
                    <p className="text-gray-700 dark:text-gray-300 font-medium truncate">{company.name}</p>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* 페이지네이션 UI */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4 space-x-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                className="px-3 py-1 rounded border bg-white text-blue-600 border-blue-500 hover:bg-blue-100"
              >
                «
              </button>
              {pageNumbers.map(page => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`px-3 py-1 rounded border ${page === currentPage
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-blue-600 border-blue-500 hover:bg-blue-100'}`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => goToPage(currentPage + 1)}
                className="px-3 py-1 rounded border bg-white text-blue-600 border-blue-500 hover:bg-blue-100"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default PartnerList;
