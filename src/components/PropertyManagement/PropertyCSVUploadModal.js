import React, { useState, useRef } from 'react';
import { Modal, Button, Alert, ProgressBar, Table, Badge, Form } from 'react-bootstrap';
import Papa from 'papaparse';
import { apiWithLongTimeout } from '../../utils/api';
import { FaFileCsv } from 'react-icons/fa';

const PropertyCSVUploadModal = ({ showModal, onHide, onSuccess }) => {
    const [csvData, setCsvData] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadResults, setUploadResults] = useState(null);
    const [error, setError] = useState('');
    const [encoding, setEncoding] = useState('UTF-8');
    const [detectedEncoding, setDetectedEncoding] = useState('');
    const [duplicateTitles, setDuplicateTitles] = useState([]); // 중복 매물명 추가
    const fileInputRef = useRef(null);

    // 매물명 중복검사 함수 추가
    const checkDuplicateTitles = (data) => {
        const titleCounts = {};
        const duplicates = [];
        
        data.forEach((item, index) => {
            if (item.title) {
                if (titleCounts[item.title]) {
                    titleCounts[item.title].push(index + 1);
                    if (titleCounts[item.title].length === 2) {
                        duplicates.push({
                            title: item.title,
                            rows: [titleCounts[item.title][0], index + 1]
                        });
                    }
                } else {
                    titleCounts[item.title] = [index + 1];
                }
            }
        });
        
        return duplicates;
    };

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
                        setDetectedEncoding('UTF-8 (BOM)');
                    } else {
                        setDetectedEncoding('UTF-8');
                    }
                    
                    // Papa.parse로 CSV 파싱 (헤더 없이 모든 행을 배열로)
                    Papa.parse(csvText, {
                        header: false,
                        skipEmptyLines: true,
                        encoding: encoding.toLowerCase(),
                        transform: (value) => {
                            // 값의 앞뒤 공백 제거 및 특수문자 처리
                            if (typeof value === 'string') {
                                return value.trim().replace(/^\uFEFF/, ''); // 추가 BOM 제거
                            }
                            return value;
                        },
                        complete: (results) => {
                            if (results.errors.length > 0) {
                                setError('CSV 파일 파싱 중 오류가 발생했습니다. 파일 형식을 확인해주세요.');
                                return;
                            }
                            
                            // 헤더 확인 (2행이 헤더, 실제 15개 컬럼)
                            const expectedHeaders = ['매물유형', '매매가격', '월세가격', '월세보증금', '전세가격', '면적', '방개수', '욕실개수', '주소', '상세주소', '상태', '주차', '애완동물', '엘리베이터', '특이사항'];
                            const actualHeaders = results.data[1] || []; // 2행이 헤더
                            
                            
                            
                            const actualData = results.data.slice(5);
                            
                            
                            const processedData = actualData
                                .filter(row => {
                                    // 배열 형태로 접근 (인덱스 기반)
                                    const hasData = row[8]; // 주소는 8번 인덱스
                                    return hasData;
                                })
                                .map((row, index) => {
                                    // 매물 유형 처리 (배열 인덱스 기반)
                                    let type = ['매매'];
                                    if (row[0]) { // 매물유형은 0번 인덱스 (수정됨)
                                        const typeStr = row[0].trim();
                                        
                                        // 쉼표로 구분된 여러 매물유형 처리
                                        if (typeStr.includes(',')) {
                                            type = typeStr.split(',').map(t => t.trim()).filter(t => t);
                                        } else if (typeStr.includes('월세')) {
                                            type = ['월세'];
                                        } else if (typeStr.includes('전세')) {
                                            type = ['전세'];
                                        } else if (typeStr.includes('실거주')) {
                                            type = ['실거주'];
                                        } else {
                                        }
                                    } else {
                                    }

                                    // 가격 처리 (배열 인덱스 기반) - 새로운 prices 구조
                                    const convertToNumber = (value) => {
                                        if (!value || value.trim() === '') return null;
                                        const num = parseInt(value.replace(/[^\d]/g, ''));
                                        return isNaN(num) ? null : num;
                                    };

                                    const prices = {
                                        매매가격: convertToNumber(row[1]), // 매매가격은 1번 인덱스
                                        월세가격: convertToNumber(row[2]), // 월세가격은 2번 인덱스
                                        월세보증금: convertToNumber(row[3]), // 월세보증금은 3번 인덱스
                                        전세가격: convertToNumber(row[4]) // 전세가격은 4번 인덱스
                                    };

                                    return {
                                        title: ((row[8] || '') + (row[9] ? ' ' + row[9] : '')).trim() || `매물${index + 1}`, // 주소 + 상세주소를 매물명으로 자동 설정
                                        type: type,
                                        prices: prices,
                                        area: row[5] || '120', // 면적은 5번 인덱스, 기본값 120
                                        rooms: parseInt(row[6]) || 1, // 방개수는 6번 인덱스
                                        bathrooms: parseInt(row[7]) || 1, // 욕실개수는 7번 인덱스
                                        address: row[8] || '', // 주소는 8번 인덱스
                                        detailedAddress: row[9] || '', // 상세주소는 9번 인덱스
                                        status: row[10] || '판매중', // 상태는 10번 인덱스
                                        parking: row[11] || '별도문의', // 주차는 11번 인덱스
                                        pets: row[12] || '별도문의', // 애완동물은 12번 인덱스
                                        elevator: row[13] || '별도문의', // 엘리베이터는 13번 인덱스
                                        specialNotes: row[14] || '' // 특이사항은 14번 인덱스
                                    };
                                });
                            
                            
                            // 중복 매물명 검사
                            const duplicates = checkDuplicateTitles(processedData);
                            setDuplicateTitles(duplicates);
                            
                            
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
            
            // 파일을 텍스트로 읽기 (선택된 인코딩으로 처리)
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
            setError('');
            setUploadProgress(0);
            setUploadResults({ success: 0, failed: 0, errors: [] });

            let successCount = 0;
            let failedCount = 0;
            const errors = [];

            for (let i = 0; i < parsedData.length; i++) {
                try {
                    const propertyData = parsedData[i];
                    
                    // 필수 필드 검증
                    if (!propertyData.title || !propertyData.address || !propertyData.area) {
                        errors.push(`행 ${i + 1}: 매물명, 주소, 면적은 필수입니다.`);
                        failedCount++;
                        continue;
                    }

                    const response = await apiWithLongTimeout.post('/properties', propertyData);
                    
                    if (response.data.success) {
                        successCount++;
                    } else {
                        errors.push(`행 ${i + 1}: ${response.data.message || '등록 실패'}`);
                        failedCount++;
                    }

                    // 진행률 업데이트
                    const progress = Math.round(((i + 1) / parsedData.length) * 100);
                    setUploadProgress(progress);

                } catch (error) {
                    console.error(`매물 ${i + 1} 등록 오류:`, error);
                    
                    let errorMessage = `행 ${i + 1}: `;
                    if (error.code === 'ECONNABORTED') {
                        errorMessage += '요청 시간이 초과되었습니다. 다시 시도해주세요.';
                    } else if (error.response?.data?.message) {
                        errorMessage += error.response.data.message;
                    } else if (error.response?.data?.error) {
                        errorMessage += error.response.data.error;
                    } else if (error.message) {
                        errorMessage += error.message;
                    } else {
                        errorMessage += '알 수 없는 오류';
                    }
                    
                    errors.push(errorMessage);
                    failedCount++;
                }
            }

            setUploadResults({
                success: successCount,
                failed: failedCount,
                errors: errors
            });

            if (successCount > 0) {
                onSuccess();
            }

        } catch (error) {
            console.error('일괄 업로드 오류:', error);
            setError('일괄 업로드 중 오류가 발생했습니다.');
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

    return (
        <Modal show={showModal} onHide={handleClose} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    <FaFileCsv className="me-2" />
                    매물 CSV 일괄 등록
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && (
                    <Alert variant="danger" onClose={() => setError('')} dismissible>
                        {error}
                    </Alert>
                )}

                {!uploadResults && (
                    <>
                        <Alert variant="info">
                            <h6>CSV 파일 형식 안내</h6>
                            <p className="mb-2">다음 컬럼을 포함한 CSV 파일을 업로드하세요:</p>
                            <p className="mb-2 text-warning">
                                <strong>주의:</strong> 한글이 깨지지 않도록 UTF-8 인코딩으로 저장하세요.
                                엑셀에서 저장할 때 "CSV UTF-8 (쉼표로 분리)" 형식으로 저장하세요.
                            </p>
                            <ul className="mb-0">
                                <li><strong>매물명</strong>: 필수</li>
                                <li><strong>매물유형</strong>: 매매, 월세, 전세, 실거주</li>
                                <li><strong>가격</strong>: 숫자만 입력 (예: 50000000)</li>
                                <li><strong>보증금</strong>: 월세/전세 시 (예: 10000000)</li>
                                <li><strong>면적</strong>: 숫자 (예: 84.5)</li>
                                <li><strong>방개수</strong>: 숫자 (예: 3)</li>
                                <li><strong>욕실개수</strong>: 숫자 (예: 2)</li>
                                <li><strong>주소</strong>: 필수</li>
                                <li><strong>상세주소</strong>: 선택</li>
                                <li><strong>상태</strong>: 판매중, 월세중, 전세중</li>
                                <li><strong>주차</strong>: 가능, 불가능, 별도문의</li>
                                <li><strong>애완동물</strong>: 가능, 불가능, 별도문의</li>
                                <li><strong>엘리베이터</strong>: 있음, 없음, 별도문의</li>
                                <li><strong>특이사항</strong>: 선택</li>
                            </ul>
                        </Alert>

                        <Form.Group className="mb-3">
                            <Form.Label>인코딩 선택</Form.Label>
                                                    <Form.Select
                            value={encoding}
                            onChange={(e) => {
                                setEncoding(e.target.value);
                                // 인코딩이 변경되면 기존 파일을 다시 파싱
                                if (csvData) {
                                    const event = { target: { files: [csvData] } };
                                    handleFileSelect(event);
                                }
                            }}
                            className="mb-2"
                        >
                                <option value="UTF-8">UTF-8 (권장)</option>
                                <option value="EUC-KR">EUC-KR (한국어)</option>
                                <option value="CP949">CP949 (한국어 Windows)</option>
                                <option value="ISO-8859-1">ISO-8859-1 (Latin)</option>
                                <option value="GBK">GBK (중국어)</option>
                                <option value="Shift_JIS">Shift_JIS (일본어)</option>
                            </Form.Select>
                            <Form.Text className="text-muted">
                                파일의 인코딩을 선택하세요. 한글이 깨진다면 EUC-KR이나 CP949를 시도해보세요.
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>CSV 파일 선택</Form.Label>
                            <Form.Control
                                type="file"
                                accept=".csv"
                                onChange={handleFileSelect}
                                ref={fileInputRef}
                            />
                            <Form.Text className="text-muted">
                                선택한 인코딩으로 파일을 읽습니다. {detectedEncoding && `감지된 인코딩: ${detectedEncoding}`}
                            </Form.Text>
                        </Form.Group>

                        {parsedData.length > 0 && (
                            <>
                                {/* 중복 매물명 경고 */}
                                {duplicateTitles.length > 0 && (
                                    <Alert variant="warning" className="mb-3">
                                        <Alert.Heading>⚠️ 중복 매물명 발견!</Alert.Heading>
                                        <p>다음 매물명이 중복되어 있습니다:</p>
                                        <ul className="mb-0">
                                            {duplicateTitles.map((dup, index) => (
                                                <li key={index}>
                                                    <strong>"{dup.title}"</strong> - {dup.rows.join(', ')}행
                                                </li>
                                            ))}
                                        </ul>
                                        <hr />
                                        <p className="mb-0">
                                            <small>
                                                중복된 매물명을 수정하거나, 기존 매물과 구분할 수 있도록 상세주소나 특이사항을 추가해주세요.
                                                <br />
                                                <strong>예시:</strong> "삼성동 123-0 101호" → "삼성동 123-0 101호 (1층)"
                                            </small>
                                        </p>
                                    </Alert>
                                )}
                                
                                <h6>파싱된 데이터 미리보기 ({parsedData.length}개)</h6>
                                <div className="table-responsive" style={{ maxHeight: '300px' }}>
                                    <Table striped bordered hover size="sm">
                                        <thead>
                                            <tr>
                                                <th>매물명</th>
                                                <th>유형</th>
                                                <th>가격</th>
                                                <th>주소</th>
                                                <th>면적</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.slice(0, 10).map((item, index) => (
                                                <tr key={index}>
                                                    <td>{item.title}</td>
                                                    <td>
                                                        {item.type.map((t, i) => (
                                                            <Badge key={i} bg="info" className="me-1">
                                                                {t}
                                                            </Badge>
                                                        ))}
                                                    </td>
                                                    <td>{item.price ? item.price.toLocaleString() : '-'}</td>
                                                    <td>{item.address}</td>
                                                    <td>{item.area}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                                {parsedData.length > 10 && (
                                    <p className="text-muted">
                                        ... 외 {parsedData.length - 10}개 더
                                    </p>
                                )}
                            </>
                        )}
                    </>
                )}

                {uploadResults && (
                    <div>
                        <h6>업로드 결과</h6>
                        <div className="row text-center mb-3">
                            <div className="col">
                                <div className="border rounded p-3">
                                    <h4 className="text-success mb-0">{uploadResults.success}</h4>
                                    <small>성공</small>
                                </div>
                            </div>
                            <div className="col">
                                <div className="border rounded p-3">
                                    <h4 className="text-danger mb-0">{uploadResults.failed}</h4>
                                    <small>실패</small>
                                </div>
                            </div>
                        </div>

                        {uploadResults.errors.length > 0 && (
                            <div>
                                <h6>오류 상세</h6>
                                <div className="table-responsive" style={{ maxHeight: '200px' }}>
                                    <Table striped bordered hover size="sm">
                                        <thead>
                                            <tr>
                                                <th>오류 내용</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {uploadResults.errors.map((error, index) => (
                                                <tr key={index}>
                                                    <td className="text-danger">{error}</td>
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
                <Button variant="secondary" onClick={handleClose}>
                    {uploadResults ? '닫기' : '취소'}
                </Button>
                {!uploadResults && parsedData.length > 0 && (
                    <Button
                        variant="primary"
                        onClick={handleUpload}
                        disabled={uploading || duplicateTitles.length > 0}
                    >
                        {uploading ? '업로드 중...' : '업로드 시작'}
                    </Button>
                )}
            </Modal.Footer>

            {uploading && (
                <div className="position-absolute top-0 start-0 w-100">
                    <ProgressBar
                        now={uploadProgress}
                        label={`${uploadProgress}%`}
                        variant="success"
                        animated
                    />
                </div>
            )}
        </Modal>
    );
};

export default PropertyCSVUploadModal; 