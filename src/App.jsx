import React, { useState, useEffect } from 'react';
import './index.css';
import DataHub from './components/DataHub';
import MailDesigner from './components/MailDesigner';
import CommunicationHub from './components/CommunicationHub';
import { listenToSurveyResponses } from './services/dashboardService';
import { db } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'veri-yukleme', label: 'Veri Yükleme', icon: 'upload_file' },
  { id: 'iletisim-hub', label: 'İletişim Hub', icon: 'hub' },
  { id: 'mail-tasarimcisi', label: 'Mail Tasarımcısı', icon: 'mail' },
  { id: 'nps-raporu', label: 'NPS Raporu', icon: 'analytics' },
  { id: 'guvenlik-etik', label: 'Güvenlik & Etik', icon: 'security' },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDark, setIsDark] = useState(false);
  const [dashboardData, setDashboardData] = useState({ totalResponses: 0, averageErrorMargin: 0, criticalAlerts: [] });
  const [governanceData, setGovernanceData] = useState(null);

  // Initialize theme based on system preference or saved state
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  // Anket verilerini ve AI Hata payını gerçek zamanlı dinleme
  useEffect(() => {
    // Projenin sabit appId'si
    const appId = "default-app-id";
    const unsubscribe = listenToSurveyResponses(appId, (newData) => {
      setDashboardData(newData);
    });

    return () => unsubscribe(); // Component kapandığında dinlemeyi durdur
  }, []);

  // Governance & Etik raporlarını anlık dinleme
  useEffect(() => {
    const appId = "default-app-id";
    const docRef = doc(db, 'artifacts', appId, 'public', 'governance_audit_latest');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setGovernanceData(docSnap.data());
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark ? 'dark' : 'light';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 36 }}>
            blur_on
          </span>
          CX-Inn<span className="dot">.</span>
        </div>

        <nav className="nav-links">
          {navItems.map(item => (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-wrapper">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <div className="search-bar">
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Bütün projelerde veya raporlarda ara..." />
            </div>
          </div>

          <div className="header-right">
            <button className="icon-button" aria-label="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="icon-button theme-toggle" onClick={toggleTheme} aria-label="Toggle Dark Mode">
              <span className="material-symbols-outlined icon-light">light_mode</span>
              <span className="material-symbols-outlined icon-dark">dark_mode</span>
            </button>

            <div className="profile-container">
              <div className="profile-text" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>Emre Demir</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Admin</span>
              </div>
              <div className="profile-avatar">
                <img src="https://ui-avatars.com/api/?name=Emre+Demir&background=f6f6f8&color=3f1eae&bold=true" alt="Profile" />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          {activeTab === 'dashboard' && (
            <div className="dashboard-content animate-fade-in">
              <div className="welcome-widget">
                <h1>Tekrar Hoşgeldin, Emre! 👋</h1>
                <p>CX-Inn proje yönetimi panelindesin. AI tabanlı algoritmalarımızın verileriniz üzerinden çıkardığı eyleme dönüştürülebilir içgörüleri (Actionable Insights) inceleyebilirsiniz.</p>
              </div>

              <div className="insights-container">
                <div className="insights-header">
                  <h2>Segmentasyon & Hedef Kitle Kılavuzu</h2>
                  <span className="badge-ai">AI Predictive Targeting</span>
                </div>

                <div className="insights-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>

                  {/* Acil Geri Kazanım (Detractors) Segmenti */}
                  <div className="insight-card" style={{ borderTop: '4px solid #ff3b30' }}>
                    <div className="insight-card-header">
                      <span className="material-symbols-outlined icon" style={{ color: '#ff3b30', background: 'rgba(255, 59, 48, 0.1)' }}>healing</span>
                      <h3>Acil Geri Kazanım Listesi (Detractors)</h3>
                    </div>
                    <div className="insight-body">
                      {/* Gerçek entegrasyonda segmentCustomers()'dan dönen 'description' buraya gelir */}
                      <p className="ai-summary">
                        Bu segmentteki <strong>124 müşteri</strong> ağırlıklı olarak <strong>"Lojistik ve Kargo"</strong> süreçlerinden dolayı derin hayal kırıklığı (Tahmini CSAT &lt; 3) yaşıyor.
                      </p>
                      <div className="action-box">
                        <p>Churn (Kayıp) riskini önlemek için bu gruba özel bir "Özür ve Kupon" kampanyası başlatın.</p>
                        <button className="btn-primary actionable-btn" onClick={() => setActiveTab('mail-tasarimcisi')} style={{ background: '#ff3b30', color: '#fff' }}>
                          <span className="material-symbols-outlined">group</span>
                          Bu Gruba Kampanya Oluştur
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sadakat & Nurture Segmenti (Promoters/Passives) */}
                  <div className="insight-card" style={{ borderTop: '4px solid #34c759' }}>
                    <div className="insight-card-header">
                      <span className="material-symbols-outlined icon" style={{ color: '#34c759', background: 'rgba(52, 199, 89, 0.1)' }}>diamond</span>
                      <h3>Sadakat Programı Adayları (Promoters)</h3>
                    </div>
                    <div className="insight-body">
                      {/* Gerçek entegrasyonda segmentCustomers()'dan dönen 'description' buraya gelir */}
                      <p className="ai-summary">
                        Son etkileşimlerinde <strong>(Tahmini CSAT 5)</strong> skor üreten <strong>312 müşteri</strong>. Memnuniyet oranı çok yüksek, marka elçisi potansiyeline sahipler.
                      </p>
                      <div className="action-box">
                        <p>Bu gruptaki kişilere özel Up-sell paketleri veya referans (Refer-a-Friend) davetiyeleri gönderin.</p>
                        <button className="btn-primary actionable-btn" onClick={() => setActiveTab('mail-tasarimcisi')} style={{ background: '#34c759', color: '#fff' }}>
                          <span className="material-symbols-outlined">star_rate</span>
                          Özel Fırsat Kampanyası Tasarla
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* REAL-TIME MODEL STATUS & CRITICAL ALERTS */}
                <div style={{ marginTop: '32px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

                  {/* Sol Taraf: AI Hata Payı */}
                  <div className="insight-card" style={{ flex: '1', minWidth: '300px', borderTop: dashboardData.requiresSystemCalibration ? '4px solid #ff9500' : 'none' }}>
                    <div className="insight-card-header">
                      <span className="material-symbols-outlined icon" style={{ color: dashboardData.requiresSystemCalibration ? '#ff9500' : 'inherit', background: dashboardData.requiresSystemCalibration ? 'rgba(255, 149, 0, 0.1)' : 'var(--bg-color)' }}>analytics</span>
                      <h3 style={{ color: dashboardData.requiresSystemCalibration ? '#ff9500' : 'inherit' }}>AI Tahmin Modeli Hata Payı</h3>
                    </div>
                    <div className="insight-body" style={{ marginTop: '16px' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Gerçekleşen Anket Yanıtları ({dashboardData.totalResponses}) üzerinden tahmin modelinin NPS/CSAT sapma oranı.</p>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                        <div className="insight-value" style={{ fontSize: '36px', color: dashboardData.requiresSystemCalibration ? '#ff9500' : 'inherit' }}>±{dashboardData.averageErrorMargin}</div>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '4px' }}>Puan</span>
                      </div>

                      {dashboardData.requiresSystemCalibration ? (
                        <div style={{ marginTop: '16px', background: 'rgba(255, 149, 0, 0.1)', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#ff9500', fontWeight: '600', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: '1.4' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', marginTop: '2px' }}>warning</span>
                          Dikkat: Sapma %20'yi aştı. Modelin acilen yeniden eğitilmesi (Kalibrasyon) önerilir.
                        </div>
                      ) : (
                        <div style={{ marginTop: '16px', background: 'var(--bg-color)', padding: '12px', borderRadius: '8px', fontSize: '13px', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                          Model doğruluğu (%80 üzeri) yüksek seyrediyor.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sağ Taraf: Acil Müdahale Listesi */}
                  <div className="insight-card" style={{ flex: '2', minWidth: '400px', borderLeft: '4px solid #ff3b30' }}>
                    <div className="insight-card-header" style={{ justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="material-symbols-outlined icon" style={{ color: '#ff3b30', background: 'rgba(255, 59, 48, 0.1)' }}>healing</span>
                        <h3 style={{ color: '#ff3b30' }}>Closed Loop: Acil Kurtarma</h3>
                      </div>
                      <span style={{ background: '#ff3b30', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                        {dashboardData.criticalAlerts.length} Yeni
                      </span>
                    </div>

                    <div style={{ marginTop: '16px', maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
                      {dashboardData.criticalAlerts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>task_alt</span>
                          <p style={{ marginTop: '8px' }}>Tüm süreçler kapatıldı. Kritik bir vaka yok.</p>
                        </div>
                      ) : (
                        dashboardData.criticalAlerts.map(alert => (
                          <div key={alert.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', gap: '16px' }}>
                            <div style={{ flex: '1' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '14px' }}>{alert.customerEmail || 'Müşteri Bilgisi Yok'}</div>
                                <span style={{ fontSize: '11px', background: 'rgba(255,59,48,0.1)', color: '#ff3b30', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>{alert.score}</span>
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '8px' }}>"{alert.reason}"</div>
                              {alert.recommendedAction && (
                                <div style={{ fontSize: '12px', color: '#ff9500', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>call_log</span>
                                  {alert.recommendedAction}
                                </div>
                              )}
                            </div>
                            <div>
                              <button style={{ background: '#ff3b30', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                                Kapat
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {activeTab === 'veri-yukleme' && (
            <DataHub />
          )}

          {activeTab === 'iletisim-hub' && (
            <CommunicationHub />
          )}

          {activeTab === 'mail-tasarimcisi' && (
            <MailDesigner />
          )}

          {activeTab === 'guvenlik-etik' && (
            <div className="dashboard-content animate-fade-in">
              <div className="welcome-widget" style={{ borderLeft: '4px solid #3f1eae', background: 'linear-gradient(90deg, var(--bg-color) 0%, rgba(63,30,174,0.05) 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '42px', color: '#3f1eae' }}>security</span>
                  <div>
                    <h1 style={{ marginBottom: '4px' }}>AI Yönetişim ve Veri Güvenliği (Governance)</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>LLM-Judge model sapmalarını (Bias) izler ve Privacy Watch sistemi PII (Kişisel Veri) ihlallerini denetler.</p>
                  </div>
                </div>
              </div>

              {!governanceData ? (
                <div style={{ textAlign: 'center', marginTop: '60px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2, animation: 'spin 2s linear infinite' }}>sync</span>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>Güvenlik verileri yükleniyor veya sistemde henüz denetim kaydı bulunmuyor...</p>
                </div>
              ) : (
                <div className="insights-container" style={{ marginTop: '32px' }}>

                  {/* Üst Metrikler */}
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

                    {/* Uyumluluk Puanı */}
                    <div className="insight-card" style={{ flex: '1', minWidth: '250px', borderTop: governanceData.complianceScore < 95 ? '4px solid #ff3b30' : '4px solid #34c759' }}>
                      <div className="insight-card-header">
                        <span className="material-symbols-outlined icon" style={{ color: governanceData.complianceScore < 95 ? '#ff3b30' : '#34c759', background: governanceData.complianceScore < 95 ? 'rgba(255, 59, 48, 0.1)' : 'rgba(52, 199, 89, 0.1)' }}>verified_user</span>
                        <h3>Sistem Uyumluluk Puanı</h3>
                      </div>
                      <div className="insight-body" style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                          <span style={{ fontSize: '42px', fontWeight: 'bold', color: governanceData.complianceScore < 95 ? '#ff3b30' : 'var(--text-main)' }}>%{governanceData.complianceScore}</span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          Toplam <strong>{governanceData.totalItemsAudited}</strong> analiz denetlendi.
                        </p>
                      </div>
                    </div>

                    {/* Maskelenen Veri (PII) */}
                    <div className="insight-card" style={{ flex: '1', minWidth: '250px' }}>
                      <div className="insight-card-header">
                        <span className="material-symbols-outlined icon">visibility_off</span>
                        <h3>Privacy Watch (PII Koruması)</h3>
                      </div>
                      <div className="insight-body" style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                          <span style={{ fontSize: '42px', fontWeight: 'bold' }}>{governanceData.piiWatch.maskedItems}</span>
                          <span style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Veri Maskelendi</span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          <strong>{governanceData.piiWatch.violationsFound}</strong> farklı dökümanda kişisel veri (TC, Tel vb.) tespit edildi ve sansürlendi.
                        </p>
                      </div>
                    </div>

                    {/* LLM Bias Tespiti */}
                    <div className="insight-card" style={{ flex: '1', minWidth: '250px' }}>
                      <div className="insight-card-header">
                        <span className="material-symbols-outlined icon" style={{ color: governanceData.llmJudge.biasDetected > 5 ? '#ff9500' : 'var(--primary)', background: governanceData.llmJudge.biasDetected > 5 ? 'rgba(255, 149, 0, 0.1)' : 'rgba(63, 30, 174, 0.1)' }}>gavel</span>
                        <h3>LLM-Judge Yanlılık (Bias) Kontrolü</h3>
                      </div>
                      <div className="insight-body" style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                          <span style={{ fontSize: '42px', fontWeight: 'bold', color: governanceData.llmJudge.biasDetected > 5 ? '#ff9500' : 'var(--text-main)' }}>{governanceData.llmJudge.biasDetected}</span>
                          <span style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Vaka Tespit Edildi</span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          Yapay zekanın tutarsız CSAT/Sentiment verdiği {governanceData.llmJudge.biasDetected} veri noktası tespit edildi. AI Doğruluğu: <strong>%{governanceData.llmJudge.accuracyScore}</strong>
                        </p>
                      </div>
                    </div>

                  </div>

                </div>
              )}
            </div>
          )}

          {activeTab !== 'dashboard' && activeTab !== 'veri-yukleme' && activeTab !== 'iletisim-hub' && activeTab !== 'mail-tasarimcisi' && activeTab !== 'guvenlik-etik' && (
            <div className="page-placeholder animate-fade-in">
              <div style={{ textAlign: 'center', marginTop: '120px', color: 'var(--text-secondary)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '72px', opacity: 0.3, marginBottom: '24px' }}>
                  {navItems.find(i => i.id === activeTab)?.icon}
                </span>
                <h2 style={{ fontSize: '24px', color: 'var(--text-main)' }}>{navItems.find(i => i.id === activeTab)?.label} Modülü</h2>
                <p style={{ marginTop: '12px', fontSize: '15px' }}>Bu sayfanın tasarımı ve entegrasyonu devam etmektedir.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
