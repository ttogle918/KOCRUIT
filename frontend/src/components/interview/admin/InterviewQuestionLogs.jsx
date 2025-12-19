import React, { useState, useEffect } from 'react';
import { FaPlay, FaPause, FaQuoteLeft, FaRobot, FaUser } from 'react-icons/fa';
import AiInterviewApi from '../../../api/aiInterviewApi';

const InterviewQuestionLogs = ({ applicationId, interviewType }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingId, setPlayingId] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await AiInterviewApi.getInterviewQuestionLogsByApplication(applicationId, interviewType);
        setLogs(data || []);
      } catch (err) {
        console.error('면접 로그 조회 실패:', err);
        setError('면접 로그를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (applicationId) {
      fetchLogs();
    }
  }, [applicationId, interviewType]);

  const toggleAudio = (id) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100">
        <p className="font-bold">{error}</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
        <FaQuoteLeft className="mx-auto text-3xl mb-4 opacity-20" />
        <p className="font-medium uppercase tracking-widest text-[10px]">No Interview Logs Found</p>
        <p className="text-xs mt-1">이 전형 단계에서 기록된 질문/답변 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-2">
      {logs.map((log, index) => (
        <div key={log.id} className="relative">
          {/* 타임라인 실선 */}
          {index !== logs.length - 1 && (
            <div className="absolute left-6 top-12 bottom-[-32px] w-0.5 bg-slate-100"></div>
          )}

          <div className="space-y-4">
            {/* 질문 (면접관) */}
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex-shrink-0 flex items-center justify-center shadow-lg shadow-slate-200">
                <FaRobot className="text-white text-lg" />
              </div>
              <div className="flex-1">
                <div className="bg-slate-100 rounded-2xl rounded-tl-none p-4 border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Question {index + 1}</p>
                  <p className="text-sm font-bold text-slate-800 leading-relaxed">
                    {log.question_text}
                  </p>
                </div>
              </div>
            </div>

            {/* 답변 (지원자) */}
            <div className="flex items-start space-x-4 flex-row-reverse space-x-reverse">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex-shrink-0 flex items-center justify-center shadow-lg shadow-blue-200">
                <FaUser className="text-white text-lg" />
              </div>
              <div className="flex-1">
                <div className="bg-blue-600 rounded-2xl rounded-tr-none p-5 text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
                  {/* 장식용 패턴 */}
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <FaQuoteLeft className="text-4xl" />
                  </div>
                  
                  <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">Applicant Answer</p>
                  <p className="text-sm font-medium leading-relaxed mb-4 relative z-10">
                    {log.answer_text || log.answer_text_transcribed || "답변 데이터가 없습니다."}
                  </p>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-500/30 relative z-10">
                    <div className="flex items-center space-x-3">
                      {log.answer_audio_url && (
                        <button 
                          onClick={() => toggleAudio(log.id)}
                          className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all"
                        >
                          {playingId === log.id ? <FaPause className="text-[10px]" /> : <FaPlay className="text-[10px] ml-0.5" />}
                        </button>
                      )}
                      {(log.emotion || log.attitude) && (
                        <span className="text-[10px] font-bold text-blue-100 uppercase tracking-tighter">
                          {log.emotion && `Emotion: ${log.emotion}`} 
                          {log.emotion && log.attitude && ' | '}
                          {log.attitude && `Attitude: ${log.attitude}`}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center bg-white/10 px-2.5 py-1 rounded-lg">
                      <span className="text-[10px] font-black mr-2">QA SCORE</span>
                      <span className="text-xs font-black">{log.answer_score || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* 피드백 (있는 경우) */}
                {log.answer_feedback && (
                  <div className="mt-3 ml-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center mb-2">
                      <div className="w-1 h-3 bg-emerald-400 rounded-full mr-2"></div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">AI Analysis Feedback</p>
                    </div>
                    <div className="text-xs text-emerald-800 leading-relaxed font-medium space-y-1">
                      {(() => {
                        try {
                          const feedback = typeof log.answer_feedback === 'string' && (log.answer_feedback.startsWith('[') || log.answer_feedback.startsWith('{'))
                            ? JSON.parse(log.answer_feedback) 
                            : log.answer_feedback;
                          
                          if (Array.isArray(feedback)) {
                            return feedback.map((msg, i) => (
                              <p key={i} className="flex items-start gap-2">
                                <span className="text-emerald-400 mt-1">•</span>
                                <span>{msg}</span>
                              </p>
                            ));
                          }
                          return <p>{feedback}</p>;
                        } catch (e) {
                          return <p>{log.answer_feedback}</p>;
                        }
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InterviewQuestionLogs;

