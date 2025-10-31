import React, { useState, useContext } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Container, Card, Alert, Spinner, Button } from "react-bootstrap";
import api from "../utils/api";
import { UserContext } from "../components/UserContext";
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

const LoginPage = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [naverLoading, setNaverLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { getUser } = useContext(UserContext);

  const { from } = location.state || { from: { pathname: "/" } };

  // location.state에서 에러가 있으면 표시
  React.useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
      // 상태를 비워줌 (뒤로가기 시 중복 표시 방지)
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // 네이버 로그인 시작
  const handleNaverLogin = () => {
    try {
      setNaverLoading(true);
      setError('');

      // 클라이언트 ID와 콜백 URL 설정
      const clientId = process.env.REACT_APP_NAVER_CLIENT_ID;
      if (!clientId) {
        setError('네이버 클라이언트 ID가 설정되지 않았습니다.');
        setNaverLoading(false);
        return;
      }
      // 현재 도메인에 따라 콜백 URL 동적 설정
      const currentOrigin = window.location.origin;
      const redirectURI = encodeURIComponent(
        process.env.REACT_APP_NAVER_REDIRECT_URI || `${currentOrigin}/auth/naver/callback`
      );
      
      // 랜덤 state 생성 (CSRF 방지)
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // state를 localStorage에 저장 (더 안정적)
      localStorage.setItem('naver_oauth_state', state);
      sessionStorage.setItem('naver_oauth_state', state); // 호환성을 위해 둘 다 저장
      
      console.log('🔐 Naver OAuth State 저장:', state);
      
      // 네이버 인증 URL 생성
      const naverAuthURL = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectURI}&state=${state}`;
      
      // 네이버 로그인 페이지로 리다이렉트
      window.location.href = naverAuthURL;

    } catch (error) {
      console.error('Naver login error:', error);
      setError('네이버 로그인을 시작할 수 없습니다.');
      setNaverLoading(false);
    }
  };

  // 로그인 히스토리 기록 함수
  const logLoginHistory = async (userId, content) => {
    try {
      let geolocationLogged = false;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            // 지역명 변환 요청
            let locationName = `위도 ${latitude}, 경도 ${longitude}`;
            let fullAddress = '';
            
            try {
              const locationResponse = await api.post('/utils/convert-location', {
                latitude: latitude,
                longitude: longitude
              });

              if (locationResponse.data.success && locationResponse.data.data.locationName) {
                locationName = locationResponse.data.data.locationName;
                fullAddress = locationResponse.data.data.fullAddress || '';
              }
            } catch (locationError) {
              console.error('지역명 변환 실패:', locationError);
            }

            // History 기록
            await api.post('/history', {
              author: userId,
              category: 'Login',
              content: `${content} - 위치: ${locationName}`,
              relatedUsers: [userId],
            });

            // ActivityLog 기록
            await api.post('/activity-logs', {
              type: 'system',
              action: '로그인',
              description: `${content} - 위치: ${locationName}`,
              priority: 2,
              status: 'success',
              details: {
                loginMethod: content,
                latitude: latitude,
                longitude: longitude,
                locationName: locationName,
                locationSource: 'geolocation',
                fullAddress: fullAddress
              }
            });

            geolocationLogged = true;
          },
          async (error) => {
            console.error("Geolocation error:", error.message);

            if (!geolocationLogged) {
              try {
                const ipResponse = await fetch('https://ipapi.co/json/');
                const ipData = await ipResponse.json();

                // 지역명 변환 요청
                let locationName = `위도 ${ipData.latitude}, 경도 ${ipData.longitude}`;
                let fullAddress = '';
                
                try {
                  const locationResponse = await api.post('/utils/convert-location', {
                    latitude: ipData.latitude,
                    longitude: ipData.longitude
                  });

                  if (locationResponse.data.success && locationResponse.data.data.locationName) {
                    locationName = locationResponse.data.data.locationName;
                    fullAddress = locationResponse.data.data.fullAddress || '';
                  }
                } catch (locationError) {
                  console.error('지역명 변환 실패:', locationError);
                }

                // History 기록
                await api.post('/history', {
                  author: userId,
                  category: 'Login',
                  content: `${content} - 위치: ${locationName} (IP 기반)`,
                  relatedUsers: [userId],
                });

                // ActivityLog 기록
                await api.post('/activity-logs', {
                  type: 'system',
                  action: '로그인',
                  description: `${content} - 위치: ${locationName} (IP 기반)`,
                  priority: 2,
                  status: 'success',
                  details: {
                    loginMethod: content,
                    latitude: ipData.latitude,
                    longitude: ipData.longitude,
                    locationName: locationName,
                    locationSource: 'ip_geolocation',
                    ipAddress: ipData.ip,
                    fullAddress: fullAddress
                  }
                });
              } catch (ipError) {
                console.error("IP location fetch failed:", ipError);
                
                // 위치 정보 없이 기록
                await api.post('/history', {
                  author: userId,
                  category: 'Login',
                  content: `${content} - location unavailable.`,
                  relatedUsers: [userId],
                });

                await api.post('/activity-logs', {
                  type: 'system',
                  action: '로그인',
                  description: `${content} - 위치 정보 없음`,
                  priority: 2,
                  status: 'success',
                  details: {
                    loginMethod: content,
                    locationSource: 'unavailable'
                  }
                });
              }
            }
          }
        );
      } else {
        // History 기록
        await api.post('/history', {
          author: userId,
          category: 'Login',
          content: `${content} - geolocation not supported.`,
          relatedUsers: [userId],
        });

        // ActivityLog 기록
        await api.post('/activity-logs', {
          type: 'system',
          action: '로그인',
          description: `${content} - 위치 서비스 미지원`,
          priority: 2,
          status: 'success',
          details: {
            loginMethod: content,
            locationSource: 'not_supported'
          }
        });
      }
    } catch (error) {
      console.error('Login history logging failed:', error);
    }
  };

  // 구글 로그인 성공 처리
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setIsLoading(true);
      setError('');

      const decoded = jwtDecode(credentialResponse.credential);

      // Google OAuth 로그인 API 호출
      const response = await api.post('/user/google-login', {
        googleId: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        profilePicture: decoded.picture
      });

      if (response.status === 200) {
        const token = response.data.token;
        const sessionId = response.data.sessionId;
        const userId = response.data.user._id;
        const user = response.data.user;

        sessionStorage.setItem("token", token);
        sessionStorage.setItem("sessionId", sessionId);
        api.defaults.headers["Authorization"] = "Bearer " + token;

        // 필수 정보 확인 (Google 로그인의 경우 더 엄격하게 체크)
        const hasRequiredInfo = user.companyName &&
          user.businessNumber &&
          user.businessAddress &&
          user.contactNumber &&
          user.gender;

        // 필수 정보가 없으면 RegisterPage로 이동
        if (!hasRequiredInfo) {
          navigate('/register', {
            state: {
              from: from,
              needsAdditionalInfo: true,
              user: user,
              isOAuthUser: true,
              socialProvider: 'google'
            }
          });
          return;
        }

        // 사용자 정보 업데이트
        if (getUser) {
          await getUser();
        }

        // 로그인 히스토리 기록
        await logLoginHistory(userId, 'Google OAuth Login');

        navigate(from);
      }
    } catch (error) {
      console.error('Google OAuth Login Error:', error);
      setError(error.response?.data?.message || "Google 로그인 중 문제가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 구글 로그인 실패 처리
  const handleGoogleError = (error) => {
    console.error('Google OAuth Error:', error);
    if (error.error === 'popup_closed_by_user') {
      setError("로그인 창이 닫혔습니다. 다시 시도해주세요.");
    } else if (error.error === 'access_denied') {
      setError("Google 로그인 권한이 거부되었습니다.");
    } else if (error.error === 'invalid_client') {
      setError("Google OAuth 설정에 문제가 있습니다. 관리자에게 문의하세요.");
    } else {
      setError("Google 로그인에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <Container className="d-flex justify-content-center" style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <Card className="shadow">
          <Card.Body className="p-4">
            <div className="text-center mb-4">
              <h2 className="mb-3">로그인</h2>
              <p className="text-muted">소셜 계정으로 간편하게 로그인하세요</p>
            </div>

            {error && (
              <Alert variant="danger" className="mb-3">
                {error}
              </Alert>
            )}

            <div className="d-flex flex-column align-items-center gap-3">
              {/* Google 로그인 */}
              <div style={{ width: '100%', maxWidth: '300px' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  disabled={isLoading || naverLoading}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  locale="ko"
                  className="w-100"
                  width="300"
                  auto_select={false}
                  use_fedcm_for_prompt={false}
                  cancel_on_tap_outside={true}
                  style={{
                    height: '48px',
                    fontSize: '14px',
                    fontFamily: 'Roboto, arial, sans-serif',
                    fontWeight: '500'
                  }}
                />
              </div>

              {/* 네이버 로그인 */}
              <div style={{ width: '100%', maxWidth: '300px' }}>
                <Button
                  variant="outline-success"
                  size="lg"
                  onClick={handleNaverLogin}
                  disabled={isLoading || naverLoading}
                  className="w-100 d-flex align-items-center justify-content-center gap-2"
                  style={{
                    height: '48px',
                    backgroundColor: '#03C75A',
                    borderColor: '#03C75A',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '14px',
                    fontFamily: 'Roboto, arial, sans-serif'
                  }}
                >
                  {naverLoading ? (
                    <>
                      <Spinner animation="border" size="sm" />
                      네이버 로그인 중...
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '18px' }}>N</span>
                      네이버로 로그인
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isLoading && (
              <div className="text-center mt-3">
                <Spinner animation="border" size="sm" variant="primary" />
                <span className="ms-2">로그인 중...</span>
              </div>
            )}

            <div className="text-center mt-4">
              <p className="mb-2">
                계정이 없으신가요?{' '}
                <Link to="/register" className="text-decoration-none">
                  회원 가입
                </Link>
              </p>
            </div>
          </Card.Body>
        </Card>
      </div>
    </Container>
  );
};

export default LoginPage;
