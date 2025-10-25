import React from 'react';
import { ListGroup, Alert } from 'react-bootstrap';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUser, FaHome } from 'react-icons/fa';
import { getDateRange } from '../utils/scheduleUtils';
import { getTypeBadge, getStatusBadge, getPriorityBadge } from '../utils/badgeUtils';

const ScheduleDayView = ({ selectedDate, allSchedules, onScheduleClick, user }) => {
    const { start, end } = getDateRange(selectedDate, 'day');
    
    const daySchedules = allSchedules.filter(schedule => {
        const scheduleDate = new Date(schedule.date);
        return scheduleDate >= start && scheduleDate <= end;
    });

    const dayName = selectedDate.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    });

    return (
        <div className="day-view">
            <h5 className="mb-3">
                <FaCalendarAlt className="me-2" />
                {dayName}
            </h5>
            {daySchedules.length === 0 ? (
                <Alert variant="info" className="text-center">
                    이 날짜에는 일정이 없습니다.
                </Alert>
            ) : (
                <ListGroup>
                    {daySchedules.map((schedule) => (
                        <ListGroup.Item 
                            key={schedule._id} 
                            className="d-flex justify-content-between align-items-start schedule-item-clickable"
                            onClick={() => onScheduleClick(schedule)}
                            style={{ 
                                cursor: (schedule.publisher && schedule.publisher._id === user._id) ? 'pointer' : 'default'
                            }}
                        >
                            <div className="ms-2 me-auto">
                                <div className="fw-bold">{schedule.title}</div>
                                <small className="text-muted">
                                    <FaClock className="me-1" />
                                    {schedule.time} | 
                                    <FaMapMarkerAlt className="ms-2 me-1" />
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
                            </div>
                            <div className="d-flex gap-2">
                                {getTypeBadge(schedule.type)}
                                {getStatusBadge(schedule.status)}
                                {getPriorityBadge(schedule.priority)}
                            </div>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            )}
        </div>
    );
};

export default ScheduleDayView;

