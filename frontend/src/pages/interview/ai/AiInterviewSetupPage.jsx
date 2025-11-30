import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Divider, Card, CardContent } from '@mui/material';
import { MdOutlinePlayCircle, MdCheckCircle, MdMic, MdVideocam, MdSettings } from 'react-icons/md';
import Navbar from '../../../components/Navbar';
import ViewPostSidebar from '../../../components/ViewPostSidebar';

export default function AiInterviewSetupPage() {
  const { jobPostId } = useParams();
  const navigate = useNavigate();
  
  // 질문 목록 상태 (초기값: 데모 데이터)
  const [questions, setQuestions] = React.useState([
    "간단한 자기소개를 해주세요.",
    "우리 회사에 지원하게 된 동기는 무엇인가요?",
    "본인의 강점과 약점에 대해 설명해주세요.",
    "직무와 관련된 프로젝트 경험이 있다면 이야기해주세요.",
    "입사 후 5년 뒤 본인의 모습을 그려본다면?"
  ]);
  const [draggedItemIndex, setDraggedItemIndex] = React.useState(null);

  const handleStartDemo = () => {
    // 데모 모드 페이지로 이동 (applicantId 자리에 'demo' 사용)
    navigate(`/ai-interview-demo/${jobPostId}/demo`);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = (e) => {
    setDraggedItemIndex(null);
    e.currentTarget.style.opacity = '1';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;

    const newQuestions = [...questions];
    const [draggedItem] = newQuestions.splice(draggedItemIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedItem);
    
    setQuestions(newQuestions);
    setDraggedItemIndex(null);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
      <Navbar />
      <Box sx={{ display: 'flex', flex: 1 }}>
        <ViewPostSidebar />
        <Box sx={{ flex: 1, p: 4, ml: '90px', mt: '64px' }}> {/* Sidebar width margin + Header height margin */}
          <Box sx={{ maxWidth: '1200px', mx: 'auto', width: '100%' }}>
            
            {/* 3D 스타일 헤더 섹션 */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 mb-8 shadow-lg transform transition-transform hover:scale-[1.01] duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="text-white">
                  <Typography variant="h4" sx={{ fontWeight: '800', mb: 1, textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
                    AI 면접 설정 및 체험
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: '600px', lineHeight: 1.6 }}>
                    우리 회사만의 AI 면접 환경을 구축하세요. 
                    질문 리스트를 확인하고, 지원자가 경험하게 될 실제 면접 과정을 미리 시뮬레이션해볼 수 있습니다.
                  </Typography>
                </div>
                <div className="hidden md:block bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
                  <MdOutlinePlayCircle size={48} className="text-white" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. AI 면접 체험 카드 */}
              <div className="col-span-1">
                <Card sx={{ height: '100%', boxShadow: 2 }}>
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <MdOutlinePlayCircle size={28} color="#1976d2" />
                      <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
                        AI 면접 체험하기 (Demo)
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'grey.600', mb: 3, flex: 1 }}>
                      설정된 공통 질문을 바탕으로 AI 면접을 직접 체험해볼 수 있습니다. 
                      실제 채용 데이터에는 반영되지 않으니 안심하고 테스트하세요.
                    </Typography>
                    <Button 
                      variant="contained" 
                      size="large" 
                      startIcon={<MdOutlinePlayCircle />}
                      onClick={handleStartDemo}
                      sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
                    >
                      데모 시작하기
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* 2. 환경 점검 카드 */}
              <div className="col-span-1">
                <Card sx={{ height: '100%', boxShadow: 2 }}>
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <MdSettings size={28} color="#ed6c02" />
                      <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
                        시스템 환경 점검
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'grey.600', mb: 3 }}>
                      카메라, 마이크, 스피커가 정상적으로 작동하는지 확인합니다. 
                      면접 진행 전 시스템 호환성을 미리 점검하세요.
                    </Typography>
                    
                    <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <MdVideocam size={20} color="#666" />
                          <Typography variant="body2" sx={{ ml: 1 }}>카메라 권한</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold' }}>확인 필요</Typography>
                      </Paper>
                      <Paper sx={{ p: 2, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <MdMic size={20} color="#666" />
                          <Typography variant="body2" sx={{ ml: 1 }}>마이크 권한</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold' }}>확인 필요</Typography>
                      </Paper>
                    </Box>
                  </CardContent>
                </Card>
              </div>

              {/* 3. 등록된 질문 목록 (Read-only) */}
              <div className="col-span-1 md:col-span-2">
                <Paper sx={{ p: 3, boxShadow: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <MdCheckCircle size={28} color="#2e7d32" />
                    <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
                      등록된 공통 질문 목록
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'grey.600', mb: 3 }}>
                    현재 채용 공고에 설정된 AI 면접 공통 질문입니다. (DB 연동)
                  </Typography>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {/* TODO: 실제 DB 데이터 연동 필요 (현재는 드래그 앤 드롭 데모) */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '320px', overflowY: 'auto', pr: 1 }}>
                    {questions.map((q, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, idx)}
                        className={`transition-all duration-200 cursor-move ${draggedItemIndex === idx ? 'opacity-50' : ''}`}
                      >
                        <Paper 
                          sx={{ 
                            p: 2, 
                            bgcolor: 'grey.50', 
                            borderLeft: '4px solid #2e7d32',
                            '&:hover': { boxShadow: 2, bgcolor: 'white' }
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'grey.800', mb: 0.5 }}>
                                질문 {idx + 1}
                              </Typography>
                              <Typography variant="body1" sx={{ color: 'grey.900' }}>
                                {q}
                              </Typography>
                            </div>
                            <div className="text-gray-400 ml-2">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 3h2v2H9V3zm4 0h2v2h-2V3zm-4 4h2v2H9V7zm4 0h2v2h-2V7zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2z"/>
                              </svg>
                            </div>
                          </div>
                        </Paper>
                      </div>
                    ))}
                  </Box>
                </Paper>
              </div>
            </div>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

