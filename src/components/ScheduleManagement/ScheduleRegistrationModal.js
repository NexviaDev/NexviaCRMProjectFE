import React, { useState, useEffect, useContext } from 'react';
import { Modal, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUser, FaHome, FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import { UserContext } from '../UserContext';
import api from '../../utils/api';
import Select from 'react-select';

const ScheduleRegistrationModal = ({ showModal, onHide, editingSchedule, onSuccess, user, preSelectedCustomers = [], selectedDate }) => {
    const [formData, setFormData] = useState({
        title: '',
        type: '시세조사',
        date: '',
        time: '09:00',
        location: '',
        description: '',
        priority: '보통',
        status: '예정',
        relatedCustomers: [],
        relatedProperties: [],
        cancelReason: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [customers, setCustomers] = useState([]);
    const [properties, setProperties] = useState([]);
    const [customerOptions, setCustomerOptions] = useState([]);
    const [propertyOptions, setPropertyOptions] = useState([]);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [showCustomerResults, setShowCustomerResults] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // 편집 중인 일정이 있으면 폼 데이터 설정
    useEffect(() => {
        if (editingSchedule && editingSchedule._id) {
            const relatedCustomers = editingSchedule.relatedCustomers && editingSchedule.relatedCustomers.length > 0 
                ? editingSchedule.relatedCustomers.map(c => c._id || c)
                : (editingSchedule.relatedCustomer ? [editingSchedule.relatedCustomer._id || editingSchedule.relatedCustomer] : []);
            
            const relatedProperties = editingSchedule.relatedProperties && editingSchedule.relatedProperties.length > 0
                ? editingSchedule.relatedProperties.map(p => p._id || p)
                : (editingSchedule.relatedProperty ? [editingSchedule.relatedProperty._id || editingSchedule.relatedProperty] : []);

            setFormData({
                title: editingSchedule.title || '',
                type: editingSchedule.type || '시세조사',
                date: editingSchedule.date ? new Date(editingSchedule.date).toISOString().split('T')[0] : '',
                time: editingSchedule.time || '09:00',
                location: editingSchedule.location || '',
                description: editingSchedule.description || '',
                priority: editingSchedule.priority || '보통',
                status: editingSchedule.status || '예정',
                relatedCustomers: relatedCustomers,
                relatedProperties: relatedProperties
            });
            
            if (relatedCustomers.length > 0) {
                const firstCustomerId = relatedCustomers[0];
                const firstCustomer = customers.find(c => c._id === firstCustomerId);
                if (firstCustomer) {
                    setCustomerSearchTerm(firstCustomer.name || '');
                }
            }
        } else {
            // selectedDate가 있으면 사용, 없으면 오늘 날짜 사용
            const defaultDate = selectedDate 
                ? selectedDate.toISOString().split('T')[0] 
                : new Date().toISOString().split('T')[0];
            setFormData({
                title: '',
                type: '시세조사',
                date: defaultDate,
                time: '09:00',
                location: '',
                description: '',
                priority: '보통',
                status: '예정',
                relatedCustomers: preSelectedCustomers,
                relatedProperties: [],
                cancelReason: ''
            });
            setCustomerSearchTerm('');
        }
    }, [editingSchedule, customers, selectedDate]);

    // 고객 목록과 매물 목록 가져오기
    useEffect(() => {
        if (showModal) {
            fetchCustomers();
            fetchProperties();
        }
    }, [showModal]);

    // 고객 검색 결과
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // 고객 검색 함수
    const searchCustomers = async (searchTerm) => {
        if (!searchTerm || searchTerm.trim().length === 0) {
            setFilteredCustomers([]);
            return;
        }

        setSearchLoading(true);
        try {
            const response = await api.get(`/customers/search?q=${encodeURIComponent(searchTerm.trim())}`);
            if (response.data.success) {
                setFilteredCustomers(response.data.data);
            }
        } catch (error) {
            console.error('고객 검색 오류:', error);
            setFilteredCustomers([]);
        } finally {
            setSearchLoading(false);
        }
    };

    // 검색어 변경 시 디바운스 적용
    useEffect(() => {
        const timer = setTimeout(() => {
            searchCustomers(customerSearchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [customerSearchTerm]);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers?limit=1000');
            if (response.data.success) {
                setCustomers(response.data.data);
            }
        } catch (error) {
            console.error('고객 목록 조회 오류:', error);
        }
    };

    const fetchProperties = async () => {
        try {
            const response = await api.get('/properties?limit=100');
            if (response.data.success) {
                setProperties(response.data.data);
                
                const options = response.data.data.map(property => ({
                    value: property._id,
                    label: property.title
                }));
                setPropertyOptions(options);
            }
        } catch (error) {
            console.error('매물 목록 조회 오류:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCustomerChange = (customerId) => {
        if (!customerId) return;
        
        setFormData(prev => {
            const newCustomers = [...prev.relatedCustomers, customerId];
            return {
                ...prev,
                relatedCustomers: newCustomers
            };
        });
        
        setCustomerSearchTerm('');
        setShowCustomerResults(false);
    };

    const handleRemoveCustomer = (customerId) => {
        setFormData(prev => ({
            ...prev,
            relatedCustomers: prev.relatedCustomers.filter(id => id !== customerId)
        }));
    };

    const handlePropertyChange = (selectedOption) => {
        if (!selectedOption) return;
        
        setFormData(prev => ({
            ...prev,
            relatedProperties: [...prev.relatedProperties, selectedOption.value]
        }));
    };

    const handleRemoveProperty = (propertyId) => {
        setFormData(prev => ({
            ...prev,
            relatedProperties: prev.relatedProperties.filter(id => id !== propertyId)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (editingSchedule && editingSchedule.publisher && user && user._id) {
                const schedulePublisherId = editingSchedule.publisher._id || editingSchedule.publisher;
                const currentUserId = user._id;
                
                if (schedulePublisherId !== currentUserId) {
                    setError('본인이 등록한 일정만 수정할 수 있습니다.');
                    setLoading(false);
                    return;
                }
            }

            if (formData.status === '취소' && !formData.cancelReason.trim()) {
                setError('취소 상태로 변경할 때는 취소 사유를 입력해주세요.');
                setLoading(false);
                return;
            }

            const safeRelatedCustomers = Array.isArray(formData.relatedCustomers) ? formData.relatedCustomers : [];
            const safeRelatedProperties = Array.isArray(formData.relatedProperties) ? formData.relatedProperties : [];

            const submitData = {
                ...formData,
                date: new Date(formData.date).toISOString(),
                relatedCustomers: safeRelatedCustomers,
                relatedProperties: safeRelatedProperties
            };

            let response;
            if (editingSchedule) {
                response = await api.put(`/schedules/${editingSchedule._id}`, submitData);
            } else {
                response = await api.post('/schedules', submitData);
            }

            if (response.data.success) {
                onSuccess();
                onHide();
            } else {
                setError(response.data.message || '일정 저장에 실패했습니다.');
            }
        } catch (error) {
            console.error('일정 저장 오류:', error);
            if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError('일정 저장 중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            title: '',
            type: '시세조사',
            date: '',
            time: '09:00',
            location: '',
            description: '',
            priority: '보통',
            status: '예정',
            relatedCustomers: [],
            relatedProperties: [],
            cancelReason: ''
        });
        setError('');
        setLoading(false);
        setCustomerSearchTerm('');
        setShowCustomerResults(false);
        setShowDeleteConfirm(false);
        onHide();
    };

    const handleDelete = async () => {
        if (!editingSchedule || !editingSchedule._id) {
            setError('삭제할 일정이 없습니다.');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await api.delete(`/schedules/${editingSchedule._id}`);

            if (response.data.success) {
                onSuccess();
                handleClose();
            } else {
                setError(response.data.message || '일정 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('일정 삭제 오류:', error);
            setError('일정 삭제 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Modal show={showModal} onHide={handleClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editingSchedule ? (
                            <>
                                <FaEdit className="me-2" />
                                일정 수정
                            </>
                        ) : (
                            <>
                                <FaPlus className="me-2" />
                                일정 등록
                            </>
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        {error && (
                            <Alert variant="danger" onClose={() => setError('')} dismissible>
                                {error}
                            </Alert>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Label>상태 변경</Form.Label>
                            <Form.Select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                            >
                                <option value="예정">예정</option>
                                <option value="진행중">진행중</option>
                                <option value="완료">완료</option>
                                <option value="취소">취소</option>
                            </Form.Select>
                            <small className="text-muted">
                                상태를 변경하여 일정의 진행 상황을 업데이트하세요.
                            </small>
                        </Form.Group>

                        {formData.status === '취소' && (
                            <Form.Group className="mb-3">
                                <Form.Label>취소 사유 <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    name="cancelReason"
                                    value={formData.cancelReason}
                                    onChange={handleInputChange}
                                    placeholder="취소 사유를 입력하세요"
                                    required={formData.status === '취소'}
                                />
                                <small className="text-muted">
                                    취소 사유를 입력해주세요.
                                </small>
                            </Form.Group>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Label>
                                <FaCalendarAlt className="me-2" />
                                일정 제목 *
                            </Form.Label>
                            <Form.Control
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="일정 제목을 입력하세요"
                                required
                            />
                        </Form.Group>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>일정 유형 *</Form.Label>
                                    <Form.Select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="시세조사">시세조사</option>
                                        <option value="고객상담">고객상담</option>
                                        <option value="계약관리">계약관리</option>
                                        <option value="기타">기타</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>우선순위 *</Form.Label>
                                    <Form.Select
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="높음">높음</option>
                                        <option value="보통">보통</option>
                                        <option value="낮음">낮음</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FaCalendarAlt className="me-2" />
                                        날짜 *
                                    </Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FaClock className="me-2" />
                                        시간 *
                                    </Form.Label>
                                    <Form.Control
                                        type="time"
                                        name="time"
                                        value={formData.time}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>
                                <FaMapMarkerAlt className="me-2" />
                                장소 *
                            </Form.Label>
                            <Form.Control
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                placeholder="장소를 입력하세요"
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>상세 내용</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="일정에 대한 상세 내용을 입력하세요"
                            />
                        </Form.Group>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FaUser className="me-2" />
                                        관련 고객
                                        {editingSchedule && (
                                            <small className="text-muted ms-2">(수정 불가)</small>
                                        )}
                                    </Form.Label>
                                    <div className="position-relative">
                                        <Form.Control
                                            type="text"
                                            placeholder={editingSchedule ? "수정 모드에서는 변경할 수 없습니다" : "고객명, 전화번호로 검색하세요..."}
                                            value={customerSearchTerm}
                                            onChange={(e) => !editingSchedule && setCustomerSearchTerm(e.target.value)}
                                            onFocus={() => !editingSchedule && setShowCustomerResults(true)}
                                            disabled={editingSchedule}
                                            className={editingSchedule ? "bg-light" : ""}
                                        />
                                        
                                        {showCustomerResults && !editingSchedule && (
                                            <div className="position-absolute w-100 bg-white border rounded shadow-sm" style={{ zIndex: 1000, maxHeight: '300px', overflowY: 'auto' }}>
                                                {searchLoading ? (
                                                    <div className="p-2 text-center text-muted">
                                                        <small>검색 중...</small>
                                                    </div>
                                                ) : filteredCustomers.length > 0 ? (
                                                    filteredCustomers.map(customer => (
                                                        <div
                                                            key={customer._id}
                                                            className="p-2 border-bottom cursor-pointer hover-bg-light"
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => {
                                                                handleCustomerChange(customer._id);
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                                        >
                                                            <div className="d-flex align-items-center">
                                                                <span className="fw-bold me-2">{customer.name.split(' ')[0]}</span>
                                                                <span className="text-muted">{customer.name.split(' ').slice(1).join(' ')}</span>
                                                            </div>
                                                            <small className="text-muted">{customer.phone || '연락처 없음'}</small>
                                                        </div>
                                                    ))
                                                ) : customerSearchTerm ? (
                                                    <div className="p-2 text-muted">검색 결과가 없습니다</div>
                                                ) : (
                                                    <div className="p-2 text-muted">고객명이나 전화번호를 입력하세요</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-2">
                                        <small className="text-muted mb-2 d-block">
                                            선택된 고객: {(formData.relatedCustomers || []).length}명
                                        </small>
                                        {(formData.relatedCustomers || []).length > 0 ? (
                                            (formData.relatedCustomers || []).map(customerId => {
                                                const customer = customers.find(c => {
                                                    const customerIdStr = customerId?.toString?.() || String(customerId);
                                                    const customerIdFromDB = c._id?.toString?.() || String(c._id);
                                                    return customerIdStr === customerIdFromDB;
                                                });

                                                return customer ? (
                                                    <div key={customerId} className="d-flex align-items-center justify-content-between p-2 bg-light rounded mb-1">
                                                        <div>
                                                            <span className="fw-bold me-2">{customer.name}</span>
                                                            <small className="text-muted">{customer.phone || '연락처 없음'}</small>
                                                        </div>
                                                        {!editingSchedule && (
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => handleRemoveCustomer(customerId)}
                                                            >
                                                                ×
                                                            </Button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div key={customerId} className="p-2 bg-warning rounded mb-1">
                                                        <small className="text-warning">고객 ID {customerId}를 찾을 수 없습니다</small>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-2 bg-light rounded">
                                                <small className="text-muted">선택된 고객이 없습니다</small>
                                            </div>
                                        )}
                                    </div>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FaHome className="me-2" />
                                        관련 매물
                                        {editingSchedule && (
                                            <small className="text-muted ms-2">(수정 불가)</small>
                                        )}
                                    </Form.Label>
                                    <Select
                                        value=""
                                        onChange={handlePropertyChange}
                                        options={propertyOptions.filter(option => 
                                            !(formData.relatedProperties || []).includes(option.value)
                                        )}
                                        placeholder={editingSchedule ? "수정 모드에서는 변경할 수 없습니다" : "매물을 선택하세요..."}
                                        isClearable={false}
                                        isSearchable={!editingSchedule}
                                        isDisabled={editingSchedule}
                                        noOptionsMessage={() => "검색 결과가 없습니다"}
                                        loadingMessage={() => "로딩 중..."}
                                        className={editingSchedule ? "opacity-50" : ""}
                                    />
                                    
                                    {(formData.relatedProperties || []).length > 0 && (
                                        <div className="mt-2">
                                            <small className="text-muted mb-2 d-block">선택된 매물:</small>
                                            {(formData.relatedProperties || []).map(propertyId => {
                                                const property = properties.find(p => p._id === propertyId);
                                                return property ? (
                                                    <div key={propertyId} className="d-flex align-items-center justify-content-between p-2 bg-light rounded mb-1">
                                                        <div>
                                                            <span className="fw-bold me-2">{property.title}</span>
                                                            <small className="text-muted">{property.address || '주소 없음'}</small>
                                                        </div>
                                                        {!editingSchedule && (
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => handleRemoveProperty(propertyId)}
                                                            >
                                                                ×
                                                            </Button>
                                                        )}
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    )}
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>

                        
                        {editingSchedule && (
                            <Button 
                                variant="danger" 
                                onClick={() => setShowDeleteConfirm(true)} 
                                disabled={loading}
                            >
                                <FaTrash/>
                            </Button>
                        )}
                        
                        {editingSchedule ? (
                            editingSchedule.publisher && user && user._id && 
                            (editingSchedule.publisher._id || editingSchedule.publisher) === user._id ? (
                                <Button variant="primary" type="submit" disabled={loading}>
                                    {loading ? '저장 중...' : <FaEdit/>}
                                </Button>
                            ) : null
                        ) : (
                            <Button variant="primary" type="submit" disabled={loading}>
                                {loading ? '저장 중...' : '등록'}
                            </Button>
                        )}
                    </Modal.Footer>
                </Form>
            </Modal>

            <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>일정 삭제 확인</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>정말로 이 일정을 삭제하시겠습니까?</p>
                    <p className="text-muted">
                        <strong>일정:</strong> {editingSchedule?.title}<br />
                        <strong>날짜:</strong> {editingSchedule?.date ? new Date(editingSchedule.date).toLocaleDateString('ko-KR') : 'N/A'}<br />
                        <strong>시간:</strong> {editingSchedule?.time || 'N/A'}
                    </p>
                    <Alert variant="warning">
                        <strong>주의:</strong> 삭제된 일정은 복구할 수 없습니다.
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={loading}>
                        취소
                    </Button>
                    <Button variant="danger" onClick={handleDelete} disabled={loading}>
                        {loading ? '삭제 중...' : '삭제'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default ScheduleRegistrationModal; 