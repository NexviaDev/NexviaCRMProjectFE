import './App.css';
import NavSection from './components/NavSection/NavSection';
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import React, { useContext } from 'react';
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TermsOfService from "./pages/TermsOfService";
import NaverCallbackPage from "./pages/NaverCallbackPage";
import GoogleCallbackPage from "./pages/GoogleCallbackPage";
import UserProvider, { UserContext } from './components/UserContext';
import ProtectedRoute from './components/ProtectedRoute';
import { GoogleOAuthProvider } from '@react-oauth/google';

// 부동산 CRM 컴포넌트들
import PropertyManagement from './components/PropertyManagement/PropertyManagement';
import CustomerManagement from './components/CustomerManagement/CustomerManagement';
import ContractManagement from './components/ContractManagement/ContractManagement';
import ScheduleManagement from './components/ScheduleManagement/ScheduleManagement';
import SalesManagement from './components/SalesManagement/SalesManagement';
import MemberManagement from './components/MemberManagement/MemberManagement';

// 구독 관리 컴포넌트
import SubscriptionManagement from './components/SubscriptionManagement/SubscriptionManagement';
import SubscriptionBilling from './components/SubscriptionManagement/SubscriptionBilling';
import SubscriptionPayment from './components/SubscriptionManagement/SubscriptionPayment';
import SubscriptionSuccess from './components/SubscriptionManagement/SubscriptionSuccess';
import SubscriptionFail from './components/SubscriptionManagement/SubscriptionFail';

// 계정 설정 컴포넌트
import AccountSettings from './components/MyPage/AccountSettings';

// 공지사항 컴포넌트
import NotificationPage from './pages/NotificationPage';

// 활동기록 컴포넌트
import ActivityLogPage from './pages/ActivityLogPage';

// 회사등록 컴포넌트
import CompanyRegisterPage from './pages/CompanyRegisterPage';

// 관리자 컴포넌트
import Admin from './components/AdminComponents/Admin';

// 구독 알림 컴포넌트
import SubscriptionAlert from './components/SubscriptionAlert';

// 환경변수 상수
const REACT_APP_GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;


// 구독 상태 확인 함수
const checkSubscriptionAccess = (user) => {
  if (!user) return false;
  
  // 구독 상태가 'active'인 경우 접근 허용
  if (user.subscriptionStatus === 'active') {
    return true;
  }
  
  // 무료 체험 중인 경우 접근 허용
  if (user.freeTrialUsed && user.freeTrialStartDate && user.freeTrialEndDate) {
    const now = new Date();
    const trialStart = new Date(user.freeTrialStartDate);
    const trialEnd = new Date(user.freeTrialEndDate);
    
    if (now >= trialStart && now <= trialEnd) {
      return true;
    }
  }
  
  return false;
};

// AppRoutes 컴포넌트를 별도로 분리하여 UserContext 사용
const AppRoutes = () => {
  const { user, isLoading } = useContext(UserContext);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen w-screen">
        <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <NavSection />
      <Routes>
        {/* 로그인이 필요 없는 라우트 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/auth/naver/callback" element={<NaverCallbackPage />} />
        <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
        
        {/* 홈 라우트 - 로그인 없이도 접근 가능 */}
        <Route path="/" element={<Home />} />
        
        {/* 부동산 CRM 라우트들 - 구독 상태 확인 */}
        <Route path="/properties" element={
          <ProtectedRoute user={user}>
            {checkSubscriptionAccess(user) ? <PropertyManagement /> : <SubscriptionAlert user={user} />}
          </ProtectedRoute>
        } />
        <Route path="/customers/:type" element={
          <ProtectedRoute user={user}>
            {checkSubscriptionAccess(user) ? <CustomerManagement /> : <SubscriptionAlert user={user} />}
          </ProtectedRoute>
        } />
        <Route path="/contracts" element={
          <ProtectedRoute user={user}>
            {checkSubscriptionAccess(user) ? <ContractManagement /> : <SubscriptionAlert user={user} />}
          </ProtectedRoute>
        } />
        <Route path="/schedule" element={
          <ProtectedRoute user={user}>
            {checkSubscriptionAccess(user) ? <ScheduleManagement /> : <SubscriptionAlert user={user} />}
          </ProtectedRoute>
        } />
        <Route path="/sales" element={
          <ProtectedRoute user={user}>
            {checkSubscriptionAccess(user) ? <SalesManagement /> : <SubscriptionAlert user={user} />}
          </ProtectedRoute>
        } />
        <Route path="/members" element={
          <ProtectedRoute user={user}>
            {checkSubscriptionAccess(user) ? <MemberManagement /> : <SubscriptionAlert user={user} />}
          </ProtectedRoute>
        } />
        
        {/* 구독 관리 라우트 */}
        <Route path="/subscription" element={
          <ProtectedRoute user={user}>
            <SubscriptionManagement />
          </ProtectedRoute>
        } />
        <Route path="/subscription/billing" element={<SubscriptionBilling />} />
        <Route path="/subscription/payment" element={<SubscriptionPayment />} />
        <Route path="/subscription/success" element={<SubscriptionSuccess />} />
        <Route path="/subscription/fail" element={<SubscriptionFail />} />
        
        {/* 계정 설정 라우트 */}
        <Route path="/AccountSettings" element={
          <ProtectedRoute user={user}>
            <AccountSettings />
          </ProtectedRoute>
        } />
        
        {/* 공지사항 라우트 */}
        <Route path="/notifications" element={
          <ProtectedRoute user={user}>
            <NotificationPage user={user} />
          </ProtectedRoute>
        } />
        
        {/* 활동기록 라우트 - 구독 상태 확인 */}
        <Route path="/activity-log" element={
          <ProtectedRoute user={user}>
            {checkSubscriptionAccess(user) ? <ActivityLogPage /> : <SubscriptionAlert user={user} />}
          </ProtectedRoute>
        } />
        
        {/* 회사등록 라우트 */}
        <Route path="/company-register" element={
          <ProtectedRoute user={user}>
            <CompanyRegisterPage />
          </ProtectedRoute>
        } />

        {/* 관리자 라우트 */}
        <Route
          path="/admin/*"
          element={
            user && (user.level === 99 || user.email === "hyin9414@gmail.com")
              ? <Admin />
              : <Navigate to="/" replace />
          }
        />
        
        {/* 404 페이지 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <GoogleOAuthProvider clientId={REACT_APP_GOOGLE_CLIENT_ID}>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
