import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { db } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { maskPII } from '../utils/piiProcessor';
import { analyzeAndGroupInteractions, saveAnalyzedDataToFirestore } from '../services/dataAnalysisService';
import { runGovernanceAudit } from '../services/governanceService';

const DataHub = ({ onAnalysisComplete }) => {
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

            // --- FIREBASE CONFIG CHECK ---
            if (db.app.options.projectId === "your-project-id") {
                console.warn("[CX-Inn] Firebase projesi yapılandırılmamış. Veriler sadece yerel olarak analiz edilecek.");
                // Demo modunda devam etmesi için analiz yapıp state güncelleyelim
                const analyzedDataResult = analyzeAndGroupInteractions(data);
                if (onAnalysisComplete) {
                    onAnalysisComplete(analyzedDataResult);
                }
                alert("Firebase projesi bağlı değil! Veriler buluta kaydedilmedi ancak yerel analiz tamamlandı. (Demo Modu)");
                setUploadSuccess(true);
                setData(null);
                setIsUploading(false);
                return;
            }

            // 1. Orijinal veriyi kaydet (Ham maskelenmiş data)
            const newImportRef = doc(collection(db, 'artifacts', appId, 'imports'));
            await setDoc(newImportRef, {
                uploadedAt: new Date().toISOString(),
                rowsCount: data.length,
                data: data
            });

            // 2. AGENTIC ORCHESTRATION: Veriyi Analiz Et (Classifier, Sentiment, Context Agents)
            // analyzeAndGroupInteractions fonksiyonu bu ajanların görevlerini sırayla yürütür
            const analyzedDataResult = analyzeAndGroupInteractions(data);

            // 3. Analiz sonucunu Firebase'e kaydet (predictive_csat, is_risk_customer vb. eklenmiş halini)
            await saveAnalyzedDataToFirestore(appId, analyzedDataResult);

            // 4. GOVERNANCE: Veriler güvenli mi diye LLM-Judge ve PII-Audit çalıştır
            await runGovernanceAudit(appId, analyzedDataResult.processedData);

            setUploadSuccess(true);
            setData(null);
        } catch (error) {
            console.error("Firestore'a veri analizi ve yükleme hatası:", error);
            alert("Sistem veriyi işlerken bir hatayla karşılaştı. Konsol loglarına bakın.");
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
