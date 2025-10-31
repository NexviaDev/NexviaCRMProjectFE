// 네이버 OAuth 인증 유틸리티

// 네이버 로그인 URL 생성
export const generateNaverLoginUrl = () => {
  const clientId = process.env.REACT_APP_NAVER_CLIENT_ID;
  if (!clientId) {
    throw new Error('REACT_APP_NAVER_CLIENT_ID 환경 변수가 설정되지 않았습니다.');
  }
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth/naver/callback`);
  const state = generateRandomState();
  
  // state를 localStorage에 저장 (CSRF 방지)
  localStorage.setItem('naver_oauth_state', state);
  
  return `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
};

// 랜덤 state 생성 (CSRF 방지)
const generateRandomState = () => {
  const array = new Uint32Array(28);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
};

// 네이버 로그인 팝업 열기
export const openNaverLoginPopup = () => {
  const url = generateNaverLoginUrl();
  const width = 500;
  const height = 600;
  const left = (window.screen.width / 2) - (width / 2);
  const top = (window.screen.height / 2) - (height / 2);
  
  const popup = window.open(
    url,
    'naverLogin',
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );
  
  return popup;
};

// 네이버 사용자 프로필 조회
export const getNaverUserProfile = async (accessToken) => {
  try {
    const clientId = process.env.REACT_APP_NAVER_CLIENT_ID;
    const clientSecret = process.env.REACT_APP_NAVER_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('네이버 OAuth 환경 변수가 설정되지 않았습니다.');
    }
    
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret
      }
    });
    
    if (!response.ok) {
      throw new Error('네이버 프로필 조회 실패');
    }
    
    const data = await response.json();
    return data.response; // 네이버 응답 구조에 맞춤
  } catch (error) {
    console.error('네이버 프로필 조회 오류:', error);
    throw error;
  }
};

// 네이버 로그인 콜백 처리
export const handleNaverCallback = (searchParams) => {
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  // 에러 체크
  if (error) {
    throw new Error(`네이버 로그인 실패: ${errorDescription || error}`);
  }
  
  // 필수 파라미터 체크
  if (!code || !state) {
    throw new Error('필수 인증 정보가 누락되었습니다.');
  }
  
  // state 검증 (CSRF 방지)
  const savedState = localStorage.getItem('naver_oauth_state');
  if (state !== savedState) {
    localStorage.removeItem('naver_oauth_state');
    throw new Error('보안 토큰이 일치하지 않습니다.');
  }
  
  // 사용된 state 제거
  localStorage.removeItem('naver_oauth_state');
  
  return { code, state };
}; 