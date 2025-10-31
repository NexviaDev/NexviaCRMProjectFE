// Google OAuth 설정
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'your-google-client-id';
const getGoogleRedirectURI = () => process.env.REACT_APP_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`;

// Naver OAuth 설정
const NAVER_CLIENT_ID = process.env.REACT_APP_NAVER_CLIENT_ID;
if (!NAVER_CLIENT_ID) {
  console.error('REACT_APP_NAVER_CLIENT_ID 환경 변수가 설정되지 않았습니다.');
}
const getNaverRedirectURI = () => process.env.REACT_APP_NAVER_REDIRECT_URI || `${window.location.origin}/auth/naver/callback`;

// Google 로그인
export const googleLogin = () => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(getGoogleRedirectURI())}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&access_type=offline` +
    `&prompt=consent`;

  window.location.href = googleAuthUrl;
};

// Naver 로그인
export const naverLogin = () => {
  if (!NAVER_CLIENT_ID) {
    throw new Error('REACT_APP_NAVER_CLIENT_ID 환경 변수가 설정되지 않았습니다.');
  }
  
  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?` +
    `response_type=code` +
    `&client_id=${NAVER_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(getNaverRedirectURI())}` +
    `&state=${Math.random().toString(36).substr(2, 11)}`;

  window.location.href = naverAuthUrl;
};

// 소셜 로그인 콜백 처리
export const handleSocialCallback = async (provider, code) => {
  try {
    const response = await fetch(`/api/auth/${provider}/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        userData: data.userData,
        token: data.token
      };
    } else {
      throw new Error(data.message || '소셜 로그인에 실패했습니다.');
    }
  } catch (error) {
    console.error(`${provider} 로그인 오류:`, error);
    return {
      success: false,
      message: error.message
    };
  }
};

// 소셜 계정으로 회원가입
export const socialSignup = async (provider, userData) => {
  try {
    const response = await fetch('/api/auth/social-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        userData
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        message: '소셜 계정으로 회원가입이 완료되었습니다.',
        user: data.user
      };
    } else {
      throw new Error(data.message || '소셜 회원가입에 실패했습니다.');
    }
  } catch (error) {
    console.error('소셜 회원가입 오류:', error);
    return {
      success: false,
      message: error.message
    };
  }
}; 