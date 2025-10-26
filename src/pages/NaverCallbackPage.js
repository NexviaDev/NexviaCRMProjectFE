import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const NaverCallbackPage = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // URL 파라미터에서 code와 state 추출
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // 에러 체크
        if (error) {
          const errorMessage = `네이버 로그인 실패: ${errorDescription || error}`;
          window.opener?.postMessage({
            type: 'NAVER_LOGIN_ERROR',
            error: errorMessage
          }, window.location.origin);
          window.close();
          return;
        }

        // 필수 파라미터 체크
        if (!code || !state) {
          const errorMessage = '필수 인증 정보가 누락되었습니다.';
          window.opener?.postMessage({
            type: 'NAVER_LOGIN_ERROR',
            error: errorMessage
          }, window.location.origin);
          window.close();
          return;
        }

        // 성공 메시지를 부모 창으로 전송
        window.opener?.postMessage({
          type: 'NAVER_LOGIN_SUCCESS',
          code,
          state
        }, window.location.origin);

        // 팝업 창 닫기
        window.close();

      } catch (error) {
        console.error('Naver callback processing error:', error);
        
        // 에러 메시지를 부모 창으로 전송
        window.opener?.postMessage({
          type: 'NAVER_LOGIN_ERROR',
          error: error.message
        }, window.location.origin);
        
        window.close();
      }
    };

    processCallback();
  }, [searchParams]);

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