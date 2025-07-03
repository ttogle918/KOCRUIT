import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import "../../styles/datepicker.css";
import { useAuth } from '../../context/AuthContext';
import Layout from '../../layout/Layout';
import api from '../../api/api';

const useAutoResize = (value) => {
  const textareaRef = useRef(null);

  const autoResizeTextarea = (element) => {
    if (element) {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      autoResizeTextarea(textareaRef.current);
    }
  }, [value]);

  return textareaRef;
};

function PostRecruitment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    qualifications: '',
    conditions: '',
    jobDetails: '',
    procedures: '',
    headcount: '',
    startDate: null,
    endDate: null,
    location: '',
    employmentType: '',
    deadline: null,
    company: null
  });

  const [teamMembers, setTeamMembers] = useState([{ email: '', role: '' }]);
  const [weights, setWeights] = useState([
    { item: '경력', score: '' },
    { item: '학력', score: '' },
    { item: '자격증', score: '' }
  ]);

  const roleOptions = ['관리자', '멤버'];
  const scoreOptions = Array.from({ length: 10 }, (_, i) => (i + 1).toString());
  const employmentTypeOptions = ['정규직', '계약직', '인턴', '프리랜서'];

  const qualificationsRef = useAutoResize(formData.qualifications);
  const conditionsRef = useAutoResize(formData.conditions);
  const jobDetailsRef = useAutoResize(formData.jobDetails);
  const proceduresRef = useAutoResize(formData.procedures);

  const handleTextareaChange = (e, field) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleInputChange = (e, field) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  // Fetch initial data if needed
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await api.get('/auth/me');
        console.log('Current user info:', response.data);
        console.log('User company info:', {
          companyId: response.data.companyId,
          company_id: response.data.company_id,
          company: response.data.company
        });
        if (response.data) {
          setFormData(prev => ({
            ...prev,
            company: {
              id: response.data.companyId,
              name: response.data.companyName
            }
          }));
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };

    fetchInitialData();
  }, []);

  const handleSubmit = async (e) => {

    e.preventDefault();
    try {
      // 날짜 형식 변환
      const formattedData = {
        ...formData,
        // company_id는 백엔드에서 자동 설정됨
        headcount: formData.headcount ? parseInt(formData.headcount) : null,
        startDate: formData.startDate ? formData.startDate.toISOString() : null,
        endDate: formData.endDate ? formData.endDate.toISOString() : null,
        deadline: formData.deadline ? formData.deadline.toISOString().split('T')[0] : null,
        teamMembers: teamMembers.filter(member => member.email && member.role),  // 빈 항목 제거
        weights: weights.filter(weight => weight.item && weight.score),  // 빈 항목 제거
      };

      console.log('Sending data:', formattedData);  // 디버깅용

      const response = await api.post('/company/jobposts', formattedData);
      
      if (response.status === 201 || response.status === 200) {
        alert('채용공고가 등록되었습니다.');
        // 기업 홈으로 리다이렉트
        navigate('/corporatehome');
      }
    } catch (error) {
      console.error('Submission failed:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      console.error('Error detail:', error.response?.data?.detail);
      console.error('Error detail expanded:', JSON.stringify(error.response?.data?.detail, null, 2));
      alert(error.response?.data?.detail?.[0]?.msg || error.response?.data?.message || '채용공고 등록에 실패했습니다.');
    }
  };

  const handleAdd = (setter, defaultItem) => setter(prev => [...prev, defaultItem]);
  const handleRemove = (setter, index) => setter(prev => prev.filter((_, i) => i !== index));
  const handleChange = (setter, index, field, value) => {
    setter(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  return (
    <Layout title="채용공고 등록">
      <div className="min-h-screen bg-[#eef6ff] dark:bg-gray-900 p-6 mx-auto max-w-screen-xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4 text-center space-y-2">
                <div className="text-2xl font-semibold w-full text-center bg-transparent outline-none text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-600 pb-2">
                  {formData.company?.name}
                </div>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={(e) => handleInputChange(e, 'title')} 
                  className="text-md w-full text-center bg-transparent outline-none text-gray-900 dark:text-gray-300" 
                  placeholder="채용공고 제목" 
                />
                <input 
                  type="text" 
                  value={formData.department} 
                  onChange={(e) => handleInputChange(e, 'department')} 
                  className="text-sm w-full text-center bg-transparent outline-none text-gray-600 dark:text-gray-400" 
                  placeholder="부서명 (예: 개발팀, 인사팀)" 
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4">
                  <h4 className="text-lg font-semibold text-gray-900 ml-4 pb-2 dark:text-white">지원자격</h4>
                  <textarea 
                    ref={qualificationsRef}
                    value={formData.qualifications} 
                    onChange={(e) => handleTextareaChange(e, 'qualifications')} 
                    className="w-full min-h-[100px] overflow-hidden resize-none p-4 rounded outline-none border-t border-gray-300 dark:border-gray-600 pt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                    placeholder="경력, 학력, 스킬, 우대사항 등" 
                  />
                </div>
                <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4">
                  <h4 className="text-lg font-semibold text-gray-900 ml-4 pb-2 dark:text-white">근무조건</h4>
                  <textarea 
                    ref={conditionsRef}
                    value={formData.conditions} 
                    onChange={(e) => handleTextareaChange(e, 'conditions')} 
                    className="w-full min-h-[100px] overflow-hidden resize-none p-4 rounded outline-none border-t border-gray-300 dark:border-gray-600 pt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                    placeholder="고용형태, 급여, 지역, 시간, 직책 등" 
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4">
                <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white">모집분야 및 자격요건</h4>
                <textarea 
                  ref={jobDetailsRef}
                  value={formData.jobDetails} 
                  onChange={(e) => handleTextareaChange(e, 'jobDetails')} 
                  className="w-full min-h-[100px] overflow-hidden resize-none p-4 rounded outline-none border-t border-gray-300 dark:border-gray-600 pt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                  placeholder="담당업무, 자격요건, 우대사항 등" 
                />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4">
                <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white">전형절차</h4>
                <textarea 
                                  ref={proceduresRef}
                value={formData.procedures}
                onChange={(e) => handleTextareaChange(e, 'procedures')} 
                  className="w-full min-h-[100px] overflow-hidden resize-none rounded p-4 outline-none border-t border-gray-300 dark:border-gray-600 pt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                  placeholder="예: 서류 → 면접 → 합격" 
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4 text-gray-900 dark:text-white">
                <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white">모집 정보 설정</h4>
                <div className="border-t border-gray-300 dark:border-gray-600 px-4 pt-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <label className="w-24 text-sm text-gray-700 dark:text-white">모집 인원:</label>
                    <input 
                      type="number" 
                      value={formData.headcount} 
                      onChange={(e) => handleInputChange(e, 'headcount')} 
                      className="border border-gray-400 dark:border-gray-600 focus:border-gray-300 dark:focus:border-gray-300 px-2 py-1 rounded w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-24 text-sm text-gray-700 dark:text-white">근무지역:</label>
                    <input 
                      type="text" 
                      value={formData.location} 
                      onChange={(e) => handleInputChange(e, 'location')} 
                      className="border border-gray-400 dark:border-gray-600 focus:border-gray-300 dark:focus:border-gray-300 px-2 py-1 rounded w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors" 
                      placeholder="예: 서울시 강남구" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-24 text-sm text-gray-700 dark:text-white">고용형태:</label>
                    <select 
                      value={formData.employmentType} 
                      onChange={(e) => handleInputChange(e, 'employmentType')} 
                      className="border border-gray-400 dark:border-gray-600 focus:border-gray-300 dark:focus:border-gray-300 px-2 py-1 rounded w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                    >
                      <option value="">선택하세요</option>
                      {employmentTypeOptions.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-24 text-sm text-gray-700 dark:text-white">모집기간:</label>
                    <DatePicker 
                      selected={formData.startDate} 
                      onChange={(date) => handleInputChange({ target: { value: date } }, 'startDate')} 
                      selectsStart 
                      startDate={formData.startDate} 
                      endDate={formData.endDate} 
                      dateFormat="yyyy/MM/dd HH:mm" 
                      showTimeSelect
                      className="w-40 border border-gray-400 dark:border-gray-600 focus:border-gray-300 dark:focus:border-gray-300 px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm transition-colors" 
                      placeholderText="시작일시" 
                      calendarClassName="dark:bg-gray-800 dark:text-white" 
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">~</span>
                    <DatePicker 
                      selected={formData.endDate} 
                      onChange={(date) => handleInputChange({ target: { value: date } }, 'endDate')} 
                      selectsEnd 
                      startDate={formData.startDate} 
                      endDate={formData.endDate} 
                      minDate={formData.startDate} 
                      dateFormat="yyyy/MM/dd HH:mm" 
                      showTimeSelect
                      className="w-40 border border-gray-400 dark:border-gray-600 focus:border-gray-300 dark:focus:border-gray-300 px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm transition-colors" 
                      placeholderText="종료일시" 
                      calendarClassName="dark:bg-gray-800 dark:text-white" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-24 text-sm text-gray-700 dark:text-white">지원마감:</label>
                    <DatePicker 
                      selected={formData.deadline} 
                      onChange={(date) => handleInputChange({ target: { value: date } }, 'deadline')} 
                      dateFormat="yyyy/MM/dd" 
                      className="w-40 border border-gray-400 dark:border-gray-600 focus:border-gray-300 dark:focus:border-gray-300 px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm transition-colors" 
                      placeholderText="마감일" 
                      calendarClassName="dark:bg-gray-800 dark:text-white" 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4 text-gray-900 dark:text-white">
                <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white">채용팀 편성</h4>
                <div className="border-t border-gray-300 dark:border-gray-600 px-4 pt-3 space-y-3">
                  {teamMembers.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <input type="email" value={member.email} onChange={(e) => handleChange(setTeamMembers, idx, 'email', e.target.value)} className="flex-1 border border-gray-400 dark:border-gray-600 focus:border-gray-300 dark:focus:border-gray-300 px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors" />
                      <select value={member.role} onChange={(e) => handleChange(setTeamMembers, idx, 'role', e.target.value)} className="w-32 border border-gray-400 dark:border-gray-600 focus:border-gray-300 dark:focus:border-gray-300 px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors">
                        <option value="">권한 선택</option>
                        {roleOptions.map((role) => <option key={role}>{role}</option>)}
                      </select>
                      <button type="button" onClick={() => handleRemove(setTeamMembers, idx)} className="text-red-500 text-xl font-bold">×</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => handleAdd(setTeamMembers, { email: '', role: '' })} className="text-sm text-blue-600 hover:underline ml-4 mt-3">+ 멤버 추가</button>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4 text-gray-900 dark:text-white">
                <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white">가중치 항목</h4>
                <div className="border-t border-gray-300 dark:border-gray-600 px-4 pt-3 space-y-3">
                  {weights.map((weight, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <input type="text" value={weight.item} onChange={(e) => handleChange(setWeights, idx, 'item', e.target.value)} className="flex-1 border border-gray-400 dark:border-gray-600 focus:border-gray-300 dark:focus:border-gray-300 px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors" />
                      <select value={weight.score} onChange={(e) => handleChange(setWeights, idx, 'score', e.target.value)} className="w-24 border border-gray-400 dark:border-gray-600 focus:border-gray-300 dark:focus:border-gray-300 px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors">
                        <option value="">점수</option>
                        {scoreOptions.map(score => <option key={score}>{score}</option>)}
                      </select>
                      <button type="button" onClick={() => handleRemove(setWeights, idx)} className="text-red-500 text-xl font-bold">×</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => handleAdd(setWeights, { item: '', score: '' })} className="text-sm text-blue-600 hover:underline ml-4 mt-3">+ 항목 추가</button>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-10">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-6 py-3 rounded text-lg">
              등록하기
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export default PostRecruitment;