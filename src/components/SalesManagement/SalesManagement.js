import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Container, Card, Row, Col, Table, Badge, Button, Alert, Form } from 'react-bootstrap';
import { FaChartLine, FaMoneyBillWave, FaCalendarAlt, FaUser, FaHome, FaPlus, FaHandshake, FaChevronLeft, FaChevronRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { UserContext } from '../UserContext';
import api from '../../utils/api';
import ContractRegistrationModal from '../ContractManagement/ContractRegistrationModal';

const SalesManagement = () => {
    const { user } = useContext(UserContext);
    const [contracts, setContracts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // 페이지네이션 상태
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [totalItems, setTotalItems] = useState(0);

    // ContractRegistrationModal에 필요한 상태 변수들
    const [selectedBuyer, setSelectedBuyer] = useState(null);
    const [selectedSeller, setSelectedSeller] = useState(null);
    const [selectedAgent, setSelectedAgent] = useState(null);

    // 계약 목록 가져오기
    const fetchContracts = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const params = new URLSearchParams();
            if (filterStatus !== 'all') {
                params.append('status', filterStatus);
            }
            if (searchTerm) {
                params.append('search', searchTerm);
            }
            // 페이지네이션 파라미터 추가
            params.append('page', currentPage);
            params.append('limit', itemsPerPage);

            const response = await api.get(`/contracts?${params.toString()}`);

            if (response.data.success) {
                setContracts(response.data.data);
                setTotalItems(response.data.total || 0);
            } else {
                setError('계약 목록을 불러오는데 실패했습니다.');
            }
        } catch (error) {
            console.error('계약 목록 조회 오류:', error);
            
            // 401 오류인 경우 로그인 만료 메시지 표시
            if (error.response?.status === 401) {
                setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
            } else {
                setError('계약 목록을 불러오는 중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, filterStatus, searchTerm]);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    // 검색어나 필터가 변경될 때 첫 페이지로 이동
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus]);

    const handleShowModal = (contract = null) => {
        setEditingContract(contract);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingContract(null);
        // ContractRegistrationModal 상태 초기화
        setSelectedBuyer(null);
        setSelectedSeller(null);
        setSelectedAgent(null);
    };

    const handleContractSuccess = () => {
        fetchContracts(); // 계약 목록 새로고침
    };

    // 페이지네이션 핸들러 함수들
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleFirstPage = () => {
        setCurrentPage(1);
    };

    const handleLastPage = () => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        setCurrentPage(totalPages);
    };

    const handlePrevPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const handleNextPage = () => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    const getPageNumbers = () => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const pageNumbers = [];
        const maxVisiblePages = 5;
        
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            
            for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(i);
            }
        }
        
        return pageNumbers;
    };



    // byCompanyNumber 기반 필터링
    const filteredContracts = contracts.filter(contract => {
        if (!user || !user.businessNumber) {
            return false;
        }
        if (contract.byCompanyNumber !== user.businessNumber) {
            return false;
        }
        return true;
    });

    // 통계 계산 - 필터링된 계약만 사용
    const totalCommission = filteredContracts.reduce((sum, contract) => {
        // 완료된 계약만 포함
        if (contract.status !== '완료') {
            return sum;
        }
        return sum + (contract.commission || 0);
    }, 0);

    const completedContracts = filteredContracts.filter(contract => contract.status === '완료');
    const pendingContracts = filteredContracts.filter(contract => contract.status === '진행중');

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const monthContracts = filteredContracts.filter(contract => {
            // 완료된 계약만 포함
            if (contract.status !== '완료') {
                return false;
            }

            const contractDate = new Date(contract.contractDate);
            return contractDate.getMonth() + 1 === month && contractDate.getFullYear() === filterYear;
        });
        const monthCommission = monthContracts.reduce((sum, contract) => {
            return sum + (contract.commission || 0);
        }, 0);
        return { month, commission: monthCommission };
    });

    const getStatusBadge = (status) => {
        return <Badge bg={status === '완료' ? 'success' : 'warning'}>{status}</Badge>;
    };




    return (
        <Container className="mt-4" style={{ paddingBottom: '80px' }}>
            <Card className="shadow-sm mb-4">
                <Card.Header className="bg-primary text-white">
                    <h4 className="mb-0">
                        <FaChartLine className="me-2" />
                        매출 현황
                    </h4>
                </Card.Header>
                <Card.Body>
                    {error && (
                        <Alert variant="danger" onClose={() => setError('')} dismissible>
                            {error}
                        </Alert>
                    )}

                    {/* 통계 카드 - 반응형 */}
                    <Row className="mb-4">
                        <Col xs={6} sm={6} md={3} className="mb-3">
                            <Card className="text-center border-primary h-100">
                                <Card.Body className="d-flex flex-column justify-content-center">
                                    <FaMoneyBillWave size={24} className="text-primary mb-2" />
                                    <h6 className="mb-1">총 수수료</h6>
                                    <h5 className="text-primary mb-0">{totalCommission.toLocaleString()}만원</h5>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col xs={6} sm={6} md={3} className="mb-3">
                            <Card className="text-center border-success h-100">
                                <Card.Body className="d-flex flex-column justify-content-center">
                                    <FaHome size={24} className="text-success mb-2" />
                                    <h6 className="mb-1">완료 거래</h6>
                                    <h5 className="text-success mb-0">{completedContracts.length}건</h5>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col xs={6} sm={6} md={3} className="mb-3">
                            <Card className="text-center border-warning h-100">
                                <Card.Body className="d-flex flex-column justify-content-center">
                                    <FaCalendarAlt size={24} className="text-warning mb-2" />
                                    <h6 className="mb-1">진행중</h6>
                                    <h5 className="text-warning mb-0">{pendingContracts.length}건</h5>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col xs={6} sm={6} md={3} className="mb-3">
                            <Card className="text-center border-info h-100">
                                <Card.Body className="d-flex flex-column justify-content-center">
                                    <FaUser size={24} className="text-info mb-2" />
                                    <h6 className="mb-1">총 거래</h6>
                                    <h5 className="text-info mb-0">{filteredContracts.length}건</h5>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* 검색 및 필터 - 반응형 */}
                    <Card className="mb-4">
                        <Card.Header>
                            <h5 className="mb-0">검색 및 필터</h5>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col xs={12} sm={12} md={4} className="mb-3">
                                    <Form.Group>
                                        <Form.Label>검색</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="계약번호, 매물명, 고객명으로 검색"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col xs={6} sm={6} md={4} className="mb-3">
                                    <Form.Group>
                                        <Form.Label>상태</Form.Label>
                                        <Form.Select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value)}
                                        >
                                            <option value="all">전체</option>
                                            <option value="진행중">진행중</option>
                                            <option value="완료">완료</option>
                                            <option value="취소">취소</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col xs={6} sm={6} md={4} className="mb-3">
                                    <Form.Group>
                                        <Form.Label>연도</Form.Label>
                                        <Form.Select
                                            value={filterYear}
                                            onChange={(e) => setFilterYear(parseInt(e.target.value))}
                                        >
                                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                                <option key={year} value={year}>{year}년</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                                        {/* 월별 수수료 현황 - 반응형 */}
                    <Card className="mb-4">
                        <Card.Header>
                            <h5 className="mb-0">월별 수수료 현황 ({filterYear}년)</h5>
                        </Card.Header>
                        <Card.Body>
                            <Row className="mb-3">
                                <Col xs={12}>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="mb-0">총 수수료: {totalCommission.toLocaleString()}원</h6>
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                            
                            <div className="monthly-chart-responsive" style={{ 
                                height: '250px', 
                                overflow: 'auto',
                                padding: '10px 0'
                            }}>
                                <div className="d-flex flex-wrap justify-content-center align-items-end" style={{ minHeight: '200px' }}>
                                    {monthlyData.map(({ month, commission }) => {
                                        const maxCommission = Math.max(...monthlyData.map(d => d.commission));
                                        const barHeight = maxCommission > 0 
                                            ? Math.max((commission / maxCommission) * 150, 5) 
                                            : 5;
                                        
                                        return (
                                            <div key={month} className="month-bar-responsive" style={{ 
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                margin: '0 2px',
                                                minWidth: '30px',
                                                maxWidth: '50px',
                                                flex: '1'
                                            }}>
                                                <div className="commission-label" style={{ 
                                                    fontSize: '10px', 
                                                    marginBottom: '5px',
                                                    color: '#666',
                                                    textAlign: 'center',
                                                    wordBreak: 'break-all'
                                                }}>
                                                    {commission > 0 ? `${commission.toLocaleString()}원` : '0원'}
                                                </div>
                                                <div className="bar-container" style={{ 
                                                    height: '150px', 
                                                    position: 'relative',
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'end'
                                                }}>
                                                    <div 
                                                        className="bar" 
                                                        style={{ 
                                                            height: `${barHeight}px`,
                                                            backgroundColor: commission > 0 ? '#007bff' : '#e9ecef',
                                                            width: '100%',
                                                            borderRadius: '3px 3px 0 0',
                                                            minHeight: '2px'
                                                        }}
                                                    ></div>
                                                </div>
                                                <div className="month-label" style={{ 
                                                    fontSize: '11px', 
                                                    marginTop: '5px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {month}월
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* 매출 상세 목록 */}
                    <Card>
                        <Card.Header className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center">
                            <h5 className="mb-2 mb-sm-0">매출 상세 내역</h5>
                            {user && user.businessNumber && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleShowModal()}
                                    disabled={loading}
                                    className="w-auto"
                                >
                                    <FaPlus className="me-1" />
                                    계약 등록
                                </Button>
                            )}
                        </Card.Header>
                        <Card.Body>
                            <Table responsive hover>
                                <thead className="table-light d-none d-md-table-header-group">
                                    <tr>
                                        <th>계약번호</th>
                                        <th>매물</th>
                                        <th>고객정보</th>
                                        <th>거래금액</th>
                                        <th>계약일</th>
                                        <th>완료일</th>
                                        <th>상태</th>
                                        <th>담당자</th>
                                        <th>관리</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="10" className="text-center py-4">
                                                <div className="spinner-border" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredContracts.length === 0 ? (
                                        <tr>
                                            <td colSpan="10" className="text-center py-4 text-muted">
                                                등록된 계약이 없습니다.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredContracts.map(contract => {
                                            const buyerInfo = contract.buyer || {};
                                            const sellerInfo = contract.seller || {};

                                            return (
                                                <tr
                                                    key={contract._id}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => handleShowModal(contract)}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                                                >
                                                    <td className="d-none d-md-table-cell">
                                                        <FaCalendarAlt className="text-muted me-1" />
                                                        {new Date(contract.contractDate).toLocaleDateString('ko-KR')}

                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        <div className="fw-bold"><FaHome className="text-muted me-1" />{contract.contractNumber}</div>
                                                        <div className="text-muted small">
                                                            {contract.contractNumber?.startsWith('MM-') && '매매'}
                                                            {contract.contractNumber?.startsWith('MR-') && '월세'}
                                                            {contract.contractNumber?.startsWith('JS-') && '전세'}
                                                            {contract.contractNumber?.startsWith('CT-') && '계약'}
                                                        </div>
                                                        <div className="text-muted small">
                                                            {contract.property && contract.property.title ? contract.property.title : '매물 정보 없음'}
                                                        </div>
                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        <div>
                                                            <div><FaUser className="text-primary me-1" />매수: {buyerInfo.name}</div>
                                                            <div><FaUser className="text-warning me-1" />매도: {sellerInfo.name}</div>
                                                        </div>
                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        <div>
                                                            <FaMoneyBillWave className="text-success me-1" />
                                                            {contract.price ? `${contract.price.toLocaleString()}원` : '-'}
                                                            {contract.type === '월세' && contract.deposit && (
                                                                <div className="text-muted small">
                                                                    <FaHandshake className="me-1" />
                                                                    보증금: {contract.deposit.toLocaleString()}원
                                                                </div>
                                                            )}

                                                        </div>
                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        {contract.commission && (
                                                            <div className="text-muted small">
                                                                <FaHandshake className="me-1" />
                                                                수수료: {contract.commission.toLocaleString()}원
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        {contract.closingDate ? new Date(contract.closingDate).toLocaleDateString('ko-KR') : '-'}
                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        {getStatusBadge(contract.status)}
                                                        {contract.status === '완료' && contract.type === '매매' && (
                                                            <div className="small text-success mt-1">
                                                                <FaHandshake className="me-1" />
                                                                매물 소유권 이전 완료
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        {contract.agent ? (
                                                            <div>
                                                                <FaUser className="text-primary me-1" />
                                                                {contract.agent.name}
                                                                <div className="text-muted small">
                                                                    {contract.agent.email}
                                                                </div>
                                                            </div>
                                                        ) : '-'}
                                                    </td>


                                                    {/* 모바일 버전 */}
                                                    <td className="d-md-none">
                                                        <div className="contract-mobile-card p-3 border rounded">
                                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                                <div className="fw-bold text-primary">{contract.contractNumber}</div>
                                                                {getStatusBadge(contract.status)}
                                                            </div>
                                                            
                                                            <div className="mb-2">
                                                                <small className="text-muted d-block">매물</small>
                                                                <div className="fw-bold">
                                                                    {contract.property && contract.property.title ? contract.property.title : '매물 정보 없음'}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="row mb-2">
                                                                <div className="col-6">
                                                                    <small className="text-muted d-block">매수자</small>
                                                                    <div className="small">
                                                                        <FaUser className="text-primary me-1" />
                                                                        {buyerInfo.name}
                                                                    </div>
                                                                </div>
                                                                <div className="col-6">
                                                                    <small className="text-muted d-block">매도자</small>
                                                                    <div className="small">
                                                                        <FaUser className="text-warning me-1" />
                                                                        {sellerInfo.name}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="row mb-2">
                                                                <div className="col-6">
                                                                    <small className="text-muted d-block">거래금액</small>
                                                                    <div className="small fw-bold text-success">
                                                                        <FaMoneyBillWave className="me-1" />
                                                                        {contract.price ? `${contract.price.toLocaleString()}원` : '-'}
                                                                    </div>
                                                                </div>
                                                                <div className="col-6">
                                                                    <small className="text-muted d-block">수수료</small>
                                                                    <div className="small fw-bold text-primary">
                                                                        {contract.commission ? `${contract.commission.toLocaleString()}원` : '-'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="row mb-2">
                                                                <div className="col-6">
                                                                    <small className="text-muted d-block">계약일</small>
                                                                    <div className="small">
                                                                        <FaCalendarAlt className="me-1" />
                                                                        {new Date(contract.contractDate).toLocaleDateString('ko-KR')}
                                                                    </div>
                                                                </div>
                                                                <div className="col-6">
                                                                    <small className="text-muted d-block">담당자</small>
                                                                    <div className="small">
                                                                        {contract.agent ? contract.agent.name : '-'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="text-center mt-2">
                                                                <small className="text-muted">
                                                                    행을 클릭하여 계약 정보를 확인하거나 수정할 수 있습니다.
                                                                </small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </Table>
                            
                            {/* 페이지네이션 */}
                            {totalItems > itemsPerPage && (
                                <div className="d-flex justify-content-center mt-4">
                                    <nav>
                                        <ul className="pagination pagination-sm mb-0">
                                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                <button 
                                                    className="page-link" 
                                                    onClick={handleFirstPage}
                                                    disabled={currentPage === 1}
                                                >
                                                    <FaAngleDoubleLeft />
                                                </button>
                                            </li>
                                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                <button 
                                                    className="page-link" 
                                                    onClick={handlePrevPage}
                                                    disabled={currentPage === 1}
                                                >
                                                    <FaChevronLeft />
                                                </button>
                                            </li>
                                            
                                            {getPageNumbers().map(pageNumber => (
                                                <li key={pageNumber} className={`page-item ${currentPage === pageNumber ? 'active' : ''}`}>
                                                    <button 
                                                        className="page-link" 
                                                        onClick={() => handlePageChange(pageNumber)}
                                                    >
                                                        {pageNumber}
                                                    </button>
                                                </li>
                                            ))}
                                            
                                            <li className={`page-item ${currentPage === Math.ceil(totalItems / itemsPerPage) ? 'disabled' : ''}`}>
                                                <button 
                                                    className="page-link" 
                                                    onClick={handleNextPage}
                                                    disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
                                                >
                                                    <FaChevronRight />
                                                </button>
                                            </li>
                                            <li className={`page-item ${currentPage === Math.ceil(totalItems / itemsPerPage) ? 'disabled' : ''}`}>
                                                <button 
                                                    className="page-link" 
                                                    onClick={handleLastPage}
                                                    disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
                                                >
                                                    <FaAngleDoubleRight />
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            )}
                            
                            {/* 페이지 정보 */}
                            <div className="text-center text-muted small mt-2">
                                총 {totalItems}건 중 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)}건 표시
                            </div>
                        </Card.Body>
                    </Card>
                </Card.Body>
            </Card>

            {/* 계약 등록/수정 모달 */}
            <ContractRegistrationModal
                show={showModal}
                onHide={handleCloseModal}
                editingContract={editingContract}
                onSuccess={handleContractSuccess}
                selectedBuyer={selectedBuyer}
                setSelectedBuyer={setSelectedBuyer}
                selectedSeller={selectedSeller}
                setSelectedSeller={setSelectedSeller}
                selectedAgent={selectedAgent}
                setSelectedAgent={setSelectedAgent}
                user={user}
            />

            <style>{`
                /* 반응형 차트 스타일 */
                .monthly-chart-responsive {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                
                .month-bar-responsive {
                    transition: all 0.3s ease;
                }
                
                .month-bar-responsive:hover {
                    transform: translateY(-2px);
                }
                
                /* 모바일 카드 스타일 */
                .contract-mobile-card {
                    background: #f8f9fa;
                    border: 1px solid #dee2e6 !important;
                    transition: all 0.3s ease;
                }
                
                .contract-mobile-card:hover {
                    background: #e9ecef;
                    border-color: #007bff !important;
                    box-shadow: 0 2px 4px rgba(0,123,255,0.1);
                }
                
                /* 반응형 테이블 */
                @media (max-width: 767.98px) {
                    .table-responsive {
                        border: none;
                    }
                    
                    .table tbody tr {
                        display: block;
                        margin-bottom: 1rem;
                        border: none;
                    }
                    
                    .table tbody td {
                        display: block;
                        border: none;
                        padding: 0;
                    }
                }
                
                /* 통계 카드 반응형 */
                @media (max-width: 575.98px) {
                    .h-100 {
                        min-height: 120px;
                    }
                }
                
                /* 차트 반응형 */
                @media (max-width: 767.98px) {
                    .monthly-chart-responsive {
                        height: 200px;
                    }
                    
                    .month-bar-responsive {
                        min-width: 25px;
                        max-width: 35px;
                    }
                }
            `}</style>
        </Container>
    );
};

export default SalesManagement; 