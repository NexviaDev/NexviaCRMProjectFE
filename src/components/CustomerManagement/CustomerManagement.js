import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Container, Card, Button, Table, Badge, Row, Col, Tabs, Tab, Alert, Form, Modal } from 'react-bootstrap';
import { FaEdit, FaSearch, FaUsers, FaPhone, FaEnvelope, FaChevronLeft, FaChevronRight, FaAngleDoubleLeft, FaAngleDoubleRight, FaHome, FaSms } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../UserContext';
import api from '../../utils/api';
import { formatPhoneNumber, formatCurrency } from '../../utils/format';
import { parsePriceInput } from '../../utils/price';
import CustomerRegistrationModal from './CustomerRegistrationModal';
import CSVBulkUploadModal from './CSVBulkUploadModal';
import CustomerTemplateUploadModal from './CustomerTemplateUploadModal';
import PropertyManagement from '../PropertyManagement/PropertyManagement';
import CustomerScheduleHistoryModal from './CustomerScheduleHistoryModal';
import ScheduleRegistrationModal from '../ScheduleManagement/ScheduleRegistrationModal';
import SMSModal from '../SMS/SMSModal';
import BulkSMSModal from '../SMS/BulkSMSModal';
import PaginationControls from './PaginationControls';
import BulkSelectionBar from './BulkSelectionBar';
import TopActionsBar from './TopActionsBar';
import BuyersFilterPanel from './BuyersFilterPanel';
import CustomerRow from './CustomerRow';

const CustomerManagement = () => {
    const { user } = useContext(UserContext);
    const { type } = useParams();
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showCSVModal, setShowCSVModal] = useState(false);
    const [showTemplateUploadModal, setShowTemplateUploadModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pendingSearchTerm, setPendingSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // PropertyManagementModal 상태
    const [showPropertyModal, setShowPropertyModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // 지원 이력 모달 상태
    const [showScheduleHistoryModal, setShowScheduleHistoryModal] = useState(false);
    const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState(null);

    // 일정 수정 모달 상태
    const [showScheduleEditModal, setShowScheduleEditModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);

    // SMS 모달 상태
    const [showSMSModal, setShowSMSModal] = useState(false);
    const [showBulkSMSModal, setShowBulkSMSModal] = useState(false);
    const [selectedCustomerForSMS, setSelectedCustomerForSMS] = useState(null);

    // 페이지네이션 상태
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [totalItems, setTotalItems] = useState(0);

    // 체크박스 선택 상태
    const [selectedCustomers, setSelectedCustomers] = useState(new Set());
    const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

    // 매수자 고객 유형 필터 상태 (중복 선택 가능)
    const [selectedBuyTypes, setSelectedBuyTypes] = useState(new Set(['월세', '전세', '매매']));

    // 가격 범위 필터 상태 (적용된 필터)
    const [appliedPriceFilters, setAppliedPriceFilters] = useState({
        매매: { min: '', max: '' },
        월세: { depositMin: '', depositMax: '', rentMin: '', rentMax: '' },
        전세: { min: '', max: '' }
    });

    // 가격 범위 필터 상태 (임시 입력값)
    const [tempPriceFilters, setTempPriceFilters] = useState({
        매매: { min: '', max: '' },
        월세: { depositMin: '', depositMax: '', rentMin: '', rentMax: '' },
        전세: { min: '', max: '' }
    });

    // 슬라이더 상태
    const [sliderValues, setSliderValues] = useState({
        매매: { min: 0, max: 10000000000 }, // 0원 ~ 100억
        월세: { depositMin: 0, depositMax: 1000000000, rentMin: 0, rentMax: 10000000 }, // 보증금 0~10억, 월세 0~1000만
        전세: { min: 0, max: 10000000000 } // 0원 ~ 100억
    });

    // URL 파라미터에 따라 기본 탭 설정
    const activeTab = type === 'sellers' ? 'sellers' : type === 'general' ? 'general' : 'buyers';

    // 탭 변경 시 URL 업데이트
    const handleTabChange = (tabKey) => {
        let urlType;
        if (tabKey === 'sellers') {
            urlType = 'sellers';
        } else if (tabKey === 'general') {
            urlType = 'general';
        } else {
            urlType = 'buyers';
        }
        // 탭 변경 시에만 선택된 고객들 초기화
        setSelectedCustomers(new Set());
        setLastSelectedIndex(null);
        navigate(`/customers/${urlType}`);
    };

    // 검색 제출 핸들러 (아이콘 클릭 또는 Enter 키)
    const handleSubmitSearch = () => {
        setCurrentPage(1);
        setSearchTerm(pendingSearchTerm);
    };

    const handleSearchKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSubmitSearch();
        }
    };

    // 매수자 고객 유형 필터 핸들러
    const handleBuyTypeFilterChange = (buyType) => {
        const newSelectedBuyTypes = new Set(selectedBuyTypes);
        if (newSelectedBuyTypes.has(buyType)) {
            newSelectedBuyTypes.delete(buyType);
        } else {
            newSelectedBuyTypes.add(buyType);
        }
        setSelectedBuyTypes(newSelectedBuyTypes);
    };

    // 모든 고객 유형 선택/해제
    const handleSelectAllBuyTypes = () => {
        if (selectedBuyTypes.size === 3) {
            setSelectedBuyTypes(new Set());
        } else {
            setSelectedBuyTypes(new Set(['월세', '전세', '매매']));
        }
    };

    // 임시 가격 필터 핸들러 (직접 입력)
    const handleTempPriceFilterChange = (type, field, value) => {
        // 입력값을 숫자로 변환
        const numericValue = parsePriceInput(value);

        setTempPriceFilters(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: numericValue
            }
        }));

        // 슬라이더 값도 함께 업데이트
        setSliderValues(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: numericValue
            }
        }));
    };

    // 슬라이더 핸들러
    const handleSliderChange = (type, field, value) => {
        const numericValue = parseInt(value);

        setSliderValues(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: numericValue
            }
        }));

        // 슬라이더 값도 임시 필터에 반영
        setTempPriceFilters(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: numericValue
            }
        }));
    };

    // 필터 적용 버튼 핸들러
    const handleApplyPriceFilters = () => {
        setAppliedPriceFilters({ ...tempPriceFilters });
    };

    // 가격 범위 필터 초기화
    const handleClearPriceFilters = () => {
        const emptyFilters = {
            매매: { min: '', max: '' },
            월세: { depositMin: '', depositMax: '', rentMin: '', rentMax: '' },
            전세: { min: '', max: '' }
        };

        setTempPriceFilters(emptyFilters);
        setAppliedPriceFilters(emptyFilters);

        // 슬라이더도 초기화
        setSliderValues({
            매매: { min: 0, max: 10000000000 },
            월세: { depositMin: 0, depositMax: 1000000000, rentMin: 0, rentMax: 10000000 },
            전세: { min: 0, max: 10000000000 }
        });
    };

    // 고객 목록 가져오기
    const fetchCustomers = useCallback(async (page) => {
        try {
            setLoading(true);
            setError('');



            const params = new URLSearchParams();
            if (filterType !== 'all') {
                params.append('type', filterType);
            }
            if (searchTerm) {
                params.append('search', searchTerm);
            }

            // 탭별 필터링 추가
            if (activeTab === 'buyers') {
                params.append('tabType', '매수자');
            } else if (activeTab === 'sellers') {
                params.append('tabType', '매도자');
            } else if (activeTab === 'general') {
                // 일반 탭: 매수자와 매도자가 아닌 고객들
                params.append('tabType', '일반');
            }

            // 페이지네이션 파라미터 추가
            if (itemsPerPage !== 'all') {
                params.append('page', page.toString());
                params.append('limit', itemsPerPage.toString());
            } else {
                // 전체 보기 옵션 선택 시 모든 데이터 가져오기
                params.append('limit', '1000'); // 충분히 큰 수로 설정
            }



            const response = await api.get(`/customers?${params.toString()}`);

            if (response.data.success) {
                setCustomers(response.data.data);
                setTotalItems(response.data.total || response.data.data.length);
            } else {
                setError('고객 목록을 불러오는데 실패했습니다.');
            }
        } catch (error) {
            console.error('고객 목록 조회 오류:', error);

            // 401 오류인 경우 로그인 만료 메시지 표시
            if (error.response?.status === 401) {
                setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
            } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                setError('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
            } else {
                setError('고객 목록을 불러오는 중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    }, [activeTab, searchTerm, filterType, itemsPerPage]);

    // 고객 등록용 CSV 양식 다운로드
    const downloadCustomerCSVTemplate = () => {
        // CSV 헤더 정의
        const headers = [
            '고객명 (필수)',
            '고객분류 (실거주/매도/매수/일반 쉼표로 구분)',
            '매수유형 (매매/월세/전세 쉼표로 구분)',
            '전화번호',
            '이메일',
            '사업자번호',
            '주소',
            '예산 (숫자만)',
            '선호지역',
            '매매최소가격 (숫자만)',
            '매매최대가격 (숫자만)',
            '월세보증금최소 (숫자만)',
            '월세보증금최대 (숫자만)',
            '월세최소 (숫자만)',
            '월세최대 (숫자만)',
            '전세최소가격 (숫자만)',
            '전세최대가격 (숫자만)',
            '최근연락일 (YYYY-MM-DD 형식)',
            '메모'
        ];

        // 예시 데이터 (2행부터)
        const examples = [
            [
                '김철수',
                '매수',
                '매매 월세',
                '010-1234-5678',
                'kim@example.com',
                '123-45-67890',
                '서울특별시 강남구 역삼동 123-45',
                '500000000',
                '강남구 서초구',
                '300000000',
                '800000000',
                '10000000',
                '50000000',
                '500000',
                '2000000',
                '200000000',
                '500000000',
                '2024-01-15',
                'VIP 고객 신축 선호'
            ],
            [
                '이영희',
                '매도 실거주',
                '',
                '010-9876-5432',
                'lee@example.com',
                '',
                '서울특별시 마포구 합정동 456-78',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '2024-01-10',
                '기존 거주지 매도 희망'
            ],
            [
                '박민수',
                '일반',
                '',
                '010-5555-1234',
                'park@example.com',
                '',
                '경기도 성남시 분당구',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '2024-01-20',
                '일반 상담 고객'
            ]
        ];

        // BOM(Byte Order Mark) 추가하여 한글 깨짐 방지
        const BOM = '\uFEFF';

        // 1행: 주의사항
        let csvContent = BOM + '⚠️ 주의: 4행부터 실제 업로드됩니다!\n';

        // 2행: 헤더
        csvContent += headers.join(',') + '\n';

        // 3-5행: 예시 데이터 (3개만)
        examples.slice(0, 3).forEach(example => {
            csvContent += example.join(',') + '\n';
        });

        // UTF-8 BOM이 포함된 Blob 생성
        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;'
        });

        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', '고객_등록_양식_예시.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    // URL 파라미터가 없으면 기본값으로 리다이렉트
    useEffect(() => {
        if (!type) {
            navigate('/customers/buyers');
        }
    }, [type, navigate]);


    // URL 파라미터(type) 변경 시 데이터 새로고침
    useEffect(() => {
        if (type) {
            setCurrentPage(1);
            fetchCustomers(1);
        }
    }, [type, fetchCustomers]);

    // activeTab 변경 시 데이터 새로고침
    useEffect(() => {
        if (type) {
            setCurrentPage(1);
            fetchCustomers(1);
        }
    }, [activeTab, type, fetchCustomers]);

    // 검색어나 필터 변경 시 페이지 리셋
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType]);

    useEffect(() => {
        fetchCustomers(currentPage);
    }, [fetchCustomers, currentPage]);

    // 선택된 고객 유형이 변경될 때 고객 목록 새로고침 (매수자 탭에서만)
    useEffect(() => {
        if (activeTab === 'buyers') {
            fetchCustomers(currentPage);
        }
    }, [selectedBuyTypes, activeTab, fetchCustomers, currentPage]);

    // 적용된 가격 범위 필터가 변경될 때 고객 목록 새로고침 (매수자 탭에서만)
    useEffect(() => {
        if (activeTab === 'buyers') {
            fetchCustomers(currentPage);
        }
    }, [appliedPriceFilters, activeTab, fetchCustomers, currentPage]);


    const handleShowModal = (customer = null) => {
        setEditingCustomer(customer);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCustomer(null);
    };

    const handleSuccess = () => {
        // 고객 목록 새로고침
        fetchCustomers(currentPage);
    };

    const handleViewScheduleHistory = (customer) => {
        setSelectedCustomerForHistory(customer);
        setShowScheduleHistoryModal(true);
    };

    const handleCloseScheduleHistoryModal = () => {
        setShowScheduleHistoryModal(false);
        setSelectedCustomerForHistory(null);
    };

    const handleEditSchedule = (schedule) => {
        setEditingSchedule(schedule);
        setShowScheduleEditModal(true);
        setShowScheduleHistoryModal(false); // 지원 이력 모달 닫기
    };

    const handleCloseScheduleEditModal = () => {
        setShowScheduleEditModal(false);
        setEditingSchedule(null);
    };

    const handleScheduleEditSuccess = () => {
        setShowScheduleEditModal(false);
        setEditingSchedule(null);
        // 지원 이력 모달 다시 열기
        setShowScheduleHistoryModal(true);
        setSelectedCustomerForHistory(selectedCustomerForHistory);
    };

    // 체크박스 선택 관련 함수들
    const handleSelectCustomer = (customerId, index, event) => {
        event.stopPropagation(); // 행 클릭 이벤트 방지

        const newSelectedCustomers = new Set(selectedCustomers);


        if (event.shiftKey && lastSelectedIndex !== null) {
            // Shift 키를 누른 경우 범위 선택
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);


            for (let i = start; i <= end; i++) {
                if (filteredCustomers[i]) {
                    newSelectedCustomers.add(filteredCustomers[i]._id);
                }
            }
        } else {
            // 일반 선택/해제
            if (newSelectedCustomers.has(customerId)) {
                newSelectedCustomers.delete(customerId);
            } else {
                newSelectedCustomers.add(customerId);
            }
        }

        setSelectedCustomers(newSelectedCustomers);
        setLastSelectedIndex(index);
    };

    const handleSelectAll = (event) => {
        event.stopPropagation();

        if (selectedCustomers.size === filteredCustomers.length) {
            // 모든 항목이 선택된 경우 모두 해제
            setSelectedCustomers(new Set());
        } else {
            // 모든 항목 선택
            const allIds = new Set(filteredCustomers.map(customer => customer._id));
            setSelectedCustomers(allIds);
        }
        setLastSelectedIndex(null);
    };


    // 매물 모달 핸들러
    const handleShowPropertyModal = (customer) => {
        setSelectedCustomer(customer);
        setShowPropertyModal(true);
    };

    const handleClosePropertyModal = () => {
        setShowPropertyModal(false);
        setSelectedCustomer(null);
        // 매물 모달이 닫힐 때 고객 목록 새로고침
        fetchCustomers(currentPage);
    };

    // 페이지네이션 관련 함수들
    const totalPages = itemsPerPage === 'all' ? 1 : Math.max(1, Math.ceil(totalItems / parseInt(itemsPerPage)));


    const handlePageChange = (pageNumber, event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        setCurrentPage(pageNumber);
        // 페이지 변경 시 선택된 고객들은 유지 (초기화하지 않음)
    };

    const handleFirstPage = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        setCurrentPage(1);
        // 페이지 변경 시 선택된 고객들은 유지 (초기화하지 않음)
    };

    const handleLastPage = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        setCurrentPage(totalPages);
        // 페이지 변경 시 선택된 고객들은 유지 (초기화하지 않음)
    };

    const handlePrevPage = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        setCurrentPage(prev => Math.max(prev - 1, 1));
        // 페이지 변경 시 선택된 고객들은 유지 (초기화하지 않음)
    };

    const handleNextPage = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
        // 페이지 변경 시 선택된 고객들은 유지 (초기화하지 않음)
    };

    // 페이지당 항목 수 변경 핸들러
    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1); // 첫 페이지로 리셋
        // 전체 보기 옵션 선택 시 페이지네이션 숨김
    };

    // SMS 전송 핸들러
    const handleSendSMS = (customer) => {
        setSelectedCustomerForSMS(customer);
        setShowSMSModal(true);
    };

    // 일괄 SMS 전송 핸들러
    const handleSendBulkSMS = () => {
        if (selectedCustomers.size === 0) {
            alert('전송할 고객을 선택해주세요.');
            return;
        }
        setShowBulkSMSModal(true);
    };

    // SMS 전송 성공 핸들러
    const handleSMSSuccess = () => {
        // SMS 전송 후 고객 목록 새로고침
        fetchCustomers(currentPage);
    };

    // 일괄 삭제 핸들러
    const handleBulkDelete = async () => {
        if (selectedCustomers.size === 0) {
            alert('삭제할 고객을 선택해주세요.');
            return;
        }

        const customerCount = selectedCustomers.size;
        const confirmMessage = `선택된 ${customerCount}명의 고객을 정말로 삭제하시겠습니까?\n\n삭제된 고객의 다음 데이터도 함께 삭제됩니다:\n- 고객 정보\n- 관련 일정\n- SMS 전송 이력\n- 매물 관심 고객 정보\n\n이 작업은 되돌릴 수 없습니다.\n\n대량 삭제는 시간이 걸릴 수 있습니다.`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            setLoading(true);

            const response = await api.delete('/customers/bulk', {
                data: {
                    customerIds: Array.from(selectedCustomers)
                },
                timeout: 60000 // 60초 타임아웃
            });

            if (response.data.success) {
                const result = response.data.data;
                const message = `${result.deletedCount}명의 고객이 삭제되었습니다.\n\n삭제 결과:\n- 고객: ${result.details.customers}명\n- 일정: ${result.details.schedules}개\n- SMS: ${result.details.sms}개\n- 매물: ${result.details.properties}개`;

                alert(message);
                setSelectedCustomers(new Set()); // 선택 초기화
                fetchCustomers(currentPage); // 목록 새로고침
            } else {
                alert(response.data.message || '일괄 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('일괄 삭제 오류:', error);
            if (error.code === 'ECONNABORTED') {
                alert('일괄 삭제 시간이 초과되었습니다. 서버에서 처리 중일 수 있습니다. 잠시 후 목록을 새로고침해주세요.');
            } else {
                alert(error.response?.data?.message || '일괄 삭제 중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 표시할 페이지 번호들 계산 (최대 5개)
    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            // 총 페이지가 5개 이하면 모든 페이지 표시
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            // 현재 페이지를 중심으로 5개 페이지 표시
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            // 끝 페이지가 총 페이지 수에 가까우면 시작 페이지 조정
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(i);
            }
        }

        return pageNumbers;
    };



    // 가격 범위 필터링 함수
    const matchesPriceFilter = (customer) => {
        if (!customer.buyPriceRanges) return true;

        // 매매 가격 범위 필터 확인 (매매 유형이 선택된 경우에만)
        if (selectedBuyTypes.has('매매') && (appliedPriceFilters.매매.min || appliedPriceFilters.매매.max)) {
            const customerPrice = customer.buyPriceRanges.매매;
            if (customerPrice) {
                const minPrice = appliedPriceFilters.매매.min ? parseInt(appliedPriceFilters.매매.min) : 0;
                const maxPrice = appliedPriceFilters.매매.max ? parseInt(appliedPriceFilters.매매.max) : Infinity;

                if (customerPrice.min > maxPrice || customerPrice.max < minPrice) {
                    return false;
                }
            } else {
                return false;
            }
        }

        // 월세 가격 범위 필터 확인 (월세 유형이 선택된 경우에만)
        if (selectedBuyTypes.has('월세') && (appliedPriceFilters.월세.depositMin || appliedPriceFilters.월세.depositMax || appliedPriceFilters.월세.rentMin || appliedPriceFilters.월세.rentMax)) {
            const customerPrice = customer.buyPriceRanges.월세;
            if (customerPrice && customerPrice.deposit && customerPrice.monthlyRent) {
                const depositMin = appliedPriceFilters.월세.depositMin ? parseInt(appliedPriceFilters.월세.depositMin) : 0;
                const depositMax = appliedPriceFilters.월세.depositMax ? parseInt(appliedPriceFilters.월세.depositMax) : Infinity;
                const rentMin = appliedPriceFilters.월세.rentMin ? parseInt(appliedPriceFilters.월세.rentMin) : 0;
                const rentMax = appliedPriceFilters.월세.rentMax ? parseInt(appliedPriceFilters.월세.rentMax) : Infinity;

                if (customerPrice.deposit.min > depositMax || customerPrice.deposit.max < depositMin ||
                    customerPrice.monthlyRent.min > rentMax || customerPrice.monthlyRent.max < rentMin) {
                    return false;
                }
            } else {
                return false;
            }
        }

        // 전세 가격 범위 필터 확인 (전세 유형이 선택된 경우에만)
        if (selectedBuyTypes.has('전세') && (appliedPriceFilters.전세.min || appliedPriceFilters.전세.max)) {
            const customerPrice = customer.buyPriceRanges.전세;
            if (customerPrice) {
                const minPrice = appliedPriceFilters.전세.min ? parseInt(appliedPriceFilters.전세.min) : 0;
                const maxPrice = appliedPriceFilters.전세.max ? parseInt(appliedPriceFilters.전세.max) : Infinity;

                if (customerPrice.min > maxPrice || customerPrice.max < minPrice) {
                    return false;
                }
            } else {
                return false;
            }
        }

        return true;
    };

    // 매수자 탭에서 고객 유형 및 가격 범위 필터링 적용
    const filteredCustomers = activeTab === 'buyers'
        ? customers.filter(customer => {
            // 매수자 고객인지 확인
            if (!customer.categories || !customer.categories.includes('매수')) {
                return false;
            }

            // 선택된 고객 유형이 없으면 모든 고객 표시
            if (selectedBuyTypes.size === 0) {
                return false;
            }

            // 고객의 buyTypes가 선택된 유형 중 하나와 일치하는지 확인
            if (customer.buyTypes && customer.buyTypes.length > 0) {
                const matchesType = customer.buyTypes.some(buyType => selectedBuyTypes.has(buyType));
                if (!matchesType) return false;
            }

            // 가격 범위 필터 확인
            return matchesPriceFilter(customer);
        })
        : customers; // 다른 탭에서는 백엔드에서 이미 필터링된 데이터 사용

    const isAllSelected = selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0;
    const isIndeterminate = selectedCustomers.size > 0 && selectedCustomers.size < filteredCustomers.length;


    const getTypeBadge = (buyTypes, categories = []) => {
        // 일반 고객인 경우 (매수자나 매도자가 아닌 경우)
        if (categories.includes('실거주') || (!categories.includes('매수') && !categories.includes('매도'))) {
            return (
                <div>
                    {categories && categories.length > 0 && categories.map((category, index) => (
                        <Badge key={index} bg="secondary" className="me-1">
                            {category}
                        </Badge>
                    ))}
                    {(!categories || categories.length === 0) && (
                        <Badge bg="secondary" className="me-1">분류 미선택</Badge>
                    )}
                </div>
            );
        }

        // 매수자 고객인 경우
        return (
            <div>
                {buyTypes && buyTypes.length > 0 && buyTypes.map((type, index) => (
                    <Badge key={index} bg="info" className="me-1">
                        {type}
                    </Badge>
                ))}
                {(!buyTypes || buyTypes.length === 0) && (
                    <Badge bg="secondary" className="me-1"></Badge>
                )}
            </div>
        );
    };


    

    

    // user가 로드되지 않은 경우 로딩 표시
    if (!user) {
        return (
            <Container className="mt-4" style={{ paddingBottom: '80px' }}>
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

    // level 2 이하인 경우 접근 제한
    if (user.level <= 2) {
        return (
            <Container className="mt-4" style={{ paddingBottom: '80px' }}>
                <Card className="shadow-sm">
                    <Card.Header className="bg-danger text-white">
                        <h4 className="mb-0">
                            <FaUsers className="me-2" />
                            접근 제한
                        </h4>
                    </Card.Header>
                    <Card.Body className="text-center py-5">
                        <div className="mb-4">
                            <FaUsers size={64} className="text-muted mb-3" />
                            <h5 className="text-muted">권한이 부족합니다</h5>
                            <p className="text-muted">
                                고객 관리 기능을 이용하려면 더 높은 권한이 필요합니다.<br />
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
                    <h4 className="mb-0">
                        <FaUsers className="me-2" />
                        고객 관리
                    </h4>
                </Card.Header>

                <Card.Body>
                    {error && (
                        <Alert variant="danger" onClose={() => setError('')} dismissible>
                            {error}
                        </Alert>
                    )}

                    <TopActionsBar
                        loading={loading}
                        onCreate={() => handleShowModal()}
                        onDownloadTemplate={downloadCustomerCSVTemplate}
                        onOpenTemplateUpload={() => setShowTemplateUploadModal(true)}
                        onOpenCSVUpload={() => setShowCSVModal(true)}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        totalItems={totalItems}
                        currentPage={currentPage}
                    />

                    {/* 탭 네비게이션 */}
                    <Tabs
                        activeKey={activeTab}
                        onSelect={handleTabChange}
                        className="mb-3"
                    >

                        <Tab eventKey="general" title="전체">
                            <div className="mt-3">
                                {/* 동일한 검색 및 필터 UI */}
                                <Row className="mb-3">
                                    <Col xs={12} md={12} className="mb-2 mb-md-0">
                                        <div className="input-group">
                                            <Button
                                                variant="outline-secondary"
                                                onClick={handleSubmitSearch}
                                                aria-label="검색"
                                            >
                                                <FaSearch />
                                            </Button>
                                            <Form.Control
                                                type="text"
                                                placeholder="고객명, 전화번호, 이메일로 검색..."
                                                value={pendingSearchTerm}
                                                onChange={(e) => setPendingSearchTerm(e.target.value)}
                                                onKeyDown={handleSearchKeyDown}
                                            />
                                        </div>
                                    </Col>

                                </Row>


                                {/* 선택된 고객 일괄 작업 */}
                                {selectedCustomers.size > 0 && (
                                    <Row className="mb-3">
                                        <Col xs={12}>
                                            <div className="d-flex align-items-center justify-content-between p-2 bg-light rounded">
                                                <div className="d-flex align-items-center">
                                                    <Badge bg="primary" className="me-2">
                                                        {selectedCustomers.size}개 선택됨
                                                    </Badge>
                                                    <span className="text-muted">선택된 고객에 대한 작업을 수행할 수 있습니다.</span>
                                                </div>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="outline-success"
                                                        size="sm"
                                                        onClick={handleSendBulkSMS}
                                                        disabled={loading}
                                                    >
                                                        <FaSms className="me-1" />
                                                        일괄 문자 전송
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={handleBulkDelete}
                                                        disabled={loading}
                                                    >
                                                        일괄 삭제
                                                    </Button>
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() => setSelectedCustomers(new Set())}
                                                    >
                                                        선택 해제
                                                    </Button>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                )}

                                {/* 동일한 테이블 구조 */}
                                {loading ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <Table responsive hover className="table-sm">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="d-none d-md-table-cell" style={{ width: '40px' }}>
                                                    <Form.Check
                                                        type="checkbox"
                                                        checked={isAllSelected}
                                                        ref={input => {
                                                            if (input) input.indeterminate = isIndeterminate;
                                                        }}
                                                        onChange={handleSelectAll}
                                                        title="전체 선택"
                                                    />
                                                </th>
                                                <th className="d-none d-md-table-cell">고객명</th>
                                                <th className="d-none d-md-table-cell">연락처</th>
                                                <th className="d-none d-md-table-cell">상세정보</th>
                                                <th className="d-none d-md-table-cell">게시자</th>
                                                <th className="d-none d-md-table-cell">관리</th>
                                                <th className="d-md-none">고객 정보</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCustomers.map((customer, index) => (
                                                <tr
                                                    key={customer._id}
                                                    onClick={() => handleViewScheduleHistory(customer)}
                                                    style={{ cursor: 'pointer' }}
                                                    className="hover-row"
                                                    title="클릭하여 지원 이력 보기"
                                                >
                                                    {/* 데스크톱 버전 */}
                                                    <td className="d-none d-md-table-cell">
                                                        <Form.Check
                                                            type="checkbox"
                                                            checked={selectedCustomers.has(customer._id)}
                                                            onChange={() => { }} // 빈 함수로 설정
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSelectCustomer(customer._id, index, e);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        <strong>{customer.name}</strong>
                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        <div>
                                                            <FaPhone className="text-muted me-1" />
                                                            {formatPhoneNumber(customer.phone)}
                                                        </div>
                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        {customer.notes ? (customer.notes.length > 7 ? customer.notes.substring(0, 7) + '...' : customer.notes) : '-'}
                                                    </td>

                                                    <td className="d-none d-md-table-cell">
                                                        {customer.publisher?.name || customer.publisher?.nickname || '알 수 없음'}
                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        <div className="d-flex gap-1">
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleShowModal(customer);
                                                                }}
                                                                disabled={loading || (customer.status === '비활성' && user.level < 11)}
                                                                title={customer.status === '비활성' && user.level < 11 ? '비활성화된 고객은 수정할 수 없습니다' : ''}
                                                            >
                                                                <FaEdit />
                                                            </Button>
                                                            {customer.phone && (
                                                                <Button
                                                                    variant="outline-success"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleSendSMS(customer);
                                                                    }}
                                                                    title="문자 전송"
                                                                >
                                                                    <FaSms />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* 모바일 버전 */}
                                                    <td className="d-md-none">
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            <div className="flex-grow-1">
                                                                <div className="d-flex align-items-center mb-1">
                                                                    <Form.Check
                                                                        type="checkbox"
                                                                        checked={selectedCustomers.has(customer._id)}
                                                                        onChange={() => { }} // 빈 함수로 설정
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleSelectCustomer(customer._id, index, e);
                                                                        }}
                                                                        className="me-2"
                                                                    />
                                                                    <div className="fw-bold">{customer.name}</div>
                                                                </div>
                                                                <div className="small mb-1">
                                                                    {customer.categories && customer.categories.map((category, index) => (
                                                                        <Badge key={index} bg="secondary" className="me-1">
                                                                            {category}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                                <div className="small mb-1">
                                                                    <FaPhone className="text-muted me-1" />
                                                                    {formatPhoneNumber(customer.phone)}
                                                                </div>
                                                                <div className="small text-muted mb-1">
                                                                    {customer.address}
                                                                </div>
                                                                <div className="small text-muted">
                                                                    {customer.notes ? (customer.notes.length > 7 ? customer.notes.substring(0, 7) + '...' : customer.notes) : '-'}
                                                                </div>
                                                            </div>
                                                            <div className="ms-2">
                                                                {(user.level >= 11 || (customer.byCompanyNumber === user.businessNumber && user.level >= 5)) && (
                                                                    <div className="d-flex flex-column gap-1">
                                                                        <Button
                                                                            variant="outline-primary"
                                                                            size="sm"
                                                                            onClick={() => handleShowModal(customer)}
                                                                            disabled={loading || (customer.status === '비활성' && user.level < 11)}
                                                                            title={customer.status === '비활성' && user.level < 11 ? '비활성화된 고객은 수정할 수 없습니다' : ''}
                                                                        >
                                                                            <FaEdit />
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}

                                {/* 페이지네이션 */}
                                {!loading && totalPages > 1 && itemsPerPage !== 'all' && (
                                    <PaginationControls
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onFirst={(e) => handleFirstPage(e)}
                                        onPrev={(e) => handlePrevPage(e)}
                                        onPage={(page) => handlePageChange(page)}
                                        onNext={(e) => handleNextPage(e)}
                                        onLast={(e) => handleLastPage(e)}
                                    />
                                )}

                                {/* 페이지 정보 표시 */}
                            </div>
                        </Tab>

                        <Tab eventKey="buyers" title="매수자 고객">
                            <div className="mt-3">
                                {/* 검색 및 기본 버튼 */}
                                <Row className="mb-3">
                                    <Col xs={12} md={12} className="mb-2 mb-md-0">
                                        <div className="input-group">
                                            <Button
                                                variant="outline-secondary"
                                                onClick={handleSubmitSearch}
                                                aria-label="검색"
                                            >
                                                <FaSearch />
                                            </Button>
                                            <Form.Control
                                                type="text"
                                                placeholder="고객명, 전화번호, 이메일로 검색..."
                                                value={pendingSearchTerm}
                                                onChange={(e) => setPendingSearchTerm(e.target.value)}
                                                onKeyDown={handleSearchKeyDown}
                                            />
                                        </div>
                                    </Col>
                                </Row>

                                <BuyersFilterPanel
                                    selectedBuyTypes={selectedBuyTypes}
                                    onToggleBuyType={handleBuyTypeFilterChange}
                                    onToggleAllBuyTypes={handleSelectAllBuyTypes}
                                    tempPriceFilters={tempPriceFilters}
                                    sliderValues={sliderValues}
                                    onSliderChange={handleSliderChange}
                                    onTempPriceChange={handleTempPriceFilterChange}
                                    onApply={handleApplyPriceFilters}
                                    onClear={handleClearPriceFilters}
                                    filteredCount={filteredCustomers.length}
                                    appliedPriceFilters={appliedPriceFilters}
                                />

                                {/* 선택된 고객 일괄 작업 */}
                                {selectedCustomers.size > 0 && (
                                    <Row className="mb-3">
                                        <Col xs={12}>
                                            <BulkSelectionBar
                                                selectedCount={selectedCustomers.size}
                                                loading={loading}
                                                onBulkSMS={handleSendBulkSMS}
                                                onBulkDelete={handleBulkDelete}
                                                onClear={() => setSelectedCustomers(new Set())}
                                            />
                                        </Col>
                                    </Row>
                                )}

                                {/* 고객 목록 */}
                                {loading ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <Table responsive hover className="table-sm">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="d-none d-md-table-cell" style={{ width: '40px' }}>
                                                    <Form.Check
                                                        type="checkbox"
                                                        checked={isAllSelected}
                                                        ref={input => {
                                                            if (input) input.indeterminate = isIndeterminate;
                                                        }}
                                                        onChange={handleSelectAll}
                                                        title="전체 선택"
                                                    />
                                                </th>
                                                <th className="d-none d-md-table-cell">고객명</th>
                                                <th className="d-none d-md-table-cell">고객 유형</th>
                                                <th className="d-none d-md-table-cell">연락처</th>
                                                <th className="d-none d-md-table-cell">예산/가격정보</th>
                                                <th className="d-none d-md-table-cell">선호지역/매물</th>
                                                <th className="d-none d-md-table-cell">게시자</th>
                                                <th className="d-none d-md-table-cell">관리</th>
                                                <th className="d-md-none">고객 정보</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCustomers
                                                .filter(customer => {
                                                    // 더 엄격한 필터링
                                                    if (!customer || !customer._id) {
                                                        console.warn('CustomerManagement: 유효하지 않은 고객 데이터 제거됨', customer);
                                                        return false;
                                                    }
                                                    return true;
                                                })
                                                .map((customer, index) => {
                                                    // 각 고객에 대해 추가 검증
                                                    if (!customer || !customer._id) {
                                                        console.error('CustomerManagement: 렌더링 중 유효하지 않은 고객 데이터 발견', customer);
                                                        return null;
                                                    }
                                                    
                                                    return (
                                                        <CustomerRow
                                                            key={customer._id}
                                                            customer={customer}
                                                            index={index}
                                                            user={user}
                                                            loading={loading}
                                                            selectedCustomers={selectedCustomers}
                                                            onSelectCustomer={handleSelectCustomer}
                                                            onShowModal={handleShowModal}
                                                            onSendSMS={handleSendSMS}
                                                            onViewScheduleHistory={handleViewScheduleHistory}
                                                            getTypeBadge={getTypeBadge}
                                                        />
                                                    );
                                                })
                                                .filter(Boolean) // null 값 제거
                                            }
                                        </tbody>
                                    </Table>
                                )}

                                {!loading && filteredCustomers.length === 0 && (
                                    <div className="text-center py-4">
                                        <FaUsers size={48} className="text-muted mb-3" />
                                        <p className="text-muted">등록된 고객이 없습니다.</p>
                                    </div>
                                )}

                                {/* 페이지네이션 */}
                                {!loading && totalPages > 1 && itemsPerPage !== 'all' && (
                                    <PaginationControls
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onFirst={(e) => handleFirstPage(e)}
                                        onPrev={(e) => handlePrevPage(e)}
                                        onPage={(page) => handlePageChange(page)}
                                        onNext={(e) => handleNextPage(e)}
                                        onLast={(e) => handleLastPage(e)}
                                    />
                                )}

                                {/* 페이지 정보 표시 */}

                            </div>
                        </Tab>



                        <Tab eventKey="sellers" title="매도자 고객">
                            <div className="mt-3">
                                {/* 동일한 검색 및 필터 UI */}
                                <Row className="mb-3">
                                    <Col xs={12} md={12} className="mb-2 mb-md-0">
                                        <div className="input-group">
                                            <Button
                                                variant="outline-secondary"
                                                onClick={handleSubmitSearch}
                                                aria-label="검색"
                                            >
                                                <FaSearch />
                                            </Button>
                                            <Form.Control
                                                type="text"
                                                placeholder="고객명, 전화번호, 이메일로 검색..."
                                                value={pendingSearchTerm}
                                                onChange={(e) => setPendingSearchTerm(e.target.value)}
                                                onKeyDown={handleSearchKeyDown}
                                            />
                                        </div>
                                    </Col>


                                </Row>

                                {/* 선택된 고객 일괄 작업 */}
                                {selectedCustomers.size > 0 && (
                                    <Row className="mb-3">
                                        <Col xs={12}>
                                            <div className="d-flex align-items-center justify-content-between p-2 bg-light rounded">
                                                <div className="d-flex align-items-center">
                                                    <Badge bg="primary" className="me-2">
                                                        {selectedCustomers.size}개 선택됨
                                                    </Badge>
                                                    <span className="text-muted">선택된 고객에 대한 작업을 수행할 수 있습니다.</span>
                                                </div>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="outline-success"
                                                        size="sm"
                                                        onClick={handleSendBulkSMS}
                                                        disabled={loading}
                                                    >
                                                        <FaSms className="me-1" />
                                                        일괄 문자 전송
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={handleBulkDelete}
                                                        disabled={loading}
                                                    >
                                                        일괄 삭제
                                                    </Button>
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() => setSelectedCustomers(new Set())}
                                                    >
                                                        선택 해제
                                                    </Button>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                )}

                                {/* 동일한 테이블 구조 */}
                                {loading ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <Table responsive hover className="table-sm">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="d-none d-md-table-cell" style={{ width: '40px' }}>
                                                    <Form.Check
                                                        type="checkbox"
                                                        checked={isAllSelected}
                                                        ref={input => {
                                                            if (input) input.indeterminate = isIndeterminate;
                                                        }}
                                                        onChange={handleSelectAll}
                                                        title="전체 선택"
                                                    />
                                                </th>
                                                <th className="d-none d-md-table-cell">고객명</th>
                                                <th className="d-none d-md-table-cell">연락처</th>
                                                <th className="d-none d-md-table-cell">매물</th>
                                                <th className="d-none d-md-table-cell">게시자</th>
                                                <th className="d-none d-md-table-cell">관리</th>
                                                <th className="d-md-none">고객 정보</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCustomers.map((customer, index) => (
                                                <tr key={customer._id}>
                                                    {/* 데스크톱 버전 */}
                                                    <td className="d-none d-md-table-cell">
                                                        <Form.Check
                                                            type="checkbox"
                                                            checked={selectedCustomers.has(customer._id)}
                                                            onChange={() => { }} // 빈 함수로 설정
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSelectCustomer(customer._id, index, e);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        <strong>{customer.name}</strong>
                                                    </td>

                                                    <td className="d-none d-md-table-cell">
                                                        <div>
                                                            <FaPhone className="text-muted me-1" />
                                                            {formatPhoneNumber(customer.phone)}
                                                        </div>
                                                        <div>
                                                            <FaEnvelope className="text-muted me-1" />
                                                            {customer.email}
                                                        </div>
                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        <Button
                                                            variant="outline-info"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleShowPropertyModal(customer);
                                                            }}
                                                            className="d-flex align-items-center"
                                                        >
                                                            <FaHome className="me-1" />
                                                            <Badge bg={customer.properties && customer.properties.length > 0 ? 'primary' : 'secondary'}>
                                                                {customer.properties && customer.properties.length > 0 ? customer.properties.length : 0}
                                                            </Badge>
                                                        </Button>
                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        <small className="text-muted">
                                                            {customer.publisher?.name || '알 수 없음'}
                                                        </small>
                                                    </td>
                                                    <td className="d-none d-md-table-cell">
                                                        {(user.level >= 11 || (customer.byCompanyNumber === user.businessNumber && user.level >= 5)) && (
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="me-1"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleShowModal(customer);
                                                                }}
                                                                disabled={loading}
                                                            >
                                                                <FaEdit />
                                                            </Button>
                                                        )}

                                                    </td>

                                                    {/* 모바일 버전 */}
                                                    <td className="d-md-none">
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            <div className="flex-grow-1">
                                                                <div className="d-flex align-items-center mb-1">
                                                                    <Form.Check
                                                                        type="checkbox"
                                                                        checked={selectedCustomers.has(customer._id)}
                                                                        onChange={() => { }} // 빈 함수로 설정
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleSelectCustomer(customer._id, index, e);
                                                                        }}
                                                                        className="me-2"
                                                                    />
                                                                    <div className="fw-bold">{customer.name}</div>
                                                                </div>
                                                                <div className="small mb-1">
                                                                    <FaPhone className="text-muted me-1" />
                                                                    {formatPhoneNumber(customer.phone)}
                                                                </div>
                                                                <div className="small text-muted mb-1">
                                                                    <Button
                                                                        variant="outline-info"
                                                                        size="sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleShowPropertyModal(customer);
                                                                        }}
                                                                        className="d-flex align-items-center"
                                                                    >
                                                                        <FaHome className="me-1" />
                                                                        <Badge bg={customer.properties && customer.properties.length > 0 ? 'primary' : 'secondary'}>
                                                                            {customer.properties && customer.properties.length > 0 ? customer.properties.length : 0}
                                                                        </Badge>
                                                                    </Button>
                                                                </div>
                                                                <div className="small">
                                                                    {customer.saleType === '매매' ? formatCurrency(customer.askingPrice) :
                                                                        customer.saleType === '월세' ? `${formatCurrency(customer.monthlyRent)} / ${formatCurrency(customer.deposit)}` :
                                                                            customer.saleType === '전세' ? formatCurrency(customer.jeonseDeposit) :
                                                                                formatCurrency(customer.askingPrice)}
                                                                </div>
                                                            </div>
                                                            <div className="ms-2">
                                                                {(user.level >= 11 || (customer.byCompanyNumber === user.businessNumber && user.level >= 5)) && (
                                                                    <div className="d-flex flex-column gap-1">
                                                                        <Button
                                                                            variant="outline-primary"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleShowModal(customer);
                                                                            }}
                                                                            disabled={loading}
                                                                        >
                                                                            <FaEdit />
                                                                        </Button>

                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}

                                {/* 매도자 고객용 페이지네이션 */}
                                {!loading && totalPages > 1 && (
                                    <div className="d-flex justify-content-center mt-4">
                                        <nav aria-label="고객 목록 페이지네이션">
                                            <ul className="pagination pagination-sm">
                                                {/* 맨 앞으로 버튼 */}
                                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        style={{ pointerEvents: 'auto', zIndex: 10 }}
                                                        onClick={(e) => handleFirstPage(e)}
                                                        disabled={currentPage === 1}
                                                        aria-label="첫 페이지"
                                                    >
                                                        <FaAngleDoubleLeft />
                                                    </button>
                                                </li>

                                                {/* 이전 버튼 */}
                                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        style={{ pointerEvents: 'auto', zIndex: 10 }}
                                                        onClick={(e) => handlePrevPage(e)}
                                                        disabled={currentPage === 1}
                                                        aria-label="이전 페이지"
                                                    >
                                                        <FaChevronLeft />
                                                    </button>
                                                </li>

                                                {/* 페이지 번호들 */}
                                                {getPageNumbers().map(pageNumber => (
                                                    <li
                                                        key={pageNumber}
                                                        className={`page-item ${currentPage === pageNumber ? 'active' : ''}`}
                                                    >
                                                        <button
                                                            className="page-link"
                                                            style={{ pointerEvents: 'auto', zIndex: 10 }}
                                                            onClick={() => handlePageChange(pageNumber)}
                                                        >
                                                            {pageNumber}
                                                        </button>
                                                    </li>
                                                ))}

                                                {/* 다음 버튼 */}
                                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        style={{ pointerEvents: 'auto', zIndex: 10 }}
                                                        onClick={(e) => handleNextPage(e)}
                                                        disabled={currentPage === totalPages}
                                                        aria-label="다음 페이지"
                                                    >
                                                        <FaChevronRight />
                                                    </button>
                                                </li>

                                                {/* 맨 뒤로 버튼 */}
                                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        style={{ pointerEvents: 'auto', zIndex: 10 }}
                                                        onClick={(e) => handleLastPage(e)}
                                                        disabled={currentPage === totalPages}
                                                        aria-label="마지막 페이지"
                                                    >
                                                        <FaAngleDoubleRight />
                                                    </button>
                                                </li>
                                            </ul>
                                        </nav>
                                    </div>
                                )}

                            </div>
                        </Tab>
                    </Tabs>
                </Card.Body>
            </Card>

            {/* 고객 등록/수정 모달 */}
            <CustomerRegistrationModal
                showModal={showModal}
                onHide={handleCloseModal}
                editingCustomer={editingCustomer}
                onSuccess={handleSuccess}
                user={user}
                fixedCustomerType={activeTab === 'buyers' ? '매수자' : activeTab === 'sellers' ? '매도자' : '일반'}
            />

            {/* CSV 일괄 등록 모달 */}
            <CSVBulkUploadModal
                showModal={showCSVModal}
                onHide={() => setShowCSVModal(false)}
                user={user}
                onSuccess={fetchCustomers}
                customerType={activeTab === 'buyers' ? '매수자' : activeTab === 'sellers' ? '매도자' : '일반'}
            />

            {/* 매물 관리 모달 */}
            {showPropertyModal && (
                <Modal show={showPropertyModal} onHide={handleClosePropertyModal} size="xl" fullscreen="lg-down">
                    <Modal.Header closeButton>
                        <Modal.Title>
                            {selectedCustomer?.name} 고객의 매물 관리
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-0">
                        <PropertyManagement
                            isModal={true}
                            customerFilter={selectedCustomer}
                            user={user}
                            onClose={handleClosePropertyModal}
                            onPropertyChange={fetchCustomers}
                        />
                    </Modal.Body>
                </Modal>
            )}

            {/* 지원 이력 모달 */}
            <CustomerScheduleHistoryModal
                showModal={showScheduleHistoryModal}
                onHide={handleCloseScheduleHistoryModal}
                customer={selectedCustomerForHistory}
                onEditSchedule={handleEditSchedule}
                user={user}
            />

            {/* 일정 수정 모달 */}
            <ScheduleRegistrationModal
                showModal={showScheduleEditModal}
                onHide={handleCloseScheduleEditModal}
                editingSchedule={editingSchedule}
                onSuccess={handleScheduleEditSuccess}
                user={user}
            />

            {/* SMS 전송 모달 */}
            <SMSModal
                show={showSMSModal}
                onHide={() => setShowSMSModal(false)}
                customer={selectedCustomerForSMS}
                onSuccess={handleSMSSuccess}
            />

            {/* 일괄 SMS 전송 모달 */}
            <BulkSMSModal
                show={showBulkSMSModal}
                onHide={() => setShowBulkSMSModal(false)}
                selectedCustomers={Array.from(selectedCustomers).map(id =>
                    customers.find(customer => customer._id === id)
                ).filter(Boolean)}
                onSuccess={handleSMSSuccess}
            />

            {/* 고객 양식 CSV 업로드 모달 */}
            <CustomerTemplateUploadModal
                show={showTemplateUploadModal}
                onHide={() => {
                    setShowTemplateUploadModal(false);
                }}
                onSuccess={() => {
                    fetchCustomers();
                    setShowTemplateUploadModal(false);
                }}
            />

        </Container>
    );
};

export default CustomerManagement; 