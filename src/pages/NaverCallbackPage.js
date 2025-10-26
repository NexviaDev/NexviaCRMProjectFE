import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, Spinner } from 'react-bootstrap';

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
          console.error('Naver callback error:', errorMessage);
          
          // 부모 창이 존재하는 경우에만 메시지 전송
          if (window.opener) {
            window.opener.postMessage({
              type: 'NAVER_LOGIN_ERROR',
              error: errorMessage
            }, window.location.origin);
          }
          
          // 팝업 창 닫기 (약간의 지연 후)
          setTimeout(() => window.close(), 100);
          return;
        }

        // 필수 파라미터 체크
        if (!code || !state) {
          const errorMessage = '필수 인증 정보가 누락되었습니다.';
          console.error('Missing parameters in Naver callback');
          
          // 부모 창이 존재하는 경우에만 메시지 전송
          if (window.opener) {
            window.opener.postMessage({
              type: 'NAVER_LOGIN_ERROR',
              error: errorMessage
            }, window.location.origin);
          }
          
          // 팝업 창 닫기 (약간의 지연 후)
          setTimeout(() => window.close(), 100);
          return;
        }

        // 성공 메시지를 부모 창으로 전송
        console.log('Sending Naver login success message');
        if (window.opener) {
          window.opener.postMessage({
            type: 'NAVER_LOGIN_SUCCESS',
            code,
            state
          }, window.location.origin);
        }

        // 팝업 창 닫기 (약간의 지연 후)
        setTimeout(() => window.close(), 500);

      } catch (error) {
        console.error('Naver callback processing error:', error);
        
        // 에러 메시지를 부모 창으로 전송
        if (window.opener) {
          window.opener.postMessage({
            type: 'NAVER_LOGIN_ERROR',
            error: error.message
          }, window.location.origin);
        }
        
        // 팝업 창 닫기 (약간의 지연 후)
        setTimeout(() => window.close(), 100);
      }
    };

    processCallback();
  }, [searchParams]);

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="text-center">
        <Spinner animation="border" variant="success" size="lg" className="mb-3" />
        <h5>네이버 로그인 처리 중...</h5>
        <p className="text-muted">잠시만 기다려주세요.</p>
      </div>
    </Container>
  );
};

export default NaverCallbackPage; 