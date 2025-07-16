import React, { useState, useEffect } from 'react';
import { fetchGrowthPrediction } from '../api/growthPredictionApi';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip, Legend as BarLegend } from 'recharts';

const GrowthPredictionCard = ({ applicationId }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showRatio, setShowRatio] = useState(true); // true: 비율(고성과자=100), false: 실제값

  // applicationId가 바뀔 때마다 상태 초기화
  useEffect(() => {
    setResult(null);
    setError(null);
    setShowDetail(false);
    setShowRatio(true);
    setLoading(false);
  }, [applicationId]);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGrowthPrediction(applicationId);
      setResult(data);
    } catch (err) {
      setError(err.message || '예측 실패');
    } finally {
      setLoading(false);
    }
  };

  // 비교 그래프 데이터 변환 (RadarChart용)
  const getRadarData = () => {
    if (!result || !result.comparison_chart_data) return [];
    const { labels, applicant, high_performer } = result.comparison_chart_data;
    if (showRatio) {
      // 비율(고성과자=100)
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
    } else {
      // 실제값
      return labels.map((label, idx) => ({
        항목: label,
        지원자: applicant[idx],
        고성과자: high_performer[idx],
      }));
    }
  };

  // 실제값 모드에서 최대값 계산 (축 범위용)
  const getMaxValue = () => {
    if (!result || !result.comparison_chart_data) return 100;
    const { applicant, high_performer } = result.comparison_chart_data;
    return Math.ceil(Math.max(...applicant, ...high_performer, 1));
  };

  // 설명형 근거 bullet
  const renderReasons = (reasons) => {
    if (!reasons || reasons.length === 0) return null;
    return (
      <ul className="mt-2 space-y-1">
        {reasons.map((r, i) => (
          <li key={i} className={r.startsWith('⚠️') ? 'text-yellow-600' : r.startsWith('✅') ? 'text-green-700' : 'text-gray-700'}>
            {r}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="border rounded-lg p-4 shadow-md bg-white max-w-md mx-auto my-4">
      <h3 className="text-lg font-bold mb-2">📊 성장 가능성 예측 (고성과자 패턴 기반)</h3>
      {!result && (
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
          onClick={handlePredict}
          disabled={loading}
        >
          {loading ? '분석 중...' : '성장 가능성 예측하기'}
        </button>
      )}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {result && (
        <div>
          {/* 설명형 요약 카드 */}
          <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
            <div className="text-xl font-bold text-blue-800 mb-1">
              성장 점수: {result.total_score ?? result.growth_score} / 100
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {result.high_performer_group && (
                <span className="text-sm text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  고성과자 그룹 {result.high_performer_group}과{' '}
                  {result.similarity ? (
                    <span className="font-bold">{Math.round((result.similarity ?? 0) * 100)}% 유사</span>
                  ) : null}
                </span>
              )}
              {!result.high_performer_group && result.similarity && (
                <span className="text-sm text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  고성과자와 {Math.round((result.similarity ?? 0) * 100)}% 유사
                </span>
              )}
            </div>
            {result.expected_growth_path && (
              <div className="text-base text-blue-900 font-semibold mb-1">
                예상 성장 경로: {result.expected_growth_path}
              </div>
            )}
            <div className="mb-1">
              <span className="font-semibold">주요 근거:</span>
              {renderReasons(result.reasons || [])}
            </div>
          </div>
          {/* 기존 상세/그래프 UI */}
          <button
            className="mt-3 bg-gray-100 hover:bg-gray-200 text-blue-700 px-3 py-1 rounded text-sm mr-2"
            onClick={() => setShowDetail((v) => !v)}
          >
            {showDetail ? '비교 그래프 숨기기' : '자세히 보기 (고성과자와 비교)'}
          </button>
          {showDetail && (
            <>
              <button
                className="mb-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded text-xs"
                onClick={() => setShowRatio((v) => !v)}
              >
                {showRatio ? '실제값 보기' : '비율(고성과자=100) 보기'}
              </button>
              <div className="mt-2">
                {getRadarData().length > 0 ? (
                  showRatio ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={getRadarData()} outerRadius={100}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="항목" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="지원자" dataKey="지원자" stroke="#2563eb" fill="#2563eb" fillOpacity={0.4} />
                        <Radar name="고성과자" dataKey="고성과자" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                        <Legend />
                        <Tooltip
                          formatter={(value, name, props) => {
                            if (name === '지원자') {
                              return [`${value.toFixed(1)}% (실제: ${props.payload.raw_지원자}, 비율: ${props.payload.지원자비율.toFixed(1)}%)`, '지원자'];
                            }
                            if (name === '고성과자') {
                              return [`${value.toFixed(1)}% (실제: ${props.payload.raw_고성과자})`, '고성과자'];
                            }
                            return value;
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={getRadarData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="항목" />
                        <YAxis />
                        <BarTooltip />
                        <BarLegend />
                        <Bar dataKey="지원자" fill="#2563eb" name="지원자" />
                        <Bar dataKey="고성과자" fill="#22c55e" name="고성과자" />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <div className="text-gray-400 text-center">비교 그래프 데이터를 불러올 수 없습니다.</div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GrowthPredictionCard; 