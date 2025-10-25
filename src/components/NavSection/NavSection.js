import React, { useContext, useEffect, useRef, useState } from 'react';
import { Container, Navbar, Offcanvas, Nav, Card, Modal } from 'react-bootstrap';
import { UserContext } from '../UserContext';
import { FaUserCircle, FaSignInAlt, FaBuilding, FaHome, FaUsers, FaChartLine, FaFileAlt, FaCalendarAlt, FaCrown } from 'react-icons/fa';
import MyPage from './MyPage';
import api from '../../utils/api';
import { Link, useLocation } from 'react-router-dom'; // react-router-dom에서 Link 추가
import SubscriptionAlert from '../SubscriptionAlert';


const NavSection = () => {
    const { user, logout } = useContext(UserContext);
    const navRef = useRef(null);
    const [showMyPage, setShowMyPage] = useState(false);
    const handleShowMyPage = () => setShowMyPage(true);
    const handleCloseMyPage = () => setShowMyPage(false);
    const location = useLocation(); // 현재 경로 가져오기
    const [isMobile, setIsMobile] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showSubscriptionAlert, setShowSubscriptionAlert] = useState(false);

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

    // 메뉴 클릭 핸들러
    const handleMenuClick = (e, item) => {
        // 로그인하지 않은 사용자는 정상적으로 이동
        if (!user) {
            return;
        }

        // 구독 접근 권한이 있는 경우 정상적으로 이동
        if (checkSubscriptionAccess(user)) {
            return;
        }

        // 구독 접근 권한이 없는 경우 알림 표시
        e.preventDefault();
        setShowSubscriptionAlert(true);
    };

    useEffect(() => {
        if (navRef.current) {
            const navHeight = navRef.current.offsetHeight;
            document.documentElement.style.setProperty('--nav-height', `${navHeight}px`);
        }
    }, []);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const zoom = window.devicePixelRatio || 1;
            const effectiveWidth = width / zoom;

            setIsMobile(effectiveWidth <= 768); // 화면 너비 768px 이하 = 모바일
        };

        handleResize(); // 초기 로드 시 한 번 실행
        window.addEventListener('resize', handleResize); // 창 크기 변경 감지

        return () => window.removeEventListener('resize', handleResize); // 이벤트 클린업
    }, []);

    // unreadCount 가져오기
    useEffect(() => {
        const fetchUnreadCount = async () => {
            if (user) {
                try {
                    const response = await api.get('/notifications/unread/count');
                    if (response.data.success) {
                        setUnreadCount(response.data.data.unreadCount);
                    }
                } catch (error) {
                    console.error('읽지 않은 알림 수 가져오기 실패:', error);
                }
            }
        };

        fetchUnreadCount();

        // 주기적으로 업데이트 (30초마다)
        const interval = setInterval(fetchUnreadCount, 10000);

        return () => clearInterval(interval);
    }, [user]);




    // 기본 메뉴 리스트
    const baseMenuList = [
        { label: "매물 관리", path: "/properties", icon: <FaBuilding size={24} style={{ color: '#519ced' }} /> },
        { label: "고객 관리", path: "/customers/general", icon: <FaUsers size={24} style={{ color: '#519ced' }} /> },
        { label: "계약 관리", path: "/contracts", icon: <FaFileAlt size={24} style={{ color: '#519ced' }} /> },
        { label: "일정 관리", path: "/schedule", icon: <FaCalendarAlt size={24} style={{ color: '#519ced' }} /> },
        { label: "매출 현황", path: "/sales", icon: <FaChartLine size={24} style={{ color: '#519ced' }} /> },

    ];

    // 로그인/회원가입 메뉴 (로그인하지 않은 경우에만 표시)
    const authMenuList = [
        { label: "로그인", path: "/login", icon: <FaSignInAlt size={24} style={{ color: '#519ced' }} /> },
        // { label: "회원가입", path: "/register", icon: <FaUserPlus size={24} style={{ color: '#519ced' }} /> },
    ];

    // 사용자 상태에 따라 메뉴 리스트 구성
    const mainList = user ? baseMenuList : [...baseMenuList, ...authMenuList];

    return (
        <Container className="mt-4" style={{ marginBottom: isMobile ? '0px' : '60px' }}>
            {/* 데스크탑 네비게이션 */}
            <Navbar ref={navRef} expand="lg" className="bg-white mb-3 fixed-top d-none d-lg-block">
                <Container>
                    <Navbar.Brand href="/" className="d-flex align-items-center">
                        <div 
                            className="d-flex align-items-center justify-content-center"
                            style={{
                                width: '50px',
                                height: '50px',
                                backgroundColor: '#519ced',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(81, 156, 237, 0.3)',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(81, 156, 237, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(81, 156, 237, 0.3)';
                            }}
                        >
                            <FaHome 
                                size={24} 
                                style={{ 
                                    color: 'white',
                                    fontWeight: 'bold'
                                }} 
                            />
                        </div>
                        <span 
                            className="ms-3 fw-bold"
                            style={{
                                color: '#2c3e50',
                                fontSize: '1.4rem',
                                letterSpacing: '-0.5px'
                            }}
                        >
                            Home
                        </span>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="offcanvasNavbar" />
                    <Navbar.Offcanvas id="offcanvasNavbar" placement="end">
                        <Offcanvas.Header closeButton>
                            <Offcanvas.Title>Menu List</Offcanvas.Title>
                        </Offcanvas.Header>
                        <Offcanvas.Body>
                            <Nav className="ms-auto flex-grow-1 justify-content-end pe-3" style={{
                                flexWrap: 'nowrap',
                                overflow: 'hidden'
                            }}>

                                {mainList.map((item, index) => {
                                    const isActive = location.pathname === item.path; // 현재 경로와 비교

                                    return (
                                        <Nav.Link
                                            as={Link}
                                            to={item.path}
                                            key={index}
                                            className="Nav-Style d-flex align-items-center"
                                            style={{
                                                padding: '0px 15px',
                                                transition: 'all 0.3s ease',
                                                textDecoration: 'none',
                                                color: '#555',
                                                fontWeight: isActive ? 'bold' : 'normal',
                                                borderBottom: isActive ? '1px solid #68a9ef' : 'none',
                                                justifyContent: 'center',
                                                whiteSpace: 'nowrap',
                                                minWidth: 'fit-content',
                                                flexShrink: 0
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.fontWeight = 'bold')}
                                            onMouseLeave={(e) => (e.currentTarget.style.fontWeight = isActive ? 'bold' : 'normal')}
                                            onClick={(e) => handleMenuClick(e, item)}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#f1f7fc',
                                                    marginRight: '8px',
                                                    transition: 'background-color 0.3s ease',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {item.icon}
                                            </div>
                                            <span style={{
                                                whiteSpace: 'nowrap',
                                                lineHeight: '1.2',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>{item.label}</span>
                                        </Nav.Link>
                                    );
                                })}


                                {user && (
                                    <div
                                        onClick={handleShowMyPage}
                                        className="Nav-Style d-flex align-items-center"
                                        style={{
                                            cursor: 'pointer',
                                            color: 'inherit',
                                            flexShrink: 0,
                                            marginLeft: '15px'
                                        }}
                                    >
                                        <FaUserCircle size={24} style={{ color: '#519ced' }} />
                                        <span className="ms-2" style={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>{user.name}</span>
                                    </div>
                                )}
                            </Nav>
                        </Offcanvas.Body>
                    </Navbar.Offcanvas>
                </Container>
            </Navbar>

            {/* 모바일 네비게이션 */}
            <Navbar ref={navRef} expand="lg" className="bg-white mb-3 fixed-top d-lg-none">
                <Container>
                    <Navbar.Brand href="/" className="d-flex align-items-center">
                        <div 
                            className="d-flex align-items-center justify-content-center"
                            style={{
                                width: '40px',
                                height: '40px',
                                backgroundColor: '#519ced',
                                borderRadius: '10px',
                                boxShadow: '0 3px 8px rgba(81, 156, 237, 0.3)',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(81, 156, 237, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 3px 8px rgba(81, 156, 237, 0.3)';
                            }}
                        >
                            <FaHome 
                                size={20} 
                                style={{ 
                                    color: 'white',
                                    fontWeight: 'bold'
                                }} 
                            />
                        </div>
                        <span 
                            className="ms-2 fw-bold"
                            style={{
                                color: '#2c3e50',
                                fontSize: '1.2rem',
                                letterSpacing: '-0.5px'
                            }}
                        >
                           Home
                        </span>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="offcanvasNavbar" />
                    <Navbar.Offcanvas id="offcanvasNavbar" placement="end">
                        <Offcanvas.Header
                            closeButton
                            style={{
                                display: 'flex',
                                alignItems: 'center',   // 수평 가운데
                                justifyContent: 'center', // 수직 가운데
                            }}
                        >
                            <Offcanvas.Title style={{ textAlign: 'center', width: '90%' }}>My Page</Offcanvas.Title>
                        </Offcanvas.Header>
                        <Offcanvas.Body>
                            {user && (
                                <Card
                                    className="shadow-sm border-1 mb-4"
                                    style={{
                                        maxWidth: '400px',
                                        margin: '0 auto',
                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', // 카드 그림자 효과 추가
                                        borderRadius: '10px', // 카드 모서리 둥글게
                                    }}
                                >
                                    <Card.Header
                                        className="bg-primary text-white text-center"
                                        style={{ fontWeight: 'bold', fontSize: '1.2rem', borderTopLeftRadius: '10px', borderTopRightRadius: '10px' }}
                                    >
                                        사용자 정보
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="d-flex flex-column">
                                            <div
                                                className="d-flex justify-content-between align-items-center py-2"
                                                style={{
                                                    borderBottom: '1px solid #e0e0e0', // 희미한 구분선
                                                }}
                                            >
                                                <span style={{ fontWeight: 'bold', color: '#519ced' }}>이메일</span>
                                                <span>{user.email}</span>
                                            </div>
                                            <div
                                                className="d-flex justify-content-between align-items-center py-2"
                                                style={{
                                                    borderBottom: '1px solid #e0e0e0', // 희미한 구분선
                                                }}
                                            >
                                                <span style={{ fontWeight: 'bold', color: '#519ced' }}>이ss름</span>
                                                <span>{user.name}</span>
                                                <span>{user.nickname}</span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center py-2">
                                                <span style={{ fontWeight: 'bold', color: '#519ced' }}>상태</span>
                                                <span>{(user.isPremium ? '유료회원' : '무료회원')}</span>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            )}
                            {user && (
                                <MyPage
                                    user={user}
                                    logout={logout}
                                    unreadCount={unreadCount}
                                />
                            )}
                        </Offcanvas.Body>
                    </Navbar.Offcanvas>
                </Container>
            </Navbar>

            {/* 모바일 하단 네비게이션 */}
            <div className="mobile-bottom-nav d-lg-none fixed-bottom bg-light d-flex justify-content-around py-2">
                {mainList
                    .filter((_, index) => index !== mainList.length)
                    .map((item, index) => (
                        <a
                            href={item.path}
                            key={index}
                            className="text-center"
                            style={{
                                textDecoration: 'none',
                                color: '#519ced',
                                flex: '1',
                                minWidth: '0',
                                padding: '8px 4px'
                            }}
                            onClick={(e) => handleMenuClick(e, item)}
                        >
                            <div style={{ scale: '1.2', marginBottom: '4px' }}>{item.icon}</div>
                            <div style={{
                                fontSize: '10px',
                                lineHeight: '1.2',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>{item.label}</div>
                        </a>
                    ))}
            </div>

            {/* My Page 오른쪽 Offcanvas */}
            <Offcanvas show={showMyPage} onHide={handleCloseMyPage} placement="end">
                <Offcanvas.Header
                    closeButton
                    style={{
                        display: 'flex',
                        alignItems: 'center',   // 수평 가운데
                        justifyContent: 'center', // 수직 가운데
                    }}
                >
                    <Offcanvas.Title style={{ textAlign: 'center', width: '90%' }}>My Page</Offcanvas.Title>
                </Offcanvas.Header>

                <Offcanvas.Body>
                    {user && (
                        <Card
                            className="shadow-sm border-1 mb-4"
                            style={{
                                maxWidth: '400px',
                                margin: '0 auto',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', // 카드 그림자 효과 추가
                                borderRadius: '10px', // 카드 모서리 둥글게
                            }}
                        >
                            <Card.Header
                                className="bg-primary text-white text-center"
                                style={{ fontWeight: 'bold', fontSize: '1.2rem', borderTopLeftRadius: '10px', borderTopRightRadius: '10px' }}
                            >
                                사용자 정보
                            </Card.Header>
                            <Card.Body>
                                <div className="d-flex flex-column">
                                    <div
                                        className="d-flex justify-content-between align-items-center py-2"
                                        style={{
                                            borderBottom: '1px solid #e0e0e0', // 희미한 구분선
                                        }}
                                    >
                                        <span style={{ fontWeight: 'bold', color: '#519ced' }}>이메일</span>
                                        <span>{user.email}</span>
                                    </div>
                                    <div
                                        className="d-flex justify-content-between align-items-center py-2"
                                        style={{
                                            borderBottom: '1px solid #e0e0e0', // 희미한 구분선
                                        }}
                                    >
                                        <span style={{ fontWeight: 'bold', color: '#519ced' }}>이름</span>
                                        <span>{user.name}</span>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center py-2"
                                        style={{
                                            borderBottom: '1px solid #e0e0e0', // 희미한 구분선
                                        }}>
                                        <span style={{ fontWeight: 'bold', color: '#519ced' }}>회사명</span>
                                        <span>{user.companyName}</span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center py-2"
                                        style={{
                                            borderBottom: '1px solid #e0e0e0', // 희미한 구분선
                                        }}
                                    >
                                        <span style={{ fontWeight: 'bold', color: '#519ced' }}>사업자등록번호</span>
                                        <span>{user.businessNumber}</span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center py-2">
                                        <span style={{ fontWeight: 'bold', color: '#519ced' }}>상태</span>
                                        <span>{(user.isPremium ? '유료회원' : '무료회원')}</span>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    )}

                    {user && (
                        <MyPage
                            user={user}
                            logout={logout}
                            unreadCount={unreadCount}
                        />
                    )}
                </Offcanvas.Body>
            </Offcanvas>

            {/* 구독 알림 모달 */}
            <Modal
                show={showSubscriptionAlert}
                onHide={() => setShowSubscriptionAlert(false)}
                centered
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FaCrown className="me-2" style={{ color: '#f0ad4e' }} />
                        프리미엄 기능 접근 제한
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <SubscriptionAlert
                        user={user}
                        onClose={() => setShowSubscriptionAlert(false)}
                    />
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default NavSection;
