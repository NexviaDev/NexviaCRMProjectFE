import React, { useState } from 'react';
import { Card, Button, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { FaRobot, FaCalendarWeek, FaCalendarDay, FaChartLine, FaCopy, FaCheck, FaClock, FaMapMarkerAlt, FaUser } from 'react-icons/fa';
import { apiWithUnlimitedTimeout } from '../../../utils/api';

const ScheduleBriefing = ({ user }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [briefingData, setBriefingData] = useState(null);
    const [activeTab, setActiveTab] = useState('weekly');
    const [copiedText, setCopiedText] = useState('');

    // 금주 브리핑 생성
    const generateWeeklyBriefing = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await apiWithUnlimitedTimeout.get('/schedule-briefing/weekly-briefing');

            if (response.data.success) {
                setBriefingData({
                    type: 'weekly',
                    data: response.data.data
                });
            } else {
                setError('브리핑 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('금주 브리핑 생성 오류:', error);
            setError('브리핑 생성 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 일일 브리핑 생성
    const generateDailyBriefing = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await apiWithUnlimitedTimeout.get('/schedule-briefing/daily-briefing');

            if (response.data.success) {
                setBriefingData({
                    type: 'daily',
                    data: response.data.data
                });
            } else {
                setError('브리핑 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('일일 브리핑 생성 오류:', error);
            setError('브리핑 생성 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 일정 분석 생성
    const generateAnalysis = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await apiWithUnlimitedTimeout.get('/schedule-briefing/analysis');

            if (response.data.success) {
                setBriefingData({
                    type: 'analysis',
                    data: response.data.data
                });
            } else {
                setError('분석 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('일정 분석 생성 오류:', error);
            setError('분석 생성 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 텍스트 복사 기능
    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedText(text.substring(0, 50) + '...');
            setTimeout(() => setCopiedText(''), 2000);
        } catch (error) {
            console.error('복사 실패:', error);
        }
    };

    // 탭 변경 핸들러
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setBriefingData(null);
        setError('');
    };

    // 브리핑 생성 핸들러
    const handleGenerateBriefing = () => {
        switch (activeTab) {
            case 'weekly':
                generateWeeklyBriefing();
                break;
            case 'daily':
                generateDailyBriefing();
                break;
            case 'analysis':
                generateAnalysis();
                break;
            default:
                break;
        }
    };

    // 시간순 타임라인 렌더링 함수
    const renderTimeline = () => {
        if (!briefingData || !briefingData.data.schedules || briefingData.data.schedules.length === 0) {
            return null;
        }

        // 시간순으로 정렬
        const sortedSchedules = [...briefingData.data.schedules].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA.getTime() !== dateB.getTime()) {
                return dateA.getTime() - dateB.getTime();
            }
            // 같은 날짜면 시간순으로 정렬
            const timeA = a.time || '00:00';
            const timeB = b.time || '00:00';
            return timeA.localeCompare(timeB);
        });

        return (
            <Card className="mt-3 border-primary">
                <Card.Header className="bg-primary text-white">
                    <h6 className="mb-0">
                        <FaClock className="me-2" />
                        ⏰ 시간순 타임라인 ({sortedSchedules.length}개 일정)
                    </h6>
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="timeline-container">
                        {sortedSchedules.map((schedule, index) => (
                            <div key={schedule._id} className="timeline-item">
                                <div className="timeline-marker">
                                    <div className="timeline-dot"></div>
                                    {index < sortedSchedules.length - 1 && <div className="timeline-line"></div>}
                                </div>
                                <div className="timeline-content">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h6 className="mb-1 text-primary">{schedule.title}</h6>
                                        <Badge 
                                            bg={schedule.priority === '높음' ? 'danger' : schedule.priority === '보통' ? 'warning' : 'secondary'}
                                            className="ms-2"
                                        >
                                            {schedule.priority}
                                        </Badge>
                                    </div>
                                    <div className="timeline-details">
                                        <div className="timeline-detail-item">
                                            <FaClock className="me-1 text-muted" />
                                            <span className="text-muted">
                                                {new Date(schedule.date).toLocaleDateString('ko-KR')} {schedule.time}
                                            </span>
                                        </div>
                                        {schedule.location && (
                                            <div className="timeline-detail-item">
                                                <FaMapMarkerAlt className="me-1 text-muted" />
                                                <span className="text-muted">{schedule.location}</span>
                                            </div>
                                        )}
                                        {schedule.relatedCustomers && schedule.relatedCustomers.length > 0 && (
                                            <div className="timeline-detail-item">
                                                <FaUser className="me-1 text-muted" />
                                                <span className="text-muted">
                                                    {schedule.relatedCustomers.map(c => c.name).join(', ')}
                                                </span>
                                            </div>
                                        )}
                                        <div className="timeline-detail-item">
                                            <Badge bg="info" className="me-1">{schedule.type}</Badge>
                                            <Badge bg="outline-secondary">{schedule.status}</Badge>
                                        </div>
                                    </div>
                                    {schedule.description && (
                                        <div className="timeline-description mt-2">
                                            <small className="text-muted">{schedule.description}</small>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card.Body>
            </Card>
        );
    };

    return (
        <Card className="shadow-sm">
            <Card.Header className="bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <Row className="align-items-center">
                    <Col md={6}>
                        <h4 className="mb-0">
                            <FaRobot className="me-2" />
                            AI 스케줄 브리핑
                        </h4>
                    </Col>
                    <Col md={6} className="text-end">
                        <Badge bg="light" text="dark" className="me-2">
                            GEMINI AI
                        </Badge>
                    </Col>
                </Row>
            </Card.Header>

            <Card.Body>
                {error && (
                    <Alert variant="danger" onClose={() => setError('')} dismissible>
                        {error}
                    </Alert>
                )}

                {/* 탭 네비게이션 */}
                <div className="mb-4">
                    <div className="nav nav-pills nav-fill" role="tablist">
                        <button
                            className={`nav-link ${activeTab === 'weekly' ? 'active' : ''}`}
                            onClick={() => handleTabChange('weekly')}
                        >
                            <FaCalendarWeek className="me-2" />
                            금주 브리핑
                        </button>
                        <button
                            className={`nav-link ${activeTab === 'daily' ? 'active' : ''}`}
                            onClick={() => handleTabChange('daily')}
                        >
                            <FaCalendarDay className="me-2" />
                            오늘 브리핑
                        </button>
                        <button
                            className={`nav-link ${activeTab === 'analysis' ? 'active' : ''}`}
                            onClick={() => handleTabChange('analysis')}
                        >
                            <FaChartLine className="me-2" />
                            일정 분석
                        </button>
                    </div>
                </div>

                {/* 브리핑 생성 버튼 */}
                <div className="text-center mb-4">
                    <div className="mb-3">

                    </div>
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={handleGenerateBriefing}
                        disabled={loading}
                        className="px-4"
                    >
                        {loading ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                AI가 깊이 있게 분석 중입니다... (시간 제한 없음)
                            </>
                        ) : (
                            <>
                                <FaRobot className="me-2" />
                                {activeTab === 'weekly' && '금주 브리핑 생성'}
                                {activeTab === 'daily' && '오늘 브리핑 생성'}
                                {activeTab === 'analysis' && '일정 분석 생성'}
                            </>
                        )}
                    </Button>
                </div>

                {/* 브리핑 결과 */}
                {briefingData && (
                    <Card className="border-0 bg-light">
                        <Card.Header className="bg-white border-bottom">
                            <Row className="align-items-center">
                                <Col>
                                    <h5 className="mb-0">
                                        {briefingData.type === 'weekly' && '📅 금주 업무 브리핑'}
                                        {briefingData.type === 'daily' && '🌅 오늘의 업무 브리핑'}
                                        {briefingData.type === 'analysis' && '📊 일정 분석 보고서'}
                                    </h5>
                                    <small className="text-muted">
                                        글자 수: {(briefingData.data.briefing || briefingData.data.analysis || '').length}자
                                        {briefingData.type === 'weekly' && ' (목표: 1300자 이내)'}
                                        {briefingData.type === 'daily' && ' (목표: 600자 이내)'}
                                    </small>
                                </Col>
                                <Col className="text-end">
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => copyToClipboard(briefingData.data.briefing || briefingData.data.analysis)}
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
                                </Col>
                            </Row>
                        </Card.Header>
                        <Card.Body>
                            <div
                                className="briefing-content"
                                style={{
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '1.6',
                                    fontSize: '14px'
                                }}
                            >
                                {briefingData.data.briefing || briefingData.data.analysis}
                            </div>
                        </Card.Body>
                    </Card>
                )}

                {/* 시간순 타임라인 */}
                {renderTimeline()}

                {/* 일정 목록 (브리핑이 생성된 경우) */}
                {briefingData && briefingData.data.schedules && briefingData.data.schedules.length > 0 && (
                    <Card className="mt-3">
                        <Card.Header>
                            <h6 className="mb-0">
                                📋 관련 일정 ({briefingData.data.schedules.length}개)
                            </h6>
                        </Card.Header>
                        <Card.Body>
                            <div className="row">
                                {briefingData.data.schedules.map((schedule, index) => (
                                    <div key={schedule._id} className="col-md-6 mb-3">
                                        <Card className="h-100">
                                            <Card.Body className="p-3">
                                                <h6 className="card-title text-primary mb-2">
                                                    {schedule.title}
                                                </h6>
                                                <div className="small text-muted mb-2">
                                                    <div><strong>날짜:</strong> {new Date(schedule.date).toLocaleDateString('ko-KR')}</div>
                                                    <div><strong>시간:</strong> {schedule.time}</div>
                                                    <div><strong>장소:</strong> {schedule.location}</div>
                                                    <div><strong>유형:</strong> {schedule.type}</div>
                                                    <div><strong>우선순위:</strong>
                                                        <Badge
                                                            bg={schedule.priority === '높음' ? 'danger' : schedule.priority === '보통' ? 'warning' : 'secondary'}
                                                            className="ms-1"
                                                        >
                                                            {schedule.priority}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                {schedule.description && (
                                                    <p className="card-text small">{schedule.description}</p>
                                                )}
                                                {schedule.relatedCustomers && schedule.relatedCustomers.length > 0 && (
                                                    <div className="small">
                                                        <strong>관련 고객:</strong>
                                                        {schedule.relatedCustomers.map((customer, idx) => (
                                                            <span key={idx} className="badge bg-info me-1">
                                                                {customer.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </Card.Body>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        </Card.Body>
                    </Card>
                )}
            </Card.Body>

            <style>{`
                .nav-pills .nav-link {
                    color: #6c757d;
                    border: 1px solid #dee2e6;
                    margin-right: 5px;
                }
                .nav-pills .nav-link.active {
                    background-color: #667eea;
                    border-color: #667eea;
                    color: white;
                }
                .nav-pills .nav-link:hover {
                    background-color: #f8f9fa;
                }
                .briefing-content {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                .briefing-content h1, .briefing-content h2, .briefing-content h3 {
                    color: #495057;
                    margin-top: 1.5rem;
                    margin-bottom: 1rem;
                }
                .briefing-content ul, .briefing-content ol {
                    padding-left: 1.5rem;
                }
                .briefing-content li {
                    margin-bottom: 0.5rem;
                }
                
                /* 타임라인 스타일 */
                .timeline-container {
                    padding: 20px;
                }
                
                .timeline-item {
                    display: flex;
                    margin-bottom: 20px;
                    position: relative;
                }
                
                .timeline-marker {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-right: 15px;
                    position: relative;
                }
                
                .timeline-dot {
                    width: 12px;
                    height: 12px;
                    background-color: #667eea;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 0 0 2px #667eea;
                    z-index: 2;
                }
                
                .timeline-line {
                    width: 2px;
                    height: 40px;
                    background-color: #e9ecef;
                    margin-top: 5px;
                }
                
                .timeline-content {
                    flex: 1;
                    background: white;
                    border-radius: 8px;
                    padding: 15px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    border-left: 3px solid #667eea;
                }
                
                .timeline-details {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                
                .timeline-detail-item {
                    display: flex;
                    align-items: center;
                    font-size: 13px;
                }
                
                .timeline-description {
                    background: #f8f9fa;
                    padding: 8px;
                    border-radius: 4px;
                    border-left: 3px solid #dee2e6;
                }
                
                @media (max-width: 768px) {
                    .timeline-item {
                        flex-direction: column;
                    }
                    
                    .timeline-marker {
                        margin-right: 0;
                        margin-bottom: 10px;
                    }
                    
                    .timeline-line {
                        display: none;
                    }
                }
            `}</style>
        </Card>
    );
};

export default ScheduleBriefing;
