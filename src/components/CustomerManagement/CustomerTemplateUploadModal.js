import React, { useState, useRef } from 'react';
import { Modal, Button, Alert, ProgressBar, Table, Badge, Form } from 'react-bootstrap';
import Papa from 'papaparse';
import { apiWithLongTimeout } from '../../utils/api';

const CustomerTemplateUploadModal = ({ show, onHide, onSuccess }) => {
    
    const [csvData, setCsvData] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadResults, setUploadResults] = useState(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setCsvData(file);
            setError('');
            setParsedData([]);
            setUploadResults(null);
            
            // 파일을 FileReader로 읽어서 인코딩 문제 해결
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    let csvText = e.target.result;
                    
                    // BOM(Byte Order Mark) 제거
                    if (csvText.charCodeAt(0) === 0xFEFF) {
                        csvText = csvText.slice(1);
                    }
                    
                    // 첫 번째 행(주의사항) 제거
                    const lines = csvText.split('\n');
                    if (lines.length > 1 && lines[0].includes('주의')) {
                        csvText = lines.slice(1).join('\n');
                    }
                    
                    // Papa.parse로 CSV 파싱
                    Papa.parse(csvText, {
                        header: true,
                        skipEmptyLines: true,
                        encoding: 'utf-8',
                        complete: (results) => {
                            if (results.errors.length > 0) {
                                setError('CSV 파일 파싱 중 오류가 발생했습니다.');
                                return;
                            }
                            
                            
                            const processedData = results.data
                                .filter(row => row['고객명 (필수)'] && row['고객명 (필수)'].trim() !== '')
                                .map((row, index) => {
                                    // 고객명
                                    const name = row['고객명 (필수)'] || '';
                                    
                                    // 고객분류 처리 (쉼표로 구분된 값들을 배열로 변환)
                                    const categories = row['고객분류 (실거주/매도/매수/일반 쉼표로 구분)'] 
                                        ? row['고객분류 (실거주/매도/매수/일반 쉼표로 구분)'].split(',').map(cat => cat.trim()).filter(cat => cat)
                                        : ['일반'];
                                    
                                    // 매수유형 처리 (쉼표로 구분된 값들을 배열로 변환)
                                    const buyTypes = row['매수유형 (매매/월세/전세 쉼표로 구분)'] 
                                        ? row['매수유형 (매매/월세/전세 쉼표로 구분)'].split(',').map(type => type.trim()).filter(type => type)
                                        : [];
                                    
                                    // 전화번호 정리
                                    const phone = row['전화번호'] ? row['전화번호'].replace(/[^\d]/g, '') : '';
                                    
                                    // 숫자 변환 함수
                                    const convertToNumber = (value) => {
                                        if (!value || value === '') return null;
                                        const cleanValue = value.toString().replace(/[^\d]/g, '');
                                        const numValue = parseFloat(cleanValue);
                                        return isNaN(numValue) ? null : numValue;
                                    };
                                    
                                    // 가격 범위 데이터 구성
                                    const buyPriceRanges = {
                                        매매: {
                                            min: convertToNumber(row['매매최소가격 (숫자만)']),
                                            max: convertToNumber(row['매매최대가격 (숫자만)'])
                                        },
                                        월세: {
                                            monthlyRent: {
                                                min: convertToNumber(row['월세최소 (숫자만)']),
                                                max: convertToNumber(row['월세최대 (숫자만)'])
                                            },
                                            deposit: {
                                                min: convertToNumber(row['월세보증금최소 (숫자만)']),
                                                max: convertToNumber(row['월세보증금최대 (숫자만)'])
                                            }
                                        },
                                        전세: {
                                            min: convertToNumber(row['전세최소가격 (숫자만)']),
                                            max: convertToNumber(row['전세최대가격 (숫자만)'])
                                        }
                                    };
                                    
                                    // 최근연락일 처리
                                    let lastContact = new Date();
                                    if (row['최근연락일 (YYYY-MM-DD 형식)']) {
                                        const dateStr = row['최근연락일 (YYYY-MM-DD 형식)'];
                                        const parsedDate = new Date(dateStr);
                                        if (!isNaN(parsedDate.getTime())) {
                                            lastContact = parsedDate;
                                        }
                                    }
                                    
                                    return {
                                        name: name,
                                        categories: categories,
                                        buyTypes: buyTypes,
                                        buyPriceRanges: buyPriceRanges,
                                        phone: phone,
                                        email: row['이메일'] || '',
                                        businessNumber: row['사업자번호'] || '',
                                        address: row['주소'] || '',
                                        budget: convertToNumber(row['예산 (숫자만)']),
                                        preferredArea: row['선호지역'] || '',
                                        status: '활성',
                                        lastContact: lastContact,
                                        notes: row['메모'] || ''
                                    };
                                });
                            
                            setParsedData(processedData);
                        },
                        error: (error) => {
                            setError('CSV 파일을 읽는 중 오류가 발생했습니다: ' + error.message);
                        }
                    });
                } catch (error) {
                    setError('파일을 읽는 중 오류가 발생했습니다: ' + error.message);
                }
            };
            
            reader.readAsText(file, 'utf-8');
        }
    };

    const handleUpload = async () => {
        if (parsedData.length === 0) {
            setError('업로드할 데이터가 없습니다.');
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setError('');

        try {
            const response = await apiWithLongTimeout.post('/customers/bulk-csv', {
                customers: parsedData
            });

            if (response.data.success) {
                setUploadResults(response.data);
                setUploadProgress(100);
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                setError(response.data.message || '업로드 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('업로드 오류:', error);
            setError('업로드 중 오류가 발생했습니다: ' + (error.response?.data?.message || error.message));
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setCsvData(null);
        setParsedData([]);
        setUploadResults(null);
        setError('');
        setUploadProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onHide();
    };

    const getCategoryBadge = (categories) => {
        if (!categories || categories.length === 0) return <Badge bg="secondary">일반</Badge>;
        
        return categories.map((category, index) => {
            let variant = 'secondary';
            if (category === '매수') variant = 'primary';
            else if (category === '매도') variant = 'success';
            else if (category === '실거주') variant = 'info';
            
            return (
                <Badge key={index} bg={variant} className="me-1">
                    {category}
                </Badge>
            );
        });
    };

    const getBuyTypeBadge = (buyTypes) => {
        if (!buyTypes || buyTypes.length === 0) return null;
        
        return buyTypes.map((type, index) => {
            let variant = 'outline-secondary';
            if (type === '매매') variant = 'outline-primary';
            else if (type === '월세') variant = 'outline-success';
            else if (type === '전세') variant = 'outline-warning';
            
            return (
                <Badge key={index} bg={variant} className="me-1">
                    {type}
                </Badge>
            );
        });
    };

    
    if (!show) {
        return null;
    }
    
    return (
        <Modal show={show} onHide={handleClose} size="xl" centered>
            <Modal.Header closeButton>
                <Modal.Title>고객 양식 CSV 업로드</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && (
                    <Alert variant="danger" onClose={() => setError('')} dismissible>
                        {error}
                    </Alert>
                )}

                {!csvData && (
                    <div className="text-center py-4">
                        <h5>CSV 파일을 선택하세요</h5>
                        <p className="text-muted">양식 다운로드로 생성한 CSV 파일을 업로드하세요.</p>
                        <Form.Control
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="mb-3"
                        />
                    </div>
                )}

                {csvData && parsedData.length > 0 && !uploadResults && (
                    <div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5>업로드할 고객 데이터 ({parsedData.length}명)</h5>
                            <div>
                                <Button variant="outline-secondary" onClick={() => handleClose()} className="me-2">
                                    취소
                                </Button>
                                <Button 
                                    variant="primary" 
                                    onClick={handleUpload}
                                    disabled={uploading}
                                >
                                    {uploading ? '업로드 중...' : '업로드 시작'}
                                </Button>
                            </div>
                        </div>

                        {uploading && (
                            <div className="mb-3">
                                <ProgressBar 
                                    now={uploadProgress} 
                                    label={`${uploadProgress}%`}
                                    animated
                                />
                            </div>
                        )}

                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <Table responsive striped hover size="sm">
                                <thead className="table-light sticky-top">
                                    <tr>
                                        <th>고객명</th>
                                        <th>분류</th>
                                        <th>매수유형</th>
                                        <th>연락처</th>
                                        <th>주소</th>
                                        <th>예산</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.map((customer, index) => (
                                        <tr key={index}>
                                            <td>
                                                <strong>{customer.name}</strong>
                                            </td>
                                            <td>
                                                {getCategoryBadge(customer.categories)}
                                            </td>
                                            <td>
                                                {getBuyTypeBadge(customer.buyTypes)}
                                            </td>
                                            <td>
                                                <div className="small">
                                                    {customer.phone && (
                                                        <div>📞 {customer.phone}</div>
                                                    )}
                                                    {customer.email && (
                                                        <div>✉️ {customer.email}</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="small text-muted">
                                                    {customer.address || '-'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="small">
                                                    {customer.budget ? 
                                                        `${customer.budget.toLocaleString()}원` : 
                                                        '-'
                                                    }
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </div>
                )}

                {uploadResults && (
                    <div>
                        <Alert variant="success">
                            <h5>업로드 완료!</h5>
                            <p className="mb-0">
                                성공: {uploadResults.successCount}명, 
                                실패: {uploadResults.failedCount}명
                            </p>
                        </Alert>

                        {uploadResults.failed && uploadResults.failed.length > 0 && (
                            <div className="mt-3">
                                <h6>실패한 고객들:</h6>
                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {uploadResults.failed.map((fail, index) => (
                                        <Alert key={index} variant="danger" className="py-2">
                                            <strong>{fail.data.name}</strong>: {fail.error}
                                        </Alert>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-center mt-3">
                            <Button variant="primary" onClick={handleClose}>
                                완료
                            </Button>
                        </div>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default CustomerTemplateUploadModal;
