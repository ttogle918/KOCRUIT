import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import InterviewQuestionApi from '../api/interviewQuestionApi';
import { getApplication } from '../api/api';

const useInterviewData = (type = 'practical') => {
  const { applicationId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!applicationId) return;

      try {
        setLoading(true);
        
        // 1. 지원자 정보 조회
        const appData = await getApplication(applicationId);
        setApplication(appData);

        // 2. 면접 질문 조회
        // type: 'practical' (실무) or 'executive' (임원)
        // DB의 QuestionType과 매핑 필요.
        // 실무면접 -> JOB, PERSONAL, COMMON 등
        // 임원면접 -> EXECUTIVE, PERSONAL 등
        // API가 'type' 필터를 지원하는지 확인 필요하지만, 일단 전체 조회 후 필터링 또는 API에 맡김
        const questionsData = await InterviewQuestionApi.getQuestionsForApplication(applicationId);
        
        // 프론트엔드에서 필요한 필터링 로직 (API가 다 주면 여기서 거름)
        let filteredQuestions = questionsData;
        if (type === 'practical') {
             // 실무 면접: 직무(JOB), 공통(COMMON), 개별(PERSONAL), 1차(FIRST) 등
             filteredQuestions = questionsData.filter(q => 
                ['JOB', 'COMMON', 'PERSONAL', 'FIRST'].includes(q.type)
             );
        } else if (type === 'executive') {
             // 임원 면접: 임원(EXECUTIVE), 인성(PERSONAL), 최종(FINAL) 등
             filteredQuestions = questionsData.filter(q => 
                ['EXECUTIVE', 'FINAL', 'PERSONAL'].includes(q.type)
             );
        }

        setQuestions(filteredQuestions);

      } catch (err) {
        console.error("Error fetching interview data:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [applicationId, type]);

  return { questions, application, loading, error };
};

export default useInterviewData;

