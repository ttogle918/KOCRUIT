import React, { useState, useEffect } from 'react';
import { fetchGrowthPrediction } from '../api/growthPredictionApi';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip, Legend as BarLegend, ComposedChart, Line, Area } from 'recharts';

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
    setChartMode('ratio');
    setShowDetail(false);
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
    <>
      {!result ? (
        <div className="flex justify-center my-6">
          <button
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-full shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={handlePredict}
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
        <div className="px-0 py-0">
          {/* 상단 탭/타이틀 */}
          <div className="flex items-center gap-2 mb-2 mt-2">
            <span className="inline-block bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full p-2 shadow">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg>
            </span>
            <span className="text-lg font-bold text-blue-800">AI 성장 가능성 예측</span>
          </div>
          {/* 점수 및 탭 바 */}
          <div className="flex flex-col items-center justify-center px-0 pt-2 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-extrabold text-blue-600 drop-shadow-sm">{result.total_score ?? result.growth_score}</span>
              <span className="text-xl font-bold text-blue-500 mb-1">점</span>
            </div>
            <div className="flex w-full mt-4 rounded-lg overflow-hidden border border-blue-100 shadow-sm">
              <div className="flex-1 text-center py-2 bg-blue-50 text-blue-700 font-semibold text-base border-r border-blue-100">AI 성장 예측</div>
              <div className="flex-1 text-center py-2 text-gray-400 font-semibold text-base">(합격/불합격 등 다른 탭 필요시 여기에)</div>
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
                  <h4 className="font-semibold text-base mb-2">고성과자 분포와 지원자 위치</h4>
                  {Object.entries(result.boxplot_data).map(([label, stats]) => {
                    const meta = boxplotLabels[label] || { label, unit: '', desc: '' };
                    
                    // Box plot 데이터 생성
                    const boxData = [
                      { name: '최저값', value: stats.min, type: 'min' },
                      { name: '25%', value: stats.q1, type: 'q1' },
                      { name: '중간값', value: stats.median, type: 'median' },
                      { name: '75%', value: stats.q3, type: 'q3' },
                      { name: '최고값', value: stats.max, type: 'max' }
                    ];
                    
                    return (
                      <div key={label} className="mb-6">
                        <div className="font-semibold mb-1">
                          {meta.label} <span className="text-xs text-gray-500">({meta.desc}{meta.unit ? `, 단위: ${meta.unit}` : ''})</span>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <ComposedChart data={boxData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <BarTooltip 
                              formatter={(value, name) => [
                                `${value}${meta.unit ? ` ${meta.unit}` : ''}`, 
                                name
                              ]}
                            />
                            <BarLegend />
                            <Bar dataKey="value" fill="#2563eb" name="고성과자 분포" />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#2563eb" 
                              strokeWidth={2}
                              dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                            />
                            {/* 지원자 위치 표시 */}
                            <Line 
                              type="monotone" 
                              data={[{ name: '지원자', value: stats.applicant }]}
                              dataKey="value" 
                              stroke="red" 
                              strokeWidth={3}
                              dot={{ fill: 'red', strokeWidth: 2, r: 6 }}
                              name="지원자"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                        <div className="text-xs text-gray-500 mt-2">
                          파란 막대는 고성과자 집단의 분포(최저~최고, 25%~75%, 중간값), 빨간 점은 지원자의 위치입니다.
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};

export default GrowthPredictionCard; 