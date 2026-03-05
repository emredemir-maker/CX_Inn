import React, { useState, useEffect } from 'react';
import { listenToNpsReportData } from '../services/npsReportService';

const NpsReport = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const appId = "default-app-id";
        const unsubscribe = listenToNpsReportData(appId, (data) => {
            setReportData(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="animate-fade-in" style={{ padding: '0 40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2, animation: 'spin 2s linear infinite' }}>analytics</span>
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>NPS Raporu ve Etki Analizi verileri yükleniyor...</p>
            </div>
        );
    }

    if (!reportData || (!reportData.impactMatrix.length && !reportData.gapAnalysis.length)) {
        return (
            <div className="animate-fade-in" style={{ padding: '0 40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '64px', opacity: 0.2, marginBottom: '16px' }}>hourglass_empty</span>
                <h3 style={{ fontSize: '24px', color: 'var(--text-main)', marginBottom: '8px' }}>Yeterli Veri Yok</h3>
                <p style={{ color: 'var(--text-secondary)' }}>NPS Raporu için henüz yeterli anket veya analiz verisi oluşturulmamış.</p>
            </div>
        );
    }

    // Gerçekleşen Ortalama NPS/CSAT (Sadece dönen anketler üzerinden hesaplanır)
    const totalActualResponses = reportData.gapAnalysis.length;
    let actualCsatAverage = 3;
    if (totalActualResponses > 0) {
        const sum = reportData.gapAnalysis.reduce((acc, curr) => acc + curr.actualScore, 0);
        actualCsatAverage = (sum / totalActualResponses).toFixed(1);
    }

    return (
        <div className="nps-report-container animate-fade-in" style={{ padding: '0 40px', height: '100%', display: 'flex', flexDirection: 'column', gap: '32px', overflowY: 'auto' }}>

            <div className="hub-header">
                <h2 style={{ fontSize: '28px', color: 'var(--text-main)', marginBottom: '8px' }}>NPS Raporu & Closed Loop Analitiği</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Müşteri memnuniyet skoru değişimleri, etki analiz grafiği ve model doğruluk verileri.</p>
            </div>

            {/* Üst Metrikler (Score Cards) */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {/* Genel Puanlama (Gerçekleşen) */}
                <div className="insight-card" style={{ flex: '1', minWidth: '250px' }}>
                    <div className="insight-card-header">
                        <span className="material-symbols-outlined icon" style={{ color: '#3f1eae', background: 'rgba(63, 30, 174, 0.1)' }}>star</span>
                        <h3 style={{ color: '#3f1eae' }}>Gerçekleşen CSAT Skoru</h3>
                    </div>
                    <div className="insight-body" style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                            <div className="insight-value" style={{ fontSize: '42px', color: actualCsatAverage >= 4 ? '#34c759' : actualCsatAverage <= 2 ? '#ff3b30' : '#ff9500' }}>{totalActualResponses > 0 ? actualCsatAverage : '-'}</div>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px' }}>/ 5</span>
                        </div>
                        <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Tamamlanan <strong>{totalActualResponses}</strong> anket baz alınarak hesaplandı.</p>
                    </div>
                </div>

                {/* AI Tahmin Edilen Ortalama (Overall) */}
                <div className="insight-card" style={{ flex: '1', minWidth: '250px' }}>
                    <div className="insight-card-header">
                        <span className="material-symbols-outlined icon">online_prediction</span>
                        <h3>AI Predictive Puanı (Zeka Önizlemesi)</h3>
                    </div>
                    <div className="insight-body" style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                            <div className="insight-value" style={{ fontSize: '42px', color: 'var(--text-main)' }}>{reportData.globalMetrics.averagePredictiveCsat || '-'}</div>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px' }}>/ 5</span>
                        </div>
                        <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Anket dahi olmadan ({reportData.globalMetrics.totalInteractions} vaka) yapılan genel öngörü.</p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>

                {/* SOL: Impact Matrix (Kök Neden Analizi) */}
                <div style={{ flex: '1', minWidth: '400px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
                    <h3 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>troubleshoot</span>
                        Impact Matrix (Etki Analizi)
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Müşteri destek konularının genel CSAT/NPS puanına pozitif (+) veya negatif (-) etkisi.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {reportData.impactMatrix.length === 0 ? (
                            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Etki analizi için yeterli veri yok.</div>
                        ) : (
                            reportData.impactMatrix.map((item, idx) => {
                                const isNegative = item.csatImpact < 0;
                                const absValue = Math.abs(item.csatImpact);
                                // Simple visual width capped at 100% (assume max impact is ~3.0 puan)
                                const barWidth = Math.min((absValue / 3) * 100, 100) + '%';

                                return (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                                            <span>{item.aspect}</span>
                                            <span style={{ color: isNegative ? '#ff3b30' : '#34c759' }}>{isNegative ? '-' : '+'}{absValue.toFixed(1)} Puan</span>
                                        </div>
                                        {/* Bar Chart Container */}
                                        <div style={{ display: 'flex', height: '12px', width: '100%', backgroundColor: 'var(--body-bg)', borderRadius: '6px', overflow: 'hidden' }}>
                                            {isNegative ? (
                                                <div style={{ width: '50%', display: 'flex', justifyContent: 'flex-end', paddingRight: '1px' }}>
                                                    <div style={{ height: '100%', width: barWidth, backgroundColor: '#ff3b30', borderRadius: '6px 0 0 6px' }} />
                                                </div>
                                            ) : (
                                                <div style={{ width: '50%' }} /> // Negative spacer
                                            )}
                                            {!isNegative ? (
                                                <div style={{ width: '50%', display: 'flex', paddingLeft: '1px' }}>
                                                    <div style={{ height: '100%', width: barWidth, backgroundColor: '#34c759', borderRadius: '0 6px 6px 0' }} />
                                                </div>
                                            ) : (
                                                <div style={{ width: '50%' }} /> // Positive spacer
                                            )}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>Bu konuda {item.volume} farklı şikayet/talep işlendi.</div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* SAĞ: GAP Analysis (Gerçek vs Tahmin) */}
                <div style={{ flex: '1', minWidth: '400px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
                    <h3 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ color: '#ff9500' }}>difference</span>
                        Gap Analysis (Gerçekleşen Datalar)
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Sistemin tahmin ettiği skor ile anket dolduran müşterinin verdiği skor arasındaki sapmalar.</p>

                    <div style={{ overflowY: 'auto', maxHeight: '400px', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
                        {reportData.gapAnalysis.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>forum</span>
                                <p style={{ marginTop: '8px' }}>Henüz Closed Loop sürecinden anketi yanıtlayıp dönen müşteri bulunmuyor.</p>
                            </div>
                        ) : (
                            reportData.gapAnalysis.map((gap, index) => (
                                <div key={index} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--body-bg)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{gap.customerEmail}</span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(gap.date).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {/* AI Puanı */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>AI Tahmini</span>
                                            <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>{gap.predictedScore}</span>
                                        </div>

                                        {/* Yön Oku ve Sapma (%) */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
                                            <span style={{ fontSize: '11px', color: gap.deviation > 20 ? '#ff3b30' : 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '4px' }}>Sapma: %{gap.deviation.toFixed(0)}</span>
                                            <span className="material-symbols-outlined" style={{ color: 'var(--text-secondary)' }}>arrow_forward</span>
                                        </div>

                                        {/* Müşterinin Verdiği */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Gerçek Skor</span>
                                            <span style={{ fontSize: '24px', fontWeight: 'bold', color: gap.actualScore <= 2 ? '#ff3b30' : '#34c759' }}>{gap.actualScore}</span>
                                        </div>
                                    </div>
                                    {gap.reason && gap.reason !== 'Belirtilmedi' && (
                                        <div style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-secondary)', backgroundColor: 'rgba(0,0,0,0.02)', padding: '8px', borderRadius: '4px' }}>
                                            "{gap.reason}"
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            {/* Closing the Loop: Acil Müdahale Panel */}
            <div style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255, 59, 48, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ color: '#ff3b30' }}>emergency_home</span>
                    </div>
                    <div>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Closing the Loop: Acil Müdahale Bekleyen Şikayetler
                        </h3>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Gerçek anketi Detractor (1-2) seviyesinde olan ve model sapması yüksek kayıtlar.</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {reportData.gapAnalysis.filter(gap => gap.actualScore <= 2).length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px', border: '2px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>check_circle</span>
                            <p>Şu an acil müdahale gerektiren (kritik düşük puanlı) bir anket sonucu bulunmuyor.</p>
                        </div>
                    ) : (
                        reportData.gapAnalysis
                            .filter(gap => gap.actualScore <= 2)
                            .map((alert, idx) => (
                                <div key={idx} style={{ border: '1px solid #ffcecc', borderRadius: '8px', padding: '16px', backgroundColor: '#fff9f9', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#ff3b30' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 'bold' }}>{alert.customerEmail}</span>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ff3b30', background: 'rgba(255,59,48,0.1)', padding: '2px 8px', borderRadius: '12px' }}>PUAN: {alert.actualScore}</span>
                                    </div>
                                    <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
                                        <strong>AI Tahmini:</strong> {alert.predictedScore} | <strong>Sapma:</strong> %{alert.deviation.toFixed(0)}
                                    </p>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn-primary" style={{ flex: 1, padding: '6px', fontSize: '12px', backgroundColor: '#ff3b30' }}>
                                            Hemen Ara / Geri Dön
                                        </button>
                                        <button className="btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '12px' }}>
                                            Kök Neden Gör
                                        </button>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>

        </div>
    );
};

export default NpsReport;
