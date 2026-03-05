import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { fetchInboxEmails, generateAIResponseDraft, sendDirectReply } from '../services/communicationService';

const CommunicationHub = ({ localData }) => {
    const [emails, setEmails] = useState([]);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [draft, setDraft] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const [xaiEvidence, setXaiEvidence] = useState('');
    const [piiAlert, setPiiAlert] = useState(false);

    useEffect(() => {
        const appId = "default-app-id";
        const docRef = doc(db, 'artifacts', appId, 'analyzed_interactions', 'latest');

        const updateEmails = (data) => {
            if (data && data.interactions) {
                const allInteractions = data.interactions;
                const filtered = allInteractions.filter(i => i.aiAnalysis && i.aiAnalysis.predictive_csat <= 4);
                setEmails(filtered);
                setIsLoading(false);
                if (!selectedEmail && filtered.length > 0) {
                    handleSelectEmail(filtered[0]);
                }
            } else {
                setEmails([]);
                setIsLoading(false);
            }
        };

        const unsubscribe = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                updateEmails(snap.data());
            } else if (localData) {
                updateEmails(localData);
            } else {
                setIsLoading(false);
            }
        }, (error) => {
            console.warn("CommunicationHub: Firestore'a bağlanılamadı, yerel veri kullanılıyor olabilir.");
            if (localData) {
                updateEmails(localData);
            } else {
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, [localData]);

    const handleSelectEmail = (email) => {
        setSelectedEmail(email);
        const { draftText, xaiEvidence: draftXai } = generateAIResponseDraft(email);
        setDraft(draftText);
        setXaiEvidence(draftXai);
        setPiiAlert(false);
    };

    const handleSendDraft = async () => {
        if (!selectedEmail) return;

        // --- PII GUARD: Yanıt içinde maskelenmemiş veri var mı kontrol et ---
        const { piiRegexList, logSecurityViolation } = await import('../services/governanceService');
        let hasViolation = false;

        piiRegexList.forEach(rule => {
            if (rule.regex.test(draft)) {
                hasViolation = true;
                logSecurityViolation("default-app-id", rule.type, draft);
            }
        });

        if (hasViolation) {
            setPiiAlert(true);
            return; // İşlemi durdur
        }

        setSending(true);
        const appId = "default-app-id";
        try {
            await sendDirectReply(appId, selectedEmail, draft);

            // Yollananı listeden çıkar (UI Güncellemesi)
            const remaining = emails.filter(e => e !== selectedEmail);
            setEmails(remaining);
            if (remaining.length > 0) {
                handleSelectEmail(remaining[0]);
            } else {
                setSelectedEmail(null);
                setDraft('');
                setXaiEvidence('');
            }
        } catch (error) {
            alert('Yanıt gönderilirken hata oluştu.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="communication-hub-container animate-fade-in" style={{ padding: '0 40px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="hub-header" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '28px', color: 'var(--text-main)', marginBottom: '8px' }}>Fonksiyonel İstasyon: İletişim Hub</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Müşterilerden gelen düşük puanlı taleplere AI tarafından otomatik çözüm taslağı hazırlanır. Yönetici onaylayıp tek tuşla gönderebilir.</p>
            </div>

            <div style={{ display: 'flex', flex: 1, gap: '24px', minHeight: '600px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>

                {/* SOL: Email Listesi */}
                <div style={{ width: '350px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                        Bekleyen Talepler ({emails.length})
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {isLoading ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Kutu yükleniyor...</div>
                        ) : emails.length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Bekleyen müdahale veriniz yok.</div>
                        ) : (
                            emails.map((email, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleSelectEmail(email)}
                                    style={{
                                        padding: '16px',
                                        borderBottom: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        backgroundColor: selectedEmail === email ? 'rgba(63,30,174,0.05)' : 'transparent',
                                        borderLeft: selectedEmail === email ? '4px solid var(--primary)' : '4px solid transparent'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{email.Musteri || email.İsim || 'İsimsiz Müşteri'}</div>
                                        <div style={{ fontSize: '12px', color: '#ff3b30', fontWeight: 'bold', background: 'rgba(255, 59, 48, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                            CSAT: {email.aiAnalysis?.predictive_csat || 3}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {email.Mesaj || email.Comment || email.Text || 'İçerik Bulunamadı'}
                                    </div>
                                    <div style={{ fontSize: '11px', marginTop: '8px', color: 'var(--primary)' }}>Konu: {email.aiAnalysis?.primary_aspect || 'Genel'}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* SAĞ: Email Detay ve AI Taslağı */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
                    {selectedEmail ? (
                        <>
                            {/* Orijinal Mesaj */}
                            <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Talebi Gönderen: {selectedEmail.Musteri || selectedEmail.İsim || 'İsimsiz Müşteri'}</div>
                                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{selectedEmail['E-posta'] || selectedEmail.Email || 'E-posta belirtilmemiş'}</div>
                                <div style={{ backgroundColor: 'var(--body-bg)', padding: '16px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.6' }}>
                                    "{selectedEmail.Mesaj || selectedEmail.Comment || selectedEmail.Text || 'Mesaj içeriği bulunamadı.'}"
                                </div>
                            </div>

                            {/* AI Çözüm Taslağı */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>auto_awesome</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>AI Agent Çözüm Taslağı (XAI Enabled)</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(63,30,174,0.05)', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>info</span>
                                        {xaiEvidence || selectedEmail.aiAnalysis?.xai_evidence}
                                    </div>
                                </div>

                                {piiAlert && (
                                    <div style={{ backgroundColor: 'rgba(255,59,48,0.1)', border: '1px solid #ff3b30', borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', color: '#ff3b30', animation: 'shake 0.5s' }}>
                                        <span className="material-symbols-outlined">security_update_warning</span>
                                        <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                                            GÜVENLİK ENGELİ: Taslak yanıt içerisinde maskelenmemiş kişisel veri (PII) tespit edildi! Lütfen metni temizleyin.
                                        </div>
                                    </div>
                                )}

                                <textarea
                                    value={draft}
                                    onChange={(e) => {
                                        setDraft(e.target.value);
                                        setPiiAlert(false);
                                    }}
                                    style={{
                                        flex: 1,
                                        width: '100%',
                                        padding: '16px',
                                        borderRadius: '8px',
                                        border: piiAlert ? '2px solid #ff3b30' : '1px solid var(--border-color)',
                                        backgroundColor: 'var(--body-bg)',
                                        color: 'var(--text-main)',
                                        fontFamily: 'inherit',
                                        fontSize: '14px',
                                        lineHeight: '1.6',
                                        resize: 'none',
                                        outline: 'none'
                                    }}
                                />
                                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                                    <button className="btn-secondary" onClick={() => {
                                        const { draftText, xaiEvidence: dXai } = generateAIResponseDraft(selectedEmail);
                                        setDraft(draftText);
                                        setXaiEvidence(dXai);
                                        setPiiAlert(false);
                                    }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span> Taslağı Yenile
                                    </button>
                                    <button className="btn-primary" onClick={handleSendDraft} disabled={sending} style={{ backgroundColor: piiAlert ? '#ccc' : '' }}>
                                        {sending ? 'Gönderiliyor...' : (
                                            <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span> Yanıtla ve Kapat</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexDirection: 'column' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '64px', opacity: 0.2, marginBottom: '16px' }}>inbox</span>
                            Bir talep seçerek Agentic AI analizini ve müdahale taslağını görüntüleyin.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommunicationHub;
