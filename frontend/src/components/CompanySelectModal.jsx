import React, { useState, useEffect } from 'react';
import api from '../api/api';

function CompanySelectModal({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [newCompany, setNewCompany] = useState('');

  // 회사명 검색
  useEffect(() => {
    if (!search) {
      setCompanies([]);
      setNotFound(false);
      return;
    }
    setLoading(true);
    api.get(`/companies?search=${encodeURIComponent(search)}`)
      .then(res => {
        setCompanies(res.data);
        setNotFound(res.data.length === 0);
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, [search]);

  // 회사 신규 등록
  const handleRegister = async () => {
    const nameToRegister = newCompany || search;
    if (!nameToRegister) return;
    setLoading(true);
    try {
      const res = await api.post('/companies', { name: nameToRegister });
      if (res.status === 200 || res.status === 201) {
        const data = res.data;
        onSelect(data.id, data.name); // 등록된 회사 id, name으로 선택
      } else {
        alert('회사 등록에 실패했습니다.');
      }
    } catch {
      alert('회사 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96 relative">
        <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>✕</button>
        <h2 className="text-lg font-bold mb-4">회사명 선택</h2>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="회사명 검색"
          className="w-full px-3 py-2 mb-2 border rounded"
          autoFocus
        />
        {loading && <div className="text-sm text-gray-500">검색 중...</div>}
        {!loading && companies.length > 0 && (
          <ul className="max-h-40 overflow-y-auto mb-2">
            {companies.map(c => (
              <li
                key={c.id || c.name}
                className="p-2 hover:bg-blue-100 cursor-pointer rounded"
                onClick={() => onSelect(c.id, c.name)}
              >
                {c.name}
              </li>
            ))}
          </ul>
        )}
        {!loading && notFound && (
          <div className="mb-2 text-sm text-gray-500">검색 결과가 없습니다.</div>
        )}
        <div className="mt-2">
          <input
            type="text"
            value={newCompany || search}
            onChange={e => setNewCompany(e.target.value)}
            placeholder="새 회사명 입력"
            className="w-full px-3 py-2 border rounded mb-2"
          />
          <button
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            onClick={handleRegister}
            disabled={loading || !(newCompany || search)}
          >
            회사 등록 및 선택
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompanySelectModal; 