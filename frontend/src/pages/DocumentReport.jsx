import { useEffect, useState, useRef } from "react";
import axiosInstance from "../api/axiosInstance";
import { useSearchParams } from "react-router-dom";

function DocumentReport() {
  const [data, setData] = useState(null);
  const [loadingText, setLoadingText] = useState('');
  const loadingInterval = useRef(null);
  const fullText = '서류보고서 PDF 생성 중입니다...';
  const [searchParams] = useSearchParams();
  const jobPostId = searchParams.get("job_post_id");

  useEffect(() => {
    if (jobPostId) {
      axiosInstance.get(`/api/v1/report/document?job_post_id=${jobPostId}`)
        .then((res) => setData(res.data))
        .catch((error) => {
          console.error('서류 보고서 데이터 조회 실패:', error);
        });
    }
  }, [jobPostId]);

  // 로딩 텍스트 애니메이션
  useEffect(() => {
    if (!data) {
      setLoadingText('');
      let i = 0;
      if (loadingInterval.current) clearInterval(loadingInterval.current);
      loadingInterval.current = setInterval(() => {
        setLoadingText(fullText.slice(0, i + 1));
        i++;
        if (i > fullText.length) i = 0;
      }, 120);
      return () => clearInterval(loadingInterval.current);
    }
  }, [data]);

  const handleDownload = () => {
    const token = localStorage.getItem('token');
    const url = `http://localhost:8000/api/v1/report/document/pdf?job_post_id=${jobPostId}`;
    
    // 새 창에서 PDF 다운로드
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>PDF 다운로드 중...</title>
          <style>
            body { background: #f9fafb; margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center; }
            .container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }
            .msg { font-size: 26px; font-weight: 800; color: #2563eb; margin-bottom: 8px; text-align: center; letter-spacing: 1px; min-height: 40px; }
            .sub { font-size: 16px; color: #64748b; text-align: center; }
          </style>
          </head>
          <body>
            <div class="container">
              <div class="msg" id="loadingMsg"></div>
              <div class="sub">잠시만 기다려 주세요.</div>
            </div>
            <script>
               const fullText = '서류보고서 PDF 생성 중입니다...';
               let i = 0;
               function typeText() {
                 document.getElementById('loadingMsg').innerText = fullText.slice(0, i + 1);
                 i++;
                 if (i > fullText.length) i = 0;
                 setTimeout(typeText, 150);
               }
               typeText();
              fetch('${url}', {
                headers: {
                  'Authorization': 'Bearer ${token}'
                }
              })
              .then(response => response.blob())
              .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = '서류전형_보고서.pdf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                window.close();
              })
              .catch(error => {
                console.error('PDF 다운로드 실패:', error);
                document.body.innerHTML = '<div class="container"><div class="msg" style="color:#ef4444">PDF 다운로드 실패</div><div class="sub">다시 시도해주세요.</div></div>';
              });
            </script>
          </body>
        </html>
      `);
    }
  };

  if (!data) return (
    <div style={{
      minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#f9fafb', borderRadius: 18, boxShadow: '0 4px 24px #e0e7ef', margin: '40px auto', maxWidth: 900
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb', marginBottom: 32, textAlign: 'center', letterSpacing: '1px', minHeight: 40 }}>
        {loadingText}
      </div>
      <div style={{ fontSize: 18, color: '#64748b', textAlign: 'center' }}>잠시만 기다려 주세요.</div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  const { job_post, stats } = data;

  // 지원자 목록 분리
  const passedApplicants = stats.applicants.filter(a => a.status === 'PASSED');
  const rejectedApplicants = stats.applicants.filter(a => a.status === 'REJECTED');

  return (
    <div style={{ maxWidth: 1200, margin: "40px auto", background: "#f9fafb", padding: 40, borderRadius: 18, boxShadow: "0 4px 24px #e0e7ef", border: '1px solid #e5e7eb' }}>
      <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: 16, marginBottom: 24 }}>
        <h2 style={{ fontWeight: 800, fontSize: 30, color: '#2563eb', letterSpacing: '-1px', marginBottom: 8 }}>{job_post.title} <span style={{ color: '#64748b', fontWeight: 600, fontSize: 20 }}>- 서류 전형 보고서</span></h2>
        <div style={{ color: '#64748b', fontSize: 16, marginBottom: 4 }}>
          모집 기간: <b>{job_post.start_date}</b> ~ <b>{job_post.end_date}</b>
        </div>
        <div style={{ color: '#64748b', fontSize: 16 }}>
          모집 부서: <b>{typeof job_post.department === 'object' && job_post.department !== null ? (job_post.department.name || JSON.stringify(job_post.department)) : (job_post.department || '')}</b>
          <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
          직무: <b>{typeof job_post.position === 'object' && job_post.position !== null ? (job_post.position.name || JSON.stringify(job_post.position)) : (job_post.position || '')}</b>
          <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
          채용 인원: <b>{job_post.recruit_count}명</b>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 18, color: '#64748b', marginBottom: 4 }}>총 지원자</div>
          <div style={{ fontWeight: 700, fontSize: 28, color: '#2563eb' }}>{stats.total_applicants}명</div>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 18, color: '#64748b', marginBottom: 4 }}>서류 합격자</div>
          <div style={{ fontWeight: 700, fontSize: 28, color: '#2563eb' }}>{stats.passed_applicants_count}명</div>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 18, color: '#64748b', marginBottom: 4 }}>평균 점수</div>
          <div style={{ fontWeight: 700, fontSize: 28, color: '#10b981' }}>{stats.avg_score}</div>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 18, color: '#64748b', marginBottom: 4 }}>최고점</div>
          <div style={{ fontWeight: 700, fontSize: 28, color: '#f59e42' }}>{stats.max_score}</div>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef', padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 18, color: '#64748b', marginBottom: 4 }}>최저점</div>
          <div style={{ fontWeight: 700, fontSize: 28, color: '#ef4444' }}>{stats.min_score}</div>
        </div>
      </div>

      {stats.passed_summary && (
        <div style={{ margin: "32px 0 16px 0", fontSize: 20, fontWeight: 600, color: "#2563eb", background: '#e0e7ff', borderRadius: 8, padding: '16px 24px' }}>
          <span style={{ marginRight: 8, fontSize: 22 }}>✅</span>합격자 요약: {stats.passed_summary}
        </div>
      )}

      <div style={{ margin: '40px 0 24px 0', borderTop: '1.5px solid #e5e7eb', paddingTop: 24 }}>
        <h3 style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', marginBottom: 12 }}>탈락 사유 Top 3</h3>
        <ul style={{ display: 'flex', gap: 16, listStyle: 'none', padding: 0, margin: 0 }}>
          {Array.isArray(stats.top_rejection_reasons)
            ? stats.top_rejection_reasons.map((r, i) => (
                <li key={i} style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 17, boxShadow: '0 1px 4px #fca5a5' }}>{typeof r === 'object' ? JSON.stringify(r) : r}</li>
              ))
            : typeof stats.top_rejection_reasons === 'object' && stats.top_rejection_reasons !== null
              ? Object.values(stats.top_rejection_reasons).map((r, i) => (
                  <li key={i} style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 17, boxShadow: '0 1px 4px #fca5a5' }}>{typeof r === 'object' ? JSON.stringify(r) : r}</li>
                ))
              : <li style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 17, boxShadow: '0 1px 4px #fca5a5' }}>{String(stats.top_rejection_reasons)}</li>}
        </ul>
      </div>

      <h3 style={{ marginTop: 40, fontSize: 24, fontWeight: 800, color: '#2563eb', marginBottom: 12 }}>합격자 목록</h3>
      <div style={{ overflowX: 'auto', marginBottom: 32 }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef' }}>
          <thead>
            <tr style={{ background: '#e0e7ff' }}>
              <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#2563eb', borderTopLeftRadius: 12, textAlign: 'center' }}>이름</th>
              <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#2563eb', textAlign: 'center' }}>총점</th>
              <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#2563eb', textAlign: 'center' }}>결과</th>
              <th style={{ padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#2563eb', borderTopRightRadius: 12 }}>평가 코멘트</th>
            </tr>
          </thead>
          <tbody>
            {passedApplicants.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>합격자가 없습니다.</td></tr>
            ) : passedApplicants.map((a, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#f3f4f6' : '#fff' }}>
                <td style={{ minWidth: 100, padding: '10px 0', fontWeight: 600, textAlign: 'center' }}>{a.name}</td>
                <td style={{ minWidth: 100, padding: '10px 0', color: '#10b981', fontWeight: 700, textAlign: 'center' }}>{a.ai_score !== undefined && a.ai_score !== null ? Math.round(a.ai_score) : (a.total_score !== undefined && a.total_score !== null ? Math.round(a.total_score) : '-')}</td>
                <td style={{ minWidth: 100, padding: '10px 0', color: a.status === 'PASSED' ? '#2563eb' : '#ef4444', fontWeight: 700, textAlign: 'center' }}>{a.status === 'PASSED' ? '합격' : (a.status === 'REJECTED' ? '불합격' : '-')}</td>
                <td style={{ padding: '10px 0', color: '#334155' }}>{a.evaluation_comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: 40, fontSize: 24, fontWeight: 800, color: '#ef4444', marginBottom: 12 }}>불합격자 목록</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e7ef' }}>
          <thead>
            <tr style={{ background: '#fee2e2' }}>
              <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#b91c1c', borderTopLeftRadius: 12, textAlign: 'center' }}>이름</th>
              <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#b91c1c', textAlign: 'center' }}>총점</th>
              <th style={{ minWidth: 100, padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#b91c1c', textAlign: 'center' }}>결과</th>
              <th style={{ padding: '12px 0', fontWeight: 700, fontSize: 17, color: '#b91c1c', borderTopRightRadius: 12 }}>평가 코멘트</th>
            </tr>
          </thead>
          <tbody>
            {rejectedApplicants.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>불합격자가 없습니다.</td></tr>
            ) : rejectedApplicants.map((a, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                <td style={{ minWidth: 100, padding: '10px 0', fontWeight: 600, textAlign: 'center' }}>{a.name}</td>
                <td style={{ minWidth: 100, padding: '10px 0', color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>{a.ai_score !== undefined && a.ai_score !== null ? Math.round(a.ai_score) : (a.total_score !== undefined && a.total_score !== null ? Math.round(a.total_score) : '-')}</td>
                <td style={{ minWidth: 100, padding: '10px 0', color: a.status === 'PASSED' ? '#2563eb' : '#ef4444', fontWeight: 700, textAlign: 'center' }}>{a.status === 'PASSED' ? '합격' : (a.status === 'REJECTED' ? '불합격' : '-')}</td>
                <td style={{ padding: '10px 0', color: '#334155' }}>{a.evaluation_comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={handleDownload} style={{ marginTop: 36, padding: "12px 32px", background: "#2563eb", color: "#fff", border: 0, borderRadius: 8, fontWeight: 700, fontSize: 18, boxShadow: '0 2px 8px #e0e7ef', letterSpacing: '1px', cursor: 'pointer', transition: 'background 0.2s' }}
        onMouseOver={e => e.currentTarget.style.background = '#1e40af'}
        onMouseOut={e => e.currentTarget.style.background = '#2563eb'}>
        📥 PDF 다운로드
      </button>
    </div>
  );
}

export default DocumentReport; 