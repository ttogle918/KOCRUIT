import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaStar, FaRegStar, FaEnvelope } from 'react-icons/fa';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart } from 'recharts';
import api from '../api/api';
import PersonalQuestionApi from '../api/personalQuestionApi';
import { calculateAge } from '../utils/resumeUtils';
import GrowthPredictionCard from './GrowthPredictionCard';

const PassReasonCard = ({ applicant, onBack, onStatusChange, feedbacks }) => {
  const [growthResult, setGrowthResult] = useState(null);
  const [growthDetailsCollapsed, setGrowthDetailsCollapsed] = useState(false);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(applicant?.isBookmarked === 'Y');
  const [aiScore, setAiScore] = useState(applicant?.ai_score || 0);
  const [aiPassReason, setAiPassReason] = useState(applicant?.pass_reason || '');
  const [aiFailReason, setAiFailReason] = useState(applicant?.fail_reason || '');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState(null);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [questionRequested, setQuestionRequested] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [showFullReason, setShowFullReason] = useState(false);
  const applicationId = applicant?.application_id || applicant?.applicationId;
  const passReason = applicant?.pass_reason || '';

  // applicant가 바뀔 때 growthResult 초기화
  useEffect(() => {
    setGrowthResult(null);
  }, [applicant]);

  // Box plot 항목별 단위/설명 매핑
  const boxplotLabels = {
    '경력(년)': { label: '경력(년)', unit: '년', desc: '고성과자 총 경력 연수 분포' },
    '주요 프로젝트 경험 수': { label: '주요 프로젝트 경험 수', unit: '개', desc: '고성과자 주요 프로젝트 경험 개수' },
    '학력': { label: '학력', unit: '레벨', desc: '학사=2, 석사=3, 박사=4' },
    '자격증': { label: '자격증 개수', unit: '개', desc: '고성과자 자격증 보유 개수' },
  };

  // 레이더 차트 데이터 처리 함수들
  const [chartMode, setChartMode] = useState('ratio'); // 'ratio' | 'normalized' | 'raw'

  // 1. 비율(고성과자=100) 데이터 변환
  const getRatioData = () => {
    if (!growthResult || !growthResult.comparison_chart_data) return [];
    const { labels, applicant, high_performer } = growthResult.comparison_chart_data;
    return labels.map((label, idx) => {
      const max = high_performer[idx] > 0 ? high_performer[idx] : 1;
      const applicantNorm = (applicant[idx] / max) * 100;
      return {
        항목: label,
        지원자: Math.min(applicantNorm, 100),
        고성과자: 100,
        raw_지원자: applicant[idx],
        raw_고성과자: high_performer[idx],
        지원자비율: applicantNorm,
      };
    });
  };

  // 2. 정규화(0~100) 데이터 변환 (항목별 최대값 기준)
  const getNormalizedData = () => {
    if (!growthResult || !growthResult.comparison_chart_data) return [];
    const { labels, applicant, high_performer } = growthResult.comparison_chart_data;
    return labels.map((label, idx) => {
      const max = Math.max(applicant[idx], high_performer[idx], 1);
      return {
        항목: label,
        지원자: (applicant[idx] / max) * 100,
        고성과자: (high_performer[idx] / max) * 100,
        raw_지원자: applicant[idx],
        raw_고성과자: high_performer[idx],
      };
    });
  };

  // 3. 실제값 데이터 변환
  const getRawData = () => {
    try {
      if (!growthResult || !growthResult.comparison_chart_data) {
        console.log('getRawData: growthResult 또는 comparison_chart_data가 없습니다.');
        return [];
      }
      
      const { labels, applicant, high_performer } = growthResult.comparison_chart_data;
      
      if (!labels || !applicant || !high_performer) {
        console.log('getRawData: 필요한 데이터 필드가 없습니다.', { labels, applicant, high_performer });
        return [];
      }
      
      const result = labels.map((label, idx) => ({
        항목: label,
        지원자: applicant[idx] || 0,
        고성과자: high_performer[idx] || 0,
      }));
      
      console.log('getRawData 결과:', result);
      return result;
    } catch (error) {
      console.error('getRawData 오류:', error);
      return [];
    }
  };

  // 실제값 모드에서 최대값 계산 (축 범위용)
  const getMaxValue = () => {
    try {
      if (!growthResult || !growthResult.comparison_chart_data) {
        console.log('getMaxValue: growthResult 또는 comparison_chart_data가 없습니다.');
        return 100;
      }
      
      const { applicant, high_performer } = growthResult.comparison_chart_data;
      
      if (!applicant || !high_performer) {
        console.log('getMaxValue: applicant 또는 high_performer가 없습니다.');
        return 100;
      }
      
      const maxValue = Math.ceil(Math.max(...applicant, ...high_performer, 1));
      console.log('getMaxValue 결과:', maxValue);
      return maxValue;
    } catch (error) {
      console.error('getMaxValue 오류:', error);
      return 100;
    }
  };

  // 그래프 데이터 및 축/범위/설명 선택
  let chartData = [];
  let yDomain = [0, 100];
  let chartDesc = '';
  
  try {
    if (chartMode === 'ratio') {
      chartData = getRatioData();
      yDomain = [0, 100];
      chartDesc = '고성과자=100%로 환산한 지원자 상대비율입니다. (실제값은 툴팁 참고)';
    } else if (chartMode === 'normalized') {
      chartData = getNormalizedData();
      yDomain = [0, 100];
      chartDesc = '각 항목별로 0~100으로 정규화한 값입니다. (실제값은 툴팁 참고)';
    } else if (chartMode === 'raw') {
      chartData = getRawData();
      const maxValue = getMaxValue();
      yDomain = [0, maxValue];
      chartDesc = '실제값(절대값) 비교입니다. 값의 편차가 클 수 있습니다.';
      
      // 디버깅 로그 추가
      console.log('실제값 모드 데이터:', {
        chartData,
        maxValue,
        yDomain,
        chartDataLength: chartData.length
      });
    }
  } catch (error) {
    console.error('차트 데이터 처리 중 오류:', error);
    chartData = [];
    yDomain = [0, 100];
    chartDesc = '데이터 처리 중 오류가 발생했습니다.';
  }

  useEffect(() => {
    const fetchResume = async () => {
      if (!applicant?.resumeId) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get(`/resumes/${applicant.resumeId}`);
        setResume(response.data);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    fetchResume();
  }, [applicant]);

  useEffect(() => {
    if (applicant?.ai_score !== undefined) {
      setAiScore(applicant.ai_score);
      setAiPassReason(applicant.pass_reason || '');
      setAiFailReason(applicant.fail_reason || '');
    }
  }, [applicant?.ai_score, applicant?.pass_reason, applicant?.fail_reason]);

  useEffect(() => {
    if (!passReason) return;
    setSummaryLoading(true);
    setSummaryError(null);
    setSummary('');
    api.post('/ai-evaluate/summary', { pass_reason: passReason })
      .then(res => {
        if (res.data && res.data.summary) {
          setSummary(res.data.summary);
        } else {
          setSummaryError('요약 데이터가 없습니다.');
        }
      })
      .catch((error) => {
        console.error('합격 요약 API 오류:', error);
        setSummaryError(error.response?.data?.detail || '요약 생성 중 오류가 발생했습니다.');
      })
      .finally(() => setSummaryLoading(false));
  }, [passReason]);

  // AI 질문 생성 로직 복원
  const handleRequestQuestions = async () => {
    if (!applicant?.application_id && !applicant?.applicationId) {
      setQuestionError('지원자 정보가 없습니다.');
      return;
    }
    
    setQuestionLoading(true);
    setQuestionError(null);
    setAiQuestions([]);
    setQuestionRequested(true);
    
    console.log('AI 개인 질문 생성 시작:', {
      application_id: applicant.application_id || applicant.applicationId,
      company_name: applicant.companyName || applicant.company_name || '회사'
    });
    
    try {
      console.log('AI 개인 질문 생성 시작 - 지원자 정보:', {
        application_id: applicant.application_id || applicant.applicationId,
        name: applicant.name,
        education: applicant.education,
        experience: applicant.experience,
        skills: applicant.skills
      });
      
      // 개인별 맞춤형 질문 생성을 위한 API 호출
      const response = await PersonalQuestionApi.generatePersonalQuestions({
        application_id: applicant.application_id || applicant.applicationId,
        company_name: applicant.companyName || applicant.company_name || '회사',
        // 개인별 질문 생성을 위한 추가 정보
        resume_data: {
          personal_info: {
            name: applicant.name || '지원자',
            email: applicant.email || '',
            birthDate: applicant.birthDate || ''
          },
          education: {
            university: applicant.university || applicant.education?.university || '',
            major: applicant.major || applicant.education?.major || '',
            degree: applicant.degree || applicant.education?.degree || '',
            gpa: applicant.gpa || applicant.education?.gpa || ''
          },
          experience: {
            companies: Array.isArray(applicant.companies) ? applicant.companies : 
                      Array.isArray(applicant.experience?.companies) ? applicant.experience.companies : [],
            position: applicant.position || applicant.experience?.position || '',
            duration: applicant.duration || applicant.experience?.duration || ''
          },
          skills: {
            programming_languages: Array.isArray(applicant.programming_languages) ? applicant.programming_languages :
                                 Array.isArray(applicant.skills?.programming_languages) ? applicant.skills.programming_languages : [],
            frameworks: Array.isArray(applicant.frameworks) ? applicant.frameworks :
                      Array.isArray(applicant.skills?.frameworks) ? applicant.skills.frameworks : [],
            databases: Array.isArray(applicant.databases) ? applicant.databases :
                      Array.isArray(applicant.skills?.databases) ? applicant.skills.databases : [],
            tools: Array.isArray(applicant.tools) ? applicant.tools :
                  Array.isArray(applicant.skills?.tools) ? applicant.skills.tools : []
          },
          projects: Array.isArray(applicant.projects) ? applicant.projects : [],
          activities: Array.isArray(applicant.activities) ? applicant.activities : []
        }
      });
      
      console.log('AI 개인 질문 생성 응답:', response);
      console.log('응답 데이터 구조:', {
        has_question_bundle: !!response?.question_bundle,
        has_questions: !!response?.questions,
        question_bundle_keys: response?.question_bundle ? Object.keys(response.question_bundle) : [],
        questions_length: response?.questions ? response.questions.length : 0
      });
      
      // 개인별 질문 데이터 처리 - 개인 질문만 필터링
      let q = response?.question_bundle || response?.question_categories || response?.questions || {};
      
      // 개인 질문만 필터링 - 모든 개인별 질문 카테고리 포함
      if (typeof q === 'object' && q !== null) {
        const personalQuestions = {};
        Object.entries(q).forEach(([category, questions]) => {
          // 개인별 질문 관련 카테고리들 모두 포함
          if (category === 'personal' || 
              category === '개인별 질문' || 
              category === '프로젝트 경험' || 
              category === '상황 대처' || 
              category === '자기소개서 요약' || 
              category === 'personal_questions' ||
              category === '학력/전공' ||
              category === '경력/직무' ||
              category === '기술 스택' ||
              category === '프로젝트 경험' ||
              category === '인성/동기' ||
              category === '회사/직무 적합성') {
            personalQuestions[category] = questions;
          }
        });
        q = personalQuestions;
      }
      
      if (Array.isArray(q)) q = { "개인별 질문": q };
      
      // 질문이 실제로 생성되었는지 확인
      const hasQuestions = q && typeof q === 'object' && Object.keys(q).length > 0;
      const totalQuestions = hasQuestions ? Object.values(q).flat().length : 0;
      
      if (hasQuestions && totalQuestions > 0) {
        setAiQuestions(q);
        console.log(`✅ AI 개인 질문 생성 완료: ${totalQuestions}개 질문`);
      } else {
        setQuestionError('AI 개인 질문이 생성되지 않았습니다. 다시 시도해주세요.');
        setQuestionRequested(false);
      }
    } catch (err) {
      console.error('AI 개인 질문 생성 오류:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.message || 
                          'AI 개인 질문 생성 중 오류가 발생했습니다.';
      setQuestionError(errorMessage);
      setQuestionRequested(false);
    } finally {
      setQuestionLoading(false);
    }
  };

  useEffect(() => {
    setAiQuestions([]);
    setQuestionError(null);
    setQuestionLoading(false);
    setQuestionRequested(false);
  }, [applicant?.application_id, applicant?.applicationId]);

  // 저장된 개인 질문 조회
  const loadSavedPersonalQuestions = async () => {
    if (!applicationId) return;
    
    try {
      setQuestionLoading(true);
      console.log('🔍 저장된 개인 질문 조회 시작:', applicationId);
      
      const savedQuestions = await PersonalQuestionApi.getPersonalQuestions(applicationId);
      console.log('📦 저장된 개인 질문 응답:', savedQuestions);
      
      // 개인별 질문 데이터 처리 - DB에서 가져온 데이터 그대로 사용
      let q = savedQuestions?.question_bundle || {};
      console.log('📋 원본 질문 데이터:', q);
      
      // 질문 데이터가 있는지 확인
      if (!q || Object.keys(q).length === 0) {
        q = savedQuestions?.questions ? { "개인별 질문": savedQuestions.questions } : {};
      }
      
      // 질문이 실제로 있는지 확인
      const hasQuestions = q && typeof q === 'object' && Object.keys(q).length > 0;
      const totalQuestions = hasQuestions ? Object.values(q).flat().length : 0;
      
      console.log('📊 질문 검증 결과:', {
        hasQuestions,
        totalQuestions,
        questionKeys: q ? Object.keys(q) : [],
        questionData: q
      });
      
      if (hasQuestions && totalQuestions > 0) {
        setAiQuestions(q);
        setQuestionRequested(true);
        console.log(`✅ 저장된 개인 질문 로드 완료: ${totalQuestions}개 질문`);
      } else {
        console.log('❌ 저장된 개인 질문이 없습니다. AI 생성 실행...');
        // 저장된 질문이 없으면 AI 생성 실행
        await handleRequestQuestions();
      }
    } catch (error) {
      console.log('❌ 저장된 개인 질문 조회 실패:', error.message);
      // 저장된 질문 조회 실패 시 AI 생성 실행
      await handleRequestQuestions();
    } finally {
      setQuestionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 h-full flex items-center justify-center min-h-[600px]">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 h-full flex flex-col gap-6 overflow-y-auto max-w-full min-h-[700px] justify-between">
      {/* 상단 프로필/이름/나이/이메일/지원경로 */}
      <div className="flex items-center gap-6 border-b pb-6 min-w-0">
        <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-3xl text-white shrink-0">
          <i className="fa-solid fa-user" />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-xl text-gray-800 dark:text-white truncate">{applicant?.name}</span>
            <span className="text-base text-gray-500 dark:text-gray-300">({calculateAge(applicant?.birthDate)}세)</span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">{applicant?.applicationSource || 'DIRECT'} 지원</span>
          </div>
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-300 text-sm min-w-0">
            <FaEnvelope className="inline-block mr-1" />
            <span className="truncate">{applicant?.email || 'N/A'}</span>
          </div>
        </div>
        <button onClick={onBack} className="ml-auto flex items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors text-lg">
          <FaArrowLeft />
          <span className="text-base font-medium">목록</span>
        </button>
      </div>

      {/* 점수/합격/AI예측 강조 카드 */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl p-8 shadow-inner w-full overflow-visible flex-grow-0">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          {/* AI 점수는 항상 표시 */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-300 mb-1 break-words">{aiScore}점</div>
            <div className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-2">합격</div>
          </div>
          
          {/* 성장 예측 점수는 항상 GrowthPredictionCard 표시 */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            {applicationId && <GrowthPredictionCard key={applicationId} applicationId={applicationId} onResultChange={setGrowthResult} />}
          </div>
        </div>
      </div>

      {/* AI 성장 예측 상세 내용 */}
      {applicationId && growthResult && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-blue-100 dark:border-blue-900/40 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-bold text-gray-800 dark:text-white">AI 성장 예측 상세 결과</div>
            <button
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              onClick={() => setGrowthDetailsCollapsed(!growthDetailsCollapsed)}
            >
              {growthDetailsCollapsed ? '펼치기' : '접기'}
            </button>
          </div>
          {/* 표 + 설명 */}
          {!growthDetailsCollapsed && (
            <>
              {growthResult.item_table && (
                <div className="pb-4">
                  <table className="w-full text-sm border rounded bg-gray-50 mb-2 mt-2">
                    <thead>
                      <tr>
                        <th className="border-b p-2 text-left">항목</th>
                        <th className="border-b p-2 text-left">지원자</th>
                        <th className="border-b p-2 text-left">고성과자평균</th>
                        <th className="border-b p-2 text-left">항목점수</th>
                        <th className="border-b p-2 text-left">비중(%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {growthResult.item_table.map((row, i) => (
                        <tr key={i}>
                          <td className="border-b p-2 font-semibold text-blue-900">{row["항목"]}</td>
                          <td className="border-b p-2">{row["지원자"]}</td>
                          <td className="border-b p-2">{row["고성과자평균"]}</td>
                          <td className="border-b p-2">{row["항목점수"]}</td>
                          <td className="border-b p-2">{row["비중"]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                                {growthResult.narrative && (
                <div className="text-base text-blue-800 font-semibold mt-4 whitespace-pre-line">{growthResult.narrative}</div>
              )}
            </div>
          )}

          {/* 레이더 차트: 지원자 vs 고성과자 비교 */}
          {growthResult.comparison_chart_data && (
            <div className="mt-6">
              <h4 className="font-semibold text-base mb-4 text-gray-800 dark:text-white">지원자 vs 고성과자 비교</h4>
              
              {/* 그래프 모드 선택 버튼 */}
              <div className="flex gap-2 mb-2">
                <button
                  className={`px-2 py-1 rounded text-xs border ${chartMode === 'ratio' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-blue-700'}`}
                  onClick={() => setChartMode('ratio')}
                >
                  비율(고성과자=100) 보기
                </button>
                <button
                  className={`px-2 py-1 rounded text-xs border ${chartMode === 'normalized' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-blue-700'}`}
                  onClick={() => setChartMode('normalized')}
                >
                  정규화(0~100) 보기
                </button>
                <button
                  className={`px-2 py-1 rounded text-xs border ${chartMode === 'raw' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-blue-700'}`}
                  onClick={() => setChartMode('raw')}
                >
                  실제값 보기
                </button>
              </div>
              <div className="text-xs text-gray-500 mb-2">{chartDesc}</div>
              
              <div className="mt-2">
                {chartData.length > 0 ? (
                  chartMode === 'ratio' || chartMode === 'normalized' ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={chartData} outerRadius={100}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="항목" />
                        <PolarRadiusAxis angle={30} domain={yDomain} />
                        <Radar name="지원자" dataKey="지원자" stroke="#2563eb" fill="#2563eb" fillOpacity={0.4} />
                        <Radar name="고성과자" dataKey="고성과자" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                        <Legend />
                        <Tooltip
                          formatter={(value, name, props) => {
                            if (name === '지원자') {
                              return [
                                chartMode === 'ratio' || chartMode === 'normalized'
                                  ? `${value.toFixed(1)}% (실제: ${props.payload.raw_지원자})`
                                  : `${value} (실제값)`,
                                '지원자',
                              ];
                            }
                            if (name === '고성과자') {
                              return [
                                chartMode === 'ratio' || chartMode === 'normalized'
                                  ? `${value.toFixed(1)}% (실제: ${props.payload.raw_고성과자})`
                                  : `${value} (실제값)`,
                                '고성과자',
                              ];
                            }
                            return value;
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="항목" />
                        <YAxis domain={yDomain} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="지원자" fill="#2563eb" name="지원자" />
                        <Bar dataKey="고성과자" fill="#22c55e" name="고성과자" />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <div className="text-gray-400 text-center">
                    {chartMode === 'raw' ? '실제값 데이터를 불러올 수 없습니다.' : '비교 그래프 데이터를 불러올 수 없습니다.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Box plot: 고성과자 분포 + 지원자 위치 */}
              {growthResult.boxplot_data && (
                <div className="mt-6">
                  <h4 className="font-semibold text-base mb-4 text-gray-800 dark:text-white">고성과자 분포와 지원자 위치</h4>
                  {Object.entries(growthResult.boxplot_data).map(([label, stats]) => {
                    const meta = boxplotLabels[label] || { label, unit: '', desc: '' };
                    
                    // 박스플롯 데이터 검증
                    if (!stats || typeof stats.min !== 'number' || typeof stats.max !== 'number' || 
                        isNaN(stats.min) || isNaN(stats.max) || stats.min === stats.max) {
                      console.warn('박스플롯 데이터 검증 실패:', { label, stats });
                      return (
                        <div key={label} className="mb-6">
                          <div className="font-semibold mb-2 text-gray-700 dark:text-gray-300">
                            {meta.label} <span className="text-xs text-gray-500">({meta.desc}{meta.unit ? `, 단위: ${meta.unit}` : ''})</span>
                          </div>
                          <div className="bg-gray-50 border rounded p-4 text-center text-gray-500">
                            데이터가 부족하여 박스플롯을 표시할 수 없습니다.
                          </div>
                        </div>
                      );
                    }
                    
                    // Box plot 데이터 생성
                    const boxData = [
                      { name: '최저값', value: stats.min, type: 'min' },
                      { name: '25%', value: stats.q1 || stats.median, type: 'q1' },
                      { name: '중간값', value: stats.median, type: 'median' },
                      { name: '75%', value: stats.q3 || stats.median, type: 'q3' },
                      { name: '최고값', value: stats.max, type: 'max' }
                    ];
                    
                    return (
                      <div key={label} className="mb-6">
                        <div className="font-semibold mb-2 text-gray-700 dark:text-gray-300">
                          {meta.label} <span className="text-xs text-gray-500">({meta.desc}{meta.unit ? `, 단위: ${meta.unit}` : ''})</span>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <ComposedChart data={boxData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip 
                              formatter={(value, name) => [
                                `${value}${meta.unit ? ` ${meta.unit}` : ''}`, 
                                name
                              ]}
                            />
                            <Legend />
                            <Bar dataKey="value" fill="#2563eb" name="고성과자 분포" />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#2563eb" 
                              strokeWidth={2}
                              dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                            />
                            {/* 지원자 위치 표시 (유효한 경우에만) */}
                            {stats.applicant !== undefined && !isNaN(stats.applicant) && (
                              <Line 
                                type="monotone" 
                                data={[{ name: '지원자', value: stats.applicant }]}
                                dataKey="value" 
                                stroke="red" 
                                strokeWidth={3}
                                dot={{ fill: 'red', strokeWidth: 2, r: 6 }}
                                name="지원자"
                              />
                            )}
                          </ComposedChart>
                        </ResponsiveContainer>
                        <div className="text-xs text-gray-500 mt-2">
                          파란 막대는 고성과자 집단의 분포(최저~최고, 25%~75%, 중간값), 빨간 점은 지원자의 위치입니다.
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 합격 포인트 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-blue-100 dark:border-blue-900/40 shadow-sm min-h-[150px] max-h-[250px] overflow-y-auto">
        <div className="text-lg font-bold text-gray-800 dark:text-white mb-2">합격 포인트</div>
        {summaryLoading ? (
          <div className="text-blue-500">요약 중...</div>
        ) : summaryError ? (
          <div className="text-red-500">{summaryError}</div>
        ) : summary ? (
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-200 text-base space-y-1 break-words">
            {summary.split(/\n|•|\-/).filter(Boolean).map((point, idx) => (
              <li key={idx}>{point.trim()}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-2">
          <button onClick={() => setShowFullReason(true)} className="text-blue-600 hover:underline text-sm font-medium">자세히 보기</button>
        </div>
        {/* 전체 pass_reason 모달 */}
        {showFullReason && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-lg w-full shadow-xl relative">
              <button onClick={() => setShowFullReason(false)} className="absolute top-2 right-4 text-gray-400 hover:text-blue-500 text-lg">✕</button>
              <div className="text-lg font-bold mb-2">전체 합격 사유</div>
              <div className="whitespace-pre-line text-gray-800 text-base max-h-96 overflow-y-auto">{passReason}</div>
            </div>
          </div>
        )}
      </div>

      {/* 이 지원자에게 물어볼 만한 질문 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-900/40 shadow-sm max-w-full">
        <div className="text-base font-bold text-blue-700 dark:text-blue-300 mb-2">이 지원자에게 물어볼 만한 질문 (예시)</div>
        {/* 예시 질문 placeholder */}
        {!questionRequested && (
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-200 text-base space-y-1 mb-4 break-words">
            <li>지원 동기와 향후 목표에 대해 말씀해 주세요.</li>
            <li>프로젝트 경험 중 가장 도전적이었던 사례는 무엇인가요?</li>
            <li>관련 자격증 취득 과정에서 배운 점은?</li>
          </ul>
        )}
        {/* AI 질문 생성 버튼/로딩/에러/질문 목록 */}
        {!questionRequested ? (
          <button
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-full shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={loadSavedPersonalQuestions}
            disabled={questionLoading}
            style={{ minWidth: 220 }}
          >
            {questionLoading && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            {questionLoading ? '개인 질문 로드 중...' : 'AI 개인 질문 생성'}
          </button>
        ) : questionLoading ? (
          <div className="flex items-center justify-center gap-3 py-8">
            <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span className="text-blue-600 font-medium">AI 개인 질문을 생성하고 있습니다...</span>
          </div>
        ) : questionError ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">오류 발생</span>
            </div>
            <p className="text-red-600 dark:text-red-400 mt-2">{questionError}</p>
            <button
              onClick={() => {
                setQuestionError(null);
                setQuestionRequested(false);
                setAiQuestions([]);
              }}
              className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
            >
              다시 시도
            </button>
          </div>
        ) : aiQuestions && Object.keys(aiQuestions).length > 0 ? (
          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-6 mt-4">
            {Object.entries(aiQuestions).map(([category, questions]) => (
              <div key={category} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-blue-700 dark:text-blue-300 text-lg">
                    {category === 'personal' ? '개인별 질문' : 
                     category === '프로젝트 경험' ? '프로젝트 경험' : 
                     category === '상황 대처' ? '상황 대처' : 
                     category === '자기소개서 요약' ? '자기소개서 요약' :
                     category}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {Array.isArray(questions) ? questions.length : 0}개
                  </span>
                </div>
                <div className="space-y-3">
                  {Array.isArray(questions) && questions.map((q, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-blue-500 dark:text-blue-400 font-semibold text-sm min-w-[20px]">
                        {idx + 1}.
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 break-words leading-relaxed flex-1">
                        {q}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">질문 없음</span>
            </div>
            <p className="text-yellow-600 dark:text-yellow-400 mt-2">
              AI 개인 질문이 생성되지 않았습니다. 다시 시도해주세요.
            </p>
            <button
              onClick={() => {
                setQuestionRequested(false);
                setAiQuestions([]);
              }}
              className="mt-3 text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 underline"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>

      {/* 불합격 처리 버튼 */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => {
            if (onStatusChange) {
              onStatusChange(applicant.application_id || applicant.applicationId, 'REJECTED');
            }
          }}
          className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          불합격 처리
        </button>
      </div>
    </div>
  );
};

export default PassReasonCard; 