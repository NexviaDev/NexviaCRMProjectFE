import React, { useState, useRef } from 'react';
import { Modal, Button, Alert, ProgressBar, Table, Badge, Form } from 'react-bootstrap';
import Papa from 'papaparse';
import api, { apiWithLongTimeout } from '../../utils/api';

const CSVBulkUploadModal = ({ showModal, onHide, onSuccess, customerType = '일반' }) => {
    const [csvData, setCsvData] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadResults, setUploadResults] = useState(null);
    const [error, setError] = useState('');
    const [encoding, setEncoding] = useState('UTF-8');
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
                                .filter(row => row['First Name'] || row['Last Name'] || row['Phone 1 - Value'])
                                .map((row, index) => {
                                    // 이름 조합 (First Name + Middle Name + Last Name)
                                    const firstName = row['First Name'] || '';
                                    const middleName = row['Middle Name'] || '';
                                    const lastName = row['Last Name'] || '';
                                    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
                                    
                                    return {
                                        name: fullName || `고객${index + 1}`,
                                        phone: (row['Phone 1 - Value'] || row['Phone 2 - Value'] || row['Phone 3 - Value'] || '').replace(/[-\s\(\)\.]/g, ''),
                                        email: row['E-mail 1 - Value'] || row['E-mail 2 - Value'] || '',
                                        address: row['Address 1 - Formatted'] || row['Address 1 - Street'] || '',
                                        notes: row['Notes'] || '',
                                        categories: ['일반'], // CSV 업로드 시 기본적으로 일반으로 분류
                                        buyTypes: [],
                                        buyPriceRanges: {
                                            매매: { min: null, max: null },
                                            월세: { monthlyRent: { min: null, max: null }, deposit: { min: null, max: null } },
                                            전세: { min: null, max: null }
                                        },
                                        properties: [],
                                        propertyHistory: []
                                    };
                                });
                            
                            setParsedData(processedData);
                        },
                        error: (error) => {
                            console.error('CSV 파싱 오류:', error);
                            setError('CSV 파일을 읽을 수 없습니다.');
                        }
                    });
                } catch (error) {
                    console.error('파일 읽기 오류:', error);
                    setError('파일을 읽는 중 오류가 발생했습니다.');
                }
            };
            
            reader.onerror = () => {
                setError('파일을 읽을 수 없습니다.');
            };
            
            // 파일을 텍스트로 읽기 (UTF-8로 처리)
            reader.readAsText(file, encoding);
        }
    };

    const handleUpload = async () => {
        if (!parsedData || parsedData.length === 0) {
            setError('업로드할 데이터가 없습니다.');
            return;
        }

        try {
            setUploading(true);
            setUploadProgress(0);
            setError('');

            // 전화번호 형식 정리 (하이픈, 공백, 특수문자 제거)
            const cleanedData = parsedData.map(customer => ({
                ...customer,
                phone: customer.phone.replace(/[-\s\(\)\.]/g, '')
            }));

            // 청크 단위로 데이터 분할 (한 번에 100명씩)
            const chunkSize = 100;
            const chunks = [];
            for (let i = 0; i < cleanedData.length; i += chunkSize) {
                chunks.push(cleanedData.slice(i, i + chunkSize));
            }

            const results = {
                success: [],
                failed: [],
                total: cleanedData.length
            };

            // 청크별로 순차적으로 업로드
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const currentProgress = Math.round(((i + 1) / chunks.length) * 100);
                setUploadProgress(currentProgress);
                

                try {
                    const response = await apiWithLongTimeout.post('/customers/bulk-csv', {
                        customers: chunk
                    });
                    


                    if (response.data.success) {
                        // 성공한 결과 병합
                        if (response.data.data && response.data.data.success) {
                            results.success.push(...response.data.data.success);
                        }
                        if (response.data.data && response.data.data.failed) {
                            results.failed.push(...response.data.data.failed);
                        }
                        
                        // 백엔드에서 성공했다면 청크 전체를 성공으로 처리
                        if (!response.data.data || (!response.data.data.success && !response.data.data.failed)) {
                            chunk.forEach(customer => {
                                results.success.push(customer);
                            });
                        }
                    } else {
                        // 청크 전체 실패 처리
                        chunk.forEach(customer => {
                            results.failed.push({
                                data: customer,
                                error: response.data.message || '청크 업로드 실패'
                            });
                        });
                    }
                } catch (error) {
                    
                    let errorMessage = '청크 업로드 실패';
                    if (error.code === 'ECONNABORTED') {
                        errorMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.';
                    } else if (error.response?.data?.message) {
                        errorMessage = error.response.data.message;
                    } else if (error.response?.data?.error) {
                        errorMessage = error.response.data.error;
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
                    
                    // 청크 전체 실패 처리
                    chunk.forEach(customer => {
                        results.failed.push({
                            data: customer,
                            error: errorMessage
                        });
                    });
                }

                // 잠시 대기 (서버 부하 방지)
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            setUploadResults(results);
            setUploadProgress(100);
            
            // 성공적으로 업로드된 경우에만 목록 새로고침
            if (results.success.length > 0) {
                onSuccess(); // 고객 목록 새로고침
            }

        } catch (error) {
            console.error('CSV 업로드 오류:', error);
            if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError('업로드 중 오류가 발생했습니다.');
            }
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setCsvData(null);
        setParsedData([]);
        setUploading(false);
        setUploadProgress(0);
        setUploadResults(null);
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onHide();
    };

    const resetForm = () => {
        setCsvData(null);
        setParsedData([]);
        setUploadResults(null);
        setError('');
        setEncoding('UTF-8');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Modal show={showModal} onHide={handleClose} size="xl">
            <Modal.Header closeButton>
                <Modal.Title>CSV 일괄 고객 등록</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && (
                    <Alert variant="danger" onClose={() => setError('')} dismissible>
                        {error}
                    </Alert>
                )}

                {!uploadResults ? (
                    <>
                        <div className="mb-4">
                            <h6>CSV 파일 업로드</h6>
                            <p className="text-muted">
                                Google Contacts에서 내보낸 CSV 파일을 업로드하여 고객을 일괄 등록할 수 있습니다.
                            </p>
                            
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <label className="form-label">파일 인코딩</label>
                                    <Form.Select 
                                        value={encoding} 
                                        onChange={(e) => setEncoding(e.target.value)}
                                    >
                                        <option value="UTF-8">UTF-8 (권장)</option>
                                        <option value="EUC-KR">EUC-KR (한글 Windows)</option>
                                        <option value="ISO-8859-1">ISO-8859-1</option>
                                        <option value="CP949">CP949 (한글 Windows)</option>
                                        <option value="ANSI">ANSI (Windows 기본)</option>
                                    </Form.Select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">CSV 파일 선택</label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileSelect}
                                        className="form-control"
                                    />
                                </div>
                            </div>
                        </div>

                        {parsedData.length > 0 && (
                            <div className="mb-4">
                                <h6>파싱된 데이터 미리보기 ({parsedData.length}명)</h6>
                                <div className="table-responsive" style={{ maxHeight: '300px' }}>
                                    <Table striped bordered hover size="sm">
                                        <thead>
                                            <tr>
                                                <th>이름</th>
                                                <th>전화번호</th>
                                                <th>이메일</th>
                                                <th>주소</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.slice(0, 10).map((customer, index) => (
                                                <tr key={index}>
                                                    <td>{customer.name}</td>
                                                    <td>{customer.phone}</td>
                                                    <td>{customer.email}</td>
                                                    <td>{customer.address}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                                {parsedData.length > 10 && (
                                    <p className="text-muted">
                                        ... 외 {parsedData.length - 10}명 더 있습니다.
                                    </p>
                                )}
                            </div>
                        )}

                        {uploading && (
                            <div className="mb-3">
                                <ProgressBar 
                                    now={uploadProgress} 
                                    label={`${uploadProgress}%`}
                                    animated
                                />
                                <p className="text-center mt-2">
                                    {uploadProgress < 100 ? '청크 단위로 업로드 중...' : '업로드 완료!'}
                                </p>
                                <small className="text-muted text-center d-block">
                                    대용량 파일은 청크 단위로 나누어 업로드됩니다.
                                </small>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="mb-4">
                        <h6>업로드 결과</h6>
                        <Alert variant="info">
                            총 {uploadResults.total}명 중 {uploadResults.success.length}명 등록 성공, {uploadResults.failed.length}명 실패
                        </Alert>

                        {uploadResults.failed.length > 0 && (
                            <div className="mb-3">
                                <h6>실패한 항목들</h6>
                                <div className="table-responsive" style={{ maxHeight: '200px' }}>
                                    <Table striped bordered hover size="sm">
                                        <thead>
                                            <tr>
                                                <th>이름</th>
                                                <th>전화번호</th>
                                                <th>오류 내용</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {uploadResults.failed.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{item.data.name}</td>
                                                    <td>{item.data.phone}</td>
                                                    <td>{item.error}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                {!uploadResults ? (
                    <>
                        <Button variant="secondary" onClick={handleClose} disabled={uploading}>
                            취소
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={handleUpload} 
                            disabled={!parsedData.length || uploading}
                        >
                            {uploading ? '업로드 중...' : '업로드 시작'}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="secondary" onClick={resetForm}>
                            새로 업로드
                        </Button>
                        <Button variant="primary" onClick={handleClose}>
                            완료
                        </Button>
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default CSVBulkUploadModal; 