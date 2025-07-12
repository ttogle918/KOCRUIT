import React, { useState, useEffect } from 'react';
import api from '../api/api';

function CompanyMemberSelectModal({ companyId, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // 회사 멤버 검색
  useEffect(() => {
    if (!companyId) {
      setMembers([]);
      setNotFound(false);
      return;
    }
    
    setLoading(true);
    const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
    api.get(`/companies/${companyId}/members${searchParam}`)
      .then(res => {
        setMembers(res.data);
        setNotFound(res.data.length === 0);
      })
      .catch(() => {
        setMembers([]);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [search, companyId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96 relative">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" onClick={onClose}>✕</button>
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">팀원 선택</h2>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="이름 또는 이메일로 검색"
          className="w-full px-3 py-2 mb-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          autoFocus
        />
        {loading && <div className="text-sm text-gray-500 dark:text-gray-400">검색 중...</div>}
        {!loading && members.length > 0 && (
          <ul className="max-h-60 overflow-y-auto mb-2">
            {members.map(member => (
              <li
                key={member.id}
                className="p-3 hover:bg-blue-100 dark:hover:bg-blue-900/20 cursor-pointer rounded border-b border-gray-200 dark:border-gray-700"
                onClick={() => onSelect(member.email, member.name)}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 dark:text-white">{member.name}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{member.email}</span>
                  {member.department && (
                    <span className="text-xs text-gray-500 dark:text-gray-500">{member.department}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!loading && notFound && (
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            {search ? '검색 결과가 없습니다.' : '회사 멤버가 없습니다.'}
          </div>
        )}
        <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
          * 같은 회사 소속 멤버만 선택할 수 있습니다.
        </div>
      </div>
    </div>
  );
}

export default CompanyMemberSelectModal; 