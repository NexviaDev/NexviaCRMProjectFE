import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Alert, InputGroup } from 'react-bootstrap';
import { FaBuilding, FaUser, FaMapMarkerAlt, FaSave, FaArrowLeft } from 'react-icons/fa';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import api from '../utils/api';

const CompanyRegisterPage = ({ 
  show, 
  onHide, 
  onSuccess, 
  user = null,  // 현재 가입 중인 사용자 정보
  isFromRegister = false  // RegisterPage에서 호출된 건지 여부
}) => {

  const [formData, setFormData] = useState({
    companyName: '',
    businessNumber: '',
    businessType: '',
    businessAddress: '',
    detailedAddress: '',
    representativeName: '',
    contactNumber: '',
    email: user?.email || '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // 입력 필드 변경 핸들러
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // 에러 메시지 제거
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    handleInputChange(name, value);
  };

  // 주소 검색 함수
  const openAddressSearch = () => {
    new window.daum.Postcode({
      oncomplete: function (data) {
        handleInputChange('businessAddress', data.address);
      }
    }).open();
  };

  // 폼 유효성 검사
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = '회사명을 입력해주세요.';
    }
    
    if (!formData.businessNumber.trim()) {
      newErrors.businessNumber = '사업자등록번호를 입력해주세요.';
    } else {
      // 포맷팅된 사업자번호 검증
      const businessNumberRegex = /^\d{3}-\d{2}-\d{5}$/;
      if (!businessNumberRegex.test(formData.businessNumber)) {
        newErrors.businessNumber = '사업자등록번호 형식이 올바르지 않습니다. (예: 123-45-67890)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 회사 등록 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);


    try {
      // 회사 등록 API 호출
      const response = await api.post('/company/register-new', {
        ...formData,
        initialUserId: user?._id,  // 최초 등록자 ID
        initialUserEmail: user?.email,  // 최초 등록자 이메일
        initialUserName: user?.name,  // 최초 등록자 이름
        isInitialRegistration: true  // 최초 등록임을 표시
      });


      if (response.data.success) {
        setSuccess(true);
        
        const { company, userUpdate } = response.data.data || response.data;
        
        if (userUpdate && userUpdate.updated) {
        } else if (userUpdate && userUpdate.error) {
        }
        
        // 성공 후 처리
        if (onSuccess) {
          onSuccess(response.data.data.company || response.data.company);
        }
        
        setTimeout(() => {
          onHide();
          setSuccess(false);
          setFormData({
            companyName: '',
            businessNumber: '',
            businessType: '',
            businessAddress: '',
            detailedAddress: '',
            representativeName: '',
            contactNumber: '',
            email: user?.email || '',
          });
        }, 2000);
      } else {
        setError(response.data.message || '회사 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('회사 등록 오류:', error);
      
      // 백엔드에서 전달된 에러 메시지 처리
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('회사 등록 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Modal show={show} onHide={onHide} size="md" centered>
        <Modal.Body className="text-center p-5">
          <div className="mb-4">
            <FaBuilding size={64} className="text-success" />
          </div>
          <h4 className="text-success mb-3">회사 등록 완료! 🎉</h4>
          <p className="text-muted mb-0">
            회사가 성공적으로 등록되었습니다.<br/>
            {isFromRegister && "최초 관리자(레벨 10)로 설정되었습니다!"}
          </p>
        </Modal.Body>
      </Modal>
    );
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title className="d-flex align-items-center">
          <FaBuilding className="me-2" />
          새 회사 등록
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="py-4">
        {error && (
          <Alert variant="danger" className="mb-4">
            <strong>오류:</strong> {error}
          </Alert>
        )}

        {isFromRegister && (
          <Alert variant="info" className="mb-4">
            <strong>안내:</strong> 회사를 새로 등록하시면 해당 회사의 최초 관리자(레벨 10)로 자동 설정됩니다.
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-4">
            <Form.Label className="d-flex align-items-center">
              <FaBuilding className="me-2 text-primary" />
              회사명 <span className="text-danger ms-1">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="회사명을 입력해주세요"
              isInvalid={!!errors.companyName}
              className="py-3"
            />
            <Form.Control.Feedback type="invalid">
              {errors.companyName}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="d-flex align-items-center">
              <FaBuilding className="me-2 text-primary" />
              사업자등록번호 <span className="text-danger ms-1">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="businessNumber"
              value={formData.businessNumber}
              onChange={(e) => {
                const value = e.target.value;
                // 숫자만 입력된 경우 자동으로 하이픈 추가
                if (/^\d{10}$/.test(value)) {
                  const formatted = value.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
                  handleInputChange('businessNumber', formatted);
                } else {
                  handleInputChange('businessNumber', value);
                }
              }}
              onBlur={(e) => {
                // 포커스를 잃을 때 포맷팅 적용
                const value = e.target.value;
                const numbersOnly = value.replace(/[^0-9]/g, '');
                
                if (numbersOnly.length === 10) {
                  const formatted = numbersOnly.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
                  if (formatted !== value) {
                    handleInputChange('businessNumber', formatted);
                  }
                }
              }}
              placeholder="123-45-67890"
              maxLength={12}
              isInvalid={!!errors.businessNumber}
              className="py-3"
            />
            <Form.Control.Feedback type="invalid">
              {errors.businessNumber}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              💡 숫자만 입력하면 자동으로 하이픈이 추가됩니다
            </Form.Text>
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label className="d-flex align-items-center">
                  <FaBuilding className="me-2 text-primary" />
                  업종
                </Form.Label>
                <Form.Control
                  type="text"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  placeholder="예: 부동산 중개업"
                  className="py-3"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label className="d-flex align-items-center">
                  <FaUser className="me-2 text-primary" />
                  대표자명
                </Form.Label>
                <Form.Control
                  type="text"
                  name="representativeName"
                  value={formData.representativeName}
                  onChange={handleChange}
                  placeholder="대표자명을 입력하세요"
                  className="py-3"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-4">
            <Form.Label className="d-flex align-items-center">
              <FaMapMarkerAlt className="me-2 text-primary" />
              사업장 주소
            </Form.Label>
            <InputGroup className="mb-2">
              <Form.Control
                type="text"
                name="businessAddress"
                value={formData.businessAddress}
                onChange={handleChange}
                placeholder="주소를 검색해주세요"
                className="py-3"
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
            <Form.Text className="text-muted">
              돋보기 아이콘을 클릭하여 주소를 검색하세요
            </Form.Text>
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label className="d-flex align-items-center">
                  <FaMapMarkerAlt className="me-2 text-primary" />
                  상세주소
                </Form.Label>
                <Form.Control
                  type="text"
                  name="detailedAddress"
                  value={formData.detailedAddress}
                  onChange={handleChange}
                  placeholder="상세주소를 입력해주세요"
                  className="py-3"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label>
                  연락처
                </Form.Label>
                <Form.Control
                  type="text"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="000-0000-0000"
                  className="py-3"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-4">
            <Form.Label>
              회사 이메일
            </Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="company@example.com"
              className="py-3"
            />
          </Form.Group>

          <div className="d-grid gap-2">
            <Button 
              type="submit" 
              variant="primary" 
              size="lg"
              disabled={loading || !formData.companyName || !formData.businessNumber}
              className="py-3 d-flex align-items-center justify-content-center"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  등록 중...
                </>
              ) : (
                <>
                  <FaSave className="me-2" />
                  회사등록
                </>
              )}
            </Button>
            
            <Button 
              variant="outline-secondary" 
              onClick={onHide}
              disabled={loading}
              className="py-3 d-flex align-items-center justify-content-center"
            >
              <FaArrowLeft className="me-2" />
              취소
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default CompanyRegisterPage;
