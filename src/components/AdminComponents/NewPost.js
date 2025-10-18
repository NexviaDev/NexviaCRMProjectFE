import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import api from '../../utils/api';

const NewPost = () => {
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    link: '',
    registrationDate: new Date().toISOString().split('T')[0] // 오늘 날짜를 기본값으로 설정
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newsList, setNewsList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // 컴포넌트 마운트 시 뉴스 목록 불러오기
  useEffect(() => {
    fetchNewsList();
  }, []);

  // 뉴스 목록 불러오기
  const fetchNewsList = async () => {
    try {
      const response = await api.get('/news');
      if (response.data.success && response.data.data) {
        setNewsList(response.data.data);
      } else {
        setNewsList([]);
      }
    } catch (error) {
      console.error('뉴스 목록 불러오기 오류:', error);
      setNewsList([]);
    }
  };

  // 폼 입력 핸들러
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const url = editingId ? `/news/${editingId}` : '/news';
      const method = editingId ? 'put' : 'post';
      
      const response = await api[method](url, formData);
      
      if (response.data.success) {
        setMessage({
          type: 'success',
          text: editingId ? '뉴스가 성공적으로 수정되었습니다.' : '뉴스가 성공적으로 등록되었습니다.'
        });
        
        // 폼 초기화
        setFormData({
          title: '',
          subtitle: '',
          link: '',
          registrationDate: new Date().toISOString().split('T')[0]
        });
        setEditingId(null);
        setShowModal(false);
        
        // 뉴스 목록 새로고침
        fetchNewsList();
      }
    } catch (error) {
      console.error('뉴스 등록/수정 오류:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || '오류가 발생했습니다.'
      });
    } finally {
      setLoading(false);
    }
  };

  // 뉴스 수정 핸들러
  const handleEdit = (news) => {
    setFormData({
      title: news.title,
      subtitle: news.subtitle,
      link: news.link || news.linkUrl, // 기존 데이터와의 호환성
      registrationDate: new Date(news.registrationDate).toISOString().split('T')[0]
    });
    setEditingId(news._id);
    setShowModal(true);
  };

  // 뉴스 삭제 핸들러
  const handleDelete = async (id) => {
    if (window.confirm('정말로 이 뉴스를 삭제하시겠습니까?')) {
      try {
        const response = await api.delete(`/news/${id}`);
        if (response.data.success) {
          setMessage({
            type: 'success',
            text: '뉴스가 성공적으로 삭제되었습니다.'
          });
          fetchNewsList();
        }
      } catch (error) {
        console.error('뉴스 삭제 오류:', error);
        setMessage({
          type: 'danger',
          text: '뉴스 삭제 중 오류가 발생했습니다.'
        });
      }
    }
  };

  // 취소 핸들러
  const handleCancel = () => {
    setFormData({
      title: '',
      subtitle: '',
      link: '',
      registrationDate: new Date().toISOString().split('T')[0]
    });
    setEditingId(null);
    setShowModal(false);
  };

  // 모달 열기 핸들러
  const handleOpenModal = () => {
    setFormData({
      title: '',
      subtitle: '',
      link: '',
      registrationDate: new Date().toISOString().split('T')[0]
    });
    setEditingId(null);
    setShowModal(true);
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      title: '',
      subtitle: '',
      link: '',
      registrationDate: new Date().toISOString().split('T')[0]
    });
    setEditingId(null);
  };

  return (
    <Container className="mt-4">
      <Row>
        <Col md={12}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">뉴스 관리</h2>
            <Button 
              variant="primary" 
              onClick={handleOpenModal}
              className="d-flex align-items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              새 뉴스 등록
            </Button>
          </div>
          
          {/* 메시지 표시 */}
          {message.text && (
            <Alert variant={message.type} className="mb-4">
              {message.text}
            </Alert>
          )}

          {/* 뉴스 목록 */}
          <Card>
            <Card.Header>
              <h5>등록된 뉴스 목록</h5>
            </Card.Header>
            <Card.Body>
              {!newsList || newsList.length === 0 ? (
                <p className="text-muted">등록된 뉴스가 없습니다.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>제목</th>
                        <th>부제목</th>
                        <th>링크</th>
                        <th>등록 날짜</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newsList && newsList.map((news) => (
                        <tr key={news._id}>
                          <td>{news.title}</td>
                          <td>{news.subtitle}</td>
                          <td>
                            <a 
                              href={news.link || news.linkUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-decoration-none"
                            >
                              {(news.link || news.linkUrl || '').length > 30 ? `${(news.link || news.linkUrl || '').substring(0, 30)}...` : (news.link || news.linkUrl || '')}
                            </a>
                          </td>
                          <td>{new Date(news.registrationDate).toLocaleDateString('ko-KR')}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline-primary"
                                onClick={() => handleEdit(news)}
                              >
                                수정
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline-danger"
                                onClick={() => handleDelete(news._id)}
                              >
                                삭제
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 뉴스 등록/수정 모달 */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? '뉴스 수정' : '새 뉴스 등록'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form id="newsForm">
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>제목 *</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="뉴스 제목을 입력하세요"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>등록 날짜</Form.Label>
                  <Form.Control
                    type="date"
                    name="registrationDate"
                    value={formData.registrationDate}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>부제목 *</Form.Label>
              <Form.Control
                type="text"
                name="subtitle"
                value={formData.subtitle}
                onChange={handleInputChange}
                placeholder="뉴스 부제목을 입력하세요"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>링크 *</Form.Label>
              <Form.Control
                type="url"
                name="link"
                value={formData.link}
                onChange={handleInputChange}
                placeholder="https://example.com"
                required
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={handleCloseModal}
          >
            취소
          </Button>
          <Button 
            variant="primary" 
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e);
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                {editingId ? '수정 중...' : '등록 중...'}
              </>
            ) : (
              editingId ? '수정하기' : '등록하기'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default NewPost;
