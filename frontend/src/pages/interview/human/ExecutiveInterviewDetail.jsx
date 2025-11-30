import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import InputLabel from '@mui/material/InputLabel';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { MdPerson, MdDescription, MdStar, MdBusiness, MdArrowBack, MdSave, MdEdit } from 'react-icons/md';
import InterviewEvaluationItems from '../../../components/interview/InterviewEvaluationItems';
import { saveExecutiveInterviewEvaluation } from '../../../api/api';

// TabPanel 컴포넌트 정의
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ExecutiveInterviewDetail = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTab, setCurrentTab] = useState('evaluation');
  
  const [evaluation, setEvaluation] = useState({
    total_score: 0,
    summary: '',
    evaluation_items: [
      { evaluate_type: '리더십', evaluate_score: 0, grade: '', comment: '' },
      { evaluate_type: '전략적 사고', evaluate_score: 0, grade: '', comment: '' },
      { evaluate_type: '조직 적응력', evaluate_score: 0, grade: '', comment: '' },
      { evaluate_type: '비전 제시', evaluate_score: 0, grade: '', comment: '' },
      { evaluate_type: '의사결정 능력', evaluate_score: 0, grade: '', comment: '' },
      { evaluate_type: '인성 및 가치관', evaluate_score: 0, grade: '', comment: '' }
    ]
  });

  useEffect(() => {
    fetchCandidateDetails();
  }, [applicationId]);

  const fetchCandidateDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/executive-interview/candidate/${applicationId}/details`);
      setCandidate(response.data);
      
      // 기존 평가가 있으면 로드
      if (response.data.practical_evaluation) {
        setEvaluation({
          total_score: response.data.practical_evaluation.total_score || 0,
          summary: response.data.practical_evaluation.summary || '',
          evaluation_items: response.data.practical_evaluation.evaluation_items || evaluation.evaluation_items
        });
      }
    } catch (err) {
      setError('지원자 정보 조회에 실패했습니다.');
      console.error('Error fetching candidate details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleScoreChange = (index, value) => {
    const newItems = [...evaluation.evaluation_items];
    newItems[index].evaluate_score = parseFloat(value) || 0;
    
    // 등급 자동 계산
    const score = parseFloat(value) || 0;
    if (score >= 90) newItems[index].grade = 'A+';
    else if (score >= 85) newItems[index].grade = 'A';
    else if (score >= 80) newItems[index].grade = 'B+';
    else if (score >= 75) newItems[index].grade = 'B';
    else if (score >= 70) newItems[index].grade = 'C+';
    else if (score >= 65) newItems[index].grade = 'C';
    else newItems[index].grade = 'D';
    
    setEvaluation({
      ...evaluation,
      evaluation_items: newItems,
      total_score: newItems.reduce((sum, item) => sum + (item.evaluate_score || 0), 0) / newItems.length
    });
  };

  const handleCommentChange = (index, value) => {
    const newItems = [...evaluation.evaluation_items];
    newItems[index].comment = value;
    setEvaluation({
      ...evaluation,
      evaluation_items: newItems
    });
  };

  const handleSave = async () => {
    try {
      const evaluationData = {
        total_score: evaluation.total_score,
        summary: evaluation.summary,
        evaluation_items: evaluation.evaluation_items,
        evaluator_id: 1 // 임시 평가자 ID
      };
      
      await saveExecutiveInterviewEvaluation(applicationId, evaluationData);
      
      setIsEditing(false);
      fetchCandidateDetails(); // 데이터 새로고침
      alert('임원진 평가가 저장되었습니다.');
    } catch (err) {
      alert('평가 저장에 실패했습니다.');
      console.error('Error saving evaluation:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">지원자 정보를 불러오는 중..</p>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600">{error || '지원자 정보를 찾을 수 없습니다.'}</p>
          <Button onClick={() => navigate('/applicant/executive-interview')} className="mt-4">
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="outlined" 
            onClick={() => navigate('/applicant/executive-interview')}
            className="flex items-center gap-2"
          >
            <MdArrowBack className="w-4 h-4" />
            목록으로
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            임원면접 평가
          </h1>
        </div>
        <div className="flex items-center gap-4 text-gray-600">
          <div className="flex items-center gap-2">
            <MdPerson className="w-4 h-4" />
            <span>{candidate.user?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <MdBusiness className="w-4 h-4" />
            <span>{candidate.job_post?.title}</span>
          </div>
        </div>
      </div>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="evaluation tabs">
          <Tab label="임원진 평가" value="evaluation" />
          <Tab label="실무진 평가" value="practical" />
          <Tab label="이력서" value="resume" />
        </Tabs>
      </Box>

      {/* 임원진 평가 탭 */}
      <TabPanel value={currentTab} index="evaluation">
        <Card>
          <CardHeader
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MdStar className="h-5 w-5" />
                  임원진 평가
                </div>
                <div className="flex gap-2">
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                      <MdEdit className="w-4 h-4" />
                      수정하기
                    </Button>
                  ) : (
                    <>
                      <Button variant="outlined" onClick={() => setIsEditing(false)}>
                        취소
                      </Button>
                      <Button onClick={handleSave} className="flex items-center gap-2" variant="contained">
                        <MdSave className="w-4 h-4" />
                        저장
                      </Button>
                    </>
                  )}
                </div>
              </div>
            }
          />
          <CardContent>
            {isEditing ? (
              <div className="space-y-6">
                {/* AI 생성 평가 항목 */}
                {candidate && candidate.resume ? (
                  <InterviewEvaluationItems
                    resumeId={candidate.resume.id}
                    applicationId={parseInt(applicationId)}
                    interviewStage="executive"
                    onScoreChange={(scores) => {
                      console.log('임원진 평가 점수:', scores);
                      // AI 생성 평가 점수를 기존 평가 리스트와 병합
                      const newEvaluationItems = [...evaluation.evaluation_items];
                      
                      // AI 평가 점수를 기존 항목에 매핑
                      Object.entries(scores).forEach(([itemName, score]) => {
                        const existingItem = newEvaluationItems.find(item => 
                          item.evaluate_type === itemName
                        );
                        if (existingItem) {
                          existingItem.evaluate_score = score;
                          // 등급 자동 계산
                          if (score >= 9) existingItem.grade = 'A+';
                          else if (score >= 8) existingItem.grade = 'A';
                          else if (score >= 7) existingItem.grade = 'B+';
                          else if (score >= 6) existingItem.grade = 'B';
                          else if (score >= 5) existingItem.grade = 'C+';
                          else existingItem.grade = 'C';
                        }
                      });
                      
                      // 총점 재계산
                      const totalScore = newEvaluationItems.reduce((sum, item) => 
                        sum + (item.evaluate_score || 0), 0
                      ) / newEvaluationItems.length;
                      
                      setEvaluation({
                        ...evaluation,
                        evaluation_items: newEvaluationItems,
                        total_score: totalScore
                      });
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    이력서 정보가 없어 평가 항목을 불러올 수 없습니다.
                  </div>
                )}
                
                {/* 기존 평가 항목 (백업) */}
                <div className="border-t pt-6">
                  <Typography variant="h6" gutterBottom>
                    기존 평가 항목 (백업)
                  </Typography>
                {evaluation.evaluation_items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                        <InputLabel className="text-lg font-medium">{item.evaluate_type}</InputLabel>
                      <div className="flex items-center gap-2">
                          <TextField
                          type="number"
                          inputProps={{ min: "0", max: "100" }}
                          value={item.evaluate_score}
                          onChange={(e) => handleScoreChange(index, e.target.value)}
                          className="w-24"
                          size="small"
                        />
                        <span className="text-sm text-gray-500">점</span>
                        <Badge badgeContent={item.grade} color="primary" />
                      </div>
                    </div>
                      <TextareaAutosize
                      placeholder={`${item.evaluate_type}에 대한 상세 코멘트를 입력하세요..`}
                      value={item.comment}
                      onChange={(e) => handleCommentChange(index, e.target.value)}
                      minRows={3}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                ))}
                </div>
                
                {/* 총점 */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <InputLabel className="text-xl font-bold">총점</InputLabel>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-blue-600">
                        {evaluation.total_score.toFixed(1)}점
                      </span>
                      <Badge badgeContent={
                         evaluation.total_score >= 85 ? 'A' : 
                         evaluation.total_score >= 75 ? 'B' : 
                         evaluation.total_score >= 65 ? 'C' : 'D'
                      } color="secondary" />
                    </div>
                  </div>
                </div>

                {/* 종합 의견 */}
                <div className="space-y-2 mt-4">
                  <InputLabel className="text-lg font-medium">종합 의견</InputLabel>
                  <TextareaAutosize
                    placeholder="전체적인 임원진 평가 코멘트를 입력하세요.."
                    value={evaluation.summary}
                    onChange={(e) => setEvaluation({...evaluation, summary: e.target.value})}
                    minRows={4}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {evaluation.evaluation_items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.evaluate_type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{item.evaluate_score}점</span>
                        <Badge badgeContent={item.grade} color="primary" />
                      </div>
                    </div>
                    {item.comment && (
                      <p className="text-gray-600 text-sm">{item.comment}</p>
                    )}
                  </div>
                ))}
                
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold">총점</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {evaluation.total_score.toFixed(1)}점
                    </span>
                  </div>
                </div>
                
                {evaluation.summary && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">종합 의견</h4>
                    <p className="text-gray-700">{evaluation.summary}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* 실무진 평가 탭 */}
      <TabPanel value={currentTab} index="practical">
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <MdDescription className="h-5 w-5" />
                실무진 평가 내용
              </div>
            }
          />
          <CardContent>
            {candidate && candidate.resume ? (
              <InterviewEvaluationItems
                resumeId={candidate.resume.id}
                applicationId={parseInt(applicationId)}
                interviewStage="practical"
                onScoreChange={(scores) => {
                  console.log('실무진 평가 점수:', scores);
                  // 여기의 점수를 저장하거나 다른 처리를 할 수 있습니다
                }}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                이력서 정보가 없어 평가 항목을 불러올 수 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* 이력서 탭 */}
      <TabPanel value={currentTab} index="resume">
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <MdDescription className="h-5 w-5" />
                지원자 이력서
              </div>
            }
          />
          <CardContent>
            {candidate && candidate.resume ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">학력</h4>
                  <p className="text-gray-700">{candidate.resume.education || '정보 없음'}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">경력</h4>
                  <p className="text-gray-700">{candidate.resume.experience || '정보 없음'}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">기술 스택</h4>
                  <p className="text-gray-700">{candidate.resume.skills || '정보 없음'}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">자기소개</h4>
                  <p className="text-gray-700">{candidate.resume.introduction || '정보 없음'}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                이력서 정보가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
};

export default ExecutiveInterviewDetail;