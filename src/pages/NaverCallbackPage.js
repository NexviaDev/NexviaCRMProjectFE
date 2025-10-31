import React, { useEffect, useContext, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { UserContext } from '../components/UserContext';

const NaverCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getUser } = useContext(UserContext);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // code가 없으면 처리하지 않음
    const code = searchParams.get('code');
    if (!code) {
      console.log('⚠️ code 파라미터 없음, 처리 생략');
      return;
    }

    // localStorage로 중복 실행 방지 (StrictMode 대응)
    const processedCode = sessionStorage.getItem(`naver_processed_${code}`);
    if (processedCode) {
      console.log('⚠️ 이미 처리된 code입니다, 중복 실행 방지');
      return;
    }

    // 처리 시작 표시 (ref와 storage 둘 다 설정)
    hasProcessed.current = true;
    sessionStorage.setItem(`naver_processed_${code}`, 'true');

    const processCallback = async () => {

      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      console.log('🔍 Naver Callback 처리 시작:', { code: code?.substring(0, 10), state, error });

      try {
        // 에러 체크
        if (error) {
          console.error('Naver OAuth error:', errorDescription || error);
          navigate('/login', { 
            state: { 
              error: `네이버 로그인 실패: ${errorDescription || error}` 
            } 
          });
          return;
        }

        // 필수 파라미터 체크
        if (!code || !state) {
          console.error('Missing required parameters');
          navigate('/login', { 
            state: { 
              error: '필수 인증 정보가 누락되었습니다.' 
            } 
          });
          return;
        }

        // CSRF 방지: state 검증
        const savedState = localStorage.getItem('naver_oauth_state') || sessionStorage.getItem('naver_oauth_state');
        if (!savedState || savedState !== state) {
          console.error('Invalid state parameter');
          navigate('/login', {
            state: {
              error: '보안 검증 실패: 상태 토큰이 일치하지 않습니다.'
            }
          });
          return;
        }

        // 백엔드에 네이버 로그인 요청
        const response = await api.post('/user/naver-login', {
          code,
          state,
          redirectUri: (process.env.REACT_APP_NAVER_REDIRECT_URI || `${window.location.origin}/auth/naver/callback`)
        });

        console.log('✅ Naver 로그인 응답:', response.data);

        if (response.status === 200 && response.data.status === 'success') {
          const token = response.data.token;
          const sessionId = response.data.sessionId;
          const user = response.data.user;

          // 토큰 저장
          sessionStorage.setItem("token", token);
          sessionStorage.setItem("sessionId", sessionId);
          api.defaults.headers["Authorization"] = "Bearer " + token;

          // 필수 정보 확인
          const hasRequiredInfo = user.companyName &&
            user.businessNumber &&
            user.businessAddress &&
            user.contactNumber &&
            user.gender;

          // 필수 정보가 없으면 RegisterPage로 이동
          if (!hasRequiredInfo) {
            navigate('/register', {
              state: {
                needsAdditionalInfo: true,
                user: user,
                isOAuthUser: true,
                socialProvider: 'naver'
              }
            });
            return;
          }

          // UserContext 업데이트
          if (getUser) {
            await getUser();
          }

          // 홈으로 리다이렉트
          navigate('/');
        } else {
          console.error('Unexpected response:', response.status, response.data);
          navigate('/login', { 
            state: { 
              error: '네이버 로그인 응답이 올바르지 않습니다.' 
            } 
          });
          return;
        }
      } catch (error) {
        console.error('Naver callback processing error:', error);
        try { alert(error.response?.data?.message || error.message || '네이버 로그인 처리 중 오류가 발생했습니다.'); } catch (_) {}
        navigate('/login', { 
          state: { 
            error: error.response?.data?.message || '네이버 로그인 처리 중 오류가 발생했습니다.' 
          } 
        });
      }
    };

    processCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>네이버 로그인 처리 중...</h2>
        <p>잠시만 기다려주세요.</p>
      </div>
    </div>
  );
};

export default NaverCallbackPage;
