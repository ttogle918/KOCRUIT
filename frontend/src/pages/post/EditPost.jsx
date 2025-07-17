import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import "../../styles/datepicker.css";
import { useAuth } from '../../context/AuthContext';
import { useFormContext } from '../../context/FormContext';
import Layout from '../../layout/Layout';
import TimePicker from '../../components/TimePicker';
import CompanyMemberSelectModal from '../../components/CompanyMemberSelectModal';
import api, { extractWeights } from '../../api/api';

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

// Helper function to validate and convert dates for DatePicker
const validateDate = (date) => {
  if (!date) return null;
  if (date instanceof Date && !isNaN(date.getTime())) return date;
  if (typeof date === 'string') {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) ? parsedDate : null;
  }
  return null;
};

function EditPost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { jobPostId } = useParams();
  const { 
    formData: contextFormData, 
    updateFormData, 
    updateFormField, 
    updateTeamMembers, 
    updateSchedules, 
    updateWeights, 
    activateForm, 
    deactivateForm 
  } = useFormContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    qualifications: '',
    conditions: '',
    job_details: '',
    procedures: '',
    headcount: '',
    start_date: null,
    end_date: null,
    location: '',
    employment_type: '',
    deadline: null,
    company: null
  });

  const [teamMembers, setTeamMembers] = useState([{ email: '', role: '' }]);
  const [schedules, setSchedules] = useState([{ date: null, time: '', place: '' }]);
  const [weights, setWeights] = useState([]);
  const [isExtractingWeights, setIsExtractingWeights] = useState(false);
  
  // Company member selection modal state
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMemberIndex, setSelectedMemberIndex] = useState(null);
  const [userCompanyId, setUserCompanyId] = useState(null);

  const roleOptions = ['관리자', '멤버'];
  const scoreOptions = Array.from({ length: 10 }, (_, i) => (i + 1).toString());
  const employmentTypeOptions = ['정규직', '계약직', '인턴', '프리랜서'];

  const qualificationsRef = useAutoResize(formData.qualifications);
  const conditionsRef = useAutoResize(formData.conditions);
  const jobDetailsRef = useAutoResize(formData.job_details);
  const proceduresRef = useAutoResize(formData.procedures);

  const handleTextareaChange = (e, field) => {
    const newValue = e.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: newValue
    }));
    updateFormField(field, newValue);
  };

  const handleInputChange = (e, field) => {
    const newValue = e.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: newValue
    }));
    updateFormField(field, newValue);
  };

  // 폼 활성화 및 기존 데이터 로드
  useEffect(() => {
    activateForm('edit');
    
    const fetchJobPost = async () => {
      try {
        const response = await api.get(`/company/jobposts/${jobPostId}`);
        const jobPost = response.data;
        

        
        // Pre-populate form data
        const newFormData = {
          title: jobPost.title || '',
          department: jobPost.department || '',
          qualifications: jobPost.qualifications || '',
          conditions: jobPost.conditions || '',
          job_details: jobPost.job_details || '',
          procedures: jobPost.procedures || '',
          headcount: jobPost.headcount || '',
          start_date: jobPost.start_date ? new Date(jobPost.start_date) : null,
          end_date: jobPost.end_date ? new Date(jobPost.end_date) : null,
          location: jobPost.location || '',
          employment_type: jobPost.employment_type || '',
          deadline: jobPost.deadline ? new Date(jobPost.deadline) : null,
          company: jobPost.company || null
        };
        
        setFormData(newFormData);
        updateFormData(newFormData);

        // Set team members, schedules, and weights
        const newTeamMembers = jobPost.teamMembers || [{ email: '', name: '', role: '' }];
        setTeamMembers(newTeamMembers);
        updateTeamMembers(newTeamMembers);
        
        // Convert interview schedules from API format to form format
        if (jobPost.interview_schedules && jobPost.interview_schedules.length > 0) {
          const convertedSchedules = jobPost.interview_schedules.map(schedule => {
            // scheduled_at에서 날짜와 시간 추출
            const scheduledAt = new Date(schedule.scheduled_at);
            const date = scheduledAt;
            const time = scheduledAt.toTimeString().slice(0, 5); // HH:MM 형식
            
            return {
              date: date,
              time: time,
              place: schedule.location || ''
            };
          });
          setSchedules(convertedSchedules);
          updateSchedules(convertedSchedules);
        } else {
          const defaultSchedules = [{ date: null, time: '', place: '' }];
          setSchedules(defaultSchedules);
          updateSchedules(defaultSchedules);
        }
        
        // Set weights from existing data
        const newWeights = jobPost.weights || [];
        setWeights(newWeights);
        updateWeights(newWeights);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching job post:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (jobPostId) {
      fetchJobPost();
    }

    // 컴포넌트 언마운트 시 폼 비활성화
    return () => {
      deactivateForm();
    };
  }, [jobPostId, activateForm, deactivateForm, updateFormData, updateTeamMembers, updateSchedules, updateWeights]);

  // Fetch initial user data for company member selection
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await api.get('/auth/me');
        console.log('Current user info:', response.data);
        console.log('User company info:', {
          companyId: response.data.companyId,
          company_id: response.data.company_id,
          company: response.data.company,
          companyName: response.data.companyName
        });
        if (response.data) {
          setUserCompanyId(response.data.company_id);
          
          // 부서 정보 가져오기 (여러 필드명 확인)
          const getUserDepartment = (userData) => {
            // API에서 department_name이 오는지 확인
            if (userData.department_name) {
              console.log('Found department_name from API:', userData.department_name);
              return userData.department_name;
            }
            
            // 여러 가능한 필드명 확인
            const possibleFields = [
              userData.department,
              userData.dept,
              userData.team,
              userData.division,
              userData.company?.department,
              userData.company?.dept,
              userData.company?.team
            ];
            
            const department = possibleFields.find(field => field && typeof field === 'string');
            console.log('Department detection:', {
              possibleFields,
              foundDepartment: department
            });
            
            return department;
          };
          
          const userDepartment = getUserDepartment(response.data);
          
          // 사용자의 부서명을 자동으로 설정 (새로 생성하는 경우에만)
          if (!formData.department && userDepartment) {
            setFormData(prev => ({
              ...prev,
              department: userDepartment
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };

    fetchInitialData();
  }, []);



  // 입력 검증 함수
  const isFieldEmpty = (value) => value === null || value === undefined || value === '';
  const isTeamValid = teamMembers.length > 0 && teamMembers.every(m => m.email && m.role);
  const isScheduleValid = schedules.length > 0 && schedules.every(s => {
    // Check if date is valid (either Date object or valid date string)
    const isValidDate = s.date && (
      s.date instanceof Date || 
      (typeof s.date === 'string' && !isNaN(new Date(s.date).getTime()))
    );
    return isValidDate && s.time && s.place;
  });
  const isWeightsValid = weights.length >= 5 && weights.every(w => w.item && w.score !== '');
  const isRecruitInfoValid = [formData.title, formData.department, formData.qualifications, formData.conditions, formData.job_details, formData.procedures, formData.headcount, formData.start_date, formData.end_date, formData.location, formData.employment_type].every(v => !isFieldEmpty(v));
  const isReady = isRecruitInfoValid && isTeamValid && isScheduleValid && isWeightsValid;
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // AI 가중치 추출 함수
  const handleExtractWeights = async () => {
    if (!formData.title || !formData.qualifications || !formData.job_details) {
      alert('가중치 추출을 위해서는 채용공고 제목, 지원자격, 모집분야가 필요합니다.');
      return;
    }

    setIsExtractingWeights(true);
    try {
      // 채용공고 내용을 조합하여 AI에 전달
      const jobPostingContent = `
        제목: ${formData.title}
        부서: ${formData.department}
        지원자격: ${formData.qualifications}
        근무조건: ${formData.conditions}
        모집분야 및 자격요건: ${formData.job_details}
        전형절차: ${formData.procedures}
      `.trim();

      // 기존 가중치 항목들을 추출
      const existingWeightItems = weights
        .filter(weight => weight.item && weight.item.trim())
        .map(weight => weight.item.trim());

      const response = await extractWeights(jobPostingContent, existingWeightItems);
      
      if (response.weights && response.weights.length > 0) {
        // 기존 가중치 유지하고 새로운 가중치 추가
        const validExistingWeights = weights.filter(weight => weight.item && weight.item.trim());
        
        if (validExistingWeights.length >= 5) {
          // 5개 이상이면 기존 것 유지하고 새로운 것 하나만 추가
          const newWeight = response.weights.find(weight => 
            !existingWeightItems.includes(weight.item)
          );
          if (newWeight) {
            setWeights([...validExistingWeights, newWeight]);
          } else {
            alert('AI가 제안할 수 있는 새로운 가중치 항목이 없습니다. 기존 항목들을 수정하거나 직접 추가해주세요.');
          }
        } else {
          // 5개 미만이면 기존 것 유지하고 5개가 되도록 새로운 것들 추가
          const neededCount = 5 - validExistingWeights.length;
          const newWeights = response.weights
            .filter(weight => !existingWeightItems.includes(weight.item))
            .slice(0, neededCount);
          setWeights([...validExistingWeights, ...newWeights]);
        }
      } else {
        alert('가중치 추출에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('가중치 추출 오류:', error);
      alert('가중치 추출 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsExtractingWeights(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isReady) {
      setShowError(true);
      return;
    }
    setShowError(false);
    setSubmitting(true); // 로딩 시작
    
    // 디버깅: 토큰 상태 확인
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('user');
    console.log('🔐 Authentication Debug:');
    console.log('  Token exists:', !!token);
    console.log('  User info exists:', !!userInfo);
    console.log('  Current user:', user);
    
    if (!token) {
      alert('로그인이 필요합니다. 다시 로그인해주세요.');
      navigate('/login');
      setSubmitting(false); // 로딩 종료
      return;
    }
    
    try {
      // 날짜 형식 변환 - 시간대 정보 제거
      const formatDate = (date) => {
        if (!date) return null;
        // Ensure date is a valid Date object
        const validDate = validateDate(date);
        if (!validDate) return null;
        
        const year = validDate.getFullYear();
        const month = String(validDate.getMonth() + 1).padStart(2, '0');
        const day = String(validDate.getDate()).padStart(2, '0');
        const hours = String(validDate.getHours()).padStart(2, '0');
        const minutes = String(validDate.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      };

      // 면접 일정 데이터 변환
      const interviewSchedules = schedules
        .filter(schedule => schedule.date && schedule.time && schedule.place)
        .map(schedule => {
          // Ensure date is a valid Date object
          const date = validateDate(schedule.date);
          if (!date) return null;
          
          return {
            interview_date: date.toISOString().split('T')[0],  // YYYY-MM-DD
            interview_time: schedule.time,  // HH:MM
            location: schedule.place,
            max_participants: 1,
            notes: null
          };
        })
        .filter(Boolean); // Remove null entries

      const formattedData = {
        ...formData,
        headcount: formData.headcount ? parseInt(formData.headcount) : null,
        start_date: formatDate(formData.start_date),
        end_date: formatDate(formData.end_date),
        deadline: formData.deadline ? validateDate(formData.deadline)?.toISOString().split('T')[0] : null,
        teamMembers: teamMembers.filter(member => member.email && member.role),  // 빈 항목 제거
        weights: weights.filter(weight => weight.item && weight.score).map(weight => ({
          ...weight,
          score: parseFloat(weight.score)
        })),  // 빈 항목 제거 및 score를 float로 변환
        interview_schedules: interviewSchedules,  // 새로운 면접 일정 필드
      };

      console.log('Sending update data:', formattedData);

      const response = await api.put(`/company/jobposts/${jobPostId}`, formattedData);
      
      if (response.status === 200) {
        alert('채용공고가 수정되었습니다.');
        navigate(-1);
      }
    } catch (error) {
      console.error('Update failed:', error);
      console.error('Error response data:', error.response?.data);
      
      // 401 에러 시 로그인 페이지로 리다이렉트
      if (error.response?.status === 401) {
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        navigate('/login');
        return;
      }
      
      alert(error.response?.data?.detail?.[0]?.msg || error.response?.data?.message || '채용공고 수정에 실패했습니다.');
    } finally {
      setSubmitting(false); // 로딩 종료
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

  // Context와 폼 데이터 동기화
  useEffect(() => {
    if (contextFormData && Object.keys(contextFormData).length > 0) {
      // Context에서 업데이트된 데이터가 있으면 폼에 반영
      const updatedFormData = { ...formData, ...contextFormData };
      setFormData(updatedFormData);
      
      // 팀 멤버, 스케줄, 가중치도 동기화
      if (contextFormData.teamMembers && contextFormData.teamMembers.length > 0) {
        setTeamMembers(contextFormData.teamMembers);
      }
      if (contextFormData.schedules && contextFormData.schedules.length > 0) {
        setSchedules(contextFormData.schedules);
      }
      if (contextFormData.weights && contextFormData.weights.length > 0) {
        setWeights(contextFormData.weights);
      }
    }
  }, [contextFormData]);

  // 실시간 폼 데이터를 챗봇이 읽을 수 있도록 접근성 속성 업데이트
  useEffect(() => {
    // 면접 일정 데이터를 실시간으로 접근성 속성에 반영
    schedules.forEach((schedule, idx) => {
      const dateElement = document.getElementById(`schedule-${idx + 1}-date`);
      const timeElement = document.getElementById(`schedule-${idx + 1}-time`);
      const placeElement = document.getElementById(`schedule-${idx + 1}-place`);
      
      if (dateElement) {
        const dateLabel = schedule.date ? 
          (schedule.date instanceof Date ? schedule.date.toLocaleDateString() : 
           typeof schedule.date === 'string' ? new Date(schedule.date).toLocaleDateString() : 
           '날짜 형식 오류') : '';
        dateElement.setAttribute('aria-label', `면접 일정 ${idx + 1} 날짜 선택${dateLabel ? `: ${dateLabel}` : ''}`);
      }
      if (timeElement) {
        timeElement.setAttribute('aria-label', `면접 일정 ${idx + 1} 시간 선택${schedule.time ? `: ${schedule.time}` : ''}`);
      }
      if (placeElement) {
        placeElement.setAttribute('aria-label', `면접 일정 ${idx + 1} 장소 입력${schedule.place ? `: ${schedule.place}` : ''}`);
      }
    });

    // 가중치 데이터를 실시간으로 접근성 속성에 반영
    weights.forEach((weight, idx) => {
      // data 속성을 사용한 요소 선택
      const itemElement = document.querySelector(`input[data-weight-index="${idx}"][data-weight-type="item"]`);
      const scoreElement = document.querySelector(`input[data-weight-index="${idx}"][data-weight-type="score"]`);
      const descriptionElement = document.getElementById(`weight-${idx + 1}-description`);
      const weightsDescriptionElement = document.getElementById('weights-description');
      
      if (itemElement) {
        itemElement.setAttribute('aria-label', `가중치 항목 ${idx + 1} 이름${weight.item ? `: ${weight.item}` : ''}`);
      }
      if (scoreElement) {
        scoreElement.setAttribute('aria-label', `가중치 항목 ${idx + 1} 점수${weight.score ? `: ${weight.score}` : ''} (0.0에서 1.0 사이)`);
      }
      if (descriptionElement) {
        descriptionElement.textContent = `${weight.item ? `항목: ${weight.item}` : '항목명 미입력'}, ${weight.score ? `점수: ${weight.score}` : '점수 미입력'}`;
      }
    });
    
    // 전체 가중치 섹션 설명 업데이트
    const weightsDescriptionElement = document.getElementById('weights-description');
    if (weightsDescriptionElement) {
      const validWeights = weights.filter(w => w.item && w.score);
      const weightsText = validWeights.length > 0 
        ? validWeights.map((w, idx) => `${idx + 1}. ${w.item} (${w.score})`).join(', ')
        : '설정된 가중치 항목 없음';
      weightsDescriptionElement.textContent = `현재 설정된 가중치 항목: ${weightsText}`;
    }
  }, [schedules, weights, formData]);

  // 팀 멤버 데이터를 실시간으로 접근성 속성에 반영
  useEffect(() => {
    teamMembers.forEach((member, idx) => {
      const emailElement = document.querySelector(`input[type="email"][data-member-index="${idx}"]`);
      const roleElement = document.querySelector(`select[data-member-index="${idx}"]`);
      
      if (emailElement) {
        emailElement.setAttribute('aria-label', `팀원 ${idx + 1} 이메일 입력${member.email ? `: ${member.email}` : ''}`);
      }
      if (roleElement) {
        roleElement.setAttribute('aria-label', `팀원 ${idx + 1} 권한 선택${member.role ? `: ${member.role}` : ''}`);
      }
    });
  }, [teamMembers]);

  if (loading) {
    return (
      <Layout title="로딩 중...">
        <div className="flex justify-center items-center h-screen">
          <div className="text-xl">로딩 중...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="오류">
        <div className="flex justify-center items-center h-screen">
          <div className="text-xl text-red-500">{error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="채용공고 수정">
      <div className="min-h-screen bg-[#eef6ff] dark:bg-gray-900 p-6 mx-auto max-w-screen-xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4 text-center space-y-2">
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={(e) => handleInputChange(e, 'title')} 
                  className={`text-2xl font-semibold w-full text-center bg-transparent outline-none text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-600 pb-2 ${showError && !formData.title ? 'border-b-2 border-red-500' : ''}`} 
                  placeholder="채용공고 제목" 
                />
                {showError && !formData.title && <div className="text-red-500 text-xs text-left">채용공고 제목을 입력하세요.</div>}
                <input 
                  type="text" 
                  value={formData.department} 
                  onChange={(e) => handleInputChange(e, 'department')} 
                  className={`text-md w-full text-center bg-transparent outline-none text-gray-900 dark:text-gray-300 ${showError && !formData.department ? 'border-b-2 border-red-500' : ''}`} 
                  placeholder="부서명 (예: 개발팀, 인사팀)" 
                />
                {showError && !formData.department && <div className="text-red-500 text-xs text-left">부서명을 입력하세요.</div>}
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4">
                  <h4 className="text-lg font-semibold text-gray-900 ml-4 pb-2 dark:text-white">지원자격</h4>
                  <textarea 
                    ref={qualificationsRef}
                    value={formData.qualifications} 
                    onChange={(e) => handleTextareaChange(e, 'qualifications')} 
                    className={`w-full min-h-[100px] overflow-hidden resize-none p-4 rounded outline-none border-t border-gray-300 dark:border-gray-600 pt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${showError && !formData.qualifications ? 'border-2 border-red-500' : ''}`} 
                    placeholder="경력, 학력, 스킬, 우대사항 등" 
                  />
                  {showError && !formData.qualifications && <div className="text-red-500 text-xs text-left">지원자격을 입력하세요.</div>}
                </div>
                <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4">
                  <h4 className="text-lg font-semibold text-gray-900 ml-4 pb-2 dark:text-white">근무조건</h4>
                  <textarea 
                    ref={conditionsRef}
                    value={formData.conditions} 
                    onChange={(e) => handleTextareaChange(e, 'conditions')} 
                    className={`w-full min-h-[100px] overflow-hidden resize-none p-4 rounded outline-none border-t border-gray-300 dark:border-gray-600 pt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${showError && !formData.conditions ? 'border-2 border-red-500' : ''}`} 
                    placeholder="고용형태, 급여, 지역, 시간, 직책 등" 
                  />
                  {showError && !formData.conditions && <div className="text-red-500 text-xs text-left">근무조건을 입력하세요.</div>}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4">
                <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white">모집분야 및 자격요건</h4>
                <textarea 
                  ref={jobDetailsRef}
                  value={formData.job_details}
                  onChange={(e) => handleTextareaChange(e, 'job_details')} 
                  className={`w-full min-h-[100px] overflow-hidden resize-none p-4 rounded outline-none border-t border-gray-300 dark:border-gray-600 pt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${showError && !formData.job_details ? 'border-2 border-red-500' : ''}`} 
                  placeholder="담당업무, 자격요건, 우대사항 등" 
                />
                {showError && !formData.job_details && <div className="text-red-500 text-xs text-left">모집분야 및 자격요건을 입력하세요.</div>}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4">
                <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white">전형절차</h4>
                <textarea 
                  ref={proceduresRef}
                  value={formData.procedures} 
                  onChange={(e) => handleTextareaChange(e, 'procedures')} 
                  className={`w-full min-h-[100px] overflow-hidden resize-none rounded p-4 outline-none border-t border-gray-300 dark:border-gray-600 pt-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${showError && !formData.procedures ? 'border-2 border-red-500' : ''}`} 
                  placeholder="예: 서류 → 면접 → 합격" 
                />
                {showError && !formData.procedures && <div className="text-red-500 text-xs text-left">전형절차를 입력하세요.</div>}
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
                      className={`border px-2 py-1 rounded w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors ${showError && !formData.headcount ? 'border-red-500' : 'border-gray-400 dark:border-gray-600'}`} 
                    />
                  </div>
                  {showError && !formData.headcount && <div className="text-red-500 text-xs text-left">모집 인원을 입력하세요.</div>}
                  <div className="flex items-center gap-2 text-sm">
                    <label className="w-24 text-sm text-gray-700 dark:text-white">근무지역:</label>
                    <input 
                      type="text" 
                      value={formData.location} 
                      onChange={(e) => handleInputChange(e, 'location')} 
                      className={`border px-2 py-1 rounded w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors ${showError && !formData.location ? 'border-red-500' : 'border-gray-400 dark:border-gray-600'}`} 
                      placeholder="예: 서울시 강남구" 
                    />
                  </div>
                  {showError && !formData.location && <div className="text-red-500 text-xs text-left">근무지역을 입력하세요.</div>}
                  <div className="flex items-center gap-2 text-sm">
                    <label className="w-24 text-sm text-gray-700 dark:text-white">고용형태:</label>
                    <select 
                      value={formData.employment_type}
                      onChange={(e) => handleInputChange(e, 'employment_type')} 
                      className={`border px-2 py-1 rounded w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors ${showError && !formData.employment_type ? 'border-red-500' : 'border-gray-400 dark:border-gray-600'}`}
                    >
                      <option value="">선택하세요</option>
                      {employmentTypeOptions.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  {showError && !formData.employment_type && <div className="text-red-500 text-xs text-left">고용형태를 선택하세요.</div>}
                  <div className="flex flex-col gap-2 overflow-x-hidden">
                    <label className="text-sm text-gray-700 dark:text-white">모집기간:</label>
                    <div className="flex flex-col md:flex-row items-center gap-1 w-full">
                      <DatePicker 
                        selected={validateDate(formData.start_date)}
                        onChange={(date) => handleInputChange({ target: { value: date } }, 'start_date')} 
                        selectsStart 
                        startDate={validateDate(formData.start_date)} 
                        endDate={validateDate(formData.end_date)} 
                        dateFormat="yyyy/MM/dd HH:mm" 
                        showTimeSelect
                        className={`w-full md:w-36 min-w-0 border px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm transition-colors ${showError && !formData.start_date ? 'border-red-500' : 'border-gray-400 dark:border-gray-600'}`}
                        placeholderText="시작일시" 
                        calendarClassName="bg-white text-gray-900 dark:bg-gray-800 dark:text-white" 
                        popperClassName="dark:bg-gray-800 dark:text-white border-0 shadow-lg" 
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 px-1">~</span>
                      <DatePicker 
                        selected={validateDate(formData.end_date)} 
                        onChange={(date) => handleInputChange({ target: { value: date } }, 'end_date')} 
                        selectsEnd 
                        startDate={validateDate(formData.start_date)} 
                        endDate={validateDate(formData.end_date)} 
                        minDate={validateDate(formData.start_date)} 
                        dateFormat="yyyy/MM/dd HH:mm" 
                        showTimeSelect
                        className={`w-full md:w-36 min-w-0 border px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm transition-colors ${showError && !formData.end_date ? 'border-red-500' : 'border-gray-400 dark:border-gray-600'}`}
                        placeholderText="종료일시" 
                        calendarClassName="bg-white text-gray-900 dark:bg-gray-800 dark:text-white" 
                        popperClassName="dark:bg-gray-800 dark:text-white border-0 shadow-lg" 
                      />
                    </div>
                    {showError && (!formData.start_date || !formData.end_date) && (
                      <div className="text-red-500 text-xs text-left mt-1">시작일시와 종료일시를 모두 입력하세요.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4 text-gray-900 dark:text-white">
                <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white">채용팀 편성</h4>
                <div className="border-t border-gray-300 dark:border-gray-600 px-4 pt-3 space-y-3">
                  {teamMembers.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <input 
                        type="email" 
                        value={member.email} 
                        onChange={e => setTeamMembers(prev => prev.map((m, i) => i === idx ? { ...m, email: e.target.value } : m))} 
                        className={`flex-1 border px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${showError && !member.email ? 'border-red-500' : 'border-gray-400 dark:border-gray-600'}`} 
                        placeholder="이메일" 
                        data-member-index={idx}
                        aria-label={`팀원 ${idx + 1} 이메일 입력${member.email ? `: ${member.email}` : ''}`}
                        onClick={() => {
                          setSelectedMemberIndex(idx);
                          setShowMemberModal(true);
                        }}
                        readOnly
                      />
                      <select 
                        value={member.role} 
                        onChange={e => setTeamMembers(prev => prev.map((m, i) => i === idx ? { ...m, role: e.target.value } : m))} 
                        className={`w-32 border px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${showError && !member.role ? 'border-red-500' : 'border-gray-400 dark:border-gray-600'}`}
                        data-member-index={idx}
                        aria-label={`팀원 ${idx + 1} 권한 선택${member.role ? `: ${member.role}` : ''}`}
                      >
                        <option value="">권한 선택</option>
                        <option value="관리자">관리자</option>
                        <option value="멤버">멤버</option>
                      </select>
                      <button 
                        type="button" 
                        onClick={() => setTeamMembers(prev => prev.filter((_, i) => i !== idx))} 
                        className="text-red-500 text-xl font-bold"
                        aria-label={`팀원 ${idx + 1} 삭제`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => {
                      setSelectedMemberIndex(teamMembers.length);
                      setShowMemberModal(true);
                    }} 
                    className="w-full text-sm text-blue-600 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 py-2 rounded border border-dashed border-blue-300 dark:border-blue-600 transition-colors"
                    aria-label="새로운 팀 멤버 추가"
                  >
                    + 멤버 추가
                  </button>
                  {showError && !isTeamValid && <div className="text-red-500 text-sm mt-1">모든 팀원 이메일과 권한을 입력하세요.</div>}
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    * 같은 회사 소속 멤버만 선택할 수 있습니다.
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4 text-gray-900 dark:text-white">
                <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white" id="interview-schedule-section">면접 일정</h4>
                <div className="border-t border-gray-300 dark:border-gray-600 px-4 pt-3 space-y-4" role="region" aria-labelledby="interview-schedule-section">
                  {schedules.map((sch, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-3" role="group" aria-labelledby={`schedule-${idx + 1}-title`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300" id={`schedule-${idx + 1}-title`}>면접 일정 {idx + 1}</span>
                        <button 
                          type="button" 
                          onClick={() => setSchedules(prev => prev.filter((_, i) => i !== idx))} 
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-lg font-bold p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          aria-label={`면접 일정 ${idx + 1} 삭제`}
                        >
                          ×
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-gray-600 dark:text-gray-400" htmlFor={`schedule-${idx + 1}-date`}>날짜</label>
                          <DatePicker 
                            selected={validateDate(sch.date)} 
                            onChange={date => setSchedules(prev => prev.map((s, i) => i === idx ? { ...s, date } : s))} 
                            dateFormat="yyyy/MM/dd" 
                            className={`w-full border px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm ${showError && !sch.date ? 'border-red-500' : 'border-gray-400 dark:border-gray-600'}`} 
                            placeholderText="날짜 선택" 
                            calendarClassName="bg-white text-gray-900 dark:bg-gray-800 dark:text-white" 
                            popperClassName="dark:bg-gray-800 dark:text-white border-0 shadow-lg"
                            id={`schedule-${idx + 1}-date`}
                            aria-label={`면접 일정 ${idx + 1} 날짜 선택${sch.date ? 
                              (sch.date instanceof Date ? `: ${sch.date.toLocaleDateString()}` : 
                               typeof sch.date === 'string' ? `: ${new Date(sch.date).toLocaleDateString()}` : 
                               ': 날짜 형식 오류') : ''}`}
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs text-gray-600 dark:text-gray-400" htmlFor={`schedule-${idx + 1}-time`}>시간</label>
                          <TimePicker 
                            value={sch.time} 
                            onChange={e => setSchedules(prev => prev.map((s, i) => i === idx ? { ...s, time: e.target.value } : s))} 
                            placeholder="시간 선택"
                            error={showError && !sch.time}
                            id={`schedule-${idx + 1}-time`}
                            aria-label={`면접 일정 ${idx + 1} 시간 선택${sch.time ? `: ${sch.time}` : ''}`}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600 dark:text-gray-400" htmlFor={`schedule-${idx + 1}-place`}>장소</label>
                        <input 
                          type="text" 
                          value={sch.place} 
                          onChange={e => setSchedules(prev => prev.map((s, i) => i === idx ? { ...s, place: e.target.value } : s))} 
                          className={`w-full border px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm ${showError && !sch.place ? 'border-red-500' : 'border-gray-400 dark:border-gray-600'}`} 
                          placeholder="면접 장소 (예: 회사 3층 회의실)" 
                          id={`schedule-${idx + 1}-place`}
                          aria-label={`면접 일정 ${idx + 1} 장소 입력${sch.place ? `: ${sch.place}` : ''}`}
                        />
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    onClick={() => {
                      setSchedules(prev => {
                        if (prev.length === 0) {
                          return [{ date: null, time: '', place: '' }];
                        }
                        // 마지막 면접 일정의 형식을 복사
                        const lastSchedule = prev[prev.length - 1];
                        return [...prev, { 
                          date: lastSchedule.date, 
                          time: lastSchedule.time, 
                          place: lastSchedule.place 
                        }];
                      });
                    }} 
                    className="w-full text-sm text-blue-600 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 py-2 rounded border-dashed border-blue-300 dark:border-blue-600 transition-colors"
                    aria-label="새로운 면접 일정 추가"
                  >
                    + 면접 일정 추가
                  </button>
                  
                  {showError && schedules.length === 0 && (
                    <div className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded" role="alert">
                      최소 하나의 면접 일정을 추가해 주세요.
                    </div>
                  )}
                  {showError && schedules.length > 0 && schedules.some(s => {
                    const isValidDate = s.date && (
                      s.date instanceof Date || 
                      (typeof s.date === 'string' && !isNaN(new Date(s.date).getTime()))
                    );
                    return !isValidDate || !s.time || !s.place;
                  }) && (
                    <div className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded" role="alert">
                      모든 면접 일정의 날짜, 시간, 장소를 입력하세요.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-400 p-4 text-gray-900 dark:text-white" role="region" aria-labelledby="weights-section-title">
                <h4 className="text-lg font-semibold ml-4 pb-2 dark:text-white" id="weights-section-title">가중치 설정</h4>
                <div className="border-t border-gray-300 dark:border-gray-600 px-4 pt-3 space-y-4" role="group" aria-describedby="weights-description">
                  {weights.map((weight, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm" role="group" aria-labelledby={`weight-${idx + 1}-label`}>
                      <label className="sr-only" id={`weight-${idx + 1}-label`}>가중치 항목 {idx + 1}</label>
                      <input 
                        type="text" 
                        value={weight.item} 
                        onChange={e => setWeights(prev => prev.map((w, i) => i === idx ? { ...w, item: e.target.value } : w))} 
                        className={`flex-1 border px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${showError && !weight.item ? 'border-red-500' : 'border-gray-400 dark:border-gray-600'}`} 
                        placeholder="가중치 항목 (예: 학력, 경력)" 
                        data-weight-index={idx}
                        data-weight-type="item"
                        aria-label={`가중치 항목 ${idx + 1} 이름${weight.item ? `: ${weight.item}` : ''}`}
                        aria-describedby={`weight-${idx + 1}-description`}
                      />
                      <input 
                        type="number" 
                        value={weight.score} 
                        onChange={e => {
                          const value = parseFloat(e.target.value);
                          if (value >= 0.0 && value <= 1.0) {
                            setWeights(prev => prev.map((w, i) => i === idx ? { ...w, score: e.target.value } : w));
                          }
                        }} 
                        min="0.0" 
                        max="1.0" 
                        step="0.1"
                        className={`w-20 border px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${showError && weight.score === '' ? 'border-red-500' : 'border-gray-400 dark:border-gray-600'}`} 
                        placeholder="0.0~1.0" 
                        data-weight-index={idx}
                        data-weight-type="score"
                        aria-label={`가중치 항목 ${idx + 1} 점수${weight.score ? `: ${weight.score}` : ''} (0.0에서 1.0 사이)`}
                        aria-describedby={`weight-${idx + 1}-description`}
                      />
                      <button 
                        type="button" 
                        onClick={() => setWeights(prev => prev.filter((_, i) => i !== idx))} 
                        className="text-red-500 text-xl font-bold hover:text-red-700 dark:hover:text-red-400"
                        data-weight-index={idx}
                        aria-label={`가중치 항목 ${idx + 1} 삭제`}
                      >
                        ×
                      </button>
                      <div className="sr-only" id={`weight-${idx + 1}-description`}>
                        {weight.item ? `항목: ${weight.item}` : '항목명 미입력'}, {weight.score ? `점수: ${weight.score}` : '점수 미입력'}
                      </div>
                    </div>
                  ))}
                  <div className="sr-only" id="weights-description">
                    현재 설정된 가중치 항목: {weights.filter(w => w.item && w.score).map((w, idx) => `${idx + 1}. ${w.item} (${w.score})`).join(', ')}
                  </div>
                  {showError && weights.length === 0 && (
                    <div className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded" role="alert">
                      최소 하나의 가중치 항목을 추가해 주세요.
                    </div>
                  )}
                  {showError && weights.length > 0 && weights.some(w => !w.item || w.score === '') && (
                    <div className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded" role="alert">
                      모든 가중치 항목의 항목명과 점수를 입력하세요.
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">AI 가중치 추출</span>
                    <button 
                      type="button" 
                      onClick={handleExtractWeights}
                      disabled={isExtractingWeights}
                      className="text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isExtractingWeights ? '추출 중...' : 'AI 가중치 추출'}
                    </button>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setWeights(prev => [...prev, { item: '', score: '' }])} 
                    className="w-full text-sm text-blue-600 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 py-2 rounded border border-dashed border-blue-300 dark:border-blue-600 transition-colors"
                    aria-label="새로운 가중치 항목 추가"
                  >
                    + 가중치 추가
                  </button>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded" role="note">
                    <strong>가중치 점수 설명:</strong><br/>
                    • 0.0: 매우 낮은 중요도<br/>
                    • 0.5: 보통 중요도<br/>
                    • 1.0: 매우 높은 중요도<br/>
                    이 점수는 이력서 평가 시 각 항목의 중요도를 결정합니다.
                  </div>
                </div>
              </div>
            </div>
          </div>
          {showError && !isReady && (
            <div className="text-red-500 text-center mt-2">
              {!isRecruitInfoValid && '기입하지 않은 항목이 있습니다. 모든 항목을 입력해 주세요.'}
              {isRecruitInfoValid && !isTeamValid && '채용팀 편성을 완료해 주세요.'}
              {isRecruitInfoValid && isTeamValid && !isScheduleValid && '면접 일정을 설정해 주세요.'}
              {isRecruitInfoValid && isTeamValid && isScheduleValid && !isWeightsValid && '가중치 설정을 완료해 주세요. (최소 5개 항목, 모든 점수 입력)'}
            </div>
          )}
          <div className="flex justify-center mt-10">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-6 py-3 rounded text-lg">수정 완료</button>
          </div>
        </form>
      </div>

      {submitting && (
        <div className="flex justify-center items-center mt-4">
          <span className="text-blue-600 text-lg">저장 중입니다. 잠시만 기다려주세요...</span>
        </div>
      )}

      {showMemberModal && (
        <CompanyMemberSelectModal
          companyId={userCompanyId}
          selectedMembers={teamMembers.filter(member => member.email && member.email.trim() !== '')}
          onSelect={(email, name) => {
            if (selectedMemberIndex !== null) {
              setTeamMembers(prev => {
                // 새로운 멤버 추가인 경우
                if (selectedMemberIndex === prev.length) {
                  return [...prev, { email, name, role: '' }];
                }
                // 기존 멤버 수정인 경우
                return prev.map((member, idx) => 
                  idx === selectedMemberIndex ? { email, name, role: member.role || '' } : member
                );
              });
            }
            setShowMemberModal(false);
            setSelectedMemberIndex(null);
          }}
          onClose={() => {
            setShowMemberModal(false);
            setSelectedMemberIndex(null);
          }}
        />
      )}
    </Layout>
  );
}

export default EditPost;
