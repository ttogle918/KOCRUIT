import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  FiCamera, FiMic, FiMicOff, FiVideo, FiVideoOff, 
  FiPlay, FiPause, FiSquare, FiSettings, FiUser,
  FiClock, FiTarget, FiTrendingUp, FiAward, FiFolder,
  FiSave, FiCheck, FiX
} from 'react-icons/fi';
import { 
  MdOutlineAutoAwesome, MdOutlinePsychology,
  MdOutlineLanguage, MdOutlineGesture,
  MdOutlinePsychologyAlt, MdOutlineWork,
  MdOutlineVerified, MdOutlineStar
} from 'react-icons/md';
import { 
  FaUsers, FaGamepad, FaBrain, FaEye,
  FaSmile, FaHandPaper, FaMicrophone
} from 'react-icons/fa';

const InterviewPanel = React.memo(({
  questions,
  interviewChecklist,
  strengthsWeaknesses,
  interviewGuideline,
  evaluationCriteria,
  toolsLoading,
  memo,
  onMemoChange,
  evaluation,
  onEvaluationChange,
  isAutoSaving,
  resumeId,
  applicationId,
  companyName,
  applicantName,
  audioFile,
  jobInfo,
  resumeInfo,
  jobPostId,
  jobBasedEvaluationCriteria,
  evaluationScores,
  onEvaluationScoreChange,
  evaluationTotalScore,
  onSaveEvaluation,
  saveStatus,
  isSaving
}) => { 