import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/api';
import Layout from '../../layout/Layout';

function PartnerDetail() {
  const { id } = useParams(); // URL에서 company ID 추출
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/common/company/${id}`)
      .then(res => {
        setCompany(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('회사 정보 로딩 실패:', err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <Layout title="기업 상세"><p className="text-center py-10">로딩 중...</p></Layout>;
  if (!company) return <Layout title="기업 상세"><p className="text-center py-10 text-red-500">해당 기업을 찾을 수 없습니다.</p></Layout>;

  return (
    <Layout title={`${company.name} 상세 정보`}>
      <div className="min-h-screen bg-[#eef6ff] dark:bg-black">
        <div className="max-w-3xl mx-auto px-4 py-10 bg-white dark:bg-gray-900 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{company.name}</h2>

          <div className="space-y-2 text-gray-800 dark:text-gray-300">
            <p><strong>기업 ID:</strong> {company.id}</p>
            <p><strong>설명:</strong> {company.description || '설명이 없습니다.'}</p>
            {/* 필요에 따라 추가 필드 */}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default PartnerDetail;
