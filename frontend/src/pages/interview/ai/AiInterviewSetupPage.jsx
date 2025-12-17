import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SelectedQuestionsList from '../../../components/interview/SelectedQuestionsList';
import { Box, Paper, Typography, Button, Divider, Chip, CardContent } from '@mui/material';
import { MdOutlinePlayCircle, MdCheckCircle, MdMic, MdVideocam, MdSettings, MdDelete } from 'react-icons/md';
import Navbar from '../../../components/Navbar';
import ViewPostSidebar from '../../../components/ViewPostSidebar';
import api from '../../../api/api';



export default function AiInterviewSetupPage() {
  const { jobPostId } = useParams();
  const navigate = useNavigate();
  
  // 질문 목록 상태
  const [questions, setQuestions] = React.useState([]);
  const [draggedItemIndex, setDraggedItemIndex] = React.useState(null);
  
  // 리프레시 트리거 (질문 추가/삭제 시 SelectedQuestionsList 갱신용)
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  // 질문 목록 가져오기 (API 호출 -> 실패 시 Mock Data)
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        console.log(`AI 면접 질문 조회 시작 (JobPostId: ${jobPostId})`);
        // const response = await api.get(`/interview-questions/job-post/${jobPostId}/ai-common`);
        
        const response = await api.get(`/ai-interview/job-post/${jobPostId}/common-questions`);
        
        if (response.data && response.data.questions && response.data.questions.length > 0) {
          setQuestions(response.data.questions);
        } else {
          throw new Error('데이터 없음');
        }
      } catch (error) {
        console.warn('AI 면접 질문 로드 실패. Mock Data를 사용합니다.', error);
        setQuestions([
          { question_text: "간단한 자기소개를 해주세요.", category: "introduction", difficulty: "easy" },
          { question_text: "우리 회사에 지원하게 된 동기는 무엇인가요?", category: "motivation", difficulty: "medium" },
          { question_text: "본인의 강점과 약점에 대해 설명해주세요.", category: "personality", difficulty: "medium" },
          { question_text: "직무와 관련된 프로젝트 경험이 있다면 이야기해주세요.", category: "experience", difficulty: "hard" },
          { question_text: "입사 후 5년 뒤 본인의 모습을 그려본다면?", category: "vision", difficulty: "medium" }
        ]);
      }
    };

    fetchQuestions();
  }, [jobPostId]);

  const handleStartDemo = () => {
    navigate(`/ai-interview-demo/${jobPostId}/demo`);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, question) => {
    e.dataTransfer.setData("question", JSON.stringify(question));
    e.dataTransfer.effectAllowed = 'copy';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };
  
  // 클릭해서 추가하는 핸들러 (드래그 앤 드롭 대안)
  const handleAddQuestion = async (question) => {
    try {
      await api.post(`/ai-interview/job-post/${jobPostId}/questions`, {
        id: typeof question === 'object' ? question.id : undefined, // 기존 질문 ID 전달
        question_text: typeof question === 'string' ? question : question.question_text,
        category: question.category || 'general',
        difficulty: question.difficulty || 'medium'
      });
      // 리스트 갱신 트리거
      setRefreshTrigger(prev => prev + 1);
      // 추천 리스트도 갱신 필요 (선택된 건 빠져야 하므로)
      // fetchQuestions(); // -> useEffect 의존성 때문에 무한루프 가능성 있으니 별도 함수로 빼거나, 여기서 상태 업데이트만.
      // 하지만 추천 리스트는 useEffect에서 로드하므로, 여기서 questions 상태를 직접 수정해서 빼는 게 UX상 좋음.
      
      if (typeof question === 'object') {
          setQuestions(prev => prev.filter(q => q.id !== question.id));
      }
      
    } catch (error) {
      console.error('질문 추가 실패:', error);
      alert('질문 추가에 실패했습니다.');
    }
  };

  // Helper to get chip color based on difficulty
  const getDifficultyColor = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'easy': return { bg: '#e8f5e9', text: '#2e7d32' };
      case 'hard': return { bg: '#ffebee', text: '#c62828' };
      default: return { bg: '#fff3e0', text: '#ef6c00' }; // medium
    }
  };

  return (
    <Box sx={{ minHeight: '110vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
      <Navbar />
      <Box sx={{ display: 'flex', flex: 1 }}>
        <ViewPostSidebar />
        <Box sx={{ flex: 1, p: 4, ml: '90px', mt: '64px', height: 'calc(110vh - 64px)', overflow: 'hidden' }}> {/* Sidebar width margin + Header height margin */}
          <Box sx={{ maxWidth: '1200px', mx: 'auto', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* 3D 스타일 헤더 섹션 (클릭 시 데모 시작) */}
            <div 
              onClick={handleStartDemo}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 mb-6 shadow-lg flex-shrink-0 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.01] group relative overflow-hidden"
            >
              {/* 클릭 유도 효과 */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                <div className="text-white">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: '800', textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
                      AI 면접 설정 및 체험
                    </Typography>
                    <Chip 
                      label="체험하기 Click" 
                      color="secondary" 
                      size="small" 
                      sx={{ 
                        fontWeight: 'bold', 
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                          '0%': { transform: 'scale(1)', opacity: 1 },
                          '50%': { transform: 'scale(1.05)', opacity: 0.8 },
                          '100%': { transform: 'scale(1)', opacity: 1 },
                        }
                      }} 
                    />
                  </Box>
                  <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: '600px', lineHeight: 1.6 }}>
                    우리 회사만의 AI 면접 환경을 구축하세요. 
                    질문 리스트를 확정하고, 이 영역을 클릭하여 실제 면접 과정을 미리 시뮬레이션해볼 수 있습니다.
                  </Typography>
                </div>
                <div className="hidden md:block bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20 group-hover:bg-white/20 transition-colors">
                  <MdOutlinePlayCircle size={48} className="text-white" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 mb-6">
              {/* 왼쪽: 질문 목록 추천 (Pool) */}
              <div className="h-full flex flex-col min-h-0">
                <Paper sx={{ p: 3, boxShadow: 2, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                    <MdCheckCircle size={28} color="#2e7d32" />
                    <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
                      추천 질문 리스트
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Button 
                      size="small" 
                      onClick={async () => {
                        try {
                          if (window.confirm('모든 질문을 다시 추천 목록으로 되돌리시겠습니까?')) {
                            await api.post(`/ai-interview/job-post/${jobPostId}/reset-questions`);
                            setRefreshTrigger(prev => prev + 1);
                            // 화면 갱신을 위해 API 재호출 (useEffect 트리거)
                            // jobPostId가 같으므로 fetchQuestions()를 직접 호출하는게 낫지만,
                            // useEffect 의존성 배열에 refreshTrigger를 추가하거나,
                            // 별도로 fetchQuestions를 호출하는게 깔끔함.
                            // 여기서는 간단히 window reload 또는 상태 초기화.
                            window.location.reload(); 
                          }
                        } catch (e) {
                          console.error('초기화 실패', e);
                        }
                      }}
                      sx={{ color: 'grey.600' }}
                    >
                      초기화
                    </Button>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'grey.600', mb: 2, flexShrink: 0 }}>
                    클릭하여 우측의 확정된 질문 목록으로 추가하세요.
                  </Typography>
                  
                  <Divider sx={{ mb: 2, flexShrink: 0 }} />
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', pr: 1, flex: 1, minHeight: 0 }}>
                    {questions.map((q, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, q)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleAddQuestion(q)}
                        className="transition-all duration-200 cursor-pointer hover:translate-x-1 flex-shrink-0"
                      >
                        <Paper 
                          sx={{ 
                            p: 2, 
                            bgcolor: 'grey.50', 
                            borderLeft: '4px solid #2e7d32',
                            '&:hover': { boxShadow: 2, bgcolor: '#f1f8e9' }
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {/* 태그 표시 (Category & Difficulty) */}
                                {typeof q !== 'string' && (
                                  <>
                                    {q.category && (
                                      <Chip 
                                        label={q.category} 
                                        size="small" 
                                        sx={{ 
                                          bgcolor: '#e3f2fd', 
                                          color: '#1565c0', 
                                          fontSize: '0.7rem', 
                                          height: '20px',
                                          fontWeight: '500'
                                        }} 
                                      />
                                    )}
                                    {q.difficulty && (
                                      <Chip 
                                        label={q.difficulty} 
                                        size="small" 
                                        sx={{ 
                                          bgcolor: getDifficultyColor(q.difficulty).bg, 
                                          color: getDifficultyColor(q.difficulty).text, 
                                          fontSize: '0.7rem', 
                                          height: '20px',
                                          fontWeight: '500'
                                        }} 
                                      />
                                    )}
                                  </>
                                )}
                              </div>
                              <Typography variant="body1" sx={{ color: 'grey.900' }}>
                                {typeof q === 'string' ? q : q.question_text}
                              </Typography>
                            </div>
                            <div className="text-gray-400 ml-2 cursor-pointer hover:text-red-500" onClick={(e) => {
                              e.stopPropagation();
                              // 질문 삭제 (숨김 처리)
                              const handleDelete = async () => {
                                try {
                                  if (typeof q === 'object' && q.id) {
                                    await api.delete(`/ai-interview/questions/${q.id}`);
                                    setQuestions(prev => prev.filter(item => item.id !== q.id));
                                  }
                                } catch (err) {
                                  console.error('질문 삭제 실패', err);
                                }
                              };
                              handleDelete();
                            }}>
                              <MdDelete size={20} />
                            </div>
                          </div>
                        </Paper>
                      </div>
                    ))}
                  </Box>
                </Paper>
              </div>

              {/* 오른쪽: 확정된 질문 목록 (Selected) */}
              <div className="h-full flex flex-col min-h-0">
                <SelectedQuestionsList jobPostId={jobPostId} refreshTrigger={refreshTrigger} />
              </div>
            </div>

          </Box>
        </Box>
      </Box>
    </Box>
  );
}

