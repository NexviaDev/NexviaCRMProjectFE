import React, { useState, useEffect, useContext } from 'react';
import { Container, Card, Button, Row, Col, Alert } from 'react-bootstrap';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { UserContext } from '../UserContext';
import ScheduleRegistrationModal from './ScheduleRegistrationModal';

// 커스텀 훅들
import { useScheduleData } from './hooks/useScheduleData';
import { usePagination, useViewMode, useFilters } from './hooks/usePagination';

// 컴포넌트들
import ScheduleFilters from './components/ScheduleFilters';
import ScheduleViewControls from './components/ScheduleViewControls';
import ScheduleCalendar from './components/ScheduleCalendar';
import ScheduleWeekView from './components/ScheduleWeekView';
import ScheduleDayView from './components/ScheduleDayView';
import ScheduleDateDetails from './components/ScheduleDateDetails';
import ScheduleList from './components/ScheduleList';
import ScheduleBriefing from './components/ScheduleBriefing';
import MeetingMessageRecommendation from './components/MeetingMessageRecommendation';

// 유틸리티 함수들
import { getSchedulesForDate } from './utils/scheduleUtils';

const ScheduleManagement = () => {
    const { user } = useContext(UserContext);
    
    // 모달 상태
    const [showModal, setShowModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [selectedScheduleForMessage, setSelectedScheduleForMessage] = useState(null);

    // 커스텀 훅들
    const filters = useFilters();
    const viewMode = useViewMode();
    const mainPagination = usePagination(1, 5);
    const datePagination = usePagination(1, 2);
    const scheduleData = useScheduleData(filters.filters);

    // 필터 변경 시 페이지 리셋 및 데이터 가져오기
    useEffect(() => {
        mainPagination.resetPage();
        const fetchData = async () => {
            const result = await scheduleData.fetchSchedules(1, mainPagination.itemsPerPage);
            mainPagination.updateTotalItems(result.total);
        };
        fetchData();
        scheduleData.fetchAllSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.filters]);

    // 페이지 변경 시 데이터 가져오기 (필터 변경이 아닌 경우에만)
    useEffect(() => {
        if (mainPagination.currentPage !== 1) {
            const fetchData = async () => {
                const result = await scheduleData.fetchSchedules(mainPagination.currentPage, mainPagination.itemsPerPage);
                mainPagination.updateTotalItems(result.total);
            };
            fetchData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mainPagination.currentPage]);

    // 선택된 날짜의 일정 총 개수 계산
    useEffect(() => {
        const allSchedulesForDate = getSchedulesForDate(viewMode.selectedDate, scheduleData.allSchedules);
        datePagination.updateTotalItems(allSchedulesForDate.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode.selectedDate, scheduleData.allSchedules]);

    // 선택된 날짜가 변경될 때 날짜 페이지 리셋
    useEffect(() => {
        datePagination.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode.selectedDate]);

    // 컴포넌트 마운트 시 현재 날짜로 초기화
    useEffect(() => {
        const today = new Date();
        viewMode.setSelectedDate(today);
        viewMode.setCurrentMonth(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 모달 관련 핸들러들
    const handleShowModal = (schedule = null) => {
        setEditingSchedule(schedule);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingSchedule(null);
    };

    const handleSuccess = () => {
        const fetchData = async () => {
            const result = await scheduleData.fetchSchedules(mainPagination.currentPage, mainPagination.itemsPerPage);
            mainPagination.updateTotalItems(result.total);
        };
        fetchData();
        scheduleData.fetchAllSchedules();
    };

    // 행 클릭으로 편집 모달 열기
    const handleRowClick = (schedule) => {
        // 모든 사용자는 자신이 등록한 일정만 편집 가능
        if (schedule.publisher && schedule.publisher._id === user._id) {
            handleShowModal(schedule);
        }
    };

    // 메시지 추천 모달 열기
    const handleShowMessageModal = (schedule) => {
        setSelectedScheduleForMessage(schedule);
        setShowMessageModal(true);
    };

    // 메시지 추천 모달 닫기
    const handleCloseMessageModal = () => {
        setShowMessageModal(false);
        setSelectedScheduleForMessage(null);
    };

    // 달력 날짜 더블클릭 핸들러 - 해당 날짜로 일정 등록 모달 열기
    const handleDateDoubleClick = (date) => {
        // 선택된 날짜를 설정하고 일정 등록 모달 열기
        viewMode.setSelectedDate(date);
        // 새로운 일정 등록을 위해 null 전달
        setEditingSchedule(null);
        setShowModal(true);
    };

    // user가 로드되지 않은 경우 로딩 표시
    if (!user) {
        return (
            <Container className="mt-4">
                <Card className="shadow-sm">
                    <Card.Body className="text-center py-5">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-3 text-muted">사용자 정보를 불러오는 중...</p>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    // level 1 이하인 경우 접근 제한 (레벨 2부터 허용)
    if (user.level <= 1) {
        return (
            <Container className="mt-4">
                <Card className="shadow-sm">
                    <Card.Header className="bg-danger text-white">
                        <h4 className="mb-0">
                            <FaCalendarAlt className="me-2" />
                            접근 제한
                        </h4>
                    </Card.Header>
                    <Card.Body className="text-center py-5">
                        <div className="mb-4">
                            <FaCalendarAlt size={64} className="text-muted mb-3" />
                            <h5 className="text-muted">권한이 부족합니다</h5>
                            <p className="text-muted">
                                일정 관리 기능을 이용하려면 더 높은 권한이 필요합니다.<br />
                                관리자에게 문의하세요.
                            </p>
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    return (
        <Container className="mt-4" style={{ paddingBottom: '80px' }}>
            <Card className="shadow-sm">
                <Card.Header className="bg-primary text-white">
                    <Row className="align-items-center">
                        <Col md={6}>
                            <h4 className="mb-0">
                                <FaCalendarAlt className="me-2" />
                                일정 관리
                            </h4>
                        </Col>
                        <Col md={6} className="text-end">
                            <ScheduleViewControls 
                                viewMode={viewMode.viewMode}
                                onViewModeChange={viewMode.handleViewModeChange}
                            />
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Body>
                    {scheduleData.error && (
                        <Alert variant="danger" onClose={() => scheduleData.setError('')} dismissible>
                            {scheduleData.error}
                        </Alert>
                    )}

                    {/* 검색 및 필터 */}
                    <ScheduleFilters
                        searchTerm={filters.searchTerm}
                        setSearchTerm={filters.setSearchTerm}
                        filterType={filters.filterType}
                        setFilterType={filters.setFilterType}
                        filterStatus={filters.filterStatus}
                        setFilterStatus={filters.setFilterStatus}
                        filterPriority={filters.filterPriority}
                        setFilterPriority={filters.setFilterPriority}
                        onAddSchedule={() => handleShowModal()}
                        loading={scheduleData.loading}
                    />

                    <Row>
                        {/* 캘린더 */}
                        <Col md={viewMode.viewMode === 'day' ? 12 : 8}>
                            <Card>
                                <Card.Header>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h5 className="mb-0">{viewMode.currentMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}</h5>
                                        <div className="d-flex gap-2">
                                            <Button 
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => viewMode.navigateMonth(-1)}
                                            >
                                                이전
                                            </Button>
                                            <Button 
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => viewMode.navigateMonth(1)}
                                            >
                                                다음
                                            </Button>
                                        </div>
                                    </div>
                                </Card.Header>
                                <Card.Body>
                                    {/* 뷰 모드에 따른 네비게이션 */}
                                    {viewMode.viewMode !== 'month' && (
                                        <Row className="mb-3">
                                            <Col md={6}>
                                                <div className="d-flex align-items-center">
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() => viewMode.navigateDate(-1)}
                                                        className="me-2"
                                                    >
                                                        <FaChevronLeft />
                                                    </Button>
                                                    <h5 className="mb-0 me-3">
                                                        {viewMode.viewMode === 'day' 
                                                            ? viewMode.selectedDate.toLocaleDateString('ko-KR', { 
                                                                year: 'numeric', 
                                                                month: 'long', 
                                                                day: 'numeric',
                                                                weekday: 'long'
                                                            })
                                                            : viewMode.selectedDate.toLocaleDateString('ko-KR', { 
                                                                year: 'numeric', 
                                                                month: 'long', 
                                                                day: 'numeric'
                                                            })
                                                        }
                                                    </h5>
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() => viewMode.navigateDate(1)}
                                                    >
                                                        <FaChevronRight />
                                                    </Button>
                                                </div>
                                            </Col>
                                        </Row>
                                    )}

                                    {/* 뷰 모드에 따른 렌더링 */}
                                    {viewMode.viewMode === 'month' && (
                                        <ScheduleCalendar
                                            currentMonth={viewMode.currentMonth}
                                            onMonthChange={viewMode.navigateMonth}
                                            selectedDate={viewMode.selectedDate}
                                            onDateSelect={viewMode.setSelectedDate}
                                            allSchedules={scheduleData.allSchedules}
                                            onDateDoubleClick={handleDateDoubleClick}
                                        />
                                    )}
                                    {viewMode.viewMode === 'week' && (
                                        <ScheduleWeekView
                                            selectedDate={viewMode.selectedDate}
                                            allSchedules={scheduleData.allSchedules}
                                            onDateSelect={viewMode.setSelectedDate}
                                        />
                                    )}
                                    {viewMode.viewMode === 'day' && (
                                        <ScheduleDayView
                                            selectedDate={viewMode.selectedDate}
                                            allSchedules={scheduleData.allSchedules}
                                            onScheduleClick={handleRowClick}
                                            user={user}
                                        />
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* 선택된 날짜의 일정 - 월간/주간 뷰에서 표시 */}
                        {(viewMode.viewMode === 'month' || viewMode.viewMode === 'week') && (
                            <Col md={4}>
                                <ScheduleDateDetails
                                    selectedDate={viewMode.selectedDate}
                                    allSchedules={scheduleData.allSchedules}
                                    currentDatePage={datePagination.currentPage}
                                    dateItemsPerPage={datePagination.itemsPerPage}
                                    totalDateItems={datePagination.totalItems}
                                    onScheduleClick={handleRowClick}
                                    onDatePageChange={datePagination.handlePageChange}
                                    user={user}
                                />
                            </Col>
                        )}
                    </Row>
                </Card.Body>
            </Card>

            {/* AI 스케줄 브리핑 섹션 */}
            <Card className="mt-4">
                <ScheduleBriefing user={user} />
            </Card>

            {/* 일정 리스트 섹션 */}
            <Card className="mt-4">
                <Card.Header>
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">전체 일정 목록</h5>
                    </div>
                </Card.Header>
                <Card.Body>
                    <ScheduleList
                        schedules={scheduleData.schedules}
                        loading={scheduleData.loading}
                        error={scheduleData.error}
                        currentPage={mainPagination.currentPage}
                        totalPages={mainPagination.totalPages}
                        totalItems={mainPagination.totalItems}
                        itemsPerPage={mainPagination.itemsPerPage}
                        onPageChange={mainPagination.handlePageChange}
                        onScheduleClick={handleRowClick}
                        onMessageRecommendation={handleShowMessageModal}
                        user={user}
                    />
                </Card.Body>
            </Card>

            {/* 일정 등록/수정 모달 */}
            <ScheduleRegistrationModal
                showModal={showModal}
                onHide={handleCloseModal}
                editingSchedule={editingSchedule}
                onSuccess={handleSuccess}
                user={user}
                selectedDate={viewMode.selectedDate}
            />

            {/* 메시지 추천 모달 */}
            {showMessageModal && selectedScheduleForMessage && (
                <MeetingMessageRecommendation
                    schedule={selectedScheduleForMessage}
                    onClose={handleCloseMessageModal}
                />
            )}

            <style>{`
                .calendar-grid {
                    display: flex;
                    flex-direction: column;
                }
                .calendar-header {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    background-color: #f8f9fa;
                    border-bottom: 1px solid #dee2e6;
                }
                .calendar-day-header {
                    padding: 10px;
                    text-align: center;
                    font-weight: bold;
                }
                .calendar-body {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                }
                .calendar-day {
                    min-height: 80px;
                    border: 1px solid #dee2e6;
                    padding: 5px;
                    cursor: pointer;
                    position: relative;
                }
                .calendar-day:hover {
                    background-color: #f8f9fa;
                }
                .calendar-day.selected {
                    background-color: #b3d9ff;
                    color: #1a5490;
                    border: 2px solid #80bfff;
                }
                .calendar-day.has-date {
                    background-color: white;
                }
                .date-number {
                    font-weight: bold;
                    display: block;
                }
                .schedule-indicator {
                    position: absolute;
                    bottom: 5px;
                    right: 5px;
                }
                .schedule-count {
                    font-size: 0.7rem;
                }
                
                /* 뷰 모드별 스타일 */
                .day-view .schedule-item {
                    border-left: 3px solid #007bff;
                    padding-left: 10px;
                    margin-bottom: 10px;
                }
                
                .week-view .card {
                    transition: transform 0.2s ease-in-out;
                }
                .week-view .card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                .week-view .selected-day {
                    background-color: #b3d9ff !important;
                    border: 2px solid #80bfff !important;
                }
                .week-view .selected-day .card-header {
                    background-color: #e6f3ff !important;
                    color: #1a5490;
                }
                
                .month-view .calendar-day-content {
                    transition: all 0.2s ease-in-out;
                }
                .month-view .calendar-day-content:hover {
                    transform: scale(1.02);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .schedule-item-clickable {
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                }
                .schedule-item-clickable:hover {
                    background-color: #f8f9fa !important;
                }
                
                .table-row-clickable {
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                }
                .table-row-clickable:hover {
                    background-color: #f8f9fa !important;
                }
                .table-row-clickable:active {
                    background-color: #e9ecef !important;
                }
                .list-group-item-clickable {
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                }
                .list-group-item-clickable:hover {
                    background-color: #f8f9fa !important;
                }
                .list-group-item-clickable:active {
                    background-color: #e9ecef !important;
                }
            `}</style>
        </Container>
    );
};

export default ScheduleManagement;