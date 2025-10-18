import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Container, Card, Alert, Spinner, Form, Button } from "react-bootstrap";
import api from "../utils/api";
import { UserContext } from "../components/UserContext";
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { openNaverLoginPopup } from "../utils/naverAuth";

const LoginPage = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [naverLoading, setNaverLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { getUser } = useContext(UserContext);

  // 탈퇴된 계정 복구 관련 상태
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [deletedUser, setDeletedUser] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const { from } = location.state || { from: { pathname: "/" } };

  // 네이버 로그인 팝업 메시지 리스너
  useEffect(() => {
    const handleMessage = async (event) => {
      // 보안: 같은 origin에서 온 메시지만 처리
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'NAVER_LOGIN_SUCCESS') {
        try {
          setNaverLoading(true);
          setError('');

          const { code, state } = event.data;

          // 네이버 로그인 API 호출
          const response = await api.post('/user/naver-login', { code, state });

          if (response.status === 200) {
            const token = response.data.token;
            const sessionId = response.data.sessionId;
            const userId = response.data.user._id;
            const user = response.data.user;

            sessionStorage.setItem("token", token);
            sessionStorage.setItem("sessionId", sessionId);
            api.defaults.headers["Authorization"] = "Bearer " + token;

            // 필수 정보 확인 (네이버 로그인의 경우 더 엄격하게 체크)
            const hasRequiredInfo = user.companyName &&
              user.businessNumber &&
              user.businessAddress &&
              user.contactNumber &&
              user.gender;
            // birthDate, detailedAddress, position은 선택적 필드이므로 제외

            // 필수 정보가 없으면 RegisterPage로 이동
            if (!hasRequiredInfo) {
              navigate('/register', {
                state: {
                  from: from,
                  needsAdditionalInfo: true,
                  user: user,
                  isOAuthUser: true,
                  socialProvider: 'naver'
                }
              });
              return;
            }

            // 사용자 정보 업데이트
            if (getUser) {
              await getUser();
            }

            // 로그인 히스토리 기록
            await logLoginHistory(userId, 'Naver OAuth Login');

            navigate(from);
          }
        } catch (error) {
          console.error('Naver OAuth Login Error:', error);
          setError(error.response?.data?.message || "네이버 로그인 중 문제가 발생했습니다. 다시 시도해주세요.");
        } finally {
          setNaverLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate, from, getUser]);

  // 네이버 로그인 시작
  const handleNaverLogin = () => {
    try {
      setNaverLoading(true);
      setError('');

      const popup = openNaverLoginPopup();

      if (!popup) {
        setError('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
        setNaverLoading(false);
        return;
      }

      // 팝업이 닫힐 때까지 대기
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setNaverLoading(false);
        }
      }, 1000);

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
                  // 변환 실패 시 원본 좌표 사용
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
                      // 변환 실패 시 원본 좌표 사용
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
        // birthDate, detailedAddress, position은 선택적 필드이므로 제외

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

        // 사용자 정보 업데이트 - UserContext의 getUser 호출
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

  // 탈퇴된 계정 복구 모달 표시
  const handleRestoreAccount = () => {
    setShowRestoreModal(true);
  };

  // 탈퇴된 계정 복구 처리
  const handleRestoreSubmit = async (event) => {
    event.preventDefault();
    if (!deletedUser) return;

    try {
      setRestoreLoading(true);
      const response = await api.post('/user/restore-account', {
        email: deletedUser.email,
        businessNumber: deletedUser.businessNumber
      });

      if (response.status === 200) {
        alert('계정이 성공적으로 복구되었습니다. 다시 로그인해주세요.');
        setShowRestoreModal(false);
        setDeletedUser(null);
      }
    } catch (error) {
      setError(error.response?.data?.message || '계정 복구에 실패했습니다.');
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <Container className="d-flex  justify-content-center" style={{ minHeight: '100vh' }}>
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
                  회원가입
                </Link>
              </p>
              <p className="mb-0">
                <button
                  type="button"
                  className="btn btn-link text-decoration-none p-0"
                  onClick={handleRestoreAccount}
                >
                  탈퇴된 계정 복구하기
                </button>
              </p>
            </div>
          </Card.Body>
        </Card>

        {/* 탈퇴된 계정 복구 모달 */}
        {showRestoreModal && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <Card style={{ maxWidth: '500px', width: '90%' }}>
              <Card.Header>
                <h5 className="mb-0">탈퇴된 계정 복구</h5>
              </Card.Header>
              <Card.Body>
                <p className="text-muted mb-3">
                  탈퇴된 계정을 복구하려면 이메일과 사업자등록번호를 입력해주세요.
                </p>
                <Form onSubmit={handleRestoreSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>이메일</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="이메일을 입력하세요"
                      value={deletedUser?.email || ''}
                      onChange={(e) => setDeletedUser({ ...deletedUser, email: e.target.value })}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>사업자등록번호</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="사업자등록번호를 입력하세요"
                      value={deletedUser?.businessNumber || ''}
                      onChange={(e) => setDeletedUser({ ...deletedUser, businessNumber: e.target.value })}
                      required
                    />
                  </Form.Group>
                  <div className="d-flex gap-2 justify-content-end">
                    <Button
                      variant="secondary"
                      onClick={() => setShowRestoreModal(false)}
                      disabled={restoreLoading}
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={restoreLoading}
                    >
                      {restoreLoading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          복구 중...
                        </>
                      ) : (
                        '계정 복구'
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </div>
        )}
      </div>
    </Container>
  );
};

export default LoginPage;
