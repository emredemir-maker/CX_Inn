import React, { useState, useEffect } from 'react';
import { fetchInboxEmails, generateAIResponseDraft, sendDirectReply } from '../services/communicationService';

const CommunicationHub = () => {
    const [emails, setEmails] = useState([]);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [draft, setDraft] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const loadEmails = async () => {
            setIsLoading(true);
            const appId = "default-app-id";
            const fetched = await fetchInboxEmails(appId);
            setEmails(fetched);
            setIsLoading(false);
            if (fetched.length > 0) handleSelectEmail(fetched[0]);
        };
        loadEmails();
    }, []);

    const handleSelectEmail = (email) => {
        setSelectedEmail(email);
        setDraft(generateAIResponseDraft(email));
    };

    const handleSendDraft = async () => {
        if (!selectedEmail) return;
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>auto_awesome</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>AI Agent Çözüm Taslağı</span>
                                </div>
                                <textarea
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    style={{
                                        flex: 1,
                                        width: '100%',
                                        padding: '16px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
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
                                    <button className="btn-secondary" onClick={() => setDraft(generateAIResponseDraft(selectedEmail))}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span> Taslağı Yenile
                                    </button>
                                    <button className="btn-primary" onClick={handleSendDraft} disabled={sending}>
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
