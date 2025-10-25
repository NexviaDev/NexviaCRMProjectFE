import React from 'react';
import { Card, ListGroup, Pagination } from 'react-bootstrap';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUser, FaHome, FaChevronLeft, FaChevronRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { getSchedulesForDate, getPageNumbers } from '../utils/scheduleUtils';
import { getTypeBadge, getStatusBadge, getPriorityBadge } from '../utils/badgeUtils';
import { formatPhoneNumber } from '../utils/scheduleUtils';

const ScheduleDateDetails = ({ 
    selectedDate, 
    allSchedules, 
    currentDatePage, 
    dateItemsPerPage, 
    totalDateItems, 
    onScheduleClick, 
    onDatePageChange, 
    user 
}) => {
    const allSchedulesForDate = getSchedulesForDate(selectedDate, allSchedules);
    const startIndex = (currentDatePage - 1) * dateItemsPerPage;
    const endIndex = startIndex + dateItemsPerPage;
    const selectedDateSchedules = allSchedulesForDate.slice(startIndex, endIndex);
    const totalDatePages = Math.ceil(totalDateItems / dateItemsPerPage);

    const handleDateFirstPage = () => onDatePageChange(1);
    const handleDateLastPage = () => onDatePageChange(totalDatePages);
    const handleDatePrevPage = () => onDatePageChange(Math.max(currentDatePage - 1, 1));
    const handleDateNextPage = () => onDatePageChange(Math.min(currentDatePage + 1, totalDatePages));

    return (
        <Card>
            <Card.Header>
                <h6 className="mb-0">
                    {selectedDate.toLocaleDateString('ko-KR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })} 일정
                </h6>
            </Card.Header>
            <Card.Body>
                {selectedDateSchedules.length > 0 ? (
                    <>
                        <ListGroup>
                            {selectedDateSchedules.map(schedule => (
                                <ListGroup.Item 
                                    key={schedule._id} 
                                    onClick={() => onScheduleClick(schedule)}
                                    style={{ 
                                        cursor: (schedule.publisher && schedule.publisher._id === user._id) ? 'pointer' : 'default'
                                    }}
                                    className={`mb-2 ${(schedule.publisher && schedule.publisher._id === user._id) ? 'list-group-item-clickable' : ''}`}
                                >
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div className="flex-grow-1">
                                            <h6 className="mb-1">{schedule.title}</h6>
                                            <div className="mb-1">
                                                {getTypeBadge(schedule.type)} {getPriorityBadge(schedule.priority)}
                                            </div>
                                            <small className="text-muted">
                                                <FaClock className="me-1" />
                                                {schedule.time}
                                            </small>
                                            <br />
                                            <small className="text-muted">
                                                <FaMapMarkerAlt className="me-1" />
                                                {schedule.location}
                                            </small>
                                            {schedule.relatedCustomer && (
                                                <div>
                                                    <small className="text-muted">
                                                        <FaUser className="me-1" />
                                                        {schedule.relatedCustomer.name}
                                                    </small>
                                                </div>
                                            )}
                                            {schedule.relatedProperty && (
                                                <div>
                                                    <small className="text-muted">
                                                        <FaHome className="me-1" />
                                                        {schedule.relatedProperty.title}
                                                    </small>
                                                </div>
                                            )}
                                            <div>
                                                <small className="text-muted">
                                                    <FaUser className="me-1" />
                                                    게시자: {schedule.publisher?.name || '알 수 없음'}
                                                </small>
                                            </div>
                                            {schedule.publisher?.phone && (
                                                <div>
                                                    <small className="text-muted">
                                                        <FaClock className="me-1" />
                                                        연락처: {formatPhoneNumber(schedule.publisher.phone)}
                                                    </small>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>

                        {/* 선택된 날짜의 일정 페이지네이션 */}
                        {totalDatePages > 1 && (
                            <div className="d-flex justify-content-center mt-3">
                                <nav aria-label="선택된 날짜의 일정 페이지네이션">
                                    <ul className="pagination pagination-sm">
                                        {/* 맨 앞으로 버튼 */}
                                        <li className={`page-item ${currentDatePage === 1 ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={handleDateFirstPage}
                                                disabled={currentDatePage === 1}
                                                aria-label="첫 페이지"
                                            >
                                                <FaAngleDoubleLeft />
                                            </button>
                                        </li>

                                        {/* 이전 버튼 */}
                                        <li className={`page-item ${currentDatePage === 1 ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={handleDatePrevPage}
                                                disabled={currentDatePage === 1}
                                                aria-label="이전 페이지"
                                            >
                                                <FaChevronLeft />
                                            </button>
                                        </li>

                                        {/* 페이지 번호들 */}
                                        {getPageNumbers(currentDatePage, totalDatePages).map(number => (
                                            <li key={number} className={`page-item ${currentDatePage === number ? 'active' : ''}`}>
                                                <button
                                                    className="page-link"
                                                    onClick={() => onDatePageChange(number)}
                                                >
                                                    {number}
                                                </button>
                                            </li>
                                        ))}

                                        {/* 다음 버튼 */}
                                        <li className={`page-item ${currentDatePage === totalDatePages ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={handleDateNextPage}
                                                disabled={currentDatePage === totalDatePages}
                                                aria-label="다음 페이지"
                                            >
                                                <FaChevronRight />
                                            </button>
                                        </li>

                                        {/* 맨 뒤로 버튼 */}
                                        <li className={`page-item ${currentDatePage === totalDatePages ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={handleDateLastPage}
                                                disabled={currentDatePage === totalDatePages}
                                                aria-label="마지막 페이지"
                                            >
                                                <FaAngleDoubleRight />
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        )}

                        {/* 선택된 날짜의 일정 페이지 정보 */}
                        {totalDateItems > 0 && (
                            <div className="text-center mt-2">
                                <small className="text-muted">
                                    총 {totalDateItems}개의 일정 중 {(currentDatePage - 1) * dateItemsPerPage + 1} - {Math.min(currentDatePage * dateItemsPerPage, totalDateItems)}번째 일정을 보고 있습니다.
                                </small>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-4">
                        <FaCalendarAlt size={48} className="text-muted mb-3" />
                        <p className="text-muted">해당 날짜의 일정이 없습니다.</p>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default ScheduleDateDetails;

