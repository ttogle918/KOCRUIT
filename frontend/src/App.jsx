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
import InterviewProgress from './pages/applicant/InterviewProgress';

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
    "none",
    "0px 1px 3px rgba(0,0,0,0.2), 0px 1px 1px rgba(0,0,0,0.14), 0px 2px 1px rgba(0,0,0,0.12)",
    "0px 1px 5px rgba(0,0,0,0.2), 0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px rgba(0,0,0,0.12)",
    "0px 1.5px 8px rgba(0,0,0,0.2), 0px 3px 4px rgba(0,0,0,0.14), 0px 4.5px 2px rgba(0,0,0,0.12)",
    "0px 2px 4px rgba(0,0,0,0.2), 0px 4px 5px rgba(0,0,0,0.14), 0px 6px 2px rgba(0,0,0,0.12)",
    "0px 3px 5px rgba(0,0,0,0.2), 0px 6px 10px rgba(0,0,0,0.14), 0px 8px 3px rgba(0,0,0,0.12)",
    "0px 4px 5px rgba(0,0,0,0.2), 0px 8px 10px rgba(0,0,0,0.14), 0px 12px 3px rgba(0,0,0,0.12)",
    "0px 5px 5px rgba(0,0,0,0.2), 0px 10px 10px rgba(0,0,0,0.14), 0px 14px 3px rgba(0,0,0,0.12)",
    "0px 6px 5px rgba(0,0,0,0.2), 0px 12px 10px rgba(0,0,0,0.14), 0px 16px 3px rgba(0,0,0,0.12)",
    "0px 7px 8px rgba(0,0,0,0.2), 0px 14px 12px rgba(0,0,0,0.14), 0px 20px 5px rgba(0,0,0,0.12)",
    "0px 8px 10px rgba(0,0,0,0.2), 0px 16px 14px rgba(0,0,0,0.14), 0px 24px 6px rgba(0,0,0,0.12)",
    "0px 9px 12px rgba(0,0,0,0.2), 0px 18px 16px rgba(0,0,0,0.14), 0px 28px 7px rgba(0,0,0,0.12)",
    "0px 10px 14px rgba(0,0,0,0.2), 0px 20px 18px rgba(0,0,0,0.14), 0px 32px 8px rgba(0,0,0,0.12)",
    "0px 11px 15px rgba(0,0,0,0.2), 0px 22px 20px rgba(0,0,0,0.14), 0px 36px 9px rgba(0,0,0,0.12)",
    "0px 12px 17px rgba(0,0,0,0.2), 0px 24px 22px rgba(0,0,0,0.14), 0px 40px 10px rgba(0,0,0,0.12)",
    "0px 13px 19px rgba(0,0,0,0.2), 0px 26px 24px rgba(0,0,0,0.14), 0px 44px 11px rgba(0,0,0,0.12)",
    "0px 14px 21px rgba(0,0,0,0.2), 0px 28px 26px rgba(0,0,0,0.14), 0px 48px 12px rgba(0,0,0,0.12)",
    "0px 15px 22px rgba(0,0,0,0.2), 0px 30px 28px rgba(0,0,0,0.14), 0px 52px 13px rgba(0,0,0,0.12)",
    "0px 16px 24px rgba(0,0,0,0.2), 0px 32px 30px rgba(0,0,0,0.14), 0px 56px 14px rgba(0,0,0,0.12)",
    "0px 17px 26px rgba(0,0,0,0.2), 0px 34px 32px rgba(0,0,0,0.14), 0px 60px 15px rgba(0,0,0,0.12)",
    "0px 18px 28px rgba(0,0,0,0.2), 0px 36px 34px rgba(0,0,0,0.14), 0px 64px 16px rgba(0,0,0,0.12)",
    "0px 19px 29px rgba(0,0,0,0.2), 0px 38px 36px rgba(0,0,0,0.14), 0px 68px 17px rgba(0,0,0,0.12)",
    "0px 20px 31px rgba(0,0,0,0.2), 0px 40px 38px rgba(0,0,0,0.14), 0px 72px 18px rgba(0,0,0,0.12)",
    "0px 21px 33px rgba(0,0,0,0.2), 0px 42px 40px rgba(0,0,0,0.14), 0px 76px 19px rgba(0,0,0,0.12)",
    "0px 22px 35px rgba(0,0,0,0.2), 0px 44px 42px rgba(0,0,0,0.14), 0px 80px 20px rgba(0,0,0,0.12)"
  ],
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