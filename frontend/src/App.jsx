import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Pages
import Home from "./pages/home/Home.jsx";
import JobList from "./pages/job/JobList.jsx";
import Login from "./pages/user/Login.jsx";
import Signup from "./pages/user/Signup.jsx";
import RoleTest from './pages/test/RoleTest.jsx';
import MyPage from "./pages/user/MyPage.jsx";
import CorporateHome from "./pages/home/CorporateHome.jsx";
import ApplicantList from "./pages/applicant/ApplicantList.jsx";
import Email from "./pages/email/Email.jsx";
import PostRecruitment from "./pages/post/PostRecruitment.jsx";
import CommonViewPost from "./pages/post/CommonViewPost.jsx";
import PartnerList from "./pages/partner/PartnerList.jsx";
import PartnerDetail from './pages/partner/PartnerDetail.jsx';
import ViewPost from './pages/post/ViewPost.jsx';
import EditPost from './pages/post/EditPost.jsx';
import PassedApplicants from "./pages/applicant/PassedApplicants.jsx";

import RejectedApplicants from "./pages/applicant/RejectedApplicants.jsx";
import ManagerSchedule from './pages/schedule/ManagerSchedule.jsx';
import MemberSchedule from './pages/schedule/MemberSchedule.jsx';
import InterviewProgress from './pages/interview/InterviewProgress';
import AiInterviewSystem from './pages/interview/AiInterviewSystem';
import AiInterviewAIResults from './pages/interview/AiInterviewAIResults';
import AiInterviewDemo from './components/interview/AiInterviewDemo';
import InterviewDashboard from './pages/interview/InterviewDashboard';
import InterviewResults from './pages/interview/InterviewResults.jsx';
import GoogleDriveTest from './pages/common/GoogleDriveTest';
import WrittenTestGenerator from './pages/applicant/WrittenTestGenerator';
import InterviewPanelManagement from './pages/interview/InterviewPanelManagement';
import ExecutiveInterviewList from './pages/interview/ExecutiveInterviewList';
import ExecutiveInterviewDetail from './pages/interview/ExecutiveInterviewDetail';
import InterviewManagementSystem from './pages/interview/InterviewManagementSystem';
import DocumentReport from "./pages/DocumentReport.jsx";
import JobAptitudeReport from "./pages/JobAptitudeReport.jsx";
import FinalReport from "./pages/FinalReport.jsx";
import WrittenTestPassedPage from './pages/written/WrittenTestPassedPage';
import InterviewReport from './pages/InterviewReport';
import ApplicantStatisticsReport from './pages/ApplicantStatisticsReport.jsx';

// Context & Constants
import { ThemeProvider } from "./context/ThemeContext";
import { ROLES } from './constants/roles';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FormProvider } from './context/FormContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import TestConnection from './components/TestConnection';
import ScrollToTop from './components/ScrollToTop';
import Chatbot from './components/Chatbot';
import { ChakraProvider } from '@chakra-ui/react';

// Styles
import "react-calendar/dist/Calendar.css";
import "./App.css";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <h1 className="text-2xl font-bold text-red-500">Something went wrong.</h1>
          <pre className="mt-4 p-4 bg-gray-100 rounded">
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

// Material-UI v5 테마 생성
const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  shadows: [
    'none', // elevation 0
    '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
    '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)',
    '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
    '0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)',
    '0px 3px 5px -1px rgba(0,0,0,0.2),0px 5px 8px 0px rgba(0,0,0,0.14),0px 1px 14px 0px rgba(0,0,0,0.12)',
    '0px 3px 5px -1px rgba(0,0,0,0.2),0px 6px 10px 0px rgba(0,0,0,0.14),0px 1px 18px 0px rgba(0,0,0,0.12)',
    '0px 4px 5px -2px rgba(0,0,0,0.2),0px 7px 10px 1px rgba(0,0,0,0.14),0px 2px 16px 1px rgba(0,0,0,0.12)',
    '0px 5px 5px -3px rgba(0,0,0,0.2),0px 8px 10px 1px rgba(0,0,0,0.14),0px 3px 14px 2px rgba(0,0,0,0.12)',
    '0px 5px 6px -3px rgba(0,0,0,0.2),0px 9px 12px 1px rgba(0,0,0,0.14),0px 3px 16px 2px rgba(0,0,0,0.12)',
    '0px 6px 6px -3px rgba(0,0,0,0.2),0px 10px 14px 1px rgba(0,0,0,0.14),0px 4px 18px 3px rgba(0,0,0,0.12)',
    '0px 6px 7px -4px rgba(0,0,0,0.2),0px 11px 15px 1px rgba(0,0,0,0.14),0px 4px 20px 3px rgba(0,0,0,0.12)',
    '0px 7px 8px -4px rgba(0,0,0,0.2),0px 12px 17px 2px rgba(0,0,0,0.14),0px 5px 22px 4px rgba(0,0,0,0.12)',
    '0px 7px 8px -4px rgba(0,0,0,0.2),0px 13px 19px 2px rgba(0,0,0,0.14),0px 5px 24px 4px rgba(0,0,0,0.12)',
    '0px 7px 9px -4px rgba(0,0,0,0.2),0px 14px 21px 2px rgba(0,0,0,0.14),0px 5px 26px 4px rgba(0,0,0,0.12)',
    '0px 8px 9px -5px rgba(0,0,0,0.2),0px 15px 22px 2px rgba(0,0,0,0.14),0px 6px 28px 5px rgba(0,0,0,0.12)',
    '0px 8px 10px -5px rgba(0,0,0,0.2),0px 16px 24px 2px rgba(0,0,0,0.14),0px 6px 30px 5px rgba(0,0,0,0.12)',
    '0px 8px 11px -5px rgba(0,0,0,0.2),0px 17px 26px 2px rgba(0,0,0,0.14),0px 6px 32px 5px rgba(0,0,0,0.12)',
    '0px 9px 11px -5px rgba(0,0,0,0.2),0px 18px 28px 2px rgba(0,0,0,0.14),0px 7px 34px 6px rgba(0,0,0,0.12)',
    '0px 9px 12px -6px rgba(0,0,0,0.2),0px 19px 29px 2px rgba(0,0,0,0.14),0px 7px 36px 6px rgba(0,0,0,0.12)',
    '0px 10px 13px -6px rgba(0,0,0,0.2),0px 20px 31px 3px rgba(0,0,0,0.14),0px 8px 38px 7px rgba(0,0,0,0.12)',
    '0px 10px 13px -6px rgba(0,0,0,0.2),0px 21px 33px 3px rgba(0,0,0,0.14),0px 8px 40px 7px rgba(0,0,0,0.12)',
    '0px 10px 14px -6px rgba(0,0,0,0.2),0px 22px 35px 3px rgba(0,0,0,0.14),0px 8px 42px 7px rgba(0,0,0,0.12)',
    '0px 11px 14px -7px rgba(0,0,0,0.2),0px 23px 36px 3px rgba(0,0,0,0.14),0px 9px 44px 8px rgba(0,0,0,0.12)',
    '0px 11px 15px -7px rgba(0,0,0,0.2),0px 24px 38px 3px rgba(0,0,0,0.14),0px 9px 46px 8px rgba(0,0,0,0.12)',
    '0px 12px 16px -8px rgba(0,0,0,0.2),0px 25px 40px 3px rgba(0,0,0,0.14),0px 10px 48px 9px rgba(0,0,0,0.12)',
    '0px 12px 17px -8px rgba(0,0,0,0.2),0px 26px 42px 3px rgba(0,0,0,0.14),0px 10px 50px 9px rgba(0,0,0,0.12)',
    '0px 13px 18px -8px rgba(0,0,0,0.2),0px 27px 44px 3px rgba(0,0,0,0.14),0px 11px 52px 10px rgba(0,0,0,0.12)',
    '0px 13px 19px -9px rgba(0,0,0,0.2),0px 28px 46px 3px rgba(0,0,0,0.14),0px 11px 54px 10px rgba(0,0,0,0.12)',
    '0px 14px 20px -9px rgba(0,0,0,0.2),0px 29px 48px 3px rgba(0,0,0,0.14),0px 12px 56px 11px rgba(0,0,0,0.12)',
    '0px 14px 21px -9px rgba(0,0,0,0.2),0px 30px 50px 3px rgba(0,0,0,0.14),0px 12px 58px 11px rgba(0,0,0,0.12)',
    '0px 15px 22px -9px rgba(0,0,0,0.2),0px 31px 52px 3px rgba(0,0,0,0.14),0px 13px 60px 12px rgba(0,0,0,0.12)',
    '0px 15px 23px -10px rgba(0,0,0,0.2),0px 32px 54px 3px rgba(0,0,0,0.14),0px 13px 62px 12px rgba(0,0,0,0.12)',
    '0px 16px 24px -10px rgba(0,0,0,0.2),0px 33px 56px 3px rgba(0,0,0,0.14),0px 14px 64px 13px rgba(0,0,0,0.12)',
    '0px 16px 25px -10px rgba(0,0,0,0.2),0px 34px 58px 3px rgba(0,0,0,0.14),0px 14px 66px 13px rgba(0,0,0,0.12)',
    '0px 17px 26px -11px rgba(0,0,0,0.2),0px 35px 60px 3px rgba(0,0,0,0.14),0px 15px 68px 14px rgba(0,0,0,0.12)',
    '0px 17px 27px -11px rgba(0,0,0,0.2),0px 36px 62px 3px rgba(0,0,0,0.14),0px 15px 70px 14px rgba(0,0,0,0.12)',
    '0px 18px 28px -11px rgba(0,0,0,0.2),0px 37px 64px 3px rgba(0,0,0,0.14),0px 16px 72px 15px rgba(0,0,0,0.12)',
    '0px 18px 29px -12px rgba(0,0,0,0.2),0px 38px 66px 3px rgba(0,0,0,0.14),0px 16px 74px 15px rgba(0,0,0,0.12)',
    '0px 19px 30px -12px rgba(0,0,0,0.2),0px 39px 68px 3px rgba(0,0,0,0.14),0px 17px 76px 16px rgba(0,0,0,0.12)',
    '0px 19px 31px -12px rgba(0,0,0,0.2),0px 40px 70px 3px rgba(0,0,0,0.14),0px 17px 78px 16px rgba(0,0,0,0.12)',
    '0px 20px 32px -13px rgba(0,0,0,0.2),0px 41px 72px 3px rgba(0,0,0,0.14),0px 18px 80px 17px rgba(0,0,0,0.12)',
    '0px 20px 33px -13px rgba(0,0,0,0.2),0px 42px 74px 3px rgba(0,0,0,0.14),0px 18px 82px 17px rgba(0,0,0,0.12)',
    '0px 21px 34px -13px rgba(0,0,0,0.2),0px 43px 76px 3px rgba(0,0,0,0.14),0px 19px 84px 18px rgba(0,0,0,0.12)',
    '0px 21px 35px -14px rgba(0,0,0,0.2),0px 44px 78px 3px rgba(0,0,0,0.14),0px 19px 86px 18px rgba(0,0,0,0.12)',
    '0px 22px 36px -14px rgba(0,0,0,0.2),0px 45px 80px 3px rgba(0,0,0,0.14),0px 20px 88px 19px rgba(0,0,0,0.12)',
    '0px 22px 37px -14px rgba(0,0,0,0.2),0px 46px 82px 3px rgba(0,0,0,0.14),0px 20px 90px 19px rgba(0,0,0,0.12)',
    '0px 23px 38px -15px rgba(0,0,0,0.2),0px 47px 84px 3px rgba(0,0,0,0.14),0px 21px 92px 20px rgba(0,0,0,0.12)',
    '0px 23px 39px -15px rgba(0,0,0,0.2),0px 48px 86px 3px rgba(0,0,0,0.14),0px 21px 94px 20px rgba(0,0,0,0.12)',
    '0px 24px 40px -15px rgba(0,0,0,0.2),0px 49px 88px 3px rgba(0,0,0,0.14),0px 22px 96px 21px rgba(0,0,0,0.12)',
    '0px 24px 41px -16px rgba(0,0,0,0.2),0px 50px 90px 3px rgba(0,0,0,0.14),0px 22px 98px 21px rgba(0,0,0,0.12)',
    '0px 25px 42px -16px rgba(0,0,0,0.2),0px 51px 92px 3px rgba(0,0,0,0.14),0px 23px 100px 22px rgba(0,0,0,0.12)',
  ],
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
  },
});

// App Routes Component
function AppRoutes() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <ScrollToTop />
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        <ChakraProvider>
          <ThemeProvider>
            <div className="min-h-screen bg-[#eef6ff] dark:bg-black">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/joblist" element={<JobList />} />
                <Route path="/common/company" element={<PartnerList />} />
                <Route path="/common/company/:id" element={<PartnerDetail />} />
                <Route path="/common/jobposts/:id" element={<CommonViewPost />} />
                <Route path="/role-test" element={<RoleTest />} />
                <Route path="/test-connection" element={<TestConnection />} />

                {/* Protected Routes */}
                <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
                <Route path="/corporatehome" element={<ProtectedRoute><CorporateHome /></ProtectedRoute>} />
                <Route path="/applicantlist" element={<ProtectedRoute><ApplicantList /></ProtectedRoute>} />
                <Route path="/email" element={<ProtectedRoute><Email /></ProtectedRoute>} />
                <Route path="/postrecruitment" element={<ProtectedRoute><PostRecruitment /></ProtectedRoute>} />
                <Route path="/company/jobposts/:id" element={<ProtectedRoute><CommonViewPost /></ProtectedRoute>} />
                <Route path="/viewpost/:jobPostId" element={<ProtectedRoute><ViewPost /></ProtectedRoute>} />
                <Route path="/passedapplicants/:jobPostId" element={<ProtectedRoute><PassedApplicants /></ProtectedRoute>} />
                <Route path="/editpost/:jobPostId" element={<ProtectedRoute><EditPost /></ProtectedRoute>} />
                <Route path="/rejectedapplicants/:jobPostId" element={<ProtectedRoute><RejectedApplicants /></ProtectedRoute>} />
                <Route path="/managerschedule" element={<ProtectedRoute><ManagerSchedule /></ProtectedRoute>} />
                <Route path="/memberschedule" element={<ProtectedRoute><MemberSchedule /></ProtectedRoute>} />
                <Route path="/applicantlist/:jobPostId" element={<ProtectedRoute><ApplicantList /></ProtectedRoute>} />
                        <Route path="/interview-progress/:jobPostId" element={<ProtectedRoute><InterviewProgress /></ProtectedRoute>} />
        <Route path="/interview-progress/:jobPostId/:interviewStage" element={<ProtectedRoute><InterviewProgress /></ProtectedRoute>} />
        <Route path="/interview-progress/:jobPostId/:interviewStage/:applicantId" element={<ProtectedRoute><InterviewProgress /></ProtectedRoute>} />
        
        {/* AI 면접 시스템 */}
        <Route path="/ai-interview/:jobPostId" element={<ProtectedRoute><AiInterviewSystem /></ProtectedRoute>} />
        <Route path="/ai-interview/:jobPostId/:applicantId" element={<ProtectedRoute><AiInterviewSystem /></ProtectedRoute>} />
        
        {/* AI 면접 결과 */}
        <Route path="/ai-interview-results/:applicationId" element={<ProtectedRoute><AiInterviewAIResults /></ProtectedRoute>} />
                <Route path="/ai-interview-demo/:jobPostId/:applicantId" element={<ProtectedRoute><AiInterviewDemo /></ProtectedRoute>} />
                <Route path="/interview/:jobPostId" element={<ProtectedRoute><InterviewDashboard /></ProtectedRoute>} />
                <Route path="/interview/results/:applicationId" element={<ProtectedRoute><InterviewResults /></ProtectedRoute>} />
                <Route path="/google-drive-test" element={<ProtectedRoute><GoogleDriveTest /></ProtectedRoute>} />
                <Route path="/interview-panel-management/:jobPostId" element={<ProtectedRoute><InterviewPanelManagement /></ProtectedRoute>} />
                <Route path="/applicant/written-test-generator" element={<ProtectedRoute><WrittenTestGenerator /></ProtectedRoute>} />
                <Route path="/applicant/executive-interview" element={<ProtectedRoute><ExecutiveInterviewList /></ProtectedRoute>} />
                <Route path="/applicant/executive-interview/:applicationId" element={<ProtectedRoute><ExecutiveInterviewDetail /></ProtectedRoute>} />
                <Route path="/interview-management/:jobPostId" element={<ProtectedRoute><InterviewManagementSystem /></ProtectedRoute>} />
                <Route path="/interview-management-system/:jobPostId" element={<ProtectedRoute><InterviewManagementSystem /></ProtectedRoute>} />
                <Route path="/report/document" element={<ProtectedRoute><DocumentReport /></ProtectedRoute>} />
                <Route path="/report/job-aptitude" element={<ProtectedRoute><JobAptitudeReport /></ProtectedRoute>} />
                <Route path="/report/final" element={<ProtectedRoute><FinalReport /></ProtectedRoute>} />
                <Route path="/report/applicant-statistics" element={<ProtectedRoute><ApplicantStatisticsReport /></ProtectedRoute>} />
                <Route path="/written-test-passed" element={<WrittenTestPassedPage />} />
                <Route path="/written-test-passed/:jobpostId" element={<WrittenTestPassedPage />} />
                <Route path="/interview-report" element={<InterviewReport />} />
              
              </Routes>
              <Chatbot />
            </div>
          </ThemeProvider>
        </ChakraProvider>
      </MuiThemeProvider>
    </BrowserRouter>
  );
}

function App() {
  console.log('App component rendering');

  return (
    <ErrorBoundary>
      <AuthProvider>
        <FormProvider>
          <AppRoutes />
        </FormProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;