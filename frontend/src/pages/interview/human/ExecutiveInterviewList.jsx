import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { MdPerson, MdDescription, MdStar, MdCalendarToday } from 'react-icons/md';
import { MdBusiness, MdArrowForward } from "react-icons/md";

const ExecutiveInterviewList = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/executive-interview/candidates');
      setCandidates(response.data);
    } catch (err) {
      setError('임원면접 대상자 조회에 실패했습니다.');
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">임원면접 대상자를 불러오는 중..</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchCandidates} className="mt-4">
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          임원면접 대상자 목록
        </h1>
        <p className="text-gray-600">
          실무진 면접을 통과한 지원자의 임원면접을 진행합니다.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"
            title="총 대상자"
            action={<MdPerson className="h-4 w-4 text-muted-foreground" />}
          />
          <CardContent>
            <div className="text-2xl font-bold">{candidates.length}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"
            title="평가 완료"
            action={<MdStar className="h-4 w-4 text-muted-foreground" />}
          />
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {candidates.filter(c => c.executive_evaluation).length}명
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"
            title="평가 대기"
            action={<MdCalendarToday className="h-4 w-4 text-muted-foreground" />}
          />
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {candidates.filter(c => !c.executive_evaluation).length}명
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"
            title="평균 실무진 점수"
            action={<MdDescription className="h-4 w-4 text-muted-foreground" />}
          />
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {candidates.length > 0 
                ? (candidates.reduce((sum, c) => sum + (c.practical_score || 0), 0) / candidates.length).toFixed(1)
                : 0}점
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 대상자 목록 */}
      <Card>
        <CardHeader title={
            <div className="flex items-center gap-2">
              <MdBusiness className="h-5 w-5" />
              임원면접 대상자 목록
            </div>
          } 
        />
        <CardContent>
          {candidates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                임원면접 대상자가 없습니다
              </h3>
              <p className="text-gray-600">
                실무진 면접을 통과한 지원자가 없습니다.
              </p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>지원자</TableCell>
                  <TableCell>지원 공고</TableCell>
                  <TableCell>실무진 점수</TableCell>
                  <TableCell>임원진 점수</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <MdPerson className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{candidate.user?.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{candidate.user?.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{candidate.job_post?.title || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{candidate.job_post?.company?.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge badgeContent={candidate.practical_score || 0} color="primary" />
                        <span className="text-sm text-gray-500">점</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {candidate.executive_evaluation ? (
                        <Badge badgeContent={candidate.executive_evaluation.total_score} color="success" />
                      ) : (
                        <Badge badgeContent="대기" color="warning" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        badgeContent={candidate.executive_evaluation ? '평가 완료' : '평가 대기'}
                        color={candidate.executive_evaluation ? "success" : "warning"}
                      />
                    </TableCell>
                    <TableCell>
                      <Link to={`/applicant/executive-interview/${candidate.id}`}>
                        <Button size="small" variant="outlined" startIcon={<MdArrowForward className="w-4 h-4" />}>
                          {candidate.executive_evaluation ? '평가 보기' : '평가 하기'}
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExecutiveInterviewList;