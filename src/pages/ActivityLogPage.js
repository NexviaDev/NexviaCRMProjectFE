import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Container, Row, Col, Card, Badge, Form, Button, Alert, Spinner, Modal, Table, ListGroup, ToggleButton } from 'react-bootstrap';
import { FaHistory, FaSearch, FaUser, FaHome, FaFileAlt, FaSync, FaTimes, FaInfoCircle, FaExclamationTriangle, FaChevronLeft, FaChevronRight, FaAngleDoubleLeft, FaAngleDoubleRight, FaSignInAlt, FaMapMarkerAlt } from 'react-icons/fa';
import api from '../utils/api';
import { UserContext } from '../components/UserContext';
import SubscriptionAlert from '../components/SubscriptionAlert';

const ActivityLogPage = () => {
    const { user } = useContext(UserContext);
    const [filteredActivities, setFilteredActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 구독 상태 확인 함수
    const checkSubscriptionAccess = (user) => {
        if (!user) return false;
        
        // 구독 상태가 'active'인 경우 접근 허용
        if (user.subscriptionStatus === 'active') {
            return true;
        }
        
        // 무료 체험 중인 경우 접근 허용
        if (user.freeTrialUsed && user.freeTrialStartDate && user.freeTrialEndDate) {
            const now = new Date();
            const trialStart = new Date(user.freeTrialStartDate);
            const trialEnd = new Date(user.freeTrialEndDate);
            
            if (now >= trialStart && now <= trialEnd) {
                return true;
            }
        }
        
        return false;
    };
    const [pagination, setPagination] = useState({
        current: 1,
        pages: 1,
        total: 0,
        hasNext: false,
        hasPrev: false
    });
    const [filters, setFilters] = useState({
        searchTerm: '',
        employeeName: '',
        companyOnly: true  // 기본값을 회사 전체로 설정
    });
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // 금액 포맷팅 함수
    const formatCurrency = (value) => {
        if (!value) return '0';
        return parseInt(value).toLocaleString();
    };

    // 활동 카테고리 정의
    const activityCategories = {
        'property': { label: '매물 관리', color: 'primary', icon: <FaHome /> },
        'customer': { label: '고객 관리', color: 'success', icon: <FaUser /> },
        'contract': { label: '계약 관리', color: 'warning', icon: <FaFileAlt /> },
        'system': { label: '시스템', color: 'info', icon: <FaHistory /> },
        'schedule': { label: '일정 관리', color: 'secondary', icon: <FaFileAlt /> },
        'payment': { label: '결제 관리', color: 'danger', icon: <FaFileAlt /> }
    };

    // API에서 활동 로그 데이터 가져오기
    const fetchActivityLogs = useCallback(async (page = 1, searchFilters = {}) => {
        try {
            setLoading(true);
            setError(null);

            // 필터 매핑: 프론트엔드 필터명을 백엔드 필터명으로 변환
            const mappedFilters = {
                page: page.toString(),
                limit: itemsPerPage.toString(),
                type: 'all',
                searchTerm: searchFilters.searchTerm || '',
                employeeName: searchFilters.employeeName || '',
                companyOnly: searchFilters.companyOnly ? 'true' : 'false'
            };

            const params = new URLSearchParams(mappedFilters);
            const requestUrl = `/activity-logs?${params}`;
            

            const response = await api.get(requestUrl);


            if (response.data.success) {
                setFilteredActivities(response.data.data.activities);
                setPagination(response.data.data.pagination);
            } else {
                throw new Error(response.data.message || '활동 로그를 가져오는데 실패했습니다.');
            }
        } catch (error) {
            console.error('Fetch activity logs error:', error);
            setError(error.response?.data?.message || error.message || '활동 로그를 불러오는데 실패했습니다.');
            setFilteredActivities([]);
        } finally {
            setLoading(false);
        }
    }, [itemsPerPage]);

    useEffect(() => {
        if (user) {
            fetchActivityLogs(1, filters);
        }
    }, [filters, user, fetchActivityLogs, itemsPerPage]);

    // 필터 변경 핸들러
    const handleFilterChange = (field, value) => {
        const newFilters = {
            ...filters,
            [field]: value
        };
        setFilters(newFilters);
    };

    // 페이지당 항목 수 변경 핸들러
    const handleItemsPerPageChange = (value) => {
        setItemsPerPage(parseInt(value));
        // 페이지당 항목 수가 변경되면 첫 페이지로 이동
        setPagination(prev => ({
            ...prev,
            current: 1
        }));
    };

    // 새로고침 핸들러
    const handleRefresh = () => {
        fetchActivityLogs(pagination.current, filters);
    };

    // 페이지 변경 핸들러
    const handlePageChange = (pageNumber, event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        fetchActivityLogs(pageNumber, filters);
    };

    const handleFirstPage = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        fetchActivityLogs(1, filters);
    };

    const handleLastPage = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        fetchActivityLogs(pagination.pages, filters);
    };

    const handlePrevPage = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const newPage = Math.max(pagination.current - 1, 1);
        fetchActivityLogs(newPage, filters);
    };

    const handleNextPage = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const newPage = Math.min(pagination.current + 1, pagination.pages);
        fetchActivityLogs(newPage, filters);
    };

    // 페이지 번호 생성 함수
    const getPageNumbers = () => {
        const totalPages = pagination.pages;
        const currentPage = pagination.current;
        const delta = 2; // 현재 페이지 앞뒤로 보여줄 페이지 수
        const range = [];
        const rangeWithDots = [];

        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, '...');
        } else {
            rangeWithDots.push(1);
        }

        rangeWithDots.push(...range);

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push('...', totalPages);
        } else if (totalPages > 1) {
            rangeWithDots.push(totalPages);
        }

        return rangeWithDots;
    };

    // 상세보기 모달 열기
    const handleShowDetail = (activity) => {
        setSelectedActivity(activity);
        setShowDetailModal(true);
    };

    // 상세보기 모달 닫기
    const handleCloseDetail = () => {
        setSelectedActivity(null);
        setShowDetailModal(false);
    };

    // 상세 정보 렌더링 함수
    const renderDetails = (details, activityType) => {
        if (!details || Object.keys(details).length === 0) {
            return <p className="text-muted">상세 정보가 없습니다.</p>;
        }

        // 로그인 관련 활동의 경우 특별 처리
        if (activityType === 'system' && details.loginMethod) {
            return (
                <div>
                    <Row className="mb-3">
                        <Col md={6}>
                            <strong>로그인 방법:</strong>
                            <Badge bg="info" className="ms-1">{details.loginMethod}</Badge>
                        </Col>
                        <Col md={6}>
                            <strong>위치 소스:</strong>
                            <Badge bg={details.locationSource === 'geolocation' ? 'success' : 
                                     details.locationSource === 'ip_geolocation' ? 'warning' : 'secondary'} 
                                   className="ms-1">
                                {details.locationSource === 'geolocation' ? 'GPS' : 
                                 details.locationSource === 'ip_geolocation' ? 'IP 기반' : 
                                 details.locationSource === 'not_supported' ? '미지원' : '없음'}
                            </Badge>
                        </Col>
                    </Row>
                    
                    
                    {details.locationName && (
                        <Row className="mb-3">
                            <Col md={12}>
                                <strong>지역:</strong> 
                                <Badge bg="primary" className="ms-1">
                                    <FaMapMarkerAlt className="me-1" />
                                    {details.locationName}
                                </Badge>
                            </Col>
                        </Row>
                    )}
                    
                    {details.fullAddress && (
                        <Row className="mb-3">
                            <Col md={12}>
                                <strong>상세 주소:</strong> 
                                <small className="text-muted ms-1">{details.fullAddress}</small>
                            </Col>
                        </Row>
                    )}
                    
                    {details.ipAddress && (
                        <Row className="mb-3">
                            <Col md={12}>
                                <strong>IP 주소:</strong> {details.ipAddress}
                            </Col>
                        </Row>
                    )}
                    
                    <Row className="mb-3">
                        <Col md={12}>
                            <div className="alert alert-info mb-0">
                                <small>
                                    <strong>보안 정보:</strong> 로그인 활동이 기록되었습니다. 
                                    {details.locationSource === 'geolocation' ? 'GPS 기반 지역 정보가 수집되었습니다.' :
                                     details.locationSource === 'ip_geolocation' ? 'IP 기반 지역 정보가 수집되었습니다.' :
                                     '위치 정보는 수집되지 않았습니다.'}
                                </small>
                            </div>
                        </Col>
                    </Row>
                </div>
            );
        }

        // CSV 일괄등록의 경우 특별 처리
        if (activityType === 'customer' && details.successCustomers) {
            return (
                <div>
                    <Row className="mb-3">
                        <Col md={4}>
                            <strong>총 등록 시도:</strong> {details.totalCount}명
                        </Col>
                        <Col md={4}>
                            <strong>성공:</strong>
                            <Badge bg="success" className="ms-1">{details.successCount}명</Badge>
                        </Col>
                        <Col md={4}>
                            <strong>실패:</strong>
                            <Badge bg="danger" className="ms-1">{details.failedCount}명</Badge>
                        </Col>
                    </Row>

                    {details.successCustomers && details.successCustomers.length > 0 && (
                        <div className="mb-3">
                            <h6>성공한 고객 목록:</h6>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                <Table striped bordered hover size="sm">
                                    <thead>
                                        <tr>
                                            <th>이름</th>
                                            <th>타입</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {details.successCustomers.slice(0, 20).map((customer, index) => (
                                            <tr key={`success-customer-${customer.name}-${index}`}>
                                                <td>{customer.name}</td>
                                                <td>{customer.type}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                                {details.successCustomers.length > 20 && (
                                    <p className="text-muted small">
                                        ... 외 {details.successCustomers.length - 20}명 더
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {details.failedCustomers && details.failedCustomers.length > 0 && (
                        <div>
                            <h6>실패한 고객 목록:</h6>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                <ListGroup>
                                    {details.failedCustomers.map((failed, index) => (
                                        <ListGroup.Item key={`failed-customer-${failed.name}-${index}`} variant="danger">
                                            <strong>{failed.name}</strong>: {failed.error}
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // 계약 관리의 경우 특별 처리
        if (activityType === 'contract') {
            return (
                <div>
                    <Row className="mb-3">
                        <Col md={6}>
                            <strong>계약 유형:</strong> {details.type || 'N/A'}
                        </Col>
                        <Col md={6}>
                            <strong>계약 상태:</strong>
                            <Badge bg={details.status === '완료' ? 'success' : 'warning'} className="ms-1">
                                {details.status || 'N/A'}
                            </Badge>
                        </Col>
                    </Row>
                    {details.contractNumber && (
                        <Row className="mb-3">
                            <Col md={12}>
                                <strong>계약 번호:</strong> {details.contractNumber}
                            </Col>
                        </Row>
                    )}
                    {details.contractAmount && (
                        <Row className="mb-3">
                            <Col md={6}>
                                <strong>계약 금액:</strong> {formatCurrency(details.contractAmount)}원
                            </Col>
                            <Col md={6}>
                                <strong>계약일:</strong> {details.contractDate ? new Date(details.contractDate).toLocaleDateString('ko-KR') : 'N/A'}
                            </Col>
                        </Row>
                    )}
                    {details.buyer && (
                        <Row className="mb-3">
                            <Col md={6}>
                                <strong>구매자:</strong> {details.buyer.name || details.buyer}
                            </Col>
                            <Col md={6}>
                                <strong>판매자:</strong> {details.seller?.name || details.seller || 'N/A'}
                            </Col>
                        </Row>
                    )}
                    {details.property && (
                        <Row className="mb-3">
                            <Col md={12}>
                                <strong>매물:</strong> {details.property.title || details.property}
                            </Col>
                        </Row>
                    )}
                    {details.agent && (
                        <Row className="mb-3">
                            <Col md={12}>
                                <strong>담당자:</strong> {details.agent.name || details.agent}
                            </Col>
                        </Row>
                    )}
                    {details.notes && (
                        <Row className="mb-3">
                            <Col md={12}>
                                <strong>비고:</strong> {details.notes}
                            </Col>
                        </Row>
                    )}
                    {/* 매물 정보 표시 */}
                    {details.property && (
                        <Row className="mb-3">
                            <Col md={12}>
                                <strong>매물:</strong> {details.property.title || details.property}
                                {details.property.address && (
                                    <div className="text-muted small">{details.property.address}</div>
                                )}
                            </Col>
                        </Row>
                    )}

                    {/* 매수자/매도자 정보 표시 */}
                    {(details.buyer || details.seller) && (
                        <Row className="mb-3">
                            <Col md={6}>
                                <strong>매수자:</strong>
                                {details.buyer ? (
                                    <div>
                                        {details.buyer.name || details.buyer}
                                        {details.buyer.phone && (
                                            <div className="text-muted small">{details.buyer.phone}</div>
                                        )}
                                    </div>
                                ) : 'N/A'}
                            </Col>
                            <Col md={6}>
                                <strong>매도자:</strong>
                                {details.seller ? (
                                    <div>
                                        {details.seller.name || details.seller}
                                        {details.seller.phone && (
                                            <div className="text-muted small">{details.seller.phone}</div>
                                        )}
                                    </div>
                                ) : 'N/A'}
                            </Col>
                        </Row>
                    )}

                    {/* ID만 있는 경우 표시 (기존 데이터 호환성) */}
                    {(details.buyerId || details.sellerId || details.propertyId) &&
                        !details.buyer && !details.seller && !details.property && (
                            <Row className="mb-3">
                                <Col md={12}>
                                    <strong>관련 정보:</strong>
                                    <div className="mt-2">
                                        {details.propertyId && (
                                            <div><strong>매물 ID:</strong> {details.propertyId}</div>
                                        )}
                                        {details.buyerId && (
                                            <div><strong>매수자 ID:</strong> {details.buyerId}</div>
                                        )}
                                        {details.sellerId && (
                                            <div><strong>매도자 ID:</strong> {details.sellerId}</div>
                                        )}
                                    </div>
                                </Col>
                            </Row>
                        )}
                    {details.reason && (
                        <Row className="mb-3">
                            <Col md={12}>
                                <strong>삭제 사유:</strong> {details.reason}
                            </Col>
                        </Row>
                    )}
                </div>
            );
        }

        // 매물 선택/제거의 경우 특별 처리
        if (activityType === 'customer' && (details.propertyId || details.propertyTitle)) {
            return (
                <div>
                    <Row className="mb-3">
                        <Col md={6}>
                            <strong>매물명:</strong> {details.propertyTitle}
                        </Col>
                        <Col md={6}>
                            <strong>매물 유형:</strong>
                            <Badge bg="info" className="ms-1">{details.propertyType}</Badge>
                        </Col>
                    </Row>
                    {details.propertyAddress && (
                        <Row className="mb-3">
                            <Col md={12}>
                                <strong>매물 주소:</strong> {details.propertyAddress}
                            </Col>
                        </Row>
                    )}
                    <Row className="mb-3">
                        <Col md={6}>
                            <strong>고객명:</strong> {details.customerName}
                        </Col>
                        <Col md={6}>
                            <strong>고객 ID:</strong> {details.customerId}
                        </Col>
                    </Row>
                </div>
            );
        }

        // 일괄삭제의 경우 특별 처리
        if (activityType === 'customer' && details.deletedCount !== undefined) {
            return (
                <div>
                    <Row className="mb-3">
                        <Col md={4}>
                            <strong>요청된 삭제:</strong> {details.requestedCount}명
                        </Col>
                        <Col md={4}>
                            <strong>실제 삭제:</strong>
                            <Badge bg="success" className="ms-1">{details.deletedCount}명</Badge>
                        </Col>
                        <Col md={4}>
                            <strong>건너뛴 수:</strong>
                            <Badge bg="warning" className="ms-1">{details.skippedCount}명</Badge>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <strong>삭제된 일정:</strong> {details.deletedSchedules}개
                        </Col>
                        <Col md={6}>
                            <strong>삭제된 SMS:</strong> {details.deletedSMS}개
                        </Col>
                    </Row>
                    <Row className="mt-2">
                        <Col md={12}>
                            <strong>업데이트된 매물:</strong> {details.updatedProperties}개
                        </Col>
                    </Row>

                    {details.deletedCustomers && details.deletedCustomers.length > 0 && (
                        <div className="mt-3">
                            <h6>삭제된 고객 목록:</h6>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                <Table striped bordered hover size="sm">
                                    <thead>
                                        <tr>
                                            <th>이름</th>
                                            <th>전화번호</th>
                                            <th>타입</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {details.deletedCustomers.slice(0, 20).map((customer, index) => (
                                            <tr key={`deleted-customer-${customer.name}-${index}`}>
                                                <td>{customer.name}</td>
                                                <td>{customer.phone}</td>
                                                <td>
                                                    <Badge bg="secondary">{customer.type}</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                                {details.deletedCustomers.length > 20 && (
                                    <p className="text-muted small">
                                        ... 외 {details.deletedCustomers.length - 20}명 더
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // 매물 소유자 변경의 경우 특별 처리
        if (activityType === 'property' && details.oldOwner && details.newOwner) {
            return (
                <div>
                    <Row className="mb-3">
                        <Col md={6}>
                            <strong>매물명:</strong> {details.propertyTitle}
                        </Col>
                        <Col md={6}>
                            <strong>매물 유형:</strong>
                            <Badge bg="info" className="ms-1">{details.propertyType}</Badge>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={6}>
                            <strong>이전 소유자:</strong> {details.oldOwner}
                        </Col>
                        <Col md={6}>
                            <strong>새 소유자:</strong>
                            <Badge bg="success" className="ms-1">{details.newOwner}</Badge>
                        </Col>
                    </Row>
                    {details.customerId && (
                        <Row className="mb-3">
                            <Col md={6}>
                                <strong>고객 ID:</strong> {details.customerId}
                            </Col>
                            <Col md={6}>
                                <strong>고객 연락처:</strong> {details.customerPhone}
                            </Col>
                        </Row>
                    )}
                </div>
            );
        }

        // 매물 수정의 경우 변경 사항 특별 처리
        if (activityType === 'property' && details.changes) {
            return (
                <div>
                    <Row className="mb-3">
                        <Col md={6}>
                            <strong>수정된 필드 수:</strong> {details.changeCount}개
                        </Col>
                        <Col md={6}>
                            <strong>수정된 필드:</strong>
                            <div className="mt-1">
                                {details.updatedFields?.map((field, index) => (
                                    <Badge key={`updated-field-${field}-${index}`} bg="info" className="me-1">
                                        {formatDetailKey(field)}
                                    </Badge>
                                ))}
                            </div>
                        </Col>
                    </Row>

                    <hr />

                    <h6>변경 사항 상세:</h6>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {Object.entries(details.changes).map(([field, change]) => (
                            <Card key={field} className="mb-2 border-primary">
                                <Card.Header className="py-2">
                                    <strong>{formatDetailKey(field)}</strong>
                                </Card.Header>
                                <Card.Body className="py-2">
                                    <Row>
                                        <Col md={6}>
                                            <small className="text-muted">이전 값:</small>
                                            <div className="bg-light p-2 rounded">
                                                {Array.isArray(change.from) ? (
                                                    change.from.map((item, index) => (
                                                        <Badge key={`from-${item}-${index}`} bg="secondary" className="me-1">
                                                            {item}
                                                        </Badge>
                                                    ))
                                                ) : typeof change.from === 'object' ? (
                                                    <pre className="small mb-0">{JSON.stringify(change.from, null, 2)}</pre>
                                                ) : (
                                                    <span>{change.from || '없음'}</span>
                                                )}
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <small className="text-muted">새로운 값:</small>
                                            <div className="bg-success bg-opacity-10 p-2 rounded">
                                                {Array.isArray(change.to) ? (
                                                    change.to.map((item, index) => (
                                                        <Badge key={`to-${item}-${index}`} bg="success" className="me-1">
                                                            {item}
                                                        </Badge>
                                                    ))
                                                ) : typeof change.to === 'object' ? (
                                                    <pre className="small mb-0">{JSON.stringify(change.to, null, 2)}</pre>
                                                ) : (
                                                    <span>{change.to || '없음'}</span>
                                                )}
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        ))}
                    </div>
                </div>
            );
        }

        // 일반적인 상세 정보 렌더링
        return (
            <div>
                {Object.entries(details).map(([key, value]) => (
                    <Row key={key} className="mb-2">
                        <Col md={4}>
                            <strong>{formatDetailKey(key)}:</strong>
                        </Col>
                        <Col md={8}>
                            {Array.isArray(value) ? (
                                <div>
                                    {value.map((item, index) => (
                                        <Badge key={`generic-item-${item}-${index}`} bg="secondary" className="me-1">
                                            {typeof item === 'object' ? JSON.stringify(item) : item}
                                        </Badge>
                                    ))}
                                </div>
                            ) : typeof value === 'object' ? (
                                <pre className="small bg-light p-2 rounded">
                                    {JSON.stringify(value, null, 2)}
                                </pre>
                            ) : (
                                <span>{value}</span>
                            )}
                        </Col>
                    </Row>
                ))}
            </div>
        );
    };

    // 상세 정보 키 포맷팅
    const formatDetailKey = (key) => {
        const keyMap = {
            'totalCount': '총 수',
            'successCount': '성공 수',
            'failedCount': '실패 수',
            'successCustomers': '성공한 고객',
            'failedCustomers': '실패한 고객',
            'requestedCount': '요청 수',
            'deletedCount': '삭제 수',
            'skippedCount': '건너뛴 수',
            'deletedSchedules': '삭제된 일정',
            'deletedSMS': '삭제된 SMS',
            'updatedProperties': '업데이트된 매물',
            'deletedCustomers': '삭제된 고객',
            'updatedFields': '수정된 필드',
            'changes': '변경 사항',
            'changeCount': '변경된 필드 수',
            'type': '타입',
            'price': '가격',
            'deposit': '보증금',
            'area': '면적',
            'address': '주소',
            'detailedAddress': '상세주소',
            'status': '상태',
            'title': '매물명',
            'rooms': '방 수',
            'bathrooms': '욕실 수',
            'specialNotes': '특이사항',
            'parking': '주차',
            'pets': '반려동물',
            'elevator': '엘리베이터',
            'contractPeriod': '계약기간',
            'phone': '전화번호',
            'email': '이메일',
            'contractAmount': '계약금액',
            'depositAmount': '보증금액',
            'contractDate': '계약일',
            'reason': '사유',
            'propertyId': '매물 ID',
            'buyerId': '매수자 ID',
            'sellerId': '매도자 ID',
            'contractNumber': '계약번호',
            'propertyTitle': '매물명',
            'propertyType': '매물 유형',
            'propertyAddress': '매물 주소',
            'oldOwner': '이전 소유자',
            'newOwner': '새 소유자',
            'customerName': '고객명',
            'customerId': '고객 ID',
            'customerPhone': '고객 연락처',
            'selectedPropertiesCount': '선택된 매물 수',
            'isEdit': '수정 여부'
        };
        return keyMap[key] || key;
    };


    const formatDate = (date) => {
        try {
            // 날짜가 문자열인 경우 Date 객체로 변환
            const dateObj = typeof date === 'string' ? new Date(date) : date;

            // 유효한 날짜인지 확인
            if (isNaN(dateObj.getTime())) {
                return '날짜 정보 없음';
            }

            return new Intl.DateTimeFormat('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }).format(dateObj);
        } catch (error) {
            console.error('Date formatting error:', error);
            return '날짜 정보 없음';
        }
    };

    const getRelativeTime = (date) => {
        try {
            // 날짜가 문자열인 경우 Date 객체로 변환
            const dateObj = typeof date === 'string' ? new Date(date) : date;

            // 유효한 날짜인지 확인
            if (isNaN(dateObj.getTime())) {
                return '시간 정보 없음';
            }

            const now = new Date();
            const diffInMinutes = Math.floor((now - dateObj) / (1000 * 60));

            if (diffInMinutes < 1) return '방금 전';
            if (diffInMinutes < 60) return `${diffInMinutes}분 전`;

            const diffInHours = Math.floor(diffInMinutes / 60);
            if (diffInHours < 24) return `${diffInHours}시간 전`;

            const diffInDays = Math.floor(diffInHours / 24);
            if (diffInDays < 7) return `${diffInDays}일 전`;

            return formatDate(dateObj);
        } catch (error) {
            console.error('Relative time calculation error:', error);
            return '시간 정보 없음';
        }
    };

    if (loading) {
        return (
            <Container className="mt-5 pt-5">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">로딩 중...</span>
                    </div>
                </div>
            </Container>
        );
    }

    // 구독 상태 확인
    if (!checkSubscriptionAccess(user)) {
        return <SubscriptionAlert user={user} />;
    }

    return (
        <Container className="mt-5 pt-5">
            <Row>
                <Col>
                    <div className="d-flex align-items-center mb-4">
                        <FaHistory className="me-3" style={{ color: '#519ced', fontSize: '2rem' }} />
                        <div>
                            <h2 className="mb-0">활동기록</h2>
                            <p className="text-muted mb-0">시스템 내 모든 활동 내역을 확인할 수 있습니다.</p>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* 필터 섹션 */}
            <Row className="mb-4">
                <Col>
                    <Card className="shadow-sm">
                        <Card.Body>
                            <Row className="align-items-end">
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label><FaSearch className="me-2" />검색</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="활동 내용, 사용자명, 로그인 방법으로 검색..."
                                            value={filters.searchTerm}
                                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label><FaUser className="me-2" />직원명</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="직원 이름으로 검색..."
                                            value={filters.employeeName}
                                            onChange={(e) => handleFilterChange('employeeName', e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label><FaUser className="me-2" />개인 활동기록</Form.Label>
                                        <ToggleButton
                                            id="toggle-personal-only"
                                            type="checkbox"
                                            variant={!filters.companyOnly ? "primary" : "outline-secondary"}
                                            checked={!filters.companyOnly}
                                            value="1"
                                            onChange={(e) => handleFilterChange('companyOnly', !e.currentTarget.checked)}
                                            className="w-100"
                                        >
                                            {!filters.companyOnly ? "개인만 보기" : "개인만 보기"}
                                        </ToggleButton>
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label>페이지당</Form.Label>
                                        <Form.Select
                                            value={itemsPerPage}
                                            onChange={(e) => handleItemsPerPageChange(e.target.value)}
                                        >
                                            <option value={10}>10개</option>
                                            <option value={20}>20개</option>
                                            <option value={50}>50개</option>
                                            <option value={100}>100개</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={1}>
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => {
                                            setFilters({ searchTerm: '', employeeName: '', companyOnly: true });
                                            setItemsPerPage(10);
                                            fetchActivityLogs(1, { searchTerm: '', employeeName: '', companyOnly: true });
                                        }}
                                        className="w-100"
                                        title="필터 초기화"
                                    >
                                        <FaTimes />
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* 활동 목록 */}
            <Row>
                <Col>
                    <Card className="shadow-sm">
                        <Card.Header className="bg-light">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">활동 내역 ({pagination.total}건)</h5>
                                <div className="d-flex align-items-center gap-2">
                                    <Badge bg="primary">{pagination.total}</Badge>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={handleRefresh}
                                        disabled={loading}
                                    >
                                        <FaSync className={loading ? 'fa-spin' : ''} />
                                    </Button>
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" variant="primary" />
                                    <p className="mt-3 text-muted">활동 내역을 불러오는 중...</p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-5">
                                    <Alert variant="danger">
                                        <FaHistory className="mb-2" />
                                        <h5>오류가 발생했습니다</h5>
                                        <p>{error}</p>
                                        <Button variant="outline-danger" onClick={handleRefresh}>
                                            다시 시도
                                        </Button>
                                    </Alert>
                                </div>
                            ) : filteredActivities.length === 0 ? (
                                <div className="text-center py-5">
                                    <FaHistory className="text-muted mb-3" style={{ fontSize: '3rem' }} />
                                    <h5 className="text-muted">활동 내역이 없습니다</h5>
                                    <p className="text-muted">선택한 조건에 맞는 활동이 없습니다.</p>
                                </div>
                            ) : (
                                <div className="activity-timeline">
                                    {filteredActivities.map((activity, index) => (
                                        <div
                                            key={activity.id || `activity-${index}`}
                                            className="activity-item"
                                            onClick={() => handleShowDetail(activity)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="d-flex">
                                                <div className="activity-icon me-3">
                                                    <div
                                                        className={`rounded-circle d-flex align-items-center justify-content-center text-white`}
                                                        style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            backgroundColor: `var(--bs-${activityCategories[activity.type].color})`
                                                        }}
                                                    >
                                                        {/* 로그인 활동인 경우 특별한 아이콘 표시 */}
                                                        {activity.type === 'system' && activity.action === '로그인' ? (
                                                            <FaSignInAlt />
                                                        ) : (
                                                            activityCategories[activity.type].icon
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="activity-content flex-grow-1">
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <div>
                                                            <h6 className="mb-1">{activity.action}</h6>
                                                            <p className="text-muted mb-1">{activity.description}</p>
                                                        </div>
                                                        <div className="text-end">
                                                            <small className="text-muted">{activity.relativeTime || getRelativeTime(activity.timestamp)}</small>
                                                            <div className="mt-1">
                                                                <Badge
                                                                    bg={activityCategories[activity.type]?.color || 'secondary'}
                                                                    className="me-1"
                                                                >
                                                                    {activityCategories[activity.type]?.label || activity.type}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div className="d-flex align-items-center">
                                                            <small className="text-muted me-3">
                                                                <FaUser className="me-1" />
                                                                {activity.userName || activity.user}
                                                            </small>
                                                            {/* 로그인 활동인 경우 위치 정보 표시 */}
                                                            {activity.type === 'system' && activity.action === '로그인' && activity.details && (
                                                                <small className="text-muted">
                                                                    <FaMapMarkerAlt className="me-1" />
                                                                    {activity.details.locationSource === 'geolocation' ? 'GPS 위치' :
                                                                     activity.details.locationSource === 'ip_geolocation' ? 'IP 위치' :
                                                                     '위치 없음'}
                                                                </small>
                                                            )}
                                                        </div>
                                                        <small className="text-muted">
                                                            {activity.timestamp ? formatDate(activity.timestamp) : '날짜 정보 없음'}
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                            {index < filteredActivities.length - 1 && (
                                                <hr className="my-3" style={{ borderColor: '#e9ecef' }} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card.Body>

                        {/* 페이지네이션 */}
                        {!loading && !error && pagination.pages > 1 && (
                            <Card.Footer className="bg-light">
                                <div className="d-flex flex-column align-items-center">

                                    <nav aria-label="활동 로그 페이지네이션">
                                        <ul className="pagination pagination-sm mb-0">
                                            {/* 맨 앞으로 버튼 */}
                                            <li className={`page-item ${pagination.current === 1 ? 'disabled' : ''}`}>
                                                <button
                                                    className="page-link"
                                                    style={{ pointerEvents: 'auto', zIndex: 10 }}
                                                    onClick={(e) => handleFirstPage(e)}
                                                    disabled={pagination.current === 1}
                                                    aria-label="첫 페이지"
                                                >
                                                    <FaAngleDoubleLeft />
                                                </button>
                                            </li>

                                            {/* 이전 버튼 */}
                                            <li className={`page-item ${pagination.current === 1 ? 'disabled' : ''}`}>
                                                <button
                                                    className="page-link"
                                                    style={{ pointerEvents: 'auto', zIndex: 10 }}
                                                    onClick={(e) => handlePrevPage(e)}
                                                    disabled={pagination.current === 1}
                                                    aria-label="이전 페이지"
                                                >
                                                    <FaChevronLeft />
                                                </button>
                                            </li>

                                            {/* 페이지 번호들 */}
                                            {getPageNumbers().map((pageNumber, index) => (
                                                <li
                                                    key={`page-${pageNumber}-${index}`}
                                                    className={`page-item ${pagination.current === pageNumber ? 'active' : ''} ${pageNumber === '...' ? 'disabled' : ''}`}
                                                >
                                                    {pageNumber === '...' ? (
                                                        <span className="page-link">...</span>
                                                    ) : (
                                                        <button
                                                            className="page-link"
                                                            style={{ pointerEvents: 'auto', zIndex: 10 }}
                                                            onClick={() => handlePageChange(pageNumber)}
                                                        >
                                                            {pageNumber}
                                                        </button>
                                                    )}
                                                </li>
                                            ))}

                                            {/* 다음 버튼 */}
                                            <li className={`page-item ${pagination.current === pagination.pages ? 'disabled' : ''}`}>
                                                <button
                                                    className="page-link"
                                                    style={{ pointerEvents: 'auto', zIndex: 10 }}
                                                    onClick={(e) => handleNextPage(e)}
                                                    disabled={pagination.current === pagination.pages}
                                                    aria-label="다음 페이지"
                                                >
                                                    <FaChevronRight />
                                                </button>
                                            </li>

                                            {/* 맨 뒤로 버튼 */}
                                            <li className={`page-item ${pagination.current === pagination.pages ? 'disabled' : ''}`}>
                                                <button
                                                    className="page-link"
                                                    style={{ pointerEvents: 'auto', zIndex: 10 }}
                                                    onClick={(e) => handleLastPage(e)}
                                                    disabled={pagination.current === pagination.pages}
                                                    aria-label="마지막 페이지"
                                                >
                                                    <FaAngleDoubleRight />
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                    <small className="text-muted mb-3">
                                        {pagination.current} / {pagination.pages} 페이지 (총 {pagination.total}건, 페이지당 {itemsPerPage}개)
                                    </small>
                                </div>
                            </Card.Footer>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* 상세보기 모달 */}
            <Modal show={showDetailModal} onHide={handleCloseDetail} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FaInfoCircle className="me-2" />
                        활동 상세 정보
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedActivity && (
                        <div>
                            {/* 기본 정보 */}
                            <Card className="mb-3">
                                <Card.Header className="bg-light">
                                    <h6 className="mb-0">기본 정보</h6>
                                </Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={6}>
                                            <strong>활동 타입:</strong>
                                            <Badge
                                                bg={activityCategories[selectedActivity.type]?.color || 'secondary'}
                                                className="ms-2"
                                            >
                                                {activityCategories[selectedActivity.type]?.label || selectedActivity.type}
                                            </Badge>
                                        </Col>
                                        <Col md={6}>
                                            <strong>상태:</strong>
                                            <Badge
                                                bg={selectedActivity.status === 'success' ? 'success' : selectedActivity.status === 'error' ? 'danger' : 'warning'}
                                                className="ms-2"
                                            >
                                                {selectedActivity.status === 'success' ? '성공' : selectedActivity.status === 'error' ? '오류' : '경고'}
                                            </Badge>
                                        </Col>
                                    </Row>
                                    <hr />
                                    <Row>
                                        <Col md={6}>
                                            <strong>액션:</strong> {selectedActivity.action}
                                        </Col>
                                        <Col md={6}>
                                            <strong>우선순위:</strong> {selectedActivity.priority}/4
                                        </Col>
                                    </Row>
                                    <hr />
                                    <Row>
                                        <Col md={12}>
                                            <strong>설명:</strong>
                                            <p className="mt-1 mb-0">{selectedActivity.description}</p>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>

                            {/* 사용자 정보 */}
                            <Card className="mb-3">
                                <Card.Header className="bg-light">
                                    <h6 className="mb-0">사용자 정보</h6>
                                </Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={6}>
                                            <strong>사용자:</strong> {selectedActivity.userName}
                                        </Col>
                                        <Col md={6}>
                                            <strong>시간:</strong> {formatDate(selectedActivity.timestamp)}
                                        </Col>
                                    </Row>
                                    {selectedActivity.ipAddress && (
                                        <Row className="mt-2">
                                            <Col md={6}>
                                                <strong>IP 주소:</strong> {selectedActivity.ipAddress}
                                            </Col>
                                        </Row>
                                    )}
                                </Card.Body>
                            </Card>

                            {/* 관련 엔티티 정보 */}
                            {selectedActivity.relatedEntity && (
                                <Card className="mb-3">
                                    <Card.Header className="bg-light">
                                        <h6 className="mb-0">관련 엔티티</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <Row>
                                            <Col md={6}>
                                                <strong>타입:</strong> {selectedActivity.relatedEntity.type}
                                            </Col>
                                            <Col md={6}>
                                                <strong>이름:</strong> {selectedActivity.relatedEntity.name}
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            )}

                            {/* 상세 정보 */}
                            {selectedActivity.details && Object.keys(selectedActivity.details).length > 0 && (
                                <Card className="mb-3">
                                    <Card.Header className="bg-light">
                                        <h6 className="mb-0">상세 정보</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        {renderDetails(selectedActivity.details, selectedActivity.type)}
                                    </Card.Body>
                                </Card>
                            )}

                            {/* 오류 정보 */}
                            {selectedActivity.errorMessage && (
                                <Card className="mb-3 border-danger">
                                    <Card.Header className="bg-danger text-white">
                                        <h6 className="mb-0">
                                            <FaExclamationTriangle className="me-2" />
                                            오류 정보
                                        </h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <p className="text-danger mb-0">{selectedActivity.errorMessage}</p>
                                    </Card.Body>
                                </Card>
                            )}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseDetail}>
                        <FaTimes className="me-1" />
                        닫기
                    </Button>
                </Modal.Footer>
            </Modal>

            <style>{`
                .activity-timeline {
                    /* max-height와 overflow-y 제거 */
                }
                
                .activity-item {
                    padding: 1rem;
                    transition: all 0.2s ease;
                    border-radius: 8px;
                    margin-bottom: 4px;
                }
                
                .activity-item:hover {
                    background-color: #e3f2fd;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                
                .activity-item:active {
                    transform: translateY(0);
                    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
                }
                
                .activity-icon {
                    flex-shrink: 0;
                }
                
                .activity-content {
                    min-width: 0;
                }
            `}</style>
        </Container>
    );
};

export default ActivityLogPage;
