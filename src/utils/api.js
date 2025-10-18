import axios from "axios";

// 환경변수에서 백엔드 URL 가져오기
let BACKEND_URL;

if (process.env.NODE_ENV === 'production') {
  // 프로덕션 환경에서는 무조건 Heroku URL 사용
  BACKEND_URL = 'https://nexviacrmproject-backend-f8b1e684656c.herokuapp.com';
} else {
  // 개발 환경에서는 환경변수 또는 로컬호스트 사용
  BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
                 (window.env && window.env.REACT_APP_BACKEND_URL) || 
                 'http://localhost:5000';
}

// 디버깅을 위한 로그
console.log('🔍 Backend URL:', BACKEND_URL);
console.log('🔍 Environment:', process.env.NODE_ENV);
console.log('🔍 Process env REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
console.log('🔍 Window env REACT_APP_BACKEND_URL:', window.env?.REACT_APP_BACKEND_URL);
console.log('🔍 All env vars:', process.env);

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 120000, // 2분 타임아웃 설정 (AI 브리핑 대응)
});

api.interceptors.request.use(
  (request) => {
    // 매 요청마다 최신 토큰을 가져와서 헤더에 설정 (localStorage 우선, sessionStorage 대체)
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      request.headers.Authorization = `Bearer ${token}`;
    }
    return request;
  },
  function (error) {
    console.error('API 요청 오류:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  function (error) {
    // 401 에러 (인증 실패) 시 토큰 제거
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("sessionId");
      
      // 현재 페이지가 로그인 페이지가 아닐 때만 리다이렉트
      if (!window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/register')) {
        // React Router 사용을 위해 window.location 대신 에러만 전달
        // UserContext에서 처리하도록 함
      }
    }
    
    // 네트워크 오류나 기타 오류 로깅
    if (error.code === 'ERR_NETWORK') {
      console.error('네트워크 오류:', error.message);
    } else if (error.response) {
      console.error('API 응답 오류:', error.response.status, error.response.data);
    } else {
      console.error('API 오류:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// CSV 업로드용 긴 타임아웃 API 인스턴스
export const apiWithLongTimeout = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 120000, // 2분 타임아웃 설정 (대량 CSV 업로드용)
});

// 긴 타임아웃 API에도 인터셉터 적용
apiWithLongTimeout.interceptors.request.use(
  (request) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      request.headers.Authorization = `Bearer ${token}`;
    }
    return request;
  },
  function (error) {
    console.error('API 요청 오류:', error);
    return Promise.reject(error);
  }
);

apiWithLongTimeout.interceptors.response.use(
  (response) => {
    return response;
  },
  function (error) {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("sessionId");
      
      // 현재 페이지가 로그인 페이지가 아닐 때만 리다이렉트
      if (!window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/register')) {
        // React Router 사용을 위해 window.location 대신 에러만 전달
        // UserContext에서 처리하도록 함
      }
    }
    
    if (error.code === 'ERR_NETWORK') {
      console.error('네트워크 오류:', error.message);
    } else if (error.response) {
      console.error('API 응답 오류:', error.response.status, error.response.data);
    } else {
      console.error('API 오류:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export const deleteOldQuotations = () => {
  return api.delete('/quotations/deleteOld');
};

export default api;
