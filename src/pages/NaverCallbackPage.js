import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

const NaverCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processNaverCallback = async () => {
      try {
        // URL 파라미터에서 code와 state 추출
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

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

        // state 검증 (CSRF 방지)
        const savedState = sessionStorage.getItem('naver_oauth_state');
        if (state !== savedState) {
          sessionStorage.removeItem('naver_oauth_state');
          console.error('State mismatch');
          navigate('/login', { 
            state: { 
              error: '보안 토큰이 일치하지 않습니다.' 
            } 
          });
          return;
        }

        // 사용된 state 제거
        sessionStorage.removeItem('naver_oauth_state');

        // 백엔드에 네이버 로그인 요청
        const response = await api.post('/user/naver-login', {
          code,
          state
        });

        if (response.status === 200 && response.data.status === 'success') {
          const token = response.data.token;
          const sessionId = response.data.sessionId;
          const userId = response.data.user._id;
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

          // 로그인 히스토리 기록
          try {
            let geolocationLogged = false;

            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                async (position) => {
                  const latitude = position.coords.latitude;
                  const longitude = position.coords.longitude;

                  let locationName = `위도 ${latitude}, 경도 ${longitude}`;
                  
                  try {
                    const locationResponse = await api.post('/utils/convert-location', {
                      latitude: latitude,
                      longitude: longitude
                    });

                    if (locationResponse.data.success && locationResponse.data.data.locationName) {
                      locationName = locationResponse.data.data.locationName;
                    }
                  } catch (locationError) {
                    console.error('지역명 변환 실패:', locationError);
                  }

                  await api.post('/history', {
                    author: userId,
                    category: 'Login',
                    content: `Naver OAuth Login - 위치: ${locationName}`,
                    relatedUsers: [userId],
                  });

                  await api.post('/activity-logs', {
                    type: 'system',
                    action: '로그인',
                    description: `Naver OAuth Login - 위치: ${locationName}`,
                    priority: 2,
                    status: 'success',
                    details: {
                      loginMethod: 'Naver OAuth',
                      latitude: latitude,
                      longitude: longitude,
                      locationName: locationName,
                      locationSource: 'geolocation'
                    }
                  });

                  geolocationLogged = true;
                },
                async (error) => {
                  console.error("Geolocation error:", error.message);
                  if (!geolocationLogged) {
                    await api.post('/history', {
                      author: userId,
                      category: 'Login',
                      content: 'Naver OAuth Login - location unavailable',
                      relatedUsers: [userId],
                    });

                    await api.post('/activity-logs', {
                      type: 'system',
                      action: '로그인',
                      description: 'Naver OAuth Login - 위치 정보 없음',
                      priority: 2,
                      status: 'success',
                      details: {
                        loginMethod: 'Naver OAuth',
                        locationSource: 'unavailable'
                      }
                    });
                  }
                }
              );
            } else {
              await api.post('/history', {
                author: userId,
                category: 'Login',
                content: 'Naver OAuth Login - geolocation not supported',
                relatedUsers: [userId],
              });

              await api.post('/activity-logs', {
                type: 'system',
                action: '로그인',
                description: 'Naver OAuth Login - 위치 서비스 미지원',
                priority: 2,
                status: 'success',
                details: {
                  loginMethod: 'Naver OAuth',
                  locationSource: 'not_supported'
                }
              });
            }
          } catch (logError) {
            console.error('Login history logging failed:', logError);
          }

          // 홈으로 리다이렉트
          navigate('/');
        }
      } catch (error) {
        console.error('Naver callback processing error:', error);
        navigate('/login', { 
          state: { 
            error: error.response?.data?.message || '네이버 로그인 처리 중 오류가 발생했습니다.' 
          } 
        });
      }
    };

    processNaverCallback();
  }, [searchParams, navigate]);

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
