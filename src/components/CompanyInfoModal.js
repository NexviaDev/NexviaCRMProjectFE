import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FaBuilding, FaCalendarAlt, FaMapMarkerAlt, FaIdCard } from 'react-icons/fa';

const CompanyInfoModal = ({ show, onHide }) => {
    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <FaBuilding className="me-2" />
                    회사 사업자 정보
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row">
                    <div className="col-md-6">
                        <div className="mb-3">
                            <h6 className="text-primary mb-2">
                                <FaIdCard className="me-2" />
                                기본 정보
                            </h6>
                            <div className="ps-3">
                                <p className="mb-1"><strong>등록번호:</strong> 541-86-03652</p>
                                <p className="mb-1"><strong>상호:</strong> 넥스비아</p>
                                <p className="mb-1"><strong>성명:</strong> 최현석</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-md-6">
                        <div className="mb-3">
                            <h6 className="text-primary mb-2">
                                <FaMapMarkerAlt className="me-2" />
                                사업장 소재지
                            </h6>
                            <div className="ps-3">
                                <p className="mb-1">인천광역시 강화군 길상면 길상로 98-12, 2층</p>
                            </div>
                        </div>
                        
                        <div className="mb-3">
                            <h6 className="text-primary mb-2">
                                <FaBuilding className="me-2" />
                                사업의 종류
                            </h6>
                            <div className="ps-3">
                                <div className="mb-2">
                                    <strong>업태:</strong>
                                    <ul className="mb-1 mt-1">
                                        <li>정보통신업</li>
                                    </ul>
                                </div>
                                <div>
                                    <strong>종목:</strong>
                                    <ul className="mb-0 mt-1">
                                        <li>응용 소프트웨어 개발 및 공급업</li>
                                        <li>도매 및 소매업</li>
                                        <li>컴퓨터 주변장치, 소프트웨어 도매업</li>
                                        <li>정보통신업</li>
                                        <li>컴퓨터 프로그래밍 서비스업</li>
                                        <li>교육서비스업</li>
                                        <li>기타 교육지원 서비스업</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-4 p-3 bg-light rounded">
                    <h6 className="text-secondary mb-2">추가 정보</h6>
                    <div className="row">
                        <div className="col-md-6">
                            <p className="mb-1"><strong>발급사유:</strong> (공란)</p>
                        </div>
                        <div className="col-md-6">
                            <p className="mb-1"><strong>공동사업자:</strong> (공란)</p>
                        </div>
                    </div>
                    <p className="mb-0"><strong>전자세금계산서 전용 전자우편주소:</strong> (공란)</p>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    닫기
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default CompanyInfoModal;
