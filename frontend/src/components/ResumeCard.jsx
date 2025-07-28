import React, { useState, useEffect } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { extractMajorAndDegree } from '../utils/resumeUtils';
import HighlightedText, { HighlightStats } from './HighlightedText';
import { highlightResumeByApplicationId, getHighlightResults } from '../api/api';

export default function ResumeCard({ resume, loading, bookmarked, onBookmarkToggle, jobpostId, applicationId }) {
  const [localBookmarked, setLocalBookmarked] = useState(bookmarked);
  const [highlightData, setHighlightData] = useState([]);
  const [highlightLoading, setHighlightLoading] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [highlightError, setHighlightError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all'); // 필터링 상태 추가
  
  useEffect(() => { setLocalBookmarked(bookmarked); }, [bookmarked]);

  // 필터링 핸들러 추가
  const handleFilterChange = (category) => {
    setFilterCategory(category);
    console.log('필터링 변경:', category);
  };

  // application_id 기반 하이라이트 분석 (저장된 결과 우선 조회)
  const analyzeContentByApplicationId = async () => {
    if (!applicationId) return;
    setHighlightLoading(true);
    setHighlightError(null);
    
    try {
      // 1단계: 저장된 결과가 있는지 먼저 확인
      let result;
      try {
        console.log('저장된 하이라이팅 결과 조회 시도...');
        result = await getHighlightResults(applicationId);
        console.log('저장된 하이라이팅 결과 발견:', result);
      } catch (error) {
        if (error.response?.status === 404) {
          // 저장된 결과가 없으면 새로 분석
          console.log('저장된 결과가 없어서 새로 분석 시작...');
          result = await highlightResumeByApplicationId(applicationId, jobpostId);
          console.log('새로운 하이라이팅 결과:', result);
        } else {
          throw error;
        }
      }
      
      // 🆕 데이터 구조 통합 처리
      let allHighlights = [];
      
      // 백엔드에서 반환하는 다양한 데이터 구조 처리
      if (result) {
        console.log('원본 하이라이팅 결과:', result);
        
        // 1. 기존 구조: result.highlights (배열)
        if (result.highlights && Array.isArray(result.highlights) && result.highlights.length > 0) {
          allHighlights = result.highlights;
          console.log('기존 구조 사용:', allHighlights.length);
        }
        // 2. 새로운 구조: result.all_highlights (배열)
        else if (result.all_highlights && Array.isArray(result.all_highlights) && result.all_highlights.length > 0) {
          allHighlights = result.all_highlights;
          console.log('all_highlights 구조 사용:', allHighlights.length);
        }
        // 3. 색상별 구조: result.blue, result.red, result.gray, result.purple, result.yellow
        else if (result.blue || result.red || result.gray || result.purple || result.yellow) {
          const colorMapping = {
            blue: 'skill_fit',
            red: 'risk', 
            gray: 'vague',
            purple: 'experience',
            yellow: 'value_fit'
          };
          
          // abstract_expression을 보라색(experience)으로 매핑
          if (result.abstract_expression && Array.isArray(result.abstract_expression)) {
            console.log(`abstract_expression 하이라이트 ${result.abstract_expression.length}개 발견`);
            result.abstract_expression.forEach(highlight => {
              if (highlight && (highlight.text || highlight.sentence)) {
                allHighlights.push({
                  ...highlight,
                  category: 'experience',  // 추상표현을 experience로 매핑
                  color: 'purple'
                });
              }
            });
          }
          
          let totalColorHighlights = 0;
          Object.entries(colorMapping).forEach(([color, category]) => {
            if (result[color] && Array.isArray(result[color])) {
              console.log(`${color} 하이라이트 ${result[color].length}개 발견`);
              totalColorHighlights += result[color].length;
              result[color].forEach(highlight => {
                // 빈 객체가 아닌 실제 데이터가 있는 하이라이트만 추가
                if (highlight && (highlight.text || highlight.sentence)) {
                  allHighlights.push({
                    ...highlight,
                    category: category,  // 올바른 카테고리로 매핑
                    color: color
                  });
                }
              });
            }
          });
          console.log('색상별 구조 사용:', allHighlights.length, `(총 ${totalColorHighlights}개 발견)`);
        }
        
        // 4. 추가 검증: 하이라이트 데이터가 실제로 유효한지 확인
        allHighlights = allHighlights.filter(highlight => {
          const hasText = highlight.text || highlight.sentence;
          const hasCategory = highlight.category;
          return hasText && hasCategory;
        });
        
        console.log('최종 유효한 하이라이트:', allHighlights.length);
      }
      
      console.log('통합된 하이라이팅 데이터:', allHighlights);
      
      // 결과를 문단별로 매핑
      if (allHighlights.length > 0) {
        // content 파싱 (함수 내부에서 처리)
        let parsed = [];
        try {
          parsed = typeof resume.content === 'string' ? JSON.parse(resume.content) : Array.isArray(resume.content) ? resume.content : [];
        } catch {
          parsed = [];
        }
        
        // 전체 하이라이트를 각 문단의 텍스트에 맞게 분배
        const highlightsByParagraph = parsed.map((item, idx) => {
          const paragraphText = item.content;
          
          // 중복 제거를 위한 Map 사용
          const uniqueHighlights = new Map();
          
          allHighlights.forEach(highlight => {
            // 하이라이트된 텍스트가 현재 문단에 포함되는지 확인
            const highlightText = highlight.text || highlight.sentence || '';
            if (paragraphText.includes(highlightText)) {
              // 문단 내에서의 상대적 위치로 조정
              const start = paragraphText.indexOf(highlightText);
              const key = `${start}-${start + highlightText.length}-${highlightText}`;
              
              // 중복 제거 (같은 위치, 같은 텍스트)
              if (!uniqueHighlights.has(key)) {
                uniqueHighlights.set(key, {
                  ...highlight,
                  text: highlightText,
                  start: start,
                  end: start + highlightText.length
                });
              }
            }
          });
          
          const paragraphHighlights = Array.from(uniqueHighlights.values());
          
          if (paragraphHighlights.length > 0) {
            console.log(`문단 ${idx} (${item.title}): ${paragraphHighlights.length}개 하이라이트`);
            paragraphHighlights.forEach(h => {
              console.log(`  - ${h.category}: "${h.text}"`);
            });
          }
          
          return { highlights: paragraphHighlights };
        });
        
        console.log('문단별 하이라이팅 매핑 완료:', highlightsByParagraph.map((p, i) => `${i}: ${p.highlights.length}개`));
        setHighlightData(highlightsByParagraph);
      } else {
        console.warn('하이라이팅 결과가 올바르지 않습니다:', result);
        setHighlightData([]);
        setHighlightError('하이라이팅 결과를 처리할 수 없습니다.');
      }
    } catch (error) {
      console.error('하이라이팅 분석 실패:', error);
      setHighlightData([]);
      
      // 타임아웃 에러 특별 처리
      if (error.message && error.message.includes('시간이 초과')) {
        setHighlightError('하이라이팅 분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      } else if (error.code === 'ECONNABORTED') {
        setHighlightError('하이라이팅 분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setHighlightError(error.message || '하이라이팅 분석에 실패했습니다.');
      }
    } finally {
      setHighlightLoading(false);
    }
  };

  // 기존 텍스트 기반 하이라이트 분석 (주석 처리 - 필요시 복원)
  /*
  const analyzeContent = async (contentArr) => {
    if (!Array.isArray(contentArr) || contentArr.length === 0) return;
    setHighlightLoading(true);
    try {
      const results = await Promise.all(
        contentArr.map(item => highlightResumeText(item.content, "", "", jobpostId))
      );
      setHighlightData(results); // [{highlights: [...]}, ...]
    } catch (error) {
      setHighlightData([]);
    } finally {
      setHighlightLoading(false);
    }
  };
  */

  // application_id가 있을 때만 하이라이트 분석 실행
  useEffect(() => {
    // applicationId가 있으면 자동으로 하이라이트 분석 실행
    if (applicationId) {
      analyzeContentByApplicationId();
    }
  }, [applicationId, jobpostId]);

  // 전체 통계용 하이라이트 합치기
  const allHighlights = (highlightData || []).flatMap(d => d.highlights || []);

  // content 파싱
  let parsed = [];
  try {
    parsed = typeof resume.content === 'string' ? JSON.parse(resume.content) : Array.isArray(resume.content) ? resume.content : [];
  } catch {
    parsed = [];
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[300px] text-blue-500 text-xl font-bold animate-pulse">
      로딩 중...
    </div>
  );
  if (!resume) return (
    <div className="flex items-center justify-center h-full min-h-[300px] text-gray-400 text-lg">
      데이터 없음
    </div>
  );
  
  const safeArray = v => Array.isArray(v) ? v : [];
  
  // skills 데이터 안전하게 처리
  const safeSkills = (skills) => {
    if (Array.isArray(skills)) {
      return skills;
    } else if (typeof skills === 'string') {
      // 쉼표로 구분된 문자열을 배열로 변환
      return skills.split(',').map(skill => skill.trim()).filter(skill => skill);
    } else {
      return [];
    }
  };

  // 안전하게 값 추출
  const {
    applicantName = '',
    gender = '',
    birthDate = '',
    email = '',
    address = '',
    phone = '',
    educations = [],
    awards = [],
    certificates = [],
    skills = [],
    experiences = [], // activities + project_experience 통합
    content = '', // 자기소개서
  } = resume || {};
  
  // skills 안전하게 처리
  const processedSkills = safeSkills(skills);
  
  // 표에서 빈칸을 위한 함수
  const safe = v => v || '';

  // 자기소개서 내용 추출
  const getContentText = () => {
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : Array.isArray(content) ? content : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => item.content).join('\n\n');
      }
      return content;
    } catch {
      return content;
    }
  };

  const contentText = getContentText();

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-8 space-y-8 w-full overflow-y-auto min-h-[300px] min-w-[500px] max-h-[70vh]"
    >
      {/* 개인정보 */}
      <section>
        <h3 className="text-lg font-bold mb-4 text-blue-700 dark:text-blue-300">개인정보</h3>
        <table className="w-full text-sm border dark:border-gray-700 mb-2 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <tbody>
            <tr>
              <td className="font-semibold bg-gray-50 dark:bg-gray-700 w-24 px-2 py-1">이름</td>
              <td className="border dark:border-gray-700 px-2 py-1">{safe(applicantName)}</td>
              <td className="font-semibold bg-gray-50 dark:bg-gray-700 w-24 px-2 py-1">성별</td>
              <td className="border dark:border-gray-700 px-2 py-1">{safe(gender)}</td>
            </tr>
            <tr>
              <td className="font-semibold bg-gray-50 dark:bg-gray-700 px-2 py-1">생년월일</td>
              <td className="border dark:border-gray-700 px-2 py-1">{safe(birthDate)}</td>
              <td className="font-semibold bg-gray-50 dark:bg-gray-700 px-2 py-1">이메일</td>
              <td className="border dark:border-gray-700 px-2 py-1">{safe(email)}</td>
            </tr>
            <tr>
              <td className="font-semibold bg-gray-50 dark:bg-gray-700 px-2 py-1">주소</td>
              <td className="border dark:border-gray-700 px-2 py-1" colSpan={3}>{safe(address)}</td>
            </tr>
            <tr>
              <td className="font-semibold bg-gray-50 dark:bg-gray-700 px-2 py-1">전화번호</td>
              <td className="border dark:border-gray-700 px-2 py-1" colSpan={3}>{safe(phone)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 학력사항 */}
      <section>
        <h3 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">학력사항</h3>
        <table className="w-full text-sm border dark:border-gray-700 mb-2 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <thead>
            <tr>
              <th className="border dark:border-gray-700 px-2 py-1">학교명</th>
              <th className="border dark:border-gray-700 px-2 py-1">전공</th>
              <th className="border dark:border-gray-700 px-2 py-1">학위</th>
              <th className="border dark:border-gray-700 px-2 py-1">학점</th>
            </tr>
          </thead>
          <tbody>
            {(safeArray(educations).length > 0 ? educations : [{ schoolName: '', degree: '', gpa: '', major: '' }]).map((edu, idx) => {
              const isHighSchool = (edu.schoolName || '').includes('고등학교');
              return (
                <tr key={idx}>
                  <td className="border dark:border-gray-700 px-2 py-1">{edu.schoolName || '-'}</td>
                  <td className="border dark:border-gray-700 px-2 py-1">{isHighSchool ? '-' : (edu.major || '-')}</td>
                  <td className="border dark:border-gray-700 px-2 py-1">{isHighSchool ? '-' : (edu.degree || '-')}</td>
                  <td className="border dark:border-gray-700 px-2 py-1">{safe(edu.gpa)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* 기술 스택 */}
      {processedSkills.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">기술 스택</h3>
          <div className="flex flex-wrap gap-2">
            {processedSkills.map((skill, idx) => (
              <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 수상내역 & 자격증 */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* 수상내역 */}
        <section className="flex-1">
          <h3 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">수상내역</h3>
          <table className="w-full text-sm border dark:border-gray-700 mb-2 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
            <tbody>
              {(safeArray(awards).length > 0 ? awards : [{ date: '', title: '', description: '', duration: '' }]).map((award, idx) => (
                <tr key={idx}>
                  <td className="border dark:border-gray-700 px-2 py-1 w-20">{safe(award.date) || safe(award.duration)}</td>
                  <td className="border dark:border-gray-700 px-2 py-1">{safe(award.title)}</td>
                  <td className="border dark:border-gray-700 px-2 py-1">{safe(award.description)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {/* 자격증 */}
        <section className="flex-1">
          <h3 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">자격증</h3>
          <table className="w-full text-sm border dark:border-gray-700 mb-2 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
            <tbody>
              {(safeArray(certificates).length > 0 ? certificates : [{ date: '', name: '', duration: '' }]).map((cert, idx) => (
                <tr key={idx}>
                  <td className="border dark:border-gray-700 px-2 py-1 w-20">{safe(cert.date) || safe(cert.duration)}</td>
                  <td className="border dark:border-gray-700 px-2 py-1">{safe(cert.name)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* 경험 (활동 + 프로젝트) */}
      {safeArray(experiences).length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">경험</h3>
          <div className="space-y-4">
            {experiences.map((experience, idx) => (
              <div key={idx} className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    experience.type === 'activity' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {experience.type === 'activity' ? '활동' : '프로젝트'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {experience.type === 'activity' ? (experience.period || experience.duration) : experience.duration}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  {experience.type === 'activity' ? experience.organization : experience.title}
                </h4>
                {experience.role && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">역할: {experience.role}</p>
                )}
                {experience.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{experience.description}</p>
                )}
                {experience.type === 'project' && experience.technologies && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">기술스택: </span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {experience.technologies}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 자기소개서 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300">자기소개서</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (highlightData.length === 0 && !highlightLoading) {
                  analyzeContentByApplicationId();
                }
                setShowHighlights(!showHighlights);
              }}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                showHighlights 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
              disabled={highlightLoading}
            >
              {highlightLoading ? '분석 중...' : (showHighlights ? '형광펜 끄기' : '형광펜 켜기')}
            </button>
            {highlightLoading && (
              <div className="flex items-center gap-1 text-xs text-blue-500">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                분석 중...
              </div>
            )}
            {highlightError && (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <span>⚠️</span>
                {highlightError}
              </div>
            )}
            {allHighlights.length > 0 && !highlightLoading && !showHighlights && (
              <div className="text-xs text-green-600 dark:text-green-400">
                ✅ 분석 완료 ({allHighlights.length}개 하이라이트)
              </div>
            )}
            {allHighlights.length > 0 && !highlightLoading && showHighlights && (
              <div className="text-xs text-blue-600 dark:text-blue-400">
                🔍 하이라이팅 표시 중
              </div>
            )}
          </div>
        </div>
        
        {/* 전체 통계 */}
        {allHighlights.length > 0 && showHighlights && (
          <>
            <HighlightStats 
              highlights={allHighlights} 
              onFilterChange={handleFilterChange}
            />
            {/* 필터링 상태 표시 */}
            {filterCategory !== 'all' && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">
                    🔍 필터링 중: {filterCategory === 'mismatch' ? '직무 불일치' :
                                  filterCategory === 'negative_tone' ? '부정 태도' :
                                  filterCategory === 'experience' ? '경험·성과·이력·경력' :
                                  filterCategory === 'skill_fit' ? '기술 사용 경험' :
                                  filterCategory === 'value_fit' ? '인재상 가치' : filterCategory}
                  </span>
                  <button
                    onClick={() => handleFilterChange('all')}
                    className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded transition-colors"
                  >
                    전체 보기
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* 문단별 하이라이트만 */}
        {parsed.map((item, idx) => (
          <div key={idx} className="mb-6">
            <div className="font-bold text-lg mb-2 text-blue-800 dark:text-blue-200">{item.title}</div>
            {showHighlights && highlightData[idx] ? (
              <HighlightedText
                text={item.content}
                highlights={highlightData[idx].highlights || []}
                filterCategory={filterCategory}
                showLegend={false}
              />
            ) : (
              <div className="whitespace-pre-wrap text-base font-inherit">{item.content}</div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}