// src/components/ApplicantCard.jsx
import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import api from '../api/api';

const plagiarismRequestCache = new Map(); // 중복 요청 방지용

const ApplicantCard = forwardRef(({
  applicant,
  index,
  isSelected,
  splitMode,
  bookmarked,
  onClick,
  onBookmarkToggle,
  calculateAge,
  compact = false,
  resumeId, // 추가: resumeId prop
}, ref) => {
  const [plagiarism, setPlagiarism] = useState(null);
  const [plagiarismLoading, setPlagiarismLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    const rid = resumeId || applicant?.resumeId || applicant?.resume_id;
    if (!rid) return;

    // 이미 DB에 검사 결과가 있으면 바로 사용
    if (applicant.plagiarism_checked_at) {
      setPlagiarism({
        input_resume_id: applicant.resume_id,
        most_similar_resume: applicant.plagiarism_score > 0 ? {
          similarity: applicant.plagiarism_score,
          resume_id: applicant.most_similar_resume_id
        } : null,
        plagiarism_suspected: (applicant.plagiarism_score || 0) >= (applicant.similarity_threshold || 0.9),
        similarity_threshold: applicant.similarity_threshold || 0.9,
        checked: true
      });
      setPlagiarismLoading(false);
      return;
    }

    // 이미 요청 중이면 기다림
    if (plagiarismRequestCache.has(rid)) {
      setPlagiarismLoading(true);
      plagiarismRequestCache.get(rid).then((result) => {
        if (isMountedRef.current) {
          setPlagiarism(result);
          setPlagiarismLoading(false);
        }
      });
      return;
    }

    // 미검사면 API 호출
    setPlagiarismLoading(true);
    const req = api.post(`/resume-plagiarism/check-resume/${rid}`)
      .then(res => {
        const result = {
          input_resume_id: rid,
          most_similar_resume: res.data.most_similar_resume,
          plagiarism_suspected: res.data.plagiarism_suspected,
          similarity_threshold: res.data.similarity_threshold,
          checked: true
        };
        if (isMountedRef.current) {
          setPlagiarism(result);
          setPlagiarismLoading(false);
        }
        return result;
      })
      .catch(() => {
        if (isMountedRef.current) setPlagiarismLoading(false);
        return null;
      })
      .finally(() => {
        plagiarismRequestCache.delete(rid);
      });
    plagiarismRequestCache.set(rid, req);
  }, [resumeId, applicant?.resumeId, applicant?.resume_id, applicant.plagiarism_checked_at]);

  // 유사도 점수 계산 (실제 유사도)
  const getSimilarityScore = () => {
    if (!plagiarism || !plagiarism.most_similar_resume) return 0;
    return Math.round(plagiarism.most_similar_resume.similarity * 100);
  };

  // 표절 위험도에 따른 색상 결정 (유사도 기준)
  const getSimilarityColor = (similarityScore) => {
    if (similarityScore >= 90) return '#e74c3c';
    if (similarityScore >= 70) return '#f1c40f';
    return '#2ecc40';
  };

  // 상태 텍스트 결정 (유사도 기준)
  const getSimilarityStatus = (similarityScore) => {
    if (plagiarismLoading) return '검사중';
    if (!plagiarism?.checked) return '검사중';
    if (similarityScore >= 90) return '표절';
    if (similarityScore >= 70) return '의심';
    return '안전';
  };

  const similarityScore = getSimilarityScore();
  const similarityColor = getSimilarityColor(similarityScore);
  const similarityStatus = getSimilarityStatus(similarityScore);

  return (
    <div ref={ref} className={`${compact ? 'p-1' : ''}`}> {/* 바깥 div는 padding/마진만 */}
      <div
        className={`relative bg-white dark:bg-gray-800 rounded-3xl flex items-center gap-2 cursor-pointer transition-all duration-300 ease-in-out ${compact ? 'p-2' : 'p-4'} 
          ${isSelected ? 'border-2 border-blue-500 ring-1 ring-blue-300 bg-blue-50 dark:bg-blue-900 shadow-lg scale-[1.01]' : 'border border-gray-200'}
        `}
        style={isSelected ? { boxShadow: '0 0 0 2px #3b82f6, 0 2px 12px 0 rgba(59,130,246,0.10)' } : {}}
        onClick={() => { onClick && onClick(); }}
      >
        {/* 번호 */}
        <div className={`absolute top-1 left-2 text-xs font-bold text-blue-600 ${compact ? 'text-[10px]' : ''}`}>{index}</div>

        {/* 즐겨찾기 별 버튼 */}
        <button
          className={`absolute top-1 right-2 transition-all duration-200 ease-in-out ${compact ? 'text-base' : 'text-xl'}`}
          onClick={e => {
            e.stopPropagation();
            onBookmarkToggle();
          }}
        >
          {bookmarked ? (
            <FaStar className="text-yellow-500 drop-shadow-sm hover:text-yellow-600 transition-colors duration-200" />
          ) : (
            <FaRegStar className="text-gray-400 hover:text-yellow-400 transition-colors duration-200" />
          )}
        </button>

        {/* 프로필 이미지 */}
        <div className={`flex items-center justify-center ${compact ? 'w-8 h-8' : 'w-12 h-12'} rounded-full bg-gray-300`}>
          <i className="fa-solid fa-user text-white text-xl" />
        </div>

        {/* 중앙 텍스트 정보 */}
        <div className="flex flex-col flex-grow min-w-0">
          <div className={`font-semibold text-gray-800 dark:text-white truncate ${compact ? 'text-xs' : 'text-base'}`}>
            {applicant.name} ({calculateAge(applicant.birthDate)}세)
          </div>
          <div className={`text-gray-500 dark:text-gray-400 truncate ${compact ? 'text-[11px]' : 'text-sm'}`}>
            {applicant.applicationSource || 'DIRECT'}
          </div>
        </div>

        {/* 날짜 및 표절률 영역 (점수 원 왼쪽에 위치) */}
        <div className="flex flex-col items-center justify-between mr-3 self-stretch">
          {/* 지원일 */}
          <div className={`text-xs text-gray-500 dark:text-gray-400 ${compact ? 'text-[10px]' : ''} flex justify-end w-full`}>
            <span>지원일: </span>
            <span>
              {applicant.appliedAt || applicant.applied_at ? 
                new Date(applicant.appliedAt || applicant.applied_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit', 
                  day: '2-digit'
                }).replace(/\./g, '/').replace(/\s/g, '').slice(0, -1) : 
                'Invalid Date'
              }
            </span>
          </div>
          
          {/* 표절률 */}
          <div className="flex flex-col items-center">
            <span className={`text-gray-500 font-medium ${compact ? 'text-[9px]' : 'text-xs'} mb-1`}>표절률</span>
            <div className="flex items-center gap-1">
              <div className={`bg-gray-200 rounded-full ${compact ? 'h-1 w-12' : 'h-1.5 w-16'}`}>
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${similarityScore}%`, 
                    backgroundColor: similarityColor 
                  }}
                ></div>
              </div>
              <span 
                className={`font-medium ${compact ? 'text-[9px]' : 'text-xs'}`}
                style={{ color: similarityColor }}
              >
                {similarityScore}%
              </span>
              <span className={`${compact ? 'text-[8px]' : 'text-xs'} text-gray-500`}>{similarityStatus}</span>
            </div>
          </div>
        </div>

        {/* 점수 원 (기존과 동일) */}
        <div className={`flex flex-col items-center justify-center ${compact ? 'w-12 h-12' : 'w-20 h-20'}`}>
          <div className={`font-bold text-gray-800 dark:text-white border-2 border-blue-300 rounded-full flex items-center justify-center ${compact ? 'w-10 h-10 text-xs' : 'w-16 h-16 text-sm'}`}>
            {applicant.ai_score || 0}점
          </div>
          {applicant.ai_score && (
            <div className={`text-xs text-blue-600 dark:text-blue-400 mt-1 ${compact ? 'text-[10px]' : ''}`}>
              AI: {applicant.ai_score}점
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ApplicantCard;
