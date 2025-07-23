import { useEffect, useState, useRef } from "react";
import axiosInstance from "../api/axiosInstance";
import { useSearchParams } from "react-router-dom";

function JobAptitudeReport() {
  const [data, setData] = useState(null);
  const [failedApplicants, setFailedApplicants] = useState([]);
  const [loadingText, setLoadingText] = useState('');
  const loadingInterval = useRef(null);
  const fullText = '직무적성평가 보고서 생성 중입니다...';
  const [searchParams] = useSearchParams();
  const jobPostId = searchParams.get("job_post_id");

  useEffect(() => {
    if (jobPostId) {
      // 직무적성평가 보고서 데이터 조회
      axiosInstance.get(`/report/job-aptitude?job_post_id=${jobPostId}`)
        .then((res) => setData(res.data))
        .catch((error) => {
          console.error('직무적성평가 보고서 데이터 조회 실패:', error);
        });
      
      // 필기불합격자 데이터 조회
      axiosInstance.get(`/written-test/failed/${jobPostId}`)
        .then((res) => setFailedApplicants(res.data))
        .catch((error) => {
          console.error('필기불합격자 데이터 조회 실패:', error);
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
    const url = `http://localhost:8000/api/v1/report/job-aptitude/pdf?job_post_id=${jobPostId}`;
    
    // 새 창에서 PDF 다운로드
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>PDF 다운로드 중...</title>
          <style>
            body { background: #f9fafb; margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center; }
            .container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }
            .msg { font-size: 26px; font-weight: 800; color: #16a34a; margin-bottom: 8px; text-align: center; letter-spacing: 1px; min-height: 40px; }
            .sub { font-size: 16px; color: #64748b; text-align: center; }
          </style>
          </head>
          <body>
            <div class="container">
              <div class="msg" id="loadingMsg"></div>
              <div class="sub">잠시만 기다려 주세요.</div>
            </div>
            <script>
               const fullText = '직무적성평가 보고서 PDF 생성 중입니다...';
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
                a.download = '직무적성평가_보고서.pdf';
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
      <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a', marginBottom: 8, textAlign: 'center', letterSpacing: 1, minHeight: 40 }}>
        {loadingText}
      </div>
      <div style={{ fontSize: 16, color: '#64748b', textAlign: 'center' }}>
        잠시만 기다려 주세요.
      </div>
    </div>
  );

  return (
    <div style={{
      background: '#f9fafb', borderRadius: 18, boxShadow: '0 4px 24px #e0e7ef', margin: '40px auto', maxWidth: 900, padding: '40px'
    }}>
      <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: 16, marginBottom: 24 }}>
        <h2 style={{ fontWeight: 800, fontSize: 30, color: '#2563eb', letterSpacing: '-1px', marginBottom: 8 }}>{data?.job_post?.title} <span style={{ color: '#64748b', fontWeight: 600, fontSize: 20 }}>- 직무적성평가 보고서</span></h2>
        <div style={{ color: '#64748b', fontSize: 16, marginBottom: 4 }}>
          모집 기간: <b>{data?.job_post?.start_date}</b> ~ <b>{data?.job_post?.end_date}</b>
        </div>
        <div style={{ color: '#64748b', fontSize: 16 }}>
          모집 부서: <b>{typeof data?.job_post?.department === 'object' && data?.job_post?.department !== null ? (data?.job_post?.department?.name || JSON.stringify(data?.job_post?.department)) : (data?.job_post?.department || '')}</b>
          <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
          직무: <b>{typeof data?.job_post?.position === 'object' && data?.job_post?.position !== null ? (data?.job_post?.position?.name || JSON.stringify(data?.job_post?.position)) : (data?.job_post?.position || '')}</b>
          <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
          채용 인원: <b>{data?.job_post?.recruit_count}명</b>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#16a34a', margin: 0 }}>
          직무적성평가 보고서
        </h1>
        <button
          onClick={handleDownload}
          style={{
            background: '#16a34a', color: 'white', border: 'none', padding: '12px 24px',
            borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = '#15803d'}
          onMouseOut={(e) => e.target.style.background = '#16a34a'}
        >
          PDF 다운로드
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 32, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
          📊 직무적성평가 개요
        </h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'nowrap' }}>
          <div style={{ flex: 1, background: '#f0fdf4', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>평가 대상자</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
              {data?.stats?.total_applicants || 0}명
            </div>
          </div>
          <div style={{ flex: 1, background: '#f0fdf4', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>필기 합격자</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
              {data?.stats?.passed_applicants_count || 0}명
            </div>
          </div>
          <div style={{ flex: 1, background: '#f0fdf4', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>평균 필기 점수</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
              {data?.stats?.average_written_score || 0}점
            </div>
          </div>
          <div style={{ flex: 1, background: '#f0fdf4', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>합격률</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
              {data?.stats?.pass_rate || 0}%
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 32, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
          🎯 필기합격자 상세 분석
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {data?.stats?.written_analysis?.map((analysis, index) => (
            <div key={index} style={{ background: '#f8fafc', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>
                {analysis.category}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>
                {analysis.score}{analysis.category === '합격률' ? '%' : '점'}
              </div>
              <div style={{ fontSize: 14, color: '#64748b' }}>
                {analysis.description}
              </div>
            </div>
          )) || (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', padding: 20 }}>
              필기평가 분석 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 32, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
          📋 필기합격자 명단
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>순위</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>지원자명</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>필기점수</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>평가일</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {data?.stats?.passed_applicants?.map((applicant, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', color: '#1f2937' }}>{index + 1}</td>
                  <td style={{ padding: '12px', color: '#1f2937', fontWeight: 500 }}>{applicant.name}</td>
                  <td style={{ padding: '12px', color: '#16a34a', fontWeight: 600 }}>{applicant.written_score}점</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{applicant.evaluation_date}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      background: '#dcfce7', 
                      color: '#16a34a', 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px', 
                      fontWeight: 500 
                    }}>
                      필기합격
                    </span>
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                    필기합격자 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 32, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
          📋 필기불합격자 명단
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>순위</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>지원자명</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>필기점수</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>평가일</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1f2937' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {failedApplicants?.map((applicant, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', color: '#1f2937' }}>{index + 1}</td>
                  <td style={{ padding: '12px', color: '#1f2937', fontWeight: 500 }}>{applicant.user_name}</td>
                  <td style={{ padding: '12px', color: '#ef4444', fontWeight: 600 }}>
                    {applicant.written_test_score !== null ? `${applicant.written_test_score}점` : '미응시'}
                  </td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{applicant.evaluation_date || '-'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      background: '#fef2f2', 
                      color: '#ef4444', 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px', 
                      fontWeight: 500 
                    }}>
                      필기불합격
                    </span>
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                    필기불합격자 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
          📋 상세 평가 결과
        </h2>
        <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
          {data?.detailed_analysis || '직무적성평가 상세 분석 결과가 여기에 표시됩니다.'}
        </div>
      </div>
    </div>
  );
}

export default JobAptitudeReport; 