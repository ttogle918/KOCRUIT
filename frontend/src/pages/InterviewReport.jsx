import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import AiInterviewApi from "../api/aiInterviewApi";
import axiosInstance from "../api/axiosInstance";

function InterviewReport() {
  const [aiData, setAiData] = useState(null);
  const [executiveData, setExecutiveData] = useState(null);
  const [loadingText, setLoadingText] = useState("");
  const loadingInterval = useRef(null);
  const fullText = "면접 보고서 생성 중입니다...";
  const [searchParams] = useSearchParams();
  const jobPostId = searchParams.get("job_post_id");

  useEffect(() => {
    if (!aiData || !executiveData) {
      setLoadingText("");
      let i = 0;
      if (loadingInterval.current) clearInterval(loadingInterval.current);
      loadingInterval.current = setInterval(() => {
        setLoadingText(fullText.slice(0, i + 1));
        i++;
        if (i > fullText.length) i = 0;
      }, 120);
      return () => clearInterval(loadingInterval.current);
    }
  }, [aiData, executiveData]);

  useEffect(() => {
    if (jobPostId) {
      AiInterviewApi.getAiInterviewEvaluationsByJobPost(jobPostId)
        .then(setAiData)
        .catch((e) => console.error("AI 면접 데이터 조회 실패:", e));
      axiosInstance.get(`/executive-interview/candidates`)
        .then((res) => setExecutiveData(res.data))
        .catch((e) => console.error("임원진 면접 데이터 조회 실패:", e));
    }
  }, [jobPostId]);

  if (!aiData || !executiveData) return (
    <div style={{
      minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#f9fafb', borderRadius: 18, boxShadow: '0 4px 24px #e0e7ef', margin: '40px auto', maxWidth: 900
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb', marginBottom: 32, textAlign: 'center', letterSpacing: '1px', minHeight: 40 }}>
        {loadingText}
      </div>
      <div style={{ fontSize: 18, color: '#64748b', textAlign: 'center' }}>잠시만 기다려 주세요.</div>
    </div>
  );

  // AI 면접 합격/불합격자 분리
  const aiPassed = (aiData.evaluations || []).filter(e => e.passed);
  const aiRejected = (aiData.evaluations || []).filter(e => !e.passed);

  // 임원진 면접 합격/불합격자 분리 (예시: status, total_score 등 활용)
  const executivePassed = executiveData.filter(a => a.interview_status === 'SECOND_INTERVIEW_PASSED');
  const executiveRejected = executiveData.filter(a => a.interview_status === 'SECOND_INTERVIEW_FAILED');

  return (
    <div style={{ maxWidth: 1200, margin: "40px auto", background: "#f9fafb", padding: 40, borderRadius: 18, boxShadow: "0 4px 24px #e0e7ef", border: '1px solid #e5e7eb' }}>
      <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: 16, marginBottom: 24 }}>
        <h2 style={{ fontWeight: 800, fontSize: 30, color: '#2563eb', letterSpacing: '-1px', marginBottom: 8 }}>면접 전형 종합 보고서</h2>
      </div>
      {/* AI 면접 섹션 */}
      <div style={{ margin: '32px 0' }}>
        <h3 style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', marginBottom: 12 }}>AI 면접 결과</h3>
        <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
          <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 18, color: '#64748b', marginBottom: 4 }}>총 평가</div>
            <div style={{ fontWeight: 700, fontSize: 28, color: '#2563eb' }}>{aiData.total_evaluations}명</div>
          </div>
          <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 18, color: '#64748b', marginBottom: 4 }}>합격</div>
            <div style={{ fontWeight: 700, fontSize: 28, color: '#10b981' }}>{aiPassed.length}명</div>
          </div>
          <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 18, color: '#64748b', marginBottom: 4 }}>불합격</div>
            <div style={{ fontWeight: 700, fontSize: 28, color: '#ef4444' }}>{aiRejected.length}명</div>
          </div>
        </div>
        <h4 style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', margin: '24px 0 8px' }}>합격자 목록</h4>
        <div style={{ overflowX: 'auto', marginBottom: 32 }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef' }}>
            <thead>
              <tr style={{ background: '#e0e7ff' }}>
                <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#2563eb', borderTopLeftRadius: 12, textAlign: 'center' }}>이름</th>
                <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#2563eb', textAlign: 'center' }}>점수</th>
                <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#2563eb', textAlign: 'center' }}>결과</th>
              </tr>
            </thead>
            <tbody>
              {aiPassed.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>합격자가 없습니다.</td></tr>
              ) : aiPassed.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#f3f4f6' : '#fff' }}>
                  <td style={{ minWidth: 100, padding: '10px 0', fontWeight: 600, textAlign: 'center' }}>{a.applicant_name}</td>
                  <td style={{ minWidth: 100, padding: '10px 0', color: '#10b981', fontWeight: 700, textAlign: 'center' }}>{a.total_score}</td>
                  <td style={{ minWidth: 100, padding: '10px 0', color: '#2563eb', fontWeight: 700, textAlign: 'center' }}>합격</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h4 style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', margin: '24px 0 8px' }}>불합격자 목록</h4>
        <div style={{ overflowX: 'auto', marginBottom: 32 }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef' }}>
            <thead>
              <tr style={{ background: '#fee2e2' }}>
                <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#b91c1c', borderTopLeftRadius: 12, textAlign: 'center' }}>이름</th>
                <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#b91c1c', textAlign: 'center' }}>점수</th>
                <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#b91c1c', textAlign: 'center' }}>결과</th>
              </tr>
            </thead>
            <tbody>
              {aiRejected.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>불합격자가 없습니다.</td></tr>
              ) : aiRejected.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                  <td style={{ minWidth: 100, padding: '10px 0', fontWeight: 600, textAlign: 'center' }}>{a.applicant_name}</td>
                  <td style={{ minWidth: 100, padding: '10px 0', color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>{a.total_score}</td>
                  <td style={{ minWidth: 100, padding: '10px 0', color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>불합격</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* 임원진 면접 섹션 */}
      <div style={{ margin: '32px 0' }}>
        <h3 style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed', marginBottom: 12 }}>임원진 면접 결과</h3>
        <h4 style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', margin: '24px 0 8px' }}>합격자 목록</h4>
        <div style={{ overflowX: 'auto', marginBottom: 32 }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef' }}>
            <thead>
              <tr style={{ background: '#e0e7ff' }}>
                <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#2563eb', borderTopLeftRadius: 12, textAlign: 'center' }}>이름</th>
                <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#2563eb', textAlign: 'center' }}>점수</th>
                <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#2563eb', textAlign: 'center' }}>결과</th>
              </tr>
            </thead>
            <tbody>
              {executivePassed.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>합격자가 없습니다.</td></tr>
              ) : executivePassed.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#f3f4f6' : '#fff' }}>
                  <td style={{ minWidth: 100, padding: '10px 0', fontWeight: 600, textAlign: 'center' }}>{a.user_name || a.name}</td>
                  <td style={{ minWidth: 100, padding: '10px 0', color: '#10b981', fontWeight: 700, textAlign: 'center' }}>{a.total_score}</td>
                  <td style={{ minWidth: 100, padding: '10px 0', color: '#2563eb', fontWeight: 700, textAlign: 'center' }}>합격</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h4 style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', margin: '24px 0 8px' }}>불합격자 목록</h4>
        <div style={{ overflowX: 'auto', marginBottom: 32 }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef' }}>
            <thead>
              <tr style={{ background: '#fee2e2' }}>
                <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#b91c1c', borderTopLeftRadius: 12, textAlign: 'center' }}>이름</th>
                <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#b91c1c', textAlign: 'center' }}>점수</th>
                <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#b91c1c', textAlign: 'center' }}>결과</th>
              </tr>
            </thead>
            <tbody>
              {executiveRejected.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>불합격자가 없습니다.</td></tr>
              ) : executiveRejected.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                  <td style={{ minWidth: 100, padding: '10px 0', fontWeight: 600, textAlign: 'center' }}>{a.user_name || a.name}</td>
                  <td style={{ minWidth: 100, padding: '10px 0', color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>{a.total_score}</td>
                  <td style={{ minWidth: 100, padding: '10px 0', color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>불합격</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* 최종 합격자/장점 등 추가 섹션(예시) */}
      <div style={{ margin: '32px 0' }}>
        <h3 style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginBottom: 12 }}>최종 합격자 및 선발 이유</h3>
        <div style={{ fontSize: 18, color: '#334155', background: '#e0f7fa', borderRadius: 8, padding: '16px 24px' }}>
          {/* 실제 최종 합격자/장점/선발 이유는 별도 API/로직 필요 */}
          <b>예시:</b> 실무 경험과 리더십, 문제해결력이 뛰어난 지원자가 최종 선발되었습니다.
        </div>
      </div>
    </div>
  );
}

export default InterviewReport; 