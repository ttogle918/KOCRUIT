import React, { useState, useEffect } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { extractMajorAndDegree } from '../utils/resumeUtils';
import HighlightedText, { HighlightStats } from './HighlightedText';
import { highlightResumeText } from '../api/api';

export default function ResumeCard({ resume, loading, bookmarked, onBookmarkToggle }) {
  const [localBookmarked, setLocalBookmarked] = useState(bookmarked);
  const [highlightData, setHighlightData] = useState(null);
  const [highlightLoading, setHighlightLoading] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  
  useEffect(() => { setLocalBookmarked(bookmarked); }, [bookmarked]);

  // 자기소개서 형광펜 하이라이팅 분석
  const analyzeContent = async (content) => {
    if (!content || typeof content !== 'string') return;
    
    try {
      setHighlightLoading(true);
      const result = await highlightResumeText(content);
      console.log('highlight API result:', result);
      setHighlightData(result);
    } catch (error) {
      console.error('형광펜 분석 실패:', error);
      setHighlightData(null); // 명시적으로 null로 설정
    } finally {
      setHighlightLoading(false);
    }
  };

  // 자기소개서 내용 추출 및 분석
  useEffect(() => {
    if (resume && resume.content) {
      let contentText = '';
      
      try {
        const parsed = typeof resume.content === 'string' ? JSON.parse(resume.content) : Array.isArray(resume.content) ? resume.content : [];
        if (Array.isArray(parsed) && parsed.length > 0) {
          contentText = parsed.map(item => item.content).join('\n\n');
        } else {
          contentText = resume.content;
        }
      } catch {
        contentText = resume.content;
      }
      
      if (contentText) {
        analyzeContent(contentText);
      }
    }
  }, [resume]);

  useEffect(() => {
    console.log('highlightData:', highlightData);
  }, [highlightData]);

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
          {highlightData && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHighlights(!showHighlights)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  showHighlights 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {showHighlights ? '형광펜 끄기' : '형광펜 켜기'}
              </button>
              {highlightLoading && (
                <span className="text-xs text-blue-500">분석 중...</span>
              )}
            </div>
          )}
        </div>
        
        {highlightData && showHighlights && (
          <HighlightStats highlights={highlightData.highlights || []} />
        )}
        
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-4 text-gray-800 dark:text-gray-100 whitespace-pre-line border dark:border-gray-700 min-h-[80px] space-y-6">
          {(() => {
            let parsed = [];
            try {
              parsed = typeof content === 'string' ? JSON.parse(content) : Array.isArray(content) ? content : [];
            } catch {
              parsed = [];
            }
            if (!Array.isArray(parsed) || parsed.length === 0) {
              return <div>내용이 없습니다.</div>;
            }
            return parsed.map((item, idx) => (
              <div key={idx} className="mb-6">
                <div className="font-bold text-lg mb-2 text-blue-800 dark:text-blue-200">{item.title}</div>
                {showHighlights && highlightData ? (
                  <HighlightedText 
                    text={item.content}
                    highlights={highlightData.highlights || []}
                    showLegend={false}
                    onHighlightClick={(highlight) => {
                      console.log('하이라이팅 클릭:', highlight);
                    }}
                  />
                ) : (
                  <div className="whitespace-pre-line text-base">{item.content}</div>
                )}
              </div>
            ));
          })()}
        </div>
      </section>
    </div>
  );
}