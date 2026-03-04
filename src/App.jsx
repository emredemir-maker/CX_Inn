import React, { useState, useEffect } from 'react';
import './index.css';
import DataHub from './components/DataHub';
import MailDesigner from './components/MailDesigner';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'veri-yukleme', label: 'Veri Yükleme', icon: 'upload_file' },
  { id: 'iletisim-hub', label: 'İletişim Hub', icon: 'hub' },
  { id: 'mail-tasarimcisi', label: 'Mail Tasarımcısı', icon: 'mail' },
  { id: 'nps-raporu', label: 'NPS Raporu', icon: 'analytics' },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDark, setIsDark] = useState(false);

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
                <p>CX-Inn proje yönetimi panelindesin. Müşteri deneyimi ve NPS metriklerinde bugünkü genel durum özetini aşağıdan inceleyebilirsin.</p>
              </div>

              <div className="card-grid">
                <div className="stat-card">
                  <div className="stat-header">
                    Aktif Kampanyalar
                    <div className="stat-icon">
                      <span className="material-symbols-outlined">campaign</span>
                    </div>
                  </div>
                  <div className="stat-value">12</div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    Ortalama NPS
                    <div className="stat-icon" style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', color: '#34c759' }}>
                      <span className="material-symbols-outlined">sentiment_very_satisfied</span>
                    </div>
                  </div>
                  <div className="stat-value">76.4</div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    Gönderilen E-postalar
                    <div className="stat-icon" style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)', color: '#ff9500' }}>
                      <span className="material-symbols-outlined">mark_email_read</span>
                    </div>
                  </div>
                  <div className="stat-value">8,402</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'veri-yukleme' && (
            <DataHub />
          )}

          {activeTab === 'mail-tasarimcisi' && (
            <MailDesigner />
          )}

          {activeTab !== 'dashboard' && activeTab !== 'veri-yukleme' && activeTab !== 'mail-tasarimcisi' && (
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
