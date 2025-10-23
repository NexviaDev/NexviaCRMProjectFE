import React, { useState } from 'react';
import { Card, Button, Row, Col, Alert, Spinner, Badge, Modal, ListGroup } from 'react-bootstrap';
import { FaComments, FaPhone, FaSms, FaEnvelope, FaCopy, FaCheck, FaUser } from 'react-icons/fa';
import api from '../../../utils/api';

const MeetingMessageRecommendation = ({ schedule, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [messageData, setMessageData] = useState(null);
    const [copiedText, setCopiedText] = useState('');
    const [activeMessageType, setActiveMessageType] = useState('phone');

    // 메시지 추천 생성
    const generateMessageRecommendation = async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await api.get(`/schedule-briefing/meeting-message/${schedule._id}`);
            
            if (response.data.success) {
                setMessageData(response.data.data);
            } else {
                setError('메시지 추천 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('메시지 추천 생성 오류:', error);
            if (error.code === 'ECONNABORTED') {
                setError('요청 시간이 초과되었습니다. 다시 시도해주세요.');
            } else {
                setError('메시지 추천 생성 중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 텍스트 복사 기능
    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedText(text.substring(0, 30) + '...');
            setTimeout(() => setCopiedText(''), 2000);
        } catch (error) {
            console.error('복사 실패:', error);
        }
    };

    // 메시지 타입별 텍스트 추출
    const getMessageByType = (messageRecommendation, type) => {
        if (!messageRecommendation) return '';
        
        const lines = messageRecommendation.split('\n');
        let currentType = '';
        let message = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.includes('전화 통화용')) {
                currentType = 'phone';
            } else if (line.includes('문자 메시지용')) {
                currentType = 'sms';
            } else if (line.includes('이메일용')) {
                currentType = 'email';
            }
            
            if (currentType === type && line.trim() && !line.includes('용')) {
                message += line + '\n';
            }
        }
        
        return message.trim();
    };

    // 컴포넌트 마운트 시 메시지 추천 생성
    React.useEffect(() => {
        generateMessageRecommendation();
    }, []);

    return (
        <Modal show={true} onHide={onClose} size="lg" centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>
                    <FaComments className="me-2" />
                    만남 메시지 추천
                </Modal.Title>
            </Modal.Header>
            
            <Modal.Body>
                {error && (
                    <Alert variant="danger" onClose={() => setError('')} dismissible>
                        {error}
                    </Alert>
                )}

                {/* 일정 정보 */}
                <Card className="mb-4">
                    <Card.Header>
                        <h6 className="mb-0">
                            <FaUser className="me-2" />
                            일정 정보
                        </h6>
                    </Card.Header>
                    <Card.Body>
                        <Row>
                            <Col md={6}>
                                <div className="mb-2">
                                    <strong>제목:</strong> {schedule.title}
                                </div>
                                <div className="mb-2">
                                    <strong>유형:</strong> 
                                    <Badge bg="primary" className="ms-1">{schedule.type}</Badge>
                                </div>
                                <div className="mb-2">
                                    <strong>날짜:</strong> {new Date(schedule.date).toLocaleDateString('ko-KR')}
                                </div>
                            </Col>
                            <Col md={6}>
                                <div className="mb-2">
                                    <strong>시간:</strong> {schedule.time}
                                </div>
                                <div className="mb-2">
                                    <strong>장소:</strong> {schedule.location}
                                </div>
                                <div className="mb-2">
                                    <strong>우선순위:</strong>
                                    <Badge 
                                        bg={schedule.priority === '높음' ? 'danger' : schedule.priority === '보통' ? 'warning' : 'secondary'}
                                        className="ms-1"
                                    >
                                        {schedule.priority}
                                    </Badge>
                                </div>
                            </Col>
                        </Row>
                        {schedule.description && (
                            <div className="mt-2">
                                <strong>설명:</strong> {schedule.description}
                            </div>
                        )}
                    </Card.Body>
                </Card>

                {/* 고객 정보 */}
                {messageData && messageData.customer && (
                    <Card className="mb-4">
                        <Card.Header>
                            <h6 className="mb-0">고객 정보</h6>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={4}>
                                    <div className="mb-2">
                                        <strong>이름:</strong> {messageData.customer.name}
                                    </div>
                                </Col>
                                <Col md={4}>
                                    <div className="mb-2">
                                        <strong>연락처:</strong> {messageData.customer.phone}
                                    </div>
                                </Col>
                                <Col md={4}>
                                    <div className="mb-2">
                                        <strong>이메일:</strong> {messageData.customer.email || '없음'}
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                )}

                {/* 메시지 추천 생성 버튼 */}
                <div className="text-center mb-4">
                    <Button
                        variant="primary"
                        onClick={generateMessageRecommendation}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                AI가 메시지를 생성 중입니다...
                            </>
                        ) : (
                            <>
                                <FaComments className="me-2" />
                                메시지 추천 생성
                            </>
                        )}
                    </Button>
                </div>

                {/* 메시지 추천 결과 */}
                {messageData && messageData.messageRecommendation && (
                    <Card>
                        <Card.Header>
                            <div className="d-flex justify-content-between align-items-center">
                                <h6 className="mb-0">추천 메시지</h6>
                                <div className="btn-group" role="group">
                                    <Button
                                        variant={activeMessageType === 'phone' ? 'primary' : 'outline-primary'}
                                        size="sm"
                                        onClick={() => setActiveMessageType('phone')}
                                    >
                                        <FaPhone className="me-1" />
                                        전화
                                    </Button>
                                    <Button
                                        variant={activeMessageType === 'sms' ? 'primary' : 'outline-primary'}
                                        size="sm"
                                        onClick={() => setActiveMessageType('sms')}
                                    >
                                        <FaSms className="me-1" />
                                        문자
                                    </Button>
                                    <Button
                                        variant={activeMessageType === 'email' ? 'primary' : 'outline-primary'}
                                        size="sm"
                                        onClick={() => setActiveMessageType('email')}
                                    >
                                        <FaEnvelope className="me-1" />
                                        이메일
                                    </Button>
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Body>
                            <div className="message-content mb-3">
                                <div 
                                    className="p-3 bg-light rounded"
                                    style={{ 
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: '1.6',
                                        fontSize: '14px',
                                        minHeight: '150px'
                                    }}
                                >
                                    {getMessageByType(messageData.messageRecommendation, activeMessageType) || 
                                     '해당 타입의 메시지를 찾을 수 없습니다.'}
                                </div>
                            </div>
                            
                            <div className="text-end">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => copyToClipboard(getMessageByType(messageData.messageRecommendation, activeMessageType))}
                                >
                                    {copiedText ? (
                                        <>
                                            <FaCheck className="me-1" />
                                            복사됨
                                        </>
                                    ) : (
                                        <>
                                            <FaCopy className="me-1" />
                                            복사
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                )}

                {/* 전체 메시지 추천 (원본) */}
                {messageData && messageData.messageRecommendation && (
                    <Card className="mt-3">
                        <Card.Header>
                            <h6 className="mb-0">전체 메시지 추천</h6>
                        </Card.Header>
                        <Card.Body>
                            <div 
                                className="p-3 bg-light rounded"
                                style={{ 
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '1.6',
                                    fontSize: '13px',
                                    maxHeight: '300px',
                                    overflowY: 'auto'
                                }}
                            >
                                {messageData.messageRecommendation}
                            </div>
                            <div className="text-end mt-2">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => copyToClipboard(messageData.messageRecommendation)}
                                >
                                    <FaCopy className="me-1" />
                                    전체 복사
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                )}
            </Modal.Body>
            
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>
                    닫기
                </Button>
            </Modal.Footer>

            <style>{`
                .message-content {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                .btn-group .btn {
                    border-radius: 0;
                }
                .btn-group .btn:first-child {
                    border-top-left-radius: 0.375rem;
                    border-bottom-left-radius: 0.375rem;
                }
                .btn-group .btn:last-child {
                    border-top-right-radius: 0.375rem;
                    border-bottom-right-radius: 0.375rem;
                }
            `}</style>
        </Modal>
    );
};

export default MeetingMessageRecommendation;
