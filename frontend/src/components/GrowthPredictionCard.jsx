import React, { useState, useEffect } from 'react';
import { fetchGrowthPrediction, fetchGrowthPredictionResults } from '../api/growthPredictionApi';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip, Legend as BarLegend, ComposedChart, Line, Area } from 'recharts';

const GrowthPredictionCard = ({ applicationId, showDetails = false, onResultChange, key }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // 그래프 모드: 'ratio' | 'normalized' | 'raw'
  const [chartMode, setChartMode] = useState('ratio'); // 기본값: 비율(고성과자=100)

  // applicationId가 바뀔 때마다 상태 초기화
  useEffect(() => {
    setResult(null);
    setError(null);
    setChartMode('ratio');
    setShowDetail(false);
    setCollapsed(false);
    setLoading(false);
  }, [applicationId]);

  // 컴포넌트 마운트 시 저장된 결과 조회하지 않음 (버튼 클릭 시에만 로드)
  useEffect(() => {
    if (applicationId) {
      // 버튼 클릭 시에만 데이터를 로드하도록 수정
      setResult(null);
      setLoading(false);
    }
  }, [applicationId]);

  const loadSavedResults = async () => {
    try {
      setLoading(true);
      const savedResult = await fetchGrowthPredictionResults(applicationId);
      setResult(savedResult);
      if (onResultChange) {
        onResultChange(savedResult);
      }
    } catch (error) {
      console.log('저장된 결과가 없습니다:', error.message);
      // 저장된 결과가 없으면 AI 분석 실행
      await handlePredict();
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGrowthPrediction(applicationId);
      setResult(data);
      // 부모 컴포넌트에 결과 전달
      if (onResultChange) {
        onResultChange(data);
      }
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

  // 점수만 표시하는 간단한 버전 (위쪽 블록용)
  if (!showDetails) {
    return (
      <>
        {!result ? (
          <div className="flex justify-center my-6">
            <button
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-full shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              onClick={loadSavedResults}
              disabled={loading}
              style={{ minWidth: 220 }}
            >
              {loading && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              )}
              {loading ? 'AI 성장 예측 분석 중...' : 'AI 성장 가능성 예측'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-0 pt-2 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-extrabold text-blue-600 drop-shadow-sm">{result.total_score ?? result.growth_score}</span>
              <span className="text-xl font-bold text-blue-500 mb-1">점</span>
            </div>
            <div className="text-lg font-semibold text-blue-700 mt-2">AI 성장 예측</div>
          </div>
        )}
      </>
    );
  }

  // 상세 버전 (아래쪽 블록용)
  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800 font-medium">{error}</span>
          </div>
        </div>
      )}

      {!result ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">성장 가능성 예측</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
              AI가 지원자의 성장 가능성을 분석하여 점수로 평가합니다.
            </p>
            <button
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-full shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              onClick={handlePredict}
              disabled={loading}
            >
              {loading && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              )}
              {loading ? 'AI 성장 예측 분석 중...' : 'AI 성장 가능성 예측'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <h3 className="text-lg font-semibold">AI 성장 가능성 예측</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="p-1 hover:bg-blue-600 rounded transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {!collapsed ? (
            <>
              {/* 점수 표시 + 다시 분석 버튼 */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-extrabold text-blue-600">{result.total_score ?? result.growth_score}</span>
                    <span className="text-lg font-bold text-blue-500 mb-1">점</span>
                  </div>
                  <button
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg shadow hover:from-green-600 hover:to-green-700 transition-all duration-200 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    onClick={loadSavedResults}
                    disabled={loading}
                  >
                    {loading && (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                    )}
                    {loading ? '재분석 중...' : '다시 분석'}
                  </button>
                </div>
              </div>
              {/* 표 + 설명 */}
              {result.item_table && (
                <div className="pb-4">
                  <table className="w-full text-sm border rounded bg-gray-50 mb-2 mt-2">
                    <thead>
                      <tr>
                        <th className="border-b p-2 text-left">항목</th>
                        <th className="border-b p-2 text-left">지원자</th>
                        <th className="border-b p-2 text-left">고성과자평균</th>
                        <th className="border-b p-2 text-left">항목점수</th>
                        <th className="border-b p-2 text-left">비중(%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.item_table.map((row, i) => (
                        <tr key={i}>
                          <td className="border-b p-2 font-semibold text-blue-900">{row["항목"]}</td>
                          <td className="border-b p-2">{row["지원자"]}</td>
                          <td className="border-b p-2">{row["고성과자평균"]}</td>
                          <td className="border-b p-2">{row["항목점수"]}</td>
                          <td className="border-b p-2">{row["비중"]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.narrative && (
                    <div className="text-base text-blue-800 font-semibold mt-4 whitespace-pre-line">{result.narrative}</div>
                  )}
                </div>
              )}
              {/* 기존 상세/그래프 UI */}
              <button
                className="mt-3 bg-gray-100 hover:bg-gray-200 text-blue-700 px-3 py-1 rounded text-sm mr-2"
                onClick={() => setShowDetail((v) => !v)}
              >
                {showDetail ? '상세 보기 숨기기' : '상세 보기'}
              </button>

              {showDetail && (
                <>
                  {/* 그래프 모드 선택 */}
                  <div className="flex gap-2 mb-4 mt-4">
                    <button
                      className={`px-3 py-1 rounded text-sm ${chartMode === 'ratio' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                      onClick={() => setChartMode('ratio')}
                    >
                      비율
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-sm ${chartMode === 'normalized' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                      onClick={() => setChartMode('normalized')}
                    >
                      정규화
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-sm ${chartMode === 'raw' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                      onClick={() => setChartMode('raw')}
                    >
                      실제값
                    </button>
                  </div>

                  {/* 차트 설명 */}
                  <div className="text-xs text-gray-500 mb-4">{chartDesc}</div>

                  {/* 비교 차트 */}
                  {result.comparison_chart_data && chartData.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-700 mb-3">고성과자 대비 비교</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="항목" />
                          <YAxis domain={yDomain} />
                          <BarTooltip />
                          <BarLegend />
                          <Bar dataKey="고성과자" fill="#3B82F6" />
                          <Bar dataKey="지원자" fill="#EF4444" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* 근거 설명 */}
                  {result.reasons && result.reasons.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-700 mb-3">예측 근거</h4>
                      {renderReasons(result.reasons)}
                    </div>
                  )}

                  {/* Box plot 차트 */}
                  {result.boxplot_data && Object.keys(result.boxplot_data).length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-700 mb-3">고성과자 분포 대비 위치</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(result.boxplot_data).map(([key, stats]) => {
                          const label = boxplotLabels[key]?.label || key;
                          const unit = boxplotLabels[key]?.unit || '';
                          const desc = boxplotLabels[key]?.desc || '';
                          
                          // 박스플롯 데이터 검증
                          if (!stats.min && !stats.max) return null;
                          
                          // SVG 박스플롯 렌더링
                          const width = 200;
                          const height = 120;
                          const padding = 20;
                          const chartWidth = width - 2 * padding;
                          const chartHeight = height - 2 * padding;
                          
                          // 값 범위 계산
                          const min = stats.min;
                          const max = stats.max;
                          const range = max - min;
                          
                          // Y 좌표 변환 함수
                          const yToPixel = (value) => {
                            return padding + (max - value) / range * chartHeight;
                          };
                          
                          // 박스플롯 요소들의 위치 계산
                          const yMax = yToPixel(stats.max);
                          const yQ3 = yToPixel(stats.q3);
                          const yMedian = yToPixel(stats.median);
                          const yQ1 = yToPixel(stats.q1);
                          const yMin = yToPixel(stats.min);
                          const yApplicant = stats.applicant !== undefined ? yToPixel(stats.applicant) : null;
                          
                          const boxX = padding + chartWidth / 2 - 20;
                          const boxWidth = 40;
                          
                          return (
                            <div key={key} className="bg-gray-50 p-4 rounded-lg">
                              <h5 className="font-medium text-gray-800 mb-2">{label}</h5>
                              <div className="bg-white border rounded p-2">
                                <svg width={width} height={height} className="mx-auto">
                                  {/* Y축 레이블 */}
                                  <text x={5} y={yMax + 3} fontSize="10" fill="#666">{stats.max.toFixed(1)}</text>
                                  <text x={5} y={yQ3 + 3} fontSize="10" fill="#666">{stats.q3.toFixed(1)}</text>
                                  <text x={5} y={yMedian + 3} fontSize="10" fill="#666">{stats.median.toFixed(1)}</text>
                                  <text x={5} y={yQ1 + 3} fontSize="10" fill="#666">{stats.q1.toFixed(1)}</text>
                                  <text x={5} y={yMin + 3} fontSize="10" fill="#666">{stats.min.toFixed(1)}</text>
                                  
                                  {/* 중앙 수직선 (whisker) */}
                                  <line 
                                    x1={boxX + boxWidth/2} y1={yMax} 
                                    x2={boxX + boxWidth/2} y2={yMin} 
                                    stroke="#666" strokeWidth="1"
                                  />
                                  
                                  {/* 박스 (Q1 ~ Q3) */}
                                  <rect 
                                    x={boxX} y={yQ3} 
                                    width={boxWidth} height={yQ1 - yQ3} 
                                    fill="#3B82F6" stroke="#1E40AF" strokeWidth="1"
                                  />
                                  
                                  {/* 중앙값 선 */}
                                  <line 
                                    x1={boxX} y1={yMedian} 
                                    x2={boxX + boxWidth} y2={yMedian} 
                                    stroke="#EF4444" strokeWidth="2"
                                  />
                                  
                                  {/* 지원자 위치 표시 */}
                                  {yApplicant !== null && (
                                    <circle 
                                      cx={boxX + boxWidth/2} cy={yApplicant} 
                                      r="4" fill="#EF4444" stroke="white" strokeWidth="2"
                                    />
                                  )}
                                  
                                  {/* 범례 */}
                                  <text x={boxX + boxWidth + 10} y={yMax + 10} fontSize="10" fill="#3B82F6">고성과자 분포</text>
                                  <text x={boxX + boxWidth + 10} y={yMax + 25} fontSize="10" fill="#EF4444">중앙값</text>
                                  {yApplicant !== null && (
                                    <text x={boxX + boxWidth + 10} y={yMax + 40} fontSize="10" fill="#EF4444">지원자</text>
                                  )}
                                </svg>
                                
                                {/* 통계 정보 */}
                                <div className="mt-2 text-xs text-gray-600">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="font-medium">최소:</span> {stats.min.toFixed(1)}{unit}
                                    </div>
                                    <div>
                                      <span className="font-medium">Q1:</span> {stats.q1.toFixed(1)}{unit}
                                    </div>
                                    <div>
                                      <span className="font-medium">중앙값:</span> {stats.median.toFixed(1)}{unit}
                                    </div>
                                    <div>
                                      <span className="font-medium">Q3:</span> {stats.q3.toFixed(1)}{unit}
                                    </div>
                                    <div>
                                      <span className="font-medium">최대:</span> {stats.max.toFixed(1)}{unit}
                                    </div>
                                    {stats.applicant !== undefined && (
                                      <div>
                                        <span className="font-medium text-red-600">지원자:</span> {stats.applicant.toFixed(1)}{unit}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="text-xs text-gray-500 mt-2">
                                  파란 박스는 고성과자 분포(25%~75%), 빨간 선은 중앙값, 빨간 점은 지원자 위치입니다.
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            /* 접은 상태: 점수만 표시 */
            <div className="flex flex-col items-center justify-center px-0 pt-2 pb-4">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-extrabold text-blue-600 drop-shadow-sm">{result.total_score ?? result.growth_score}</span>
                <span className="text-lg font-bold text-blue-500 mb-1">점</span>
              </div>
              <div className="text-sm text-blue-700 mt-1 font-semibold">AI 성장 예측</div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default GrowthPredictionCard; 