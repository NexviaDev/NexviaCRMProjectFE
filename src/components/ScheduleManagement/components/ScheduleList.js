import React from 'react';
import { Card, Form, Pagination, Button } from 'react-bootstrap';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUser, FaComments } from 'react-icons/fa';
import { createSchedulePagination } from '../utils/scheduleUtils';
import { getTypeBadge, getStatusBadge, getPriorityBadge } from '../utils/badgeUtils';

const ScheduleList = ({ 
    schedules, 
    loading, 
    error, 
    currentPage, 
    totalPages, 
    totalItems, 
    itemsPerPage, 
    onPageChange, 
    onScheduleClick, 
    onMessageRecommendation,
    user 
}) => {
    if (loading) {
        return (
            <div className="text-center py-4">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">로딩 중...</span>
                </div>
                <p className="mt-2">일정 목록을 불러오는 중...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-4">
                <p className="text-danger">{error}</p>
            </div>
        );
    }

    if (schedules.length === 0) {
        return (
            <div className="text-center py-4">
                <FaCalendarAlt size={48} className="text-muted mb-3" />
                <p className="text-muted">등록된 일정이 없습니다.</p>
            </div>
        );
    }

    return (
        <>
            {/* 일정 목록 테이블 */}
            <div className="table-responsive">
                <table className="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>일정 정보</th>
                            <th>날짜/시간</th>
                            <th>장소</th>
                            <th>담당자</th>
                            <th>상태</th>
                            <th>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schedules.map((schedule) => (
                            <tr 
                                key={schedule._id}
                                onClick={() => onScheduleClick(schedule)}
                                style={{ 
                                    cursor: (schedule.publisher && schedule.publisher._id === user._id) ? 'pointer' : 'default'
                                }}
                                className={(schedule.publisher && schedule.publisher._id === user._id) ? 'table-row-clickable' : ''}
                            >
                                <td>
                                    <div className="d-flex align-items-center">
                                        {getTypeBadge(schedule.type)}
                                        <div className="ms-2">
                                            <div className="fw-bold">{schedule.title}</div>
                                            <small className="text-muted">
                                                {getPriorityBadge(schedule.priority)}
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
                                            {new Date(schedule.date).toLocaleDateString('ko-KR')}
                                        </div>
                                        <small className="text-muted">
                                            <FaClock className="me-1" />
                                            {schedule.time}
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
                                    {schedule.relatedCustomers && schedule.relatedCustomers.length > 0 && (
                                        <Button
                                            variant="outline-info"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onMessageRecommendation(schedule);
                                            }}
                                            title="메시지 추천"
                                        >
                                            <FaComments />
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                    <Pagination className="mb-0">
                        {createSchedulePagination(currentPage, totalPages, onPageChange, 'schedule-list').map((item, index) => {
                            switch (item.type) {
                                case 'first':
                                    return (
                                        <Pagination.First
                                            key={item.key}
                                            onClick={item.onClick}
                                            disabled={item.disabled}
                                            className="border-0"
                                            title={item.title}
                                        >
                                            {item.content}
                                        </Pagination.First>
                                    );
                                case 'prev':
                                    return (
                                        <Pagination.Prev
                                            key={item.key}
                                            onClick={item.onClick}
                                            disabled={item.disabled}
                                            className="border-0"
                                            title={item.title}
                                        >
                                            {item.content}
                                        </Pagination.Prev>
                                    );
                                case 'next':
                                    return (
                                        <Pagination.Next
                                            key={item.key}
                                            onClick={item.onClick}
                                            disabled={item.disabled}
                                            className="border-0"
                                            title={item.title}
                                        >
                                            {item.content}
                                        </Pagination.Next>
                                    );
                                case 'last':
                                    return (
                                        <Pagination.Last
                                            key={item.key}
                                            onClick={item.onClick}
                                            disabled={item.disabled}
                                            className="border-0"
                                            title={item.title}
                                        >
                                            {item.content}
                                        </Pagination.Last>
                                    );
                                case 'item':
                                default:
                                    return (
                                        <Pagination.Item
                                            key={item.key}
                                            active={item.active}
                                            onClick={item.onClick}
                                            className="border-0"
                                        >
                                            {item.content}
                                        </Pagination.Item>
                                    );
                            }
                        })}
                    </Pagination>
                </div>
            )}

            {/* 페이지 정보 */}
            <div className="text-center mt-3">
                <small className="text-muted">
                    총 {totalItems}개의 일정 중 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)}번째 일정을 보고 있습니다.
                </small>
            </div>
        </>
    );
};

export default ScheduleList;
