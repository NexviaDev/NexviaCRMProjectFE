import React from 'react';
import { Row, Col, Badge, Button } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { getDaysInMonth, getSchedulesForDate, formatDate } from '../utils/scheduleUtils';

const ScheduleCalendar = ({ 
    currentMonth, 
    onMonthChange, 
    selectedDate, 
    onDateSelect, 
    allSchedules,
    onDateDoubleClick 
}) => {
    const days = getDaysInMonth(currentMonth);

    return (
        <div className="month-view">
            <style>{`
                .calendar-day.has-date {
                    transition: all 0.2s ease;
                }
                
                .calendar-day.has-date:hover {
                    background-color: #e3f2fd;
                    transform: scale(1.02);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                
                .calendar-day.has-date:active {
                    transform: scale(0.98);
                }
                
                .calendar-day.selected {
                    background-color: #e3f2fd !important;
                    color: #1976d2;
                    border: 2px solid #90caf9;
                }
                
                .calendar-day.selected:hover {
                    background-color: #bbdefb !important;
                    border-color: #64b5f6;
                }
                
                .schedule-indicator {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                }
                
                .schedule-count {
                    font-size: 0.7rem;
                    padding: 2px 6px;
                }
            `}</style>
            <Row className="mb-3">
                <Col md={6}>
                    <div className="d-flex align-items-center">
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => onMonthChange(-1)}
                            className="me-2"
                        >
                            <FaChevronLeft />
                        </Button>
                        <h5 className="mb-0 me-3">{formatDate(currentMonth)}</h5>
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => onMonthChange(1)}
                        >
                            <FaChevronRight />
                        </Button>
                    </div>
                </Col>
            </Row>

            <div className="calendar-grid">
                <div className="calendar-header">
                    {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                        <div key={day} className="calendar-day-header">{day}</div>
                    ))}
                </div>
                <div className="calendar-body">
                    {days.map((day, index) => (
                        <div 
                            key={index} 
                            className={`calendar-day ${day ? 'has-date' : ''} ${
                                day && day.toDateString() === selectedDate.toDateString() ? 'selected' : ''
                            }`}
                            onClick={() => day && onDateSelect(day)}
                            onDoubleClick={() => day && onDateDoubleClick && onDateDoubleClick(day)}
                            style={{ cursor: day ? 'pointer' : 'default' }}
                            title={day ? `${day.getDate()}일 더블클릭으로 일정 추가` : ''}
                        >
                            {day && (
                                <>
                                    <span className="date-number">{day.getDate()}</span>
                                    {getSchedulesForDate(day, allSchedules).length > 0 && (
                                        <div className="schedule-indicator">
                                            <Badge bg="primary" className="schedule-count">
                                                {getSchedulesForDate(day, allSchedules).length}
                                            </Badge>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ScheduleCalendar;

