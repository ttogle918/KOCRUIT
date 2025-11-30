import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import AiInterviewAIResults from './AiInterviewAIResults';

// 기업용 AI 면접(STT/QA) 채용 결과 페이지
// 이 컴포넌트는 AiInterviewAIResults의 wrapper 역할을 하며,
// 기업 채용관에게 맞춤화된 추가 정보와 안내를 제공합니다.
export default function ApplicantAiInterviewAIResults() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* 기업 채용관 안내 헤더 */}
      <Paper 
        elevation={2} 
        sx={{ 
          m: 2, 
          p: 3, 
          bgcolor: 'info.50', 
          border: '1px solid', 
          borderColor: 'info.200',
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <InfoIcon sx={{ color: 'info.main', fontSize: 28 }} />
          <Typography variant="h6" sx={{ color: 'info.800', fontWeight: 'medium' }}>
            AI 면접 결과 분석 시스템
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'info.700', lineHeight: 1.6 }}>
          이 페이지는 AI 면접 시스템의 STT(음성 인식) 및 QA(질문-응답) 분석 결과를 제공합니다. 
          지원자의 음성 응답을 텍스트로 변환하고, 질문별로 세분화된 분석 결과를 확인할 수 있습니다.
        </Typography>
      </Paper>
      
      {/* 메인 AI 면접 결과 컴포넌트 */}
      <AiInterviewAIResults />
    </Box>
  );
}
