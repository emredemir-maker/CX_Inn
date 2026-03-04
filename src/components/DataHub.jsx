import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { db } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { maskPII } from '../utils/piiProcessor';

const DataHub = () => {
    const [data, setData] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const processFile = (file) => {
        if (!file || file.type !== 'text/csv') {
            alert("Lütfen geçerli bir CSV dosyası yükleyin.");
            return;
        }

        setIsProcessing(true);
        setUploadSuccess(false);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // Redact PII data
                const rows = results.data;
                const maskedData = rows.map(row => {
                    const newRow = {};
                    for (const [key, value] of Object.entries(row)) {
                        newRow[key] = maskPII(value, key);
                    }
                    return newRow;
                });

                setData(maskedData);
                setIsProcessing(false);
            },
            error: (error) => {
                console.error("CSV okuma hatası:", error);
                setIsProcessing(false);
                alert("Dosya işlenirken bir hata oluştu.");
            }
        });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    };

    const handleUploadToFirestore = async () => {
        if (!data || data.length === 0) return;

        setIsUploading(true);
        try {
            // Bu appId projeye veya kullanıcıya göre dinamik olarak değiştirilebilir.
            const appId = "default-app-id";

            const newImportRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'imports'));

            await setDoc(newImportRef, {
                uploadedAt: new Date().toISOString(),
                rowsCount: data.length,
                data: data
            });

            setUploadSuccess(true);
            setData(null);
        } catch (error) {
            console.error("Firestore'a yükleme hatası:", error);
            alert("Firestore'a yükleme sırasında hata oluştu. Firebase ayarlarınızı (api key vb.) kontrol edin veya Console loglarına bakın.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="data-hub-container animate-fade-in" style={{ padding: '0 40px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="hub-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '28px', color: 'var(--text-main)', marginBottom: '8px' }}>Veri Yükleme & PII Pre-processor</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Müşteri verilerinizi yükleyin. TCKN, İsim ve Telefon bilgileri otomatik olarak maskelenecektir.</p>
                </div>
            </div>

            {!data && (
                <div
                    className={`dropzone ${isDragging ? 'drag-active' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <span className="material-symbols-outlined drop-icon">cloud_upload</span>
                    <h3>CSV Dosyasını Sürükleyin veya Seçin</h3>
                    <p>Dosyanız cihazınızda (istemci tarafı) işlenir ve PII maskelemesi yapılır.</p>
                    {isProcessing && <div className="loader">İşleniyor...</div>}

                    {uploadSuccess && (
                        <div className="success-banner">
                            <span className="material-symbols-outlined">check_circle</span>
                            Veriler maskelenmiş halde Firestore'a başarıyla kaydedildi! (/artifacts/APP_ID/public/data/imports)
                        </div>
                    )}
                </div>
            )}

            {data && (
                <div className="preview-container">
                    <div className="preview-header">
                        <h4>Önizleme ({data.length} satır)</h4>
                        <div className="preview-actions">
                            <button className="btn-secondary" onClick={() => setData(null)}>İptal</button>
                            <button
                                className="btn-primary"
                                onClick={handleUploadToFirestore}
                                disabled={isUploading}
                            >
                                {isUploading ? 'Yükleniyor...' : 'Güvenli Firestore\'a Aktar'}
                            </button>
                        </div>
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    {Object.keys(data[0] || {}).map((header, index) => (
                                        <th key={index}>{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.slice(0, 50).map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {Object.values(row).map((val, colIndex) => (
                                            <td key={colIndex}>
                                                <span className={val === '[PII_MASKED]' ? 'masked-badge' : ''}>
                                                    {val}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {data.length > 50 && (
                        <p className="table-footer-note">Sadece ilk 50 satır önizlemede gösteriliyor.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default DataHub;
