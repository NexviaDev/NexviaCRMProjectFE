import React, { useState, useEffect } from 'react';
import { Modal, Table, Badge, Button, Row, Col, Alert } from 'react-bootstrap';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUser, FaHome, FaEye, FaEdit, FaPlus } from 'react-icons/fa';
import api from '../../utils/api';
import ScheduleRegistrationModal from '../ScheduleManagement/ScheduleRegistrationModal';

const CustomerScheduleHistoryModal = ({ showModal, onHide, customer, onEditSchedule, user }) => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 일정 등록 모달 관련 상태
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);

    // 고객의 일정 목록 가져오기
    useEffect(() => {
        if (showModal && customer) {
            fetchCustomerSchedules();
        }
    }, [showModal, customer]);

    const fetchCustomerSchedules = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get(`/customers/${customer._id}/schedules`);

            if (response.data.success) {
                // 중복된 일정 제거 (같은 _id를 가진 일정 중 첫 번째만 유지)
                const uniqueSchedules = response.data.data.filter((schedule, index, self) => 
                    index === self.findIndex(s => s._id === schedule._id)
                );
                setSchedules(uniqueSchedules);
            } else {
                console.error('API 응답 실패:', response.data);
                setError('일정 목록을 불러오는 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('고객 일정 조회 오류:', error);
            
            // 403 에러인 경우 권한 관련 메시지 표시
            if (error.response?.status === 403) {
                setError('이 고객의 일정에 접근할 권한이 없습니다. 본인이 등록한 일정이거나, 같은 회사 소속이며 레벨 2 이상인 경우에만 조회할 수 있습니다.');
            } else {
                setError('일정 목록을 불러오는 중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 일정 상태에 따른 배지 색상
    const getStatusBadge = (status) => {
        const statusConfig = {
            '예정': { variant: 'primary', text: '예정' },
            '진행중': { variant: 'warning', text: '진행중' },
            '완료': { variant: 'success', text: '완료' },
            '취소': { variant: 'danger', text: '취소' }
        };

        const config = statusConfig[status] || { variant: 'secondary', text: status };
        return <Badge bg={config.variant}>{config.text}</Badge>;
    };

    // 일정 우선순위에 따른 배지 색상
    const getPriorityBadge = (priority) => {
        const priorityConfig = {
            '높음': { variant: 'danger', text: '높음' },
            '보통': { variant: 'warning', text: '보통' },
            '낮음': { variant: 'secondary', text: '낮음' }
        };

        const config = priorityConfig[priority] || { variant: 'secondary', text: priority };
        return <Badge bg={config.variant} className="ms-1">{config.text}</Badge>;
    };

    // 일정 유형에 따른 아이콘과 색상
    const getTypeIcon = (type) => {
        const typeConfig = {
            '시세조사': { icon: '📊', color: 'text-primary' },
            '고객상담': { icon: '💬', color: 'text-success' },
            '계약관리': { icon: '📋', color: 'text-warning' },
            '기타': { icon: '📝', color: 'text-secondary' }
        };

        const config = typeConfig[type] || { icon: '📝', color: 'text-secondary' };
        return <span className={config.color}>{config.icon}</span>;
    };

    // 날짜 포맷팅
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    // 시간 포맷팅
    const formatTime = (timeString) => {
        if (!timeString) return '';
        return timeString;
    };

    const handleEditSchedule = (schedule) => {
        
        setEditingSchedule(schedule);
        setShowScheduleModal(true);
    };

    const handleAddSchedule = () => {
        setEditingSchedule(null);
        setShowScheduleModal(true);
    };

    const handleScheduleModalClose = () => {
        setShowScheduleModal(false);
        setEditingSchedule(null);
    };

    const handleScheduleSuccess = () => {
        // 일정 등록/수정 성공 시 일정 목록 새로고침
        fetchCustomerSchedules();
        setShowScheduleModal(false);
        setEditingSchedule(null);
    };

    return (
        <>
            <Modal show={showModal} onHide={onHide} size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FaUser className="me-2" />
                        {customer?.name} - 지원 이력
                    </Modal.Title>

                </Modal.Header>
                <Modal.Body>
                    {error && (
                        <>
                            <Alert variant="danger" onClose={() => setError('')} dismissible>
                                {error}
                            </Alert>
                            {error.includes('권한이 없습니다') && (
                                <Alert variant="info" className="mt-2">
                                    <small>
                                        💡 <strong>권한 안내:</strong> 다음 조건을 만족하는 경우에만 일정을 조회하고 수정할 수 있습니다:
                                        <br/>• 본인이 등록한 일정
                                        <br/>• 같은 회사 소속(사업자번호 동일)이며 본인 레벨이 2 이상인 경우
                                        <br/>다른 사용자의 일정을 보려면 해당 사용자에게 문의하거나, 같은 회사 소속이면서 레벨을 높이세요.
                                    </small>
                                </Alert>
                            )}
                        </>
                    )}

                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">로딩 중...</span>
                            </div>
                            <p className="mt-2">일정 목록을 불러오는 중...</p>
                        </div>
                    ) : schedules.length === 0 ? (
                        <div className="text-center py-4">
                            <FaCalendarAlt className="text-muted" size={48} />
                            <p className="mt-2 text-muted">등록된 일정이 없습니다.</p>
                            <small className="text-muted">이 고객과 관련된 일정을 등록해보세요.</small>
                        </div>
                    ) : (
                        <>
                            <Row className="mb-3">
                                <Col>
                                    <h6 className="text-muted">
                                        총 {schedules.length}개의 일정이 있습니다.
                                    </h6>
                                </Col>
                            </Row>

                            <div className="table-responsive">
                                <Table striped hover>
                                    <thead>
                                        <tr>
                                            <th>일정 정보</th>
                                            <th>날짜/시간</th>
                                            <th>장소</th>
                                            <th>담당자</th>
                                            <th>상태</th>
                                            <th>작업</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {schedules.map((schedule) => (
                                            <tr key={schedule._id}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        {getTypeIcon(schedule.type)}
                                                        <div className="ms-2">
                                                            <div className="fw-bold">{schedule.title}</div>
                                                            <small className="text-muted">
                                                                {schedule.type} {getPriorityBadge(schedule.priority)}
                                                            </small>
                                                            {schedule.description && (
                                                                <div className="text-muted small mt-1">
                                                                    {schedule.description.length > 50
                                                                        ? `${schedule.description.substring(0, 50)}...`
                                                                        : schedule.description
                                                                    }
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div>
                                                        <div className="fw-bold">
                                                            <FaCalendarAlt className="me-1" />
                                                            {formatDate(schedule.date)}
                                                        </div>
                                                        <small className="text-muted">
                                                            <FaClock className="me-1" />
                                                            {formatTime(schedule.time)}
                                                        </small>
                                                    </div>
                                                </td>
                                                <td>
                                                    {schedule.location && (
                                                        <div>
                                                            <FaMapMarkerAlt className="me-1 text-muted" />
                                                            <span className="small">{schedule.location}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {schedule.publisher && (
                                                        <div className="small">
                                                            <FaUser className="me-1 text-muted" />
                                                            {schedule.publisher.name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {getStatusBadge(schedule.status)}
                                                </td>
                                                <td>
                                                    {/* 권한 검증: 본인이 등록했거나, 같은 사업자번호 + 레벨 2 이상 */}
                                                    {schedule.publisher && user && user._id && (
                                                        (schedule.publisher._id || schedule.publisher) === user._id || 
                                                        (user.businessNumber && 
                                                         schedule.publisher.businessNumber && 
                                                         user.businessNumber === schedule.publisher.businessNumber && 
                                                         user.level >= 2) ||
                                                        user.level >= 11
                                                    ) ? (
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            onClick={() => handleEditSchedule(schedule)}
                                                            className="me-1"
                                                        >
                                                            <FaEdit className="me-1" />
                                                            수정
                                                        </Button>
                                                    ) : (
                                                        <small className="text-muted">
                                                            수정 권한 없음
                                                        </small>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    {/* 권한이 있는 경우에만 일정 등록 버튼 표시 */}
                    {user && user._id ? (
                        <Button
                            variant="success"
                            onClick={handleAddSchedule}
                            className="ms-auto"
                        >
                            <FaPlus className="me-1" />
                            일정 등록
                        </Button>
                    ) : (
                        <div className="ms-auto text-muted">
                            <small>일정 등록을 위해서는 로그인이 필요합니다.</small>
                        </div>
                    )}
                    <Button variant="secondary" onClick={onHide}>
                        닫기
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 일정 등록/수정 모달 */}
            <ScheduleRegistrationModal
                showModal={showScheduleModal}
                onHide={handleScheduleModalClose}
                editingSchedule={editingSchedule}
                onSuccess={handleScheduleSuccess}
                user={user}
                preSelectedCustomers={customer ? [customer._id] : []} // 현재 고객을 미리 선택
            />
        </>
    );
};

export default CustomerScheduleHistoryModal; 