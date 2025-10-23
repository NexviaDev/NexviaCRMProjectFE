import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import api from '../../utils/api';
import PropertyRegistrationModal from '../PropertyManagement/PropertyRegistrationModal';
import CustomerBasicInfo from './CustomerBasicInfo';
import CustomerSaleInfo from './CustomerSaleInfo';
import CustomerBuyInfo from './CustomerBuyInfo';
import PropertySelectionModal from './PropertySelectionModal';
import CustomerDuplicateCheck from './CustomerDuplicateCheck';
import { getInitialBuyPriceRanges } from './customerUtils';

const CustomerRegistrationModal = ({
    showModal,
    onHide,
    editingCustomer,
    onSuccess,
    user,
    fixedCustomerType
}) => {
    // 모드 상태: 'search' (중복검색), 'register' (등록/수정)
    const [modalMode, setModalMode] = useState('search');
    const [isDuplicateMode, setIsDuplicateMode] = useState(false);
    const [duplicateCustomer, setDuplicateCustomer] = useState(null);
    const [searchData, setSearchData] = useState({
        name: '',
        phone: '',
        email: ''
    });

    const [categories, setCategories] = useState(
        editingCustomer?.categories || []
    );

    const [buyTypes, setBuyTypes] = useState(
        editingCustomer?.buyTypes || []
    );

    // 매수 가격대 상태 추가
    const [buyPriceRanges, setBuyPriceRanges] = useState(getInitialBuyPriceRanges(editingCustomer));

    // 모달이 열릴 때 상태 초기화
    useEffect(() => {
        if (showModal) {
            if (editingCustomer) {
                // 수정 모드인 경우 바로 등록 폼으로
                setModalMode('register');
                setIsDuplicateMode(false);
                if (editingCustomer.categories) {
                    setCategories(editingCustomer.categories);
                } else {
                    setCategories([]);
                }

                if (editingCustomer.buyTypes) {
                    setBuyTypes(editingCustomer.buyTypes);
                } else {
                    setBuyTypes([]);
                }

                if (editingCustomer.buyPriceRanges) {
                    setBuyPriceRanges(editingCustomer.buyPriceRanges);
                } else {
                    setBuyPriceRanges(getInitialBuyPriceRanges());
                }
            } else {
                // 새 등록인 경우 중복 검색부터 시작
                setModalMode('search');
                setIsDuplicateMode(false);
                setCategories([]);
                setBuyTypes([]);
                setBuyPriceRanges(getInitialBuyPriceRanges());
            }
        }
    }, [showModal, editingCustomer]);

    // 비활성화된 고객 수정 시 경고
    useEffect(() => {
        if (showModal && editingCustomer && editingCustomer.status === '비활성' && user.level < 11) {
            setError('비활성화된 고객은 수정할 수 없습니다. 관리자에게 문의하세요.');
        }
    }, [showModal, editingCustomer, user.level]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPropertyModal, setShowPropertyModal] = useState(false);

    // 여러 매물을 관리하기 위한 상태
    const [selectedProperties, setSelectedProperties] = useState([]);
    const [editingProperty, setEditingProperty] = useState(null);

    // 매물 선택 모달 관련 상태
    const [showPropertySelectionModal, setShowPropertySelectionModal] = useState(false);
    const [properties, setProperties] = useState([]);
    const [propertySearchTerm, setPropertySearchTerm] = useState('');
    const [propertyFilterType, setPropertyFilterType] = useState('all');
    const [propertyLoading, setPropertyLoading] = useState(false);

    // 편집 모드일 때 기존 매물들을 selectedProperties에 설정
    useEffect(() => {
        if (showModal && editingCustomer && editingCustomer.properties) {
            setSelectedProperties(editingCustomer.properties.map(prop => ({
                propertyId: prop.property._id || prop.property,
                propertyTitle: prop.property.title || prop.property,
                propertyType: prop.property.type,
                askingPrice: prop.askingPrice || '',
                monthlyRent: prop.monthlyRent || '',
                deposit: prop.deposit || '',
                jeonseDeposit: prop.jeonseDeposit || ''
            })));
        } else {
            setSelectedProperties([]);
        }
    }, [showModal, editingCustomer]);

    const handleCloseModal = () => {
        // 모달이 닫힐 때 기본값으로 초기화
        setModalMode('search');
        setIsDuplicateMode(false);
        setDuplicateCustomer(null);
        setCategories([]);
        setBuyTypes([]);
        setError('');
        setSelectedProperties([]);
        setSearchData({ name: '', phone: '', email: '' });
        onHide();
    };

    // 중복 검색에서 중복 고객 발견 시
    const handleDuplicateFound = (existingCustomer) => {
        // 기존 고객 정보로 수정 모드로 전환
        setModalMode('register');
        setIsDuplicateMode(true);
        setDuplicateCustomer(existingCustomer);
        setError('동일한 정보의 고객이 이미 등록되어 있습니다. 수정 모드로 전환합니다.');

        // 기존 고객 정보로 폼 초기화
        setCategories(existingCustomer.categories || []);
        setBuyTypes(existingCustomer.buyTypes || []);
        setBuyPriceRanges(getInitialBuyPriceRanges(existingCustomer));

        // 매물 정보 설정
        if (existingCustomer.properties) {
            setSelectedProperties(existingCustomer.properties.map(prop => ({
                propertyId: prop.property._id || prop.property,
                propertyTitle: prop.property.title || prop.property,
                propertyType: prop.property.type,
                askingPrice: prop.askingPrice || '',
                monthlyRent: prop.monthlyRent || '',
                deposit: prop.deposit || '',
                jeonseDeposit: prop.jeonseDeposit || ''
            })));
        }
    };

    // 중복 검색에서 중복이 없을 때
    const handleNoDuplicate = (data) => {
        setModalMode('register');
        setIsDuplicateMode(true); // 중복 검사를 통과했으므로 중복 모드 활성화
        setSearchData(data);
        setError('');
    };

    // 중복 검색 취소
    const handleSearchCancel = () => {
        handleCloseModal();
    };

    // 매물 목록 조회 함수
    const fetchProperties = async () => {
        try {
            setPropertyLoading(true);
            const params = new URLSearchParams();
            if (propertySearchTerm) params.append('search', propertySearchTerm);
            if (propertyFilterType !== 'all') params.append('filterType', propertyFilterType);

            const response = await api.get(`/properties?${params.toString()}`);
            if (response.status === 200) {
                setProperties(response.data.data);
            }
        } catch (error) {
            console.error('매물 목록 조회 오류:', error);
            setError('매물 목록을 불러오는데 실패했습니다.');
        } finally {
            setPropertyLoading(false);
        }
    };

    // 매물 선택 모달 열기
    const handleShowPropertySelectionModal = () => {
        setShowPropertySelectionModal(true);
        fetchProperties();
    };

    // 매물 선택 처리
    const handlePropertySelection = async (property) => {
        // 이미 선택된 매물인지 확인
        const isAlreadySelected = selectedProperties.some(prop => prop.propertyId === property._id);
        if (isAlreadySelected) {
            setError('이미 선택된 매물입니다.');
            return;
        }

        // 매물을 선택된 목록에 추가 (즉시 소유자 변경하지 않음)
        const newProperty = {
            propertyId: property._id,
            propertyTitle: property.title,
            propertyType: property.type,
            askingPrice: property.type === '매매' ? property.price : '',
            monthlyRent: property.type === '월세' ? property.price : '',
            deposit: property.type === '월세' ? property.deposit : '',
            jeonseDeposit: property.type === '전세' ? property.price : ''
        };

        setSelectedProperties([...selectedProperties, newProperty]);
        setShowPropertySelectionModal(false);

        // ActivityLog에 매물 선택 기록
        try {
            await api.post('/activity-logs', {
                type: 'customer',
                action: '매물 선택',
                description: `고객 등록/수정 시 매물을 선택했습니다: ${property.title}`,
                details: {
                    propertyId: property._id,
                    propertyTitle: property.title,
                    propertyType: property.type,
                    propertyAddress: property.address,
                    customerName: editingCustomer?.name || '새 고객',
                    customerId: editingCustomer?._id || 'new'
                },
                relatedEntity: {
                    type: 'property',
                    id: property._id,
                    name: property.title
                },
                priority: 2,
                status: 'success'
            });
        } catch (error) {
            console.error('ActivityLog 기록 실패:', error);
        }
    };

    // 매물 제거 처리
    const handleRemoveProperty = async (propertyId) => {
        // 제거할 매물 정보 찾기
        const propertyToRemove = selectedProperties.find(prop => prop.propertyId === propertyId);
        
        setSelectedProperties(selectedProperties.filter(prop => prop.propertyId !== propertyId));

        // ActivityLog에 매물 제거 기록
        if (propertyToRemove) {
            try {
                await api.post('/activity-logs', {
                    type: 'customer',
                    action: '매물 제거',
                    description: `고객 등록/수정 시 선택된 매물을 제거했습니다: ${propertyToRemove.propertyTitle}`,
                    details: {
                        propertyId: propertyToRemove.propertyId,
                        propertyTitle: propertyToRemove.propertyTitle,
                        propertyType: propertyToRemove.propertyType,
                        customerName: editingCustomer?.name || '새 고객',
                        customerId: editingCustomer?._id || 'new'
                    },
                    relatedEntity: {
                        type: 'property',
                        id: propertyToRemove.propertyId,
                        name: propertyToRemove.propertyTitle
                    },
                    priority: 2,
                    status: 'success'
                });
            } catch (error) {
                console.error('ActivityLog 기록 실패:', error);
            }
        }
    };

    // 매물 수정 처리
    const handlePropertyEdit = async (property) => {
        try {
            setShowPropertySelectionModal(false);
            setShowPropertyModal(true);
            setEditingProperty(property);
        } catch (error) {
            console.error('매물 수정 모달 열기 오류:', error);
            setError('매물 수정 모달을 열 수 없습니다.');
        }
    };

    const handlePropertySuccess = async (propertyData, propertyId = null) => {
        try {
            if (propertyId) {
                // 매물 수정
                const response = await api.put(`/properties/${propertyId}`, propertyData);

                if (response.status === 200 && response.data.success) {
                    // 수정된 매물 정보로 선택 상태 업데이트
                    const updatedProperty = response.data.data;

                    // selectedProperties에서 해당 매물 업데이트
                    setSelectedProperties(prev => prev.map(prop =>
                        prop.propertyId === propertyId
                            ? {
                                ...prop,
                                propertyTitle: updatedProperty.title,
                                propertyType: updatedProperty.type,
                                askingPrice: updatedProperty.type === '매매' ? updatedProperty.price : prop.askingPrice,
                                monthlyRent: updatedProperty.type === '월세' ? updatedProperty.price : prop.monthlyRent,
                                deposit: updatedProperty.type === '월세' ? updatedProperty.deposit : prop.deposit,
                                jeonseDeposit: updatedProperty.type === '전세' ? updatedProperty.price : prop.jeonseDeposit
                            }
                            : prop
                    ));
                } else {
                    throw new Error(response.data?.message || '매물 수정에 실패했습니다.');
                }
            } else {
                // 매물 등록
                const response = await api.post('/properties', propertyData);
                if (response.status === 201) {
                    const newProperty = {
                        propertyId: response.data.data._id,
                        propertyTitle: propertyData.title,
                        propertyType: propertyData.type,
                        askingPrice: propertyData.type === '매매' ? propertyData.price : '',
                        monthlyRent: propertyData.type === '월세' ? propertyData.price : '',
                        deposit: propertyData.type === '월세' ? propertyData.deposit : '',
                        jeonseDeposit: propertyData.type === '전세' ? propertyData.price : ''
                    };

                    setSelectedProperties([...selectedProperties, newProperty]);
                }
            }
            setShowPropertyModal(false);
        } catch (error) {
            console.error('매물 저장 오류:', error);
            throw error;
        }
    };

    const handleShowPropertyModal = () => {
        setShowPropertyModal(true);
    };

    // 고객 삭제 함수
    const handleDelete = async () => {
        if (!editingCustomer) return;

        if (window.confirm('정말로 이 고객을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            try {
                setLoading(true);
                setError('');

                const response = await api.delete(`/customers/${editingCustomer._id}`);

                if (response.data.success) {
                    setSuccess('고객이 성공적으로 삭제되었습니다.');
                    setTimeout(() => {
                        handleCloseModal();
                        onSuccess();
                    }, 1500);
                } else {
                    setError(response.data.message || '고객 삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error('고객 삭제 오류:', error);

                if (error.response?.status === 401) {
                    setError('로그인이 필요하거나 토큰이 만료되었습니다. 다시 로그인해주세요.');
                } else if (error.response?.status === 403) {
                    setError('고객을 삭제할 권한이 없습니다.');
                } else if (error.response?.status === 404) {
                    setError('고객을 찾을 수 없습니다.');
                } else if (error.response?.data?.message) {
                    setError(error.response.data.message);
                } else {
                    setError('고객 삭제 중 오류가 발생했습니다.');
                }
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 비활성화된 고객 수정 시도 시 차단
        if (editingCustomer && editingCustomer.status === '비활성' && user.level < 11) {
            setError('비활성화된 고객은 수정할 수 없습니다. 관리자에게 문의하세요.');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const formData = new FormData(e.target);

            // 폼 데이터와 검색 데이터를 병합
            const customerData = {
                name: formData.get('name') || searchData.name || editingCustomer?.name,
                categories: categories,
                buyTypes: buyTypes,
                buyPriceRanges: buyPriceRanges,
                phone: formData.get('phone') || searchData.phone || editingCustomer?.phone,
                email: formData.get('email') || searchData.email || editingCustomer?.email,
                address: formData.get('address'),
                budget: formData.get('budget') || '',
                preferredArea: formData.get('preferredArea') || '',
                status: formData.get('status'),
                lastContact: formData.get('lastContact'),
                notes: formData.get('notes')
            };

            // 고객명 검증
            if (!customerData.name) {
                setError('고객명은 필수 입력 항목입니다.');
                setLoading(false);
                return;
            }

            // 고객 분류 선택 검증
            if (categories.length === 0) {
                setError('최소 하나의 고객 분류를 선택해주세요.');
                setLoading(false);
                return;
            }



            let response;
            if (duplicateCustomer) {
                // 중복 고객인 경우 수정
                response = await api.put(`/customers/${duplicateCustomer._id}`, customerData);
            } else if (editingCustomer) {
                response = await api.put(`/customers/${editingCustomer._id}`, customerData);
            } else {
                response = await api.post('/customers', customerData);
            }

            if (response.data.success) {
                // ActivityLog에 고객 수정 기록
                try {
                    await api.post('/activity-logs', {
                        type: 'customer',
                        action: editingCustomer ? '고객 정보 수정' : '고객 등록',
                        description: editingCustomer ? 
                            `고객 정보를 수정했습니다: ${response.data.data.name}` : 
                            `새 고객을 등록했습니다: ${response.data.data.name}`,
                        details: {
                            customerId: response.data.data._id,
                            customerName: response.data.data.name,
                            customerType: response.data.data.type,
                            customerPhone: response.data.data.phone,
                            customerEmail: response.data.data.email,
                            selectedPropertiesCount: selectedProperties.length,
                            isEdit: !!editingCustomer
                        },
                        relatedEntity: {
                            type: 'customer',
                            id: response.data.data._id,
                            name: response.data.data.name
                        },
                        priority: editingCustomer ? 3 : 2,
                        status: 'success'
                    });
                } catch (error) {
                    console.error('ActivityLog 기록 실패:', error);
                }

                // 매물 소유자 변경 처리
                if (selectedProperties.length > 0) {
                    const customerId = duplicateCustomer ? duplicateCustomer._id : (editingCustomer ? editingCustomer._id : response.data.data._id);
                    const customerName = duplicateCustomer ? duplicateCustomer.name : (editingCustomer ? editingCustomer.name : response.data.data.name);
                    const customerPhone = duplicateCustomer ? duplicateCustomer.phone : (editingCustomer ? editingCustomer.phone : response.data.data.phone);


                    // 수정 모드인 경우 기존 고객의 모든 매물 소유권 해제
                    if (editingCustomer || duplicateCustomer) {
                        const existingCustomerId = editingCustomer?._id || duplicateCustomer?._id;
                        
                        if (existingCustomerId) {
                            try {
                                // 기존 고객의 매물 목록 조회
                                const customerResponse = await api.get(`/customers/${existingCustomerId}`);
                                if (customerResponse.data.success && customerResponse.data.data.properties) {
                                    
                                    // 기존 매물들의 소유권 해제
                                    for (const prop of customerResponse.data.data.properties) {
                                        const propertyId = prop.property._id || prop.property;
                                        try {
                                            const propertyResponse = await api.get(`/properties/${propertyId}`);
                                            const currentOwner = propertyResponse.data.data.customer;

                                            // 현재 소유자가 수정 중인 고객인 경우에만 해제
                                            if (currentOwner && currentOwner._id === existingCustomerId) {
                                                
                                                await api.put(`/properties/${propertyId}/owner`, {
                                                    newOwnerId: null, // 소유권 해제
                                                    customerName: '',
                                                    customerPhone: '',
                                                    oldCustomerName: currentOwner.name,
                                                    oldCustomerPhone: currentOwner.phone
                                                });
                                            }
                                        } catch (error) {
                                            console.error(`매물 ${propertyId} 소유권 해제 실패:`, error);
                                        }
                                    }
                                }
                            } catch (error) {
                                console.error('기존 고객 매물 조회 실패:', error);
                            }
                        }
                    }

                    // 선택된 매물들의 소유자 업데이트
                    for (const prop of selectedProperties) {
                        try {
                            // 매물의 현재 소유자 정보 조회
                            const propertyResponse = await api.get(`/properties/${prop.propertyId}`);
                            const currentOwner = propertyResponse.data.data.customer;


                            const ownerResponse = await api.put(`/properties/${prop.propertyId}/owner`, {
                                newOwnerId: customerId,
                                customerName: customerName,
                                customerPhone: customerPhone,
                                oldCustomerName: currentOwner?.name || '',
                                oldCustomerPhone: currentOwner?.phone || ''
                            });

                            if (!ownerResponse.data.success) {
                            } else {
                                
                                // 매물 소유자 변경 ActivityLog 기록
                                try {
                                    await api.post('/activity-logs', {
                                        type: 'property',
                                        action: '매물 소유자 변경',
                                        description: `매물 소유자를 변경했습니다: ${prop.propertyTitle} → ${customerName}`,
                                        details: {
                                            propertyId: prop.propertyId,
                                            propertyTitle: prop.propertyTitle,
                                            propertyType: prop.propertyType,
                                            oldOwner: currentOwner?.name || '없음',
                                            newOwner: customerName,
                                            customerId: customerId,
                                            customerPhone: customerPhone
                                        },
                                        relatedEntity: {
                                            type: 'property',
                                            id: prop.propertyId,
                                            name: prop.propertyTitle
                                        },
                                        priority: 3,
                                        status: 'success'
                                    });
                                } catch (error) {
                                    console.error('매물 소유자 변경 ActivityLog 기록 실패:', error);
                                }
                            }
                        } catch (error) {
                            console.error(`매물 ${prop.propertyId} 소유자 업데이트 실패:`, error);
                            // 소유자 변경 실패해도 고객 등록은 성공으로 처리
                        }
                    }
                }

                handleCloseModal();
                // 고객 목록 새로고침만 수행
                onSuccess(response.data.data);
            } else {
                setError(response.data.message || '고객 정보 저장에 실패했습니다.');
            }
        } catch (error) {
            console.error('고객 저장 오류:', error);

            if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                setError('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
                setLoading(false);
                return;
            }

            if (error.response && error.response.data) {
                const errorData = error.response.data;

                if (errorData.existingCustomer) {
                    const existing = errorData.existingCustomer;
                    const registrationDate = new Date(existing.updatedAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    const duplicateMessage = `이미 등록된 고객입니다.<br><br>기존 고객 정보:<br>- 이름: ${existing.name}<br>- 전화번호: ${existing.phone}<br>- 이메일: ${existing.email}<br>- 고객 유형: ${existing.type}<br>- 매물: ${existing.property || '없음'}<br>- 등록일: ${registrationDate}`;

                    setError(duplicateMessage);
                    return;
                } else {
                    setError(errorData.message || '고객 정보 저장 중 오류가 발생했습니다.');
                }
            } else if (error.response && error.response.status === 400) {
                setError('입력 정보가 올바르지 않습니다. 필수 필드를 확인해주세요.');
            } else {
                setError('고객 정보 저장 중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 중복 검색 모드일 때
    if (modalMode === 'search') {
        return (
            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>고객 중복 검색</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <CustomerDuplicateCheck
                        onDuplicateFound={handleDuplicateFound}
                        onNoDuplicate={handleNoDuplicate}
                        onCancel={handleSearchCancel}
                    />
                </Modal.Body>
            </Modal>
        );
    }

    // 등록/수정 모드일 때
    return (
        <Modal show={showModal} onHide={handleCloseModal} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    {editingCustomer ? '고객 정보 수정' : '고객 등록'}
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" onClose={() => setError('')} dismissible>
                            <div dangerouslySetInnerHTML={{ __html: error }} />
                        </Alert>
                    )}

                    {success && (
                        <Alert variant="success" onClose={() => setSuccess('')} dismissible>
                            {success}
                        </Alert>
                    )}

                    {/* 고객 기본 정보 */}
                    <CustomerBasicInfo
                        editingCustomer={duplicateCustomer || editingCustomer}
                        categories={categories}
                        setCategories={setCategories}
                        user={user}
                        searchData={searchData}
                        isDuplicateMode={isDuplicateMode}
                    />

                    {/* 매도 정보 */}
                    <CustomerSaleInfo
                        categories={categories}
                        selectedProperties={selectedProperties}
                        setSelectedProperties={setSelectedProperties}
                        handleShowPropertyModal={handleShowPropertyModal}
                        handleShowPropertySelectionModal={handleShowPropertySelectionModal}
                        handleRemoveProperty={handleRemoveProperty}
                        user={user}
                        editingCustomer={editingCustomer}
                    />

                    {/* 매수 정보 */}
                    <CustomerBuyInfo
                        categories={categories}
                        buyTypes={buyTypes}
                        setBuyTypes={setBuyTypes}
                        buyPriceRanges={buyPriceRanges}
                        setBuyPriceRanges={setBuyPriceRanges}
                        editingCustomer={editingCustomer}
                        user={user}
                    />

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>상태</Form.Label>
                                <Form.Select
                                    name="status"
                                    defaultValue={editingCustomer?.status || '활성'}
                                    disabled={editingCustomer?.status === '비활성' && user.level < 11}
                                >
                                    <option value="활성">활성</option>
                                    <option value="비활성">비활성</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>최근 연락일</Form.Label>
                                <Form.Control
                                    type="date"
                                    name="lastContact"
                                    defaultValue={editingCustomer?.lastContact ?
                                        new Date(editingCustomer.lastContact).toISOString().split('T')[0] :
                                        new Date().toISOString().split('T')[0]}
                                    disabled={editingCustomer?.status === '비활성' && user.level < 11}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>메모</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            name="notes"
                            defaultValue={editingCustomer?.notes}
                            placeholder="고객 관련 특이사항이나 요청사항을 기록하세요"
                            disabled={editingCustomer?.status === '비활성' && user.level < 11}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <div className="d-flex justify-content-end w-100">
                        <Button variant="secondary" onClick={handleCloseModal} disabled={loading} className="me-2">
                            취소
                        </Button>
                        {editingCustomer && (editingCustomer.publisher?._id === user._id ||
                            (user.level >= 5 && editingCustomer.publisher?.businessNumber === user.businessNumber) ||
                            user.level >= 11) && (
                                <Button
                                    variant="danger"
                                    onClick={handleDelete}
                                    disabled={loading || (editingCustomer?.status === '비활성' && user.level < 11)}
                                    className="me-2"
                                >
                                    삭제
                                </Button>
                            )}
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={loading || (editingCustomer?.status === '비활성' && user.level < 11)}
                        >
                            {loading ? '처리중...' : (editingCustomer ? '수정' : '등록')}
                        </Button>
                    </div>
                </Modal.Footer>
            </Form>

            {/* 매물 등록 모달 */}
            <PropertyRegistrationModal
                showModal={showPropertyModal}
                onHide={() => {
                    setShowPropertyModal(false);
                    setEditingProperty(null);
                }}
                editingProperty={editingProperty}
                onSuccess={handlePropertySuccess}
                loading={loading}
            />

            {/* 매물 선택 모달 */}
            <PropertySelectionModal
                showModal={showPropertySelectionModal}
                onHide={() => setShowPropertySelectionModal(false)}
                properties={properties}
                propertySearchTerm={propertySearchTerm}
                setPropertySearchTerm={setPropertySearchTerm}
                propertyFilterType={propertyFilterType}
                setPropertyFilterType={setPropertyFilterType}
                propertyLoading={propertyLoading}
                fetchProperties={fetchProperties}
                handlePropertySelection={handlePropertySelection}
                handlePropertyEdit={handlePropertyEdit}
                selectedProperties={selectedProperties}
            />
        </Modal>
    );
};

export default CustomerRegistrationModal; 