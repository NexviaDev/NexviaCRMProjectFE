import React, { useState, useEffect } from "react";
import { Container, Card, Alert, Spinner, Form, Button, Row, Col, InputGroup } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import api from "../utils/api";
import PrivacyPolicy from "../components/PrivacyPolicy";
import CompanySearchModal from "../components/MyPage/CompanySearchModal";
import CompanyRegisterPage from "../components/CompanyRegisterPage";

const RegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAdditionalInfoForm, setShowAdditionalInfoForm] = useState(false);
  const [oauthUser, setOauthUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    companyName: '',
    businessNumber: '',
    businessAddress: '',
    detailedAddress: '',
    contactNumber: '',
    birthDate: '',
    gender: '',
    position: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  
  // 개인정보처리방침 동의 관련 상태
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // 회사 찾기 모달 관련 상태
  const [showCompanySearchModal, setShowCompanySearchModal] = useState(false);
  const [showCompanyRegisterModal, setShowCompanyRegisterModal] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // 개인정보처리방침 관련 함수들
  const handleShowTerms = () => {
    setShowTermsModal(true);
  };

  const handleAgreeToTerms = () => {
    setAgreedToTerms(true);
    setShowTermsModal(false);
  };

  const handleCloseTerms = () => {
    setShowTermsModal(false);
  };

  // 모달에서 회사 선택 시 호출되는 함수
  const handleCompanySelect = async (company) => {
    try {
      // 선택된 회사 정보를 formData에 즉시 반영
      setFormData(prev => ({
        ...prev,
        companyName: company.companyName,
        businessNumber: company.businessNumber,
        businessAddress: company.businessAddress || company.address || '',
        detailedAddress: company.detailedAddress || ''
      }));

      // 에러 메시지 제거
      setValidationErrors(prev => ({
        ...prev,
        companyName: '',
        businessNumber: '',
        businessAddress: ''
      }));

      setSuccess('회사 정보가 선택되었습니다.');
    } catch (error) {
      console.error('회사 선택 실패: ', error);
      setError('회사 선택에 실패했습니다.');
    }
  };

  // 회사 등록 성공 핸들러
  const handleCompanyRegisterSuccess = (newCompany) => {
    setFormData(prev => ({
      ...prev,
      companyName: newCompany.companyName,
      businessNumber: newCompany.businessNumber,
      businessAddress: newCompany.businessAddress,
      detailedAddress: newCompany.detailedAddress || '',
      isInitialCompanyRegistrant: true  // 최초 회사 등록자임을 표시
    }));
    setSuccess('새 회사가 등록되었습니다! 회원가입 완료 시 최초 관리자 레벨로 설정됩니다.');
    setShowCompanyRegisterModal(false);
  };


  // LoginPage에서 전달된 상태 확인
  useEffect(() => {
    if (location.state && location.state.needsAdditionalInfo && location.state.user) {
      setOauthUser(location.state.user);
      setShowAdditionalInfoForm(true);
      
      // 기존 정보로 폼 초기화
      setFormData({
        name: location.state.user.name || '',
        nickname: location.state.user.nickname || location.state.user.name || '',
        companyName: location.state.user.companyName || '',
        businessNumber: location.state.user.businessNumber || '',
        businessAddress: location.state.user.businessAddress || '',
        detailedAddress: location.state.user.detailedAddress || '',
        contactNumber: location.state.user.contactNumber || '',
        birthDate: location.state.user.birthDate || '',
        gender: location.state.user.gender || '',
        position: location.state.user.position || ''
      });
    }
  }, [location.state]);

  // Google OAuth 회원가입 성공 처리
  const handleGoogleSuccess = async (credentialResponse) => {
    // 개인정보처리방침 동의 확인
    if (!agreedToTerms) {
      setError('개인정보처리방침에 동의해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      const decoded = jwtDecode(credentialResponse.credential);

      // Google OAuth 회원가입 API 호출
      const response = await api.post('/user/google-login', {
        googleId: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        nickname: decoded.name, // Google에서 받은 이름을 nickname으로도 설정
        profilePicture: decoded.picture
      });

      if (response.status === 200) {
        const user = response.data.user;
        
        // 토큰을 세션에 저장하고 API 헤더에 설정
        const token = response.data.token;
        const sessionId = response.data.sessionId;
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("sessionId", sessionId);
        api.defaults.headers["Authorization"] = "Bearer " + token;
        
        // 추가 정보가 필요한 경우
        if (user.isSocialAccount && (
          !user.name ||
          !user.companyName || 
          !user.businessNumber || 
          !user.businessAddress || 
          !user.contactNumber || 
          !user.gender
        )) {
          setOauthUser(user);
          setShowAdditionalInfoForm(true);
        } else {
          // 추가 정보가 이미 있는 경우 바로 로그인
          setSuccess('회원가입이 완료되었습니다!');
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Google OAuth Registration Error:', error);
      setError((error.response && error.response.data && error.response.data.message) || "Google 회원가입 중 문제가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth 회원가입 실패 처리
  const handleGoogleError = (error) => {
    console.error('Google OAuth Error:', error);
    if (error.error === 'popup_closed_by_user') {
      setError("회원가입 창이 닫혔습니다. 다시 시도해주세요.");
    } else if (error.error === 'access_denied') {
      setError("Google 회원가입 권한이 거부되었습니다.");
    } else if (error.error === 'invalid_client') {
      setError("Google OAuth 설정에 문제가 있습니다. 관리자에게 문의하세요.");
    } else {
      setError("Google 회원가입에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 추가 정보 입력 처리
  const handleAdditionalInfoSubmit = async (event) => {
    event.preventDefault();
    
    // 개인정보처리방침 동의 확인
    if (!agreedToTerms) {
      setError('개인정보처리방침에 동의해주세요.');
      return;
    }
    
    // 유효성 검사
    const errors = {};
    if (!formData.name.trim()) errors.name = '이름을 입력해주세요.';
    if (!formData.companyName.trim()) errors.companyName = '회사명을 입력해주세요.';
    if (!formData.businessNumber.trim()) errors.businessNumber = '사업자등록번호를 입력해주세요.';
    if (!formData.businessAddress.trim()) errors.businessAddress = '주소를 입력해주세요.';
    if (!formData.contactNumber.trim()) errors.contactNumber = '연락처를 입력해주세요.';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // nickname이 비어있으면 name과 동일하게 설정
      const finalNickname = formData.nickname.trim() || formData.name.trim();


      // 사용자 정보 업데이트
      const response = await api.put('/user/update', {
        name: formData.name,
        nickname: finalNickname,
        companyName: formData.companyName,
        businessNumber: formData.businessNumber,
        businessAddress: formData.businessAddress,
        detailedAddress: formData.detailedAddress,
        contactNumber: formData.contactNumber,
        birthDate: formData.birthDate,
        gender: formData.gender,
        position: formData.position
      });

      if (response.status === 200) {
        // 최초 회사 등록자인 경우 레벨 업데이트
        if (formData.isInitialCompanyRegistrant) {
          try {
            await api.put('/user/set-initial-company-admin');
            setSuccess('추가 정보 입력이 완료되었습니다! 최초 관리자 레벨로 설정되었습니다.');
          } catch (levelError) {
            console.error('⚠️ 레벨 설정 실패:', levelError);
            setSuccess('추가 정보 입력이 완료되었습니다. (레벨 설정은 관리자가 수동으로 처리하겠습니다.)');
          }
        } else {
          setSuccess('추가 정보 입력이 완료되었습니다!');
        }
        
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (error) {
      console.error('Additional Info Update Error:', error);
      setError((error.response && error.response.data && error.response.data.message) || '추가 정보 업데이트에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 주소 검색 함수
  const openAddressSearch = () => {
    new window.daum.Postcode({
      oncomplete: function (data) {
        setFormData(prev => ({
          ...prev,
          businessAddress: data.address
        }));
        
        // 에러 메시지 제거
        if (validationErrors.businessAddress) {
          setValidationErrors(prev => ({
            ...prev,
            businessAddress: ''
          }));
        }
      }
    }).open();
  };

  // 폼 데이터 변경 처리
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 에러 메시지 제거
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };



  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: '500px', width: '100%' }}>
        {!showAdditionalInfoForm ? (
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="mb-3">회원가입</h2>
                <p className="text-muted">Google 계정으로 간편하게 가입하세요</p>
              </div>

              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" className="mb-3">
                  {success}
                </Alert>
              )}

              {/* 개인정보처리방침 동의 */}
              <div className="mb-3">
                <Form.Check
                  type="checkbox"
                  id="termsAgreement"
                  label={
                    <span>
                      <button 
                        type="button"
                        onClick={handleShowTerms}
                        className="text-decoration-none border-0 bg-transparent p-0 text-primary"
                        style={{ textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        개인정보처리방침
                      </button>
                      에 동의합니다 (필수)
                    </span>
                  }
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  isInvalid={!agreedToTerms && error.includes('개인정보처리방침')}
                />
                {!agreedToTerms && error.includes('개인정보처리방침') && (
                  <div className="text-danger small mt-1">
                    개인정보처리방침에 동의해주세요.
                  </div>
                )}
              </div>

              <div className="d-grid gap-3">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  disabled={isLoading}
                  theme="outline"
                  size="large"
                  text="signup_with"
                  shape="rectangular"
                  locale="ko"
                  className="w-100"
                  width="300"
                  auto_select={false}
                  use_fedcm_for_prompt={false}
                  cancel_on_tap_outside={true}
                />
              </div>

              {isLoading && (
                <div className="text-center mt-3">
                  <Spinner animation="border" size="sm" variant="primary" />
                  <span className="ms-2">처리 중...</span>
                </div>
              )}

              <div className="text-center mt-4">
                <p className="mb-0">
                  이미 계정이 있으신가요?{' '}
                  <a href="/login" className="text-decoration-none">
                    로그인
                  </a>
                </p>
              </div>
            </Card.Body>
          </Card>
        ) : (
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <div className="alert alert-warning mb-3" role="alert">
                  <strong>⚠️ 필수 정보 입력이 필요합니다!</strong>
                  <br />
                  CRM 시스템을 이용하기 위해 아래 정보를 입력해주세요.
                </div>
                <h2 className="mb-3">추가 정보 입력</h2>
                <p className="text-muted">
                  <strong>회사명, 사업자등록번호, 주소, 연락처</strong>는 필수 입력 항목입니다.
                </p>
              </div>

              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleAdditionalInfoSubmit}>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>이름 *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="이름을 입력하세요"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        isInvalid={!!validationErrors.name}
                      />
                      <Form.Control.Feedback type="invalid">
                        {validationErrors.name}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>닉네임</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="닉네임을 입력하세요 (선택사항)"
                        value={formData.nickname}
                        onChange={(e) => handleInputChange('nickname', e.target.value)}
                        isInvalid={!!validationErrors.nickname}
                      />
                      <Form.Control.Feedback type="invalid">
                        {validationErrors.nickname}
                      </Form.Control.Feedback>
                      <Form.Text className="text-muted">
                        💡 닉네임을 입력하지 않으면 이름과 동일하게 설정됩니다
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        회사명 *
                        <Button
                          variant="primary"
                          size="sm"
                          className="ms-2"
                          onClick={() => setShowCompanySearchModal(true)}
                          style={{
                            backgroundColor: '#3b82f6',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.8rem'
                          }}
                        >
                          🔍 회사 찾기
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          className="ms-2"
                          onClick={() => setShowCompanyRegisterModal(true)}
                          style={{
                            backgroundColor: '#10b981',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.8rem'
                          }}
                        >
                          ➕ 회사 추가하기
                        </Button>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="회사명을 입력하세요"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange('companyName', e.target.value)}
                        onClick={() => {
                          if (!formData.companyName) {
                            setShowCompanySearchModal(true);
                          }
                        }}
                        isInvalid={!!validationErrors.companyName}
                      />
                      <Form.Control.Feedback type="invalid">
                        {validationErrors.companyName}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>사업자등록번호 *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="1234567890"
                        value={formData.businessNumber}
                        onChange={(e) => {
                          const value = e.target.value;
                          // 숫자만 추출
                          const numbersOnly = value.replace(/[^0-9]/g, '');
                          
                          // 숫자가 10자리인 경우에만 포맷팅 적용
                          if (numbersOnly.length === 10) {
                            const formatted = numbersOnly.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
                            handleInputChange('businessNumber', formatted);
                          } else if (numbersOnly.length <= 10) {
                            // 10자리 미만인 경우 숫자만 저장
                            handleInputChange('businessNumber', numbersOnly);
                          }
                          // 10자리를 초과하는 경우는 무시
                        }}
                        onClick={() => {
                          if (!formData.businessNumber) {
                            setShowCompanySearchModal(true);
                          }
                        }}
                        maxLength={12} // 123-45-67890 (최대 12자)
                        isInvalid={!!validationErrors.businessNumber}
                      />
                      <Form.Control.Feedback type="invalid">
                        {validationErrors.businessNumber}
                      </Form.Control.Feedback>
                      <Form.Text className="text-muted">
                        💡 숫자만 입력하면 자동으로 하이픈이 추가됩니다
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>연락처 *</Form.Label>
                      <Form.Control
                        type="tel"
                        placeholder="010-1234-5678"
                        value={formData.contactNumber}
                        onChange={(e) => {
                          const value = e.target.value;
                          // 숫자만 입력된 경우 자동으로 하이픈 추가
                          if (/^\d{11}$/.test(value)) {
                            const formatted = value.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
                            handleInputChange('contactNumber', formatted);
                          } else {
                            handleInputChange('contactNumber', value);
                          }
                        }}
                        onKeyDown={(e) => {
                          // 모든 키 허용 (백스페이스, 삭제 등이 정상 작동하도록)
                          // 숫자만 입력하도록 제한하는 것은 onChange에서 처리
                        }}
                        onBlur={(e) => {
                          // 포커스를 잃을 때 포맷팅 적용
                          const value = e.target.value;
                          const numbersOnly = value.replace(/[^0-9]/g, '');
                          
                          if (numbersOnly.length === 11) {
                            const formatted = numbersOnly.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
                            if (formatted !== value) {
                              handleInputChange('contactNumber', formatted);
                            }
                          }
                        }}
                        maxLength={13} // 010-1234-5678 (최대 13자)
                        isInvalid={!!validationErrors.contactNumber}
                      />
                      <Form.Control.Feedback type="invalid">
                        {validationErrors.contactNumber}
                      </Form.Control.Feedback>
                      <Form.Text className="text-muted">
                        💡 숫자만 입력하면 자동으로 하이픈이 추가됩니다 (예: 01012345678 → 010-1234-5678)
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>주소 * (회사)</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="주소를 입력하세요"
                      value={formData.businessAddress}
                      onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                      onClick={() => {
                        if (!formData.businessAddress) {
                          setShowCompanySearchModal(true);
                        }
                      }}
                      isInvalid={!!validationErrors.businessAddress}
                      readOnly
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={openAddressSearch}
                      type="button"
                    >
                      <FontAwesomeIcon icon={faSearch} />
                    </Button>
                  </InputGroup>
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.businessAddress}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    돋보기 아이콘을 클릭하여 주소를 검색하세요
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>상세주소</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="상세주소를 입력하세요"
                    value={formData.detailedAddress}
                    onChange={(e) => handleInputChange('detailedAddress', e.target.value)}
                    onClick={() => {
                      if (!formData.detailedAddress) {
                        setShowCompanySearchModal(true);
                      }
                    }}
                  />
                </Form.Group>

                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>생년월일</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="2000-01-01"
                        value={formData.birthDate}
                        onChange={(e) => {
                          const value = e.target.value;
                          // 숫자만 입력된 경우 자동으로 하이픈 추가
                          if (/^\d{8}$/.test(value)) {
                            const formatted = value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
                            handleInputChange('birthDate', formatted);
                          } else {
                            handleInputChange('birthDate', value);
                          }
                        }}
                        onKeyDown={(e) => {
                          // 모든 키 허용 (백스페이스, 삭제 등이 정상 작동하도록)
                          // 숫자만 입력하도록 제한하는 것은 onChange에서 처리
                        }}
                        onBlur={(e) => {
                          // 포커스를 잃을 때 포맷팅 적용
                          const value = e.target.value;
                          const numbersOnly = value.replace(/[^0-9]/g, '');
                          
                          if (numbersOnly.length === 8) {
                            const formatted = numbersOnly.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
                            if (formatted !== value) {
                              handleInputChange('birthDate', formatted);
                            }
                          }
                        }}
                        maxLength={10} // YYYY-MM-DD (최대 10자)
                      />
                      <Form.Text className="text-muted">
                        💡 숫자만 입력하면 자동으로 하이픈이 추가됩니다 (예: 20000101 → 2000-01-01)
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>성별</Form.Label>
                      <div>
                        <Form.Check
                          inline
                          type="radio"
                          name="gender"
                          id="male"
                          label="남성"
                          value="male"
                          checked={formData.gender === 'male'}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                        />
                        <Form.Check
                          inline
                          type="radio"
                          name="gender"
                          id="female"
                          label="여성"
                          value="female"
                          checked={formData.gender === 'female'}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>


                <Form.Group className="mb-4">
                  <Form.Label>직급</Form.Label>
                  <Form.Select
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                  >
                    <option value="">직급을 선택하세요</option>
                    <option value="사원">사원</option>
                    <option value="대리">대리</option>
                    <option value="과장">과장</option>
                    <option value="차장">차장</option>
                    <option value="부장">부장</option>
                    <option value="이사">이사</option>
                    <option value="상무">상무</option>
                    <option value="전무">전무</option>
                    <option value="부사장">부사장</option>
                    <option value="사장">사장</option>
                    <option value="기타">기타</option>
                  </Form.Select>
                </Form.Group>

                {/* 개인정보처리방침 동의 */}
                <div className="mb-4">
                  <Form.Check
                    type="checkbox"
                    id="termsAgreementAdditional"
                    label={
                      <span>
                        <button 
                          type="button"
                          onClick={handleShowTerms}
                          className="text-decoration-none border-0 bg-transparent p-0 text-primary"
                          style={{ textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          개인정보처리방침
                        </button>
                        에 동의합니다 (필수)
                      </span>
                    }
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    isInvalid={!agreedToTerms && error.includes('개인정보처리방침')}
                  />
                  {!agreedToTerms && error.includes('개인정보처리방침') && (
                    <div className="text-danger small mt-1">
                      개인정보처리방침에 동의해주세요.
                    </div>
                  )}
                </div>

                <div className="d-grid gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div>
                        <Spinner animation="border" size="sm" className="me-2" />
                        처리 중...
                      </div>
                    ) : (
                      '가입 완료'
                    )}
                  </Button>
                  
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowAdditionalInfoForm(false)}
                    disabled={isLoading}
                  >
                    뒤로 가기
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        )}

        {/* 개인정보처리방침 모달 */}
        <PrivacyPolicy
          showModal={showTermsModal}
          onHide={handleCloseTerms}
          onAgree={handleAgreeToTerms}
          title="개인정보처리방침"
        />

        {/* 회사 찾기 모달 */}
        <CompanySearchModal
          show={showCompanySearchModal}
          onHide={() => setShowCompanySearchModal(false)}
          onSelectCompany={handleCompanySelect}
        />

        {/* 회사 등록 모달 */}
        <CompanyRegisterPage
          show={showCompanyRegisterModal}
          onHide={() => setShowCompanyRegisterModal(false)}
          onSuccess={handleCompanyRegisterSuccess}
          user={oauthUser} // 현재 가입 중인 사용자 정보 전달
          isFromRegister={true} // RegisterPage에서 호출된 것임을 표시
        />

      </div>
    </Container>
  );
};

export default RegisterPage;
