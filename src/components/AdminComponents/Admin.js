import React from 'react';
import { Container, Row, Col, Nav } from 'react-bootstrap';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AdminUsers from './AdminUsers';
import SubscriptionHistory from './SubscriptionHistory';
import CompanyManagement from './CompanyManagement';
import NewPost from './NewPost';

const Admin = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // 현재 활성 탭을 URL에서 추출
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/admin/users')) return 'users';
        if (path.includes('/admin/subscription-history')) return 'subscription-history';
        if (path.includes('/admin/companies')) return 'companies';
        if (path.includes('/admin/news')) return 'news';
        return 'users'; // 기본값
    };

    const handleTabClick = (tabKey) => {
        navigate(`/admin/${tabKey}`);
    };

    return (
        <Container className="mt-4">
            <h1 className="mb-4">관리자 페이지</h1>
            <Row>
                {/* 왼쪽 탭 영역 */}
                <Col md={2}>
                    <Nav variant="pills" className="flex-column">
                        <Nav.Item>
                            <Nav.Link 
                                eventKey="users"
                                active={getActiveTab() === 'users'}
                                onClick={() => handleTabClick('users')}
                                style={{ cursor: 'pointer' }}
                            >
                                사용자 관리
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link 
                                eventKey="subscription-history"
                                active={getActiveTab() === 'subscription-history'}
                                onClick={() => handleTabClick('subscription-history')}
                                style={{ cursor: 'pointer' }}
                            >
                                구독 히스토리
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link 
                                eventKey="companies"
                                active={getActiveTab() === 'companies'}
                                onClick={() => handleTabClick('companies')}
                                style={{ cursor: 'pointer' }}
                            >
                                회사 관리
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link 
                                eventKey="news"
                                active={getActiveTab() === 'news'}
                                onClick={() => handleTabClick('news')}
                                style={{ cursor: 'pointer' }}
                            >
                                뉴스 관리
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
                </Col>

                {/* 오른쪽 콘텐츠 영역 */}
                <Col md={10}>
                    <Routes>
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="subscription-history" element={<SubscriptionHistory />} />
                        <Route path="companies" element={<CompanyManagement />} />
                        <Route path="news" element={<NewPost />} />
                        <Route path="" element={<Navigate to="users" replace />} />
                    </Routes>
                </Col>
            </Row>
        </Container>
    );
};

export default Admin;
