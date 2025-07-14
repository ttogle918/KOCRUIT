import React, { useState, useEffect } from 'react';
import api from '../api/api';

function CompanyMemberSelectModal({ companyId, onSelect, onClose, selectedMembers = [] }) {
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'department', 'hr'

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

  // 현재 사용자 정보 가져오기 (부서 정보용)
  const [currentUser, setCurrentUser] = useState(null);
  
  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        console.log('👤 Current user data:', res.data);
        setCurrentUser(res.data);
      })
      .catch((error) => {
        console.error('❌ Failed to fetch current user:', error);
        setCurrentUser(null);
      });
  }, []);

  // 부서 정보 가져오기 (여러 필드명 확인)
  const getUserDepartment = () => {
    if (!currentUser) return null;
    
    // API에서 department_name이 오는지 확인
    if (currentUser.department_name) {
      console.log('🏢 Found department_name from API:', currentUser.department_name);
      return currentUser.department_name;
    }
    
    // 여러 가능한 필드명 확인 (기존 로직)
    const possibleFields = [
      currentUser.department,
      currentUser.dept,
      currentUser.team,
      currentUser.division,
      currentUser.company?.department,
      currentUser.company?.dept,
      currentUser.company?.team
    ];
    
    const department = possibleFields.find(field => field && typeof field === 'string');
    console.log('🏢 Department detection:', {
      possibleFields,
      foundDepartment: department
    });
    
    return department;
  };

  // 탭별 멤버 필터링
  const getFilteredMembers = () => {
    if (!members.length) return [];
    
    const userDepartment = getUserDepartment();
    
    console.log('🔍 Filtering members:', {
      totalMembers: members.length,
      activeTab,
      userDepartment,
      membersWithDepartment: members.filter(m => m.department).map(m => ({ name: m.name, department: m.department }))
    });
    
    let filteredMembers;
    
    switch (activeTab) {
      case 'department':
        // 현재 사용자와 같은 부서 멤버들 (대소문자, 공백 무시)
        filteredMembers = members.filter(member => {
          if (!member.department || !userDepartment) return false;
          
          const memberDept = member.department.trim().toLowerCase();
          const userDept = userDepartment.trim().toLowerCase();
          
          return memberDept === userDept;
        });
        break;
      case 'hr':
        // 인사팀 멤버들 (부서명에 '인사', 'HR', '채용' 포함)
        filteredMembers = members.filter(member => 
          member.department && 
          (member.department.includes('인사') || 
           member.department.includes('HR') || 
           member.department.includes('채용') ||
           member.department.includes('인력'))
        );
        break;
      default:
        // 전체 멤버
        filteredMembers = members;
    }
    
    // 이미 선택된 멤버 제외
    const availableMembers = filteredMembers.filter(member => 
      !selectedMembers.some(selected => selected.email === member.email)
    );
    
    console.log('🏢 Available members after filtering:', {
      originalCount: filteredMembers.length,
      selectedCount: selectedMembers.length,
      availableCount: availableMembers.length,
      selectedEmails: selectedMembers.map(m => m.email)
    });
    
    return availableMembers;
  };

  const filteredMembers = getFilteredMembers();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96 relative">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" onClick={onClose}>✕</button>
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">팀원 선택</h2>
        
        {/* 탭 메뉴 */}
        <div className="flex mb-4 border-b border-gray-200 dark:border-gray-600">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('all')}
          >
            전체
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'department'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('department')}
          >
            {getUserDepartment() || '부서'}
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'hr'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('hr')}
          >
            인사팀
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="이름 또는 이메일로 검색"
          className="w-full px-3 py-2 mb-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          autoFocus
        />
        
        {loading && <div className="text-sm text-gray-500 dark:text-gray-400">검색 중...</div>}
        
        {!loading && filteredMembers.length > 0 && (
          <ul className="max-h-60 overflow-y-auto mb-2">
            {filteredMembers.map(member => (
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
        
        {!loading && filteredMembers.length === 0 && (
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            {search 
              ? '검색 결과가 없습니다.' 
              : activeTab === 'department' 
                ? `${getUserDepartment() || '부서'} 멤버가 없습니다.`
                : activeTab === 'hr'
                  ? '인사팀 멤버가 없습니다.'
                  : '회사 멤버가 없습니다.'
            }
          </div>
        )}
        
        {!loading && filteredMembers.length > 0 && getFilteredMembers().length === 0 && (
          <div className="mb-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
            {activeTab === 'department' 
              ? `${getUserDepartment() || '부서'}의 모든 멤버가 이미 선택되었습니다.`
              : activeTab === 'hr'
                ? '인사팀의 모든 멤버가 이미 선택되었습니다.'
                : '모든 회사 멤버가 이미 선택되었습니다.'
            }
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