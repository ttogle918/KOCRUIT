import React, { useState, useEffect } from 'react';
import { fetchGrowthPrediction } from '../api/growthPredictionApi';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip, Legend as BarLegend } from 'recharts';
import Plot from 'react-plotly.js';

const GrowthPredictionCard = ({ applicationId }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  // 그래프 모드: 'ratio' | 'normalized' | 'raw'
  const [chartMode, setChartMode] = useState('ratio'); // 기본값: 비율(고성과자=100)

  // applicationId가 바뀔 때마다 상태 초기화
  useEffect(() => {
    setResult(null);
    setError(null);
    setShowDetail(false);
    setChartMode('ratio');
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

  // 1. 비율(고성과자=100) 데이터 변환
  const getRatioData = () => {
    if (!result || !result.comparison_chart_data) return [];
    const { labels, applicant, high_performer } = result.comparison_chart_data;
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
    if (!result || !result.comparison_chart_data) return [];
    const { labels, applicant, high_performer } = result.comparison_chart_data;
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
    if (!result || !result.comparison_chart_data) return [];
    const { labels, applicant, high_performer } = result.comparison_chart_data;
    return labels.map((label, idx) => ({
      항목: label,
      지원자: applicant[idx],
      고성과자: high_performer[idx],
    }));
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

  // 그래프 데이터 및 축/범위/설명 선택
  let chartData = [];
  let yDomain = [0, 100];
  let chartDesc = '';
  if (chartMode === 'ratio') {
    chartData = getRatioData();
    yDomain = [0, 100];
    chartDesc = '고성과자=100%로 환산한 지원자 상대비율입니다. (실제값은 툴팁 참고)';
  } else if (chartMode === 'normalized') {
    chartData = getNormalizedData();
    yDomain = [0, 100];
    chartDesc = '각 항목별로 0~100으로 정규화한 값입니다. (실제값은 툴팁 참고)';
  } else {
    chartData = getRawData();
    yDomain = [0, getMaxValue()];
    chartDesc = '실제값(절대값) 비교입니다. 값의 편차가 클 수 있습니다.';
  }

  // Box plot 항목별 단위/설명 매핑
  const boxplotLabels = {
    '경력(년)': { label: '경력(년)', unit: '년', desc: '고성과자 총 경력 연수 분포' },
    '주요 프로젝트 경험 수': { label: '주요 프로젝트 경험 수', unit: '개', desc: '고성과자 주요 프로젝트 경험 개수' },
    '학력': { label: '학력', unit: '레벨', desc: '학사=2, 석사=3, 박사=4' },
    '자격증': { label: '자격증 개수', unit: '개', desc: '고성과자 자격증 보유 개수' },
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
              {/* 그래프 모드 선택 버튼 */}
              <div className="flex gap-2 mb-2 mt-2">
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
              {/* Box plot: 고성과자 분포 + 지원자 위치 */}
              {result.boxplot_data && (
                <div className="mt-6">
                  <h4 className="font-semibold text-base mb-2">고성과자 분포와 지원자 위치 (Box Plot)</h4>
                  {Object.entries(result.boxplot_data).map(([label, stats]) => {
                    const meta = boxplotLabels[label] || { label, unit: '', desc: '' };
                    return (
                      <div key={label} className="mb-6">
                        <div className="font-semibold mb-1">
                          {meta.label} <span className="text-xs text-gray-500">({meta.desc}{meta.unit ? `, 단위: ${meta.unit}` : ''})</span>
                        </div>
                        <Plot
                          data={[
                            {
                              y: [stats.min, stats.q1, stats.median, stats.q3, stats.max],
                              type: 'box',
                              name: '고성과자 분포',
                              boxpoints: false,
                              marker: { color: '#2563eb' }
                            },
                            {
                              y: [stats.applicant],
                              type: 'scatter',
                              mode: 'markers',
                              name: '지원자',
                              marker: { color: 'red', size: 14, symbol: 'circle' }
                            }
                          ]}
                          layout={{
                            title: `${meta.label} 분포`,
                            yaxis: { title: `${meta.label}${meta.unit ? ` (${meta.unit})` : ''}` },
                            showlegend: true,
                            height: 320,
                            margin: { l: 60, r: 30, t: 40, b: 40 }
                          }}
                          config={{ displayModeBar: false }}
                          style={{ width: '100%', maxWidth: 500 }}
                        />
                      </div>
                    );
                  })}
                  <div className="text-xs text-gray-500 mt-2">
                    파란 박스는 고성과자 집단의 분포(최저~최고, 25%~75%, 중간값), 빨간 점은 지원자의 위치입니다.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GrowthPredictionCard; 