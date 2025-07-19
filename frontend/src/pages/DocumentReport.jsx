import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { useSearchParams } from "react-router-dom";

function DocumentReport() {
  const [data, setData] = useState(null);
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

  const handleDownload = () => {
    const token = localStorage.getItem('token');
    const url = `http://localhost:8000/api/v1/report/document/pdf?job_post_id=${jobPostId}`;
    
    // 새 창에서 PDF 다운로드
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>PDF 다운로드 중...</title></head>
          <body>
            <h2>PDF 다운로드 중...</h2>
            <script>
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
                document.body.innerHTML = '<h2>PDF 다운로드 실패</h2><p>다시 시도해주세요.</p>';
              });
            </script>
          </body>
        </html>
      `);
    }
  };

  if (!data) return <div>불러오는 중...</div>;

  const { job_post, stats } = data;

  // 지원자 목록 분리
  const passedApplicants = stats.applicants.filter(a => a.status === 'PASSED');
  const rejectedApplicants = stats.applicants.filter(a => a.status === 'REJECTED');

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", background: "#fff", padding: 32, borderRadius: 12, boxShadow: "0 2px 8px #eee" }}>
      <h2 style={{ fontWeight: 700, fontSize: 24 }}>{job_post.title} - 서류 전형 보고서</h2>
      <p>모집 기간: {job_post.start_date} ~ {job_post.end_date}</p>
      <p>모집 부서: {job_post.department} | 직무: {job_post.position} | 채용 인원: {job_post.recruit_count}명</p>
      <p>총 지원자: {stats.total_applicants}명, 평균 점수: {stats.avg_score}</p>
      <p>최고점: {stats.max_score}, 최저점: {stats.min_score}</p>

      {stats.passed_summary && (
        <div style={{ margin: "32px 0", fontSize: 20, fontWeight: 600, color: "#2563eb" }}>
          합격자 요약: {stats.passed_summary}
        </div>
      )}

      <h3 style={{ marginTop: 32, fontSize: 28, fontWeight: 800 }}>탈락 사유 Top 3</h3>
      {console.log('Top3:', stats.top_rejection_reasons, Array.isArray(stats.top_rejection_reasons))}
      <ul>
        {Array.isArray(stats.top_rejection_reasons)
          ? stats.top_rejection_reasons.map((r, i) => <li key={i}>{r}</li>)
          : <li>{stats.top_rejection_reasons}</li>}
      </ul>

      <h3 style={{ marginTop: 32, fontSize: 28, fontWeight: 800 }}>합격자 목록</h3>
      <table border="1" style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32 }}>
        <thead>
          <tr>
            <th>이름</th><th>학력</th><th>경력</th><th>자격증</th>
            <th>자소서</th><th>총점</th><th>결과</th><th>평가 코멘트</th>
          </tr>
        </thead>
        <tbody>
          {passedApplicants.length === 0 ? (
            <tr><td colSpan={8} style={{ textAlign: 'center' }}>합격자가 없습니다.</td></tr>
          ) : passedApplicants.map((a, i) => (
            <tr key={i}>
              <td>{a.name}</td><td>{a.education}</td><td>{a.experience}</td>
              <td>{a.certificates}</td><td>{a.essay_score}</td>
              <td>{a.total_score}</td><td>{a.status}</td><td>{a.evaluation_comment}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 32, fontSize: 28, fontWeight: 800 }}>불합격자 목록</h3>
      <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>이름</th><th>학력</th><th>경력</th><th>자격증</th>
            <th>자소서</th><th>총점</th><th>결과</th><th>평가 코멘트</th>
          </tr>
        </thead>
        <tbody>
          {rejectedApplicants.length === 0 ? (
            <tr><td colSpan={8} style={{ textAlign: 'center' }}>불합격자가 없습니다.</td></tr>
          ) : rejectedApplicants.map((a, i) => (
            <tr key={i}>
              <td>{a.name}</td><td>{a.education}</td><td>{a.experience}</td>
              <td>{a.certificates}</td><td>{a.essay_score}</td>
              <td>{a.total_score}</td><td>{a.status}</td><td>{a.evaluation_comment}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={handleDownload} style={{ marginTop: 24, padding: "8px 20px", background: "#2563eb", color: "#fff", border: 0, borderRadius: 6, fontWeight: 600, fontSize: 16 }}>
        📥 PDF 다운로드
      </button>
    </div>
  );
}

export default DocumentReport; 