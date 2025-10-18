import React, { useEffect, useState, useContext } from 'react';
import { Container, Row, Col, Card, Button, Badge, ListGroup, Pagination } from 'react-bootstrap';
import { FaHome, FaUsers, FaFileAlt, FaCalendarAlt, FaChartLine, FaCog, FaPlus, FaSearch, FaMoneyBillWave, FaClock, FaMapMarkerAlt, FaUser, FaHome as FaHomeIcon, FaBuilding } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import ScheduleRegistrationModal from './ScheduleManagement/ScheduleRegistrationModal';
import CompanyInfoModal from './CompanyInfoModal';
import { UserContext } from './UserContext';


const Home = () => {
    const { user } = useContext(UserContext);
    const [isMobile, setIsMobile] = useState(false);
    const [todaySchedules, setTodaySchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [showCompanyInfoModal, setShowCompanyInfoModal] = useState(false);
    const navigate = useNavigate();

    // 실시간 통계 데이터 상태
    const [stats, setStats] = useState({
        totalProperties: 0,
        activeCustomers: 0,
        pendingContracts: 0,
        monthlyRevenue: '0원',
        completedDeals: 0,
        upcomingAppointments: 0
    });

    // 각 통계 카드별 로딩 상태
    const [statsLoading, setStatsLoading] = useState({
        totalProperties: true,
        activeCustomers: true,
        pendingContracts: true,
        monthlyRevenue: true,
        completedDeals: true,
        upcomingAppointments: true
    });

    // 최근 활동 데이터 (실제 스케줄에서 가져옴)
    const [recentActivities, setRecentActivities] = useState([]);

    // 뉴스 데이터
    const [latestNews, setLatestNews] = useState([]);
    const [newsLoading, setNewsLoading] = useState(true);

    // 페이지네이션 상태
    const [todaySchedulesPage, setTodaySchedulesPage] = useState(1);
    const [recentActivitiesPage, setRecentActivitiesPage] = useState(1);
    const itemsPerPage = 3; // 페이지당 아이템 수

    // 페이지네이션 헬퍼 함수들
    const getCurrentPageData = (data, currentPage) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    };

    const getTotalPages = (data) => {
        return Math.ceil(data.length / itemsPerPage);
    };

    // Home.js 전용 페이지네이션 생성 함수
    const createHomePagination = (currentPage, totalPages, onPageChange, keyPrefix) => {
        if (totalPages <= 1) {
            return [];
        }
        
        const items = [];
        
        // 첫 번째 버튼
        items.push(
            <Pagination.Item
                key={`${keyPrefix}-first`}
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
            >
                ≪
            </Pagination.Item>
        );
        
        // 이전 버튼
        items.push(
            <Pagination.Item
                key={`${keyPrefix}-prev`}
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
            >
                ‹
            </Pagination.Item>
        );
        
        // 현재 페이지
        items.push(
            <Pagination.Item
                key={`${keyPrefix}-current`}
                active
            >
                {currentPage}
            </Pagination.Item>
        );
        
        // 다음 버튼
        items.push(
            <Pagination.Item
                key={`${keyPrefix}-next`}
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
            >
                ›
            </Pagination.Item>
        );
        
        // 마지막 버튼
        items.push(
            <Pagination.Item
                key={`${keyPrefix}-last`}
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
            >
                ≫
            </Pagination.Item>
        );

        return items;
    };

    // 통계 데이터 가져오기
    const fetchStats = async () => {
        try {
            // 모든 통계 로딩 상태를 true로 설정
            setStatsLoading({
                totalProperties: true,
                activeCustomers: true,
                pendingContracts: true,
                monthlyRevenue: true,
                completedDeals: true,
                upcomingAppointments: true
            });
            
            // 1. 총 매물 수 가져오기
            const propertiesResponse = await api.get('/properties?limit=1000');
            const totalProperties = propertiesResponse.data.success ? propertiesResponse.data.data.length : 0;
            setStats(prev => ({ ...prev, totalProperties }));
            setStatsLoading(prev => ({ ...prev, totalProperties: false }));

            // 2. 활성 고객 수 가져오기 (매수자 + 매도자)
            const buyersResponse = await api.get('/customers?type=매수자&status=활성&limit=1000');
            const sellersResponse = await api.get('/customers?type=매도자&status=활성&limit=1000');
            const activeCustomers = (buyersResponse.data.success ? buyersResponse.data.data.length : 0) + 
                                  (sellersResponse.data.success ? sellersResponse.data.data.length : 0);
            setStats(prev => ({ ...prev, activeCustomers }));
            setStatsLoading(prev => ({ ...prev, activeCustomers: false }));

            // 3. 진행 중인 계약 수 가져오기
            const contractsResponse = await api.get('/contracts?status=진행중&limit=1000');
            const pendingContracts = contractsResponse.data.success ? contractsResponse.data.data.length : 0;
            setStats(prev => ({ ...prev, pendingContracts }));
            setStatsLoading(prev => ({ ...prev, pendingContracts: false }));

            // 4. 완료된 거래 수 가져오기
            const completedContractsResponse = await api.get('/contracts?status=완료&limit=1000');
            const completedDeals = completedContractsResponse.data.success ? completedContractsResponse.data.data.length : 0;
            setStats(prev => ({ ...prev, completedDeals }));
            setStatsLoading(prev => ({ ...prev, completedDeals: false }));

            // 5. 월 매출 계산 (이번 달 완료된 계약들의 수수료 합계)
            // SalesManagement.js와 동일한 방식으로 모든 계약을 가져온 후 필터링
            const allContractsResponse = await api.get('/contracts?limit=1000');
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            
            let monthlyRevenue = 0;
            if (allContractsResponse.data.success && allContractsResponse.data.data.length > 0) {
                // 이번 달에 체결된 완료된 계약들만 필터링
                const thisMonthCompletedContracts = allContractsResponse.data.data.filter(contract => {
                    // 완료된 계약만
                    if (contract.status !== '완료') {
                        return false;
                    }
                    
                    // 계약 날짜가 있는지 확인
                    if (!contract.contractDate) {
                        return false;
                    }
                    
                    try {
                        const contractDate = new Date(contract.contractDate);
                        const contractMonth = contractDate.getMonth() + 1;
                        const contractYear = contractDate.getFullYear();
                        
                        return contractMonth === currentMonth && contractYear === currentYear;
                    } catch (error) {
                        return false;
                    }
                });
                
                monthlyRevenue = thisMonthCompletedContracts.reduce((sum, contract) => {
                    return sum + (contract.commission || 0);
                }, 0);
            }
            
            setStats(prev => ({ 
                ...prev, 
                monthlyRevenue: monthlyRevenue > 0 ? `${monthlyRevenue.toLocaleString()}원` : '0원' 
            }));
            setStatsLoading(prev => ({ ...prev, monthlyRevenue: false }));

            // 6. 예정 일정 수 가져오기 (오늘 이후)
            const today = new Date().toISOString().split('T')[0];
            const upcomingSchedulesResponse = await api.get(`/schedules?startDate=${today}&status=예정&limit=1000`);
            const upcomingAppointments = upcomingSchedulesResponse.data.success ? upcomingSchedulesResponse.data.data.length : 0;
            setStats(prev => ({ ...prev, upcomingAppointments }));
            setStatsLoading(prev => ({ ...prev, upcomingAppointments: false }));

        } catch (error) {
            console.error('통계 데이터 조회 오류:', error);
            // 오류 발생 시 모든 로딩 상태를 false로 설정
            setStatsLoading({
                totalProperties: false,
                activeCustomers: false,
                pendingContracts: false,
                monthlyRevenue: false,
                completedDeals: false,
                upcomingAppointments: false
            });
        }
    };

    // 오늘의 스케줄 가져오기 (본인 일정만)
    const fetchTodaySchedules = async () => {
        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];

            // 본인 일정만 조회하기 위해 publisher 파라미터 추가
            const response = await api.get(`/schedules?startDate=${today}&endDate=${today}&limit=10&publisher=${user._id}`);

            if (response.data.success) {
                setTodaySchedules(response.data.data);
            }
        } catch (error) {
            console.error('오늘의 스케줄 조회 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    // 최근 활동 가져오기 (모든 사용자)
    const fetchRecentActivities = async () => {
        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];

            // 현재 날짜부터 이전 날짜로 조회 (최근 30일)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const startDate = thirtyDaysAgo.toISOString().split('T')[0];

            // 진행중과 완료 상태만 조회 (최대 3개) - 오늘 제외하고 전날부터
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const response = await api.get(`/schedules?startDate=${startDate}&endDate=${yesterdayStr}&status=진행중&status=완료&limit=3`);

            if (response.data.success) {
                setRecentActivities(response.data.data);
            }
        } catch (error) {
            console.error('최근 활동 조회 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    // 최신 뉴스 가져오기
    const fetchLatestNews = async () => {
        try {
            setNewsLoading(true);
            const response = await api.get('/news?limit=15&sortBy=registrationDate&sortOrder=desc');
            
            if (response.data.success) {
                setLatestNews(response.data.data);
            }
        } catch (error) {
            console.error('최신 뉴스 조회 오류:', error);
        } finally {
            setNewsLoading(false);
        }
    };

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        // 통계 데이터, 오늘의 스케줄과 최근 활동 가져오기
        if (user && user._id) {
            fetchStats();
            fetchTodaySchedules();
            fetchRecentActivities();
            fetchLatestNews();
        }

        return () => window.removeEventListener('resize', handleResize);
    }, [user]);

    // 사용자 정보가 없을 때 로딩 상태 표시 (리다이렉트 중일 때)
    if (!user || !user._id) {
        return (
            <Container className="mt-4">
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3 text-muted">로그인 페이지로 이동 중...</p>
                </div>
            </Container>
        );
    }

    const getStatusBadge = (status) => {
        return <Badge bg={status === '완료' ? 'success' : 'warning'}>{status}</Badge>;
    };

    const getTypeBadge = (type) => {
        const variants = {
            '시세조사': 'primary',
            '고객상담': 'success',
            '계약관리': 'warning',
            '기타': 'secondary'
        };
        return <Badge bg={variants[type] || 'secondary'}>{type}</Badge>;
    };

    const getPriorityBadge = (priority) => {
        const variants = {
            '높음': 'danger',
            '보통': 'primary',
            '낮음': 'warning'
        };
        return <Badge bg={variants[priority] || 'secondary'}>{priority}</Badge>;
    };

    const formatTime = (time) => {
        if (!time) return '';
        return time.substring(0, 5); // HH:MM 형식으로 변환
    };

    // 스케줄 모달 관련 함수들
    const handleShowScheduleModal = (schedule = null) => {
        setEditingSchedule(schedule);
        setShowScheduleModal(true);
    };

    const handleCloseScheduleModal = () => {
        setShowScheduleModal(false);
        setEditingSchedule(null);
    };

    const handleScheduleSuccess = () => {
        fetchTodaySchedules(); // 오늘의 할 일 새로고침
        fetchRecentActivities(); // 최근 활동 새로고침
        fetchStats(); // 통계 데이터 새로고침
    };



    return (
        <Container className="mt-4">
            {/* 환영 메시지 */}
            <Card className="mb-4 bg-primary text-white">
                <Card.Body>
                    <Row className="align-items-center">
                        <Col md={8}>
                            <h3 className="mb-2">
                                안녕하세요, {user?.nickname || '중개사'}님!
                            </h3>
                            <p className="mb-0">
                                오늘도 부동산 중개 업무에 열정을 가져주세요.
                            </p>
                        </Col>
                        <Col md={4} className="text-end">
                            <div className="d-flex justify-content-end">
                                <FaHome size={48} />
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* 통계 카드 */}
            <Row className="mb-4">
                <Col md={12} className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">📊 실시간 통계</h5>
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={fetchStats}
                            disabled={Object.values(statsLoading).some(loading => loading)}
                        >
                            {Object.values(statsLoading).some(loading => loading) ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    새로고침 중...
                                </>
                            ) : (
                                <>
                                    <FaChartLine className="me-2" />
                                    새로고침
                                </>
                            )}
                        </Button>
                    </div>
                </Col>
                <Col md={2} sm={6} className="mb-3">
                    <Card 
                        className="text-center border-primary h-100 transition-all"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/properties')}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Card.Body className="d-flex flex-column justify-content-center">
                            {statsLoading.totalProperties ? (
                                <div className="text-center">
                                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <FaHome size={32} className="text-primary mb-2" />
                                    <h5>총 매물</h5>
                                    <h3 className="text-primary">{stats.totalProperties}</h3>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={2} sm={6} className="mb-3">
                    <Card 
                        className="text-center border-success h-100 transition-all"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/customers/buyers')}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Card.Body className="d-flex flex-column justify-content-center">
                            {statsLoading.activeCustomers ? (
                                <div className="text-center">
                                    <div className="spinner-border spinner-border-sm text-success" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <FaUsers size={32} className="text-success mb-2" />
                                    <h5>활성 고객</h5>
                                    <h3 className="text-success">{stats.activeCustomers}</h3>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={2} sm={6} className="mb-3">
                    <Card 
                        className="text-center border-warning h-100 transition-all"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/contracts')}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Card.Body className="d-flex flex-column justify-content-center">
                            {statsLoading.pendingContracts ? (
                                <div className="text-center">
                                    <div className="spinner-border spinner-border-sm text-warning" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <FaFileAlt size={32} className="text-warning mb-2" />
                                    <h5>진행 계약</h5>
                                    <h3 className="text-warning">{stats.pendingContracts}</h3>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={2} sm={6} className="mb-3">
                    <Card 
                        className="text-center border-info h-100 transition-all"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/sales')}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Card.Body className="d-flex flex-column justify-content-center">
                            {statsLoading.monthlyRevenue ? (
                                <div className="text-center">
                                    <div className="spinner-border spinner-border-sm text-info" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <FaMoneyBillWave size={32} className="text-info mb-2" />
                                    <h5>월 매출</h5>
                                    <h3 className="text-info">{stats.monthlyRevenue}</h3>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={2} sm={6} className="mb-3">
                    <Card 
                        className="text-center border-secondary h-100 transition-all"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/sales')}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Card.Body className="d-flex flex-column justify-content-center">
                            {statsLoading.completedDeals ? (
                                <div className="text-center">
                                    <div className="spinner-border spinner-border-sm text-secondary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <FaChartLine size={32} className="text-secondary mb-2" />
                                    <h5>완료 거래</h5>
                                    <h3 className="text-secondary">{stats.completedDeals}</h3>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={2} sm={6} className="mb-3">
                    <Card 
                        className="text-center border-danger h-100 transition-all"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/schedule')}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Card.Body className="d-flex flex-column justify-content-center">
                            {statsLoading.upcomingAppointments ? (
                                <div className="text-center">
                                    <div className="spinner-border spinner-border-sm text-danger" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <FaClock size={32} className="text-danger mb-2" />
                                    <h5>예정 일정</h5>
                                    <h3 className="text-danger">{stats.upcomingAppointments}</h3>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                {/* 오늘의 할 일 */}
                <Col md={8} className="mb-4">
                    <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">
                                <FaCalendarAlt className="me-2" />
                                오늘의 할 일
                            </h5>
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => navigate('/schedule')}
                            >
                                전체 보기
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            {loading ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <p className="mt-2 text-muted">일정을 불러오는 중...</p>
                                </div>
                            ) : todaySchedules.length > 0 ? (
                                <>
                                    <ListGroup variant="flush">
                                        {getCurrentPageData(todaySchedules, todaySchedulesPage).map((schedule) => (
                                        <ListGroup.Item
                                            key={schedule._id}
                                            className="border-0 px-0 py-2"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => handleShowScheduleModal(schedule)}
                                        >
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div className="flex-grow-1">
                                                    <div className="d-flex align-items-center mb-1">
                                                        <h6 className="mb-0 me-2">{schedule.title}</h6>
                                                        {getTypeBadge(schedule.type)} {getPriorityBadge(schedule.priority)}
                                                    </div>
                                                    <div className="d-flex align-items-center mb-1">
                                                        <FaClock className="text-muted me-1" />
                                                        <small className="text-muted me-3">
                                                            {formatTime(schedule.time)}
                                                        </small>
                                                        <FaMapMarkerAlt className="text-muted me-1" />
                                                        <small className="text-muted">
                                                            {schedule.location}
                                                        </small>
                                                    </div>
                                                    {schedule.relatedCustomer && (
                                                        <div className="mb-1">
                                                            <FaUser className="text-muted me-1" />
                                                            <small className="text-muted">
                                                                {schedule.relatedCustomer.name}
                                                            </small>
                                                        </div>
                                                    )}
                                                    {schedule.relatedProperty && (
                                                        <div className="mb-1">
                                                            <FaHomeIcon className="text-muted me-1" />
                                                            <small className="text-muted">
                                                                {schedule.relatedProperty.title}
                                                            </small>
                                                        </div>
                                                    )}
                                                    {schedule.description && (
                                                        <small className="text-muted d-block">
                                                            {schedule.description}
                                                        </small>
                                                    )}
                                                    {schedule.status === '취소' && schedule.cancelReason && (
                                                        <small className="text-danger d-block">
                                                            <strong>취소 사유:</strong> {schedule.cancelReason}
                                                        </small>
                                                    )}
                                                </div>
                                                <div className="ms-2">
                                                    {(() => {
                                                        let badgeColor;
                                                        switch (schedule.status) {
                                                            case '예정':
                                                                badgeColor = 'primary';
                                                                break;
                                                            case '진행중':
                                                                badgeColor = 'warning';
                                                                break;
                                                            case '완료':
                                                                badgeColor = 'success';
                                                                break;
                                                            case '취소':
                                                                badgeColor = 'danger';
                                                                break;
                                                            default:
                                                                badgeColor = 'secondary';
                                                        }
                                                        return (
                                                            <Badge bg={badgeColor} className="me-1">
                                                                {schedule.status}
                                                            </Badge>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </ListGroup.Item>
                                    ))}
                                    </ListGroup>
                                    
                                    {/* 오늘 할일 페이지네이션 */}
                                    {todaySchedules.length > 0 && (
                                        <div className="d-flex justify-content-center mt-3">
                                            <Pagination className="mb-0">
                                                {createHomePagination(
                                                    todaySchedulesPage,
                                                    getTotalPages(todaySchedules),
                                                    setTodaySchedulesPage,
                                                    'home-schedules'
                                                )}
                                            </Pagination>
                                        </div>
                                    )}
                                    
                                    <div className="text-center text-muted small mt-2">
                                        총 {todaySchedules.length}개 중 {((todaySchedulesPage - 1) * itemsPerPage) + 1}~{Math.min(todaySchedulesPage * itemsPerPage, todaySchedules.length)}개 표시
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <FaCalendarAlt size={48} className="text-muted mb-3" />
                                    <p className="text-muted mb-2">오늘 예정된 일정이 없습니다.</p>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => navigate('/schedule')}
                                    >
                                        일정 등록하기
                                    </Button>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* 최근 활동 */}
                <Col md={4} className="mb-4">
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">
                                <FaClock className="me-2" />
                                최근 활동
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {loading ? (
                                <div className="text-center py-3">
                                    <div className="spinner-border spinner-border-sm" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <small className="text-muted d-block mt-1">최근 활동을 불러오는 중...</small>
                                </div>
                            ) : recentActivities.length > 0 ? (
                                <>
                                    {getCurrentPageData(recentActivities, recentActivitiesPage).map((activity) => (
                                    <div key={activity._id} className="d-flex justify-content-between align-items-start mb-3">
                                        <div className="flex-grow-1">
                                            <div className="d-flex align-items-center mb-1">
                                                <strong className="me-2">{activity.title}</strong>
                                                {getStatusBadge(activity.status)}
                                            </div>
                                            <small className="text-muted d-block">
                                                {activity.description || `${activity.type} - ${activity.location}`}
                                            </small>
                                            <small className="text-muted d-flex align-items-center">
                                                <FaUser className="me-1" />
                                                {activity.publisher?.name || '알 수 없음'}
                                                {activity.publisher?._id === user._id && (
                                                    <Badge bg="info" className="ms-1">본인</Badge>
                                                )}
                                            </small>
                                            <small className="text-muted">
                                                {new Date(activity.date).toLocaleDateString('ko-KR')} {formatTime(activity.time)}
                                            </small>
                                        </div>
                                    </div>
                                    ))}
                                    
                                    {/* 최근활동 페이지네이션 */}
                                    {recentActivities.length > 0 && (
                                        <div className="d-flex justify-content-center mt-3">
                                            <Pagination className="mb-0">
                                                {createHomePagination(
                                                    recentActivitiesPage,
                                                    getTotalPages(recentActivities),
                                                    setRecentActivitiesPage,
                                                    'home-activities'
                                                )}
                                            </Pagination>
                                        </div>
                                    )}
                                    
                                    <div className="text-center text-muted small mt-2">
                                        총 {recentActivities.length}개 중 {((recentActivitiesPage - 1) * itemsPerPage) + 1}~{Math.min(recentActivitiesPage * itemsPerPage, recentActivities.length)}개 표시
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-3">
                                    <FaClock size={24} className="text-muted mb-2" />
                                    <p className="text-muted mb-0">최근 활동이 없습니다.</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* 최신 뉴스 섹션 */}
            <Row className="mb-4">
                <Col md={12}>
                    <Card className="shadow-sm">
                        <Card.Header>
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">📰 최신 뉴스</h5>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={fetchLatestNews}
                                    disabled={newsLoading}
                                >
                                    {newsLoading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            새로고침 중...
                                        </>
                                    ) : (
                                        <>
                                            <FaChartLine className="me-2" />
                                            새로고침
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card.Header>
                        <Card.Body>
                            {newsLoading ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <p className="text-muted mt-2">뉴스를 불러오는 중...</p>
                                </div>
                            ) : latestNews.length > 0 ? (
                                <div className="row">
                                    {latestNews.slice(0, 15).map((news, index) => (
                                        <div key={news._id} className="col-md-4 col-sm-6 mb-3">
                                            <Card 
                                                className="h-100 border-0 shadow-sm transition-all"
                                                style={{ 
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
                                                }}
                                                onClick={() => window.open(news.link || news.linkUrl, '_blank')}
                                            >
                                                <Card.Body className="p-3">
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <Badge bg="primary" className="small">
                                                            #{index + 1}
                                                        </Badge>
                                                        <small className="text-muted">
                                                            {new Date(news.registrationDate).toLocaleDateString('ko-KR')}
                                                        </small>
                                                    </div>
                                                    <h6 className="card-title mb-2" style={{ 
                                                        fontSize: '0.95rem',
                                                        lineHeight: '1.4',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {news.title}
                                                    </h6>
                                                    <p className="card-text text-muted small mb-2" style={{
                                                        fontSize: '0.85rem',
                                                        lineHeight: '1.3',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {news.subtitle}
                                                    </p>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <small className="text-primary">
                                                            <i className="fas fa-external-link-alt me-1"></i>
                                                            링크 보기
                                                        </small>
                                                        <small className="text-muted">
                                                            {new Date(news.createdAt).toLocaleDateString('ko-KR')}
                                                        </small>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-newspaper text-muted" style={{ fontSize: '2rem' }}></i>
                                    <p className="text-muted mt-2 mb-0">등록된 뉴스가 없습니다.</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* 스케줄 등록/수정 모달 */}
            <ScheduleRegistrationModal
                showModal={showScheduleModal}
                onHide={handleCloseScheduleModal}
                editingSchedule={editingSchedule}
                onSuccess={handleScheduleSuccess}
                user={user}
            />

            {/* Footer */}
            <footer style={{
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #dee2e6',
                padding: '30px 0',
                marginTop: '50px'
            }}>
                <Container>
                    <Row>
                        <Col md={6}>
                            <h6 style={{color: '#495057', marginBottom: '15px'}}>부동산 CRM 시스템</h6>
                            <p style={{color: '#6c757d', fontSize: '0.9rem', margin: 0}}>
                                효율적인 부동산 중개업무를 위한 종합 관리 시스템
                            </p>
                        </Col>
                        <Col md={6} className="text-end">
                            <div style={{marginBottom: '15px'}}>
                                <a 
                                    href="/terms-of-service" 
                                    style={{
                                        color: '#6c757d',
                                        textDecoration: 'none',
                                        fontSize: '0.9rem',
                                        marginRight: '20px'
                                    }}
                                    onMouseEnter={(e) => e.target.style.color = '#495057'}
                                    onMouseLeave={(e) => e.target.style.color = '#6c757d'}
                                >
                                    이용약관
                                </a>
                                <a 
                                    href="/privacy-policy" 
                                    style={{
                                        color: '#6c757d',
                                        textDecoration: 'none',
                                        fontSize: '0.9rem'
                                    }}
                                    onMouseEnter={(e) => e.target.style.color = '#495057'}
                                    onMouseLeave={(e) => e.target.style.color = '#6c757d'}
                                >
                                    개인정보처리방침
                                </a>
                                <button 
                                    onClick={() => setShowCompanyInfoModal(true)}
                                    style={{
                                        color: '#6c757d',
                                        textDecoration: 'none',
                                        fontSize: '0.9rem',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        paddingLeft: 10
                                    }}
                                    onMouseEnter={(e) => e.target.style.color = '#495057'}
                                    onMouseLeave={(e) => e.target.style.color = '#6c757d'}
                                >
                                    {/* <FaBuilding className="me-1" /> */}
                                    회사 정보
                                </button>
                            </div>
                            <p style={{color: '#6c757d', fontSize: '0.8rem', margin: 0}}>
                                © 2024 부동산 CRM. All rights reserved.
                            </p>
                        </Col>
                    </Row>
                </Container>
            </footer>

            {/* 회사 정보 모달 */}
            <CompanyInfoModal 
                show={showCompanyInfoModal} 
                onHide={() => setShowCompanyInfoModal(false)} 
            />
        </Container>
    );
};

export default Home;
