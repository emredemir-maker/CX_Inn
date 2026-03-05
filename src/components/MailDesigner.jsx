import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

// Mevcut komponent tipleri - Gelişmiş Tasarım Opsiyonları ile
const COMPONENT_TYPES = [
    { type: 'logo', label: 'Logo / Görsel', icon: 'image', defaultProps: { url: 'https://placehold.co/200x80?text=LOGO', align: 'center', backgroundColor: 'transparent', borderRadius: '0', borderWidth: '0', borderColor: 'transparent' } },
    { type: 'header', label: 'Başlık', icon: 'title', defaultProps: { text: 'Merhaba {MUSTERI_ADI},', align: 'left', color: '#141416', backgroundColor: 'transparent', borderRadius: '0', borderWidth: '0', borderColor: 'transparent' } },
    { type: 'paragraph', label: 'Metin Bloğu', icon: 'subject', defaultProps: { text: 'Bizi tercih ettiğiniz için teşekkür ederiz.', align: 'left', color: '#6e6e73', backgroundColor: 'transparent', borderRadius: '0', borderWidth: '0', borderColor: 'transparent' } },
    { type: 'nps', label: 'NPS Skoru (0-10)', icon: 'confirmation_number', defaultProps: { question: 'Bizi ne kadar tavsiye edersiniz?', color: '#141416', backgroundColor: '#f6f6f8', borderRadius: '12', borderWidth: '1', borderColor: '#e0e0e0' } },
    { type: 'stars', label: 'Yıldız Derecesi', icon: 'star', defaultProps: { question: 'Deneyiminizi nasıl değerlendirirsiniz?', color: '#141416', backgroundColor: '#f6f6f8', borderRadius: '12', borderWidth: '1', borderColor: '#e0e0e0' } }
];

const MailDesigner = () => {
    const [elements, setElements] = useState([]);
    const [isPreview, setIsPreview] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Click-to-add için fonksiyon (Ekran dışında sürükleme sorunlarını çözer, UX'i basitleştirir)
    const addElement = (componentTemplate) => {
        const newElement = {
            id: uuidv4(),
            type: componentTemplate.type,
            props: { ...componentTemplate.defaultProps }
        };
        setElements([...elements, newElement]);
    };

    const removeElement = (id) => {
        setElements(elements.filter(el => el.id !== id));
    };

    const updateElementProp = (id, propKey, newValue) => {
        setElements(elements.map(el => {
            if (el.id === id) {
                return { ...el, props: { ...el.props, [propKey]: newValue } };
            }
            return el;
        }));
    };

    // Sadece Canvas içi sürükleme için
    const handleDragEnd = (result) => {
        const { source, destination } = result;
        if (!destination) return;

        const reorderedElements = Array.from(elements);
        const [movedElement] = reorderedElements.splice(source.index, 1);
        reorderedElements.splice(destination.index, 0, movedElement);
        setElements(reorderedElements);
    };

    const handleSaveToFirestore = async () => {
        if (elements.length === 0) {
            alert("Şablon boş. Kaydetmek için önce bileşen ekleyin.");
            return;
        }

        setIsSaving(true);
        try {
            const appId = "default-app-id";
            const templateId = uuidv4();

            const newTemplateRef = doc(db, 'artifacts', appId, 'public', 'templates', templateId);

            const jsonOutput = {
                id: templateId,
                createdAt: new Date().toISOString(),
                design: elements
            };

            await setDoc(newTemplateRef, jsonOutput);
            console.log("JSON Çıktısı (Firestore'a kaydedilen):", JSON.stringify(jsonOutput, null, 2));
            alert(`Şablon başarıyla kaydedildi! ID: ${templateId}`);
        } catch (error) {
            console.error("Şablon kaydetme hatası:", error);
            alert("Kaydetme sırasında bir hata oluştu.");
        } finally {
            setIsSaving(false);
        }
    };

    const renderContent = (text) => {
        if (!isPreview) return text;
        return text.replace(/\{MUSTERI_ADI\}/g, 'Emre Demir')
            .replace(/\{SIPARIS_NO\}/g, '#AB1234')
            .replace(/\{URUN_ADI\}/g, 'CX-Inn Premium Paket');
    };

    const DesignSettingsBar = ({ el }) => (
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Arka Plan:</span>
                <input type="color" value={el.props.backgroundColor !== 'transparent' ? el.props.backgroundColor : '#ffffff'} onChange={(e) => updateElementProp(el.id, 'backgroundColor', e.target.value)} style={{ border: 'none', background: 'none', width: '20px', height: '20px', cursor: 'pointer', padding: 0 }} />
                <button
                    onClick={() => updateElementProp(el.id, 'backgroundColor', 'transparent')}
                    style={{ fontSize: '11px', padding: '2px 4px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                    title="Şeffaf Yap"
                >Şeffaf</button>
            </div>

            {el.props.color !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Metin:</span>
                    <input type="color" value={el.props.color} onChange={(e) => updateElementProp(el.id, 'color', e.target.value)} style={{ border: 'none', background: 'none', width: '20px', height: '20px', cursor: 'pointer', padding: 0 }} />
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Çerçeve Kalınlık:</span>
                <input type="number" min="0" max="10" value={el.props.borderWidth} onChange={(e) => updateElementProp(el.id, 'borderWidth', e.target.value)} style={{ width: '40px', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>px</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Renk:</span>
                <input type="color" value={el.props.borderColor !== 'transparent' ? el.props.borderColor : '#000000'} onChange={(e) => updateElementProp(el.id, 'borderColor', e.target.value)} style={{ border: 'none', background: 'none', width: '20px', height: '20px', cursor: 'pointer', padding: 0 }} />
                <button
                    onClick={() => updateElementProp(el.id, 'borderColor', 'transparent')}
                    style={{ fontSize: '11px', padding: '2px 4px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                >Şeffaf</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Yuvarlama:</span>
                <input type="number" min="0" max="100" value={el.props.borderRadius} onChange={(e) => updateElementProp(el.id, 'borderRadius', e.target.value)} style={{ width: '40px', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>px</span>
            </div>
        </div>
    );

    const renderEditorElement = (el, index) => {
        return (
            <Draggable key={el.id} draggableId={el.id} index={index}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`designer-element ${snapshot.isDragging ? 'dragging' : ''}`}
                    >
                        <div className="element-actions">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} {...provided.dragHandleProps}>
                                <span className="material-symbols-outlined drag-handle">drag_indicator</span>
                                <span className="element-type-label">
                                    {COMPONENT_TYPES.find(t => t.type === el.type)?.label}
                                </span>
                            </div>

                            <button className="del-btn" onClick={() => removeElement(el.id)}>
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>

                        <div className="element-content" style={{
                            backgroundColor: el.props.backgroundColor,
                            border: `${el.props.borderWidth || 0}px solid ${el.props.borderColor || 'transparent'}`,
                            borderRadius: `${el.props.borderRadius || 0}px`,
                            padding: '16px',
                            marginBottom: '8px'
                        }}>
                            {/* Logo */}
                            {el.type === 'logo' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <input type="text" className="editor-input" value={el.props.url} onChange={(e) => updateElementProp(el.id, 'url', e.target.value)} placeholder="Logo / Görsel URL'sini yapıştırın" />
                                    <div style={{ textAlign: el.props.align, padding: '16px' }}>
                                        <img src={el.props.url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100px' }} onError={(e) => { e.target.src = 'https://placehold.co/200x80?text=HATALI+URL' }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button className={`btn-secondary ${el.props.align === 'left' ? 'active' : ''}`} style={{ padding: '4px 12px' }} onClick={() => updateElementProp(el.id, 'align', 'left')}>Sola</button>
                                        <button className={`btn-secondary ${el.props.align === 'center' ? 'active' : ''}`} style={{ padding: '4px 12px' }} onClick={() => updateElementProp(el.id, 'align', 'center')}>Ortala</button>
                                        <button className={`btn-secondary ${el.props.align === 'right' ? 'active' : ''}`} style={{ padding: '4px 12px' }} onClick={() => updateElementProp(el.id, 'align', 'right')}>Sağa</button>
                                    </div>
                                </div>
                            )}

                            {/* Metin ve Başlık */}
                            {(el.type === 'header' || el.type === 'paragraph') && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <textarea
                                        className={`editor-input ${el.type}`}
                                        style={{ color: el.props.color, textAlign: el.props.align, backgroundColor: 'rgba(255,255,255,0.5)' }}
                                        value={el.props.text}
                                        onChange={(e) => updateElementProp(el.id, 'text', e.target.value)}
                                        placeholder="Metin girin... (Örn: Merhaba {MUSTERI_ADI})"
                                        rows={el.type === 'paragraph' ? 3 : 1}
                                    />
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button className={`btn-secondary ${el.props.align === 'left' ? 'active' : ''}`} style={{ padding: '4px 12px' }} onClick={() => updateElementProp(el.id, 'align', 'left')}>Sola</button>
                                        <button className={`btn-secondary ${el.props.align === 'center' ? 'active' : ''}`} style={{ padding: '4px 12px' }} onClick={() => updateElementProp(el.id, 'align', 'center')}>Ortala</button>
                                        <button className={`btn-secondary ${el.props.align === 'right' ? 'active' : ''}`} style={{ padding: '4px 12px' }} onClick={() => updateElementProp(el.id, 'align', 'right')}>Sağa</button>
                                    </div>
                                </div>
                            )}

                            {/* Etkileşimli NPS / Yıldız */}
                            {(el.type === 'nps' || el.type === 'stars') && (
                                <div className="interactive-block-editor">
                                    <input type="text" className="editor-input bold" style={{ color: el.props.color, backgroundColor: 'rgba(255,255,255,0.5)' }} value={el.props.question} onChange={(e) => updateElementProp(el.id, 'question', e.target.value)} placeholder="Gösterilecek soruyu buraya yazın..." />
                                    <div className="interactive-preview-placeholder" style={{ backgroundColor: 'transparent', border: 'none' }}>
                                        {el.type === 'nps' && (
                                            <div className="nps-preview">
                                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <span key={n} className="nps-box" style={{ borderColor: el.props.color || 'var(--border-color)', color: el.props.color }}>{n}</span>)}
                                            </div>
                                        )}
                                        {el.type === 'stars' && (
                                            <div className="stars-preview">
                                                {[1, 2, 3, 4, 5].map(n => <span key={n} className="material-symbols-outlined star-icon">star</span>)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DesignSettingsBar el={el} />
                    </div>
                )}
            </Draggable>
        );
    };

    const renderPreviewElement = (el) => {
        const customStyle = {
            backgroundColor: el.props.backgroundColor !== 'transparent' ? el.props.backgroundColor : undefined,
            border: `${el.props.borderWidth || 0}px solid ${el.props.borderColor || 'transparent'}`,
            borderRadius: `${el.props.borderRadius || 0}px`,
            padding: '24px 32px',
            marginBottom: '16px'
        };

        return (
            <div key={el.id} className={`preview-element type-${el.type}`} style={customStyle}>
                {el.type === 'logo' && (
                    <div style={{ textAlign: el.props.align }}>
                        <img src={el.props.url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100px' }} />
                    </div>
                )}

                {el.type === 'header' && <h1 style={{ textAlign: el.props.align, color: el.props.color, margin: 0 }}>{renderContent(el.props.text)}</h1>}

                {el.type === 'paragraph' && <p style={{ textAlign: el.props.align, color: el.props.color, margin: 0 }}>{renderContent(el.props.text)}</p>}

                {(el.type === 'nps' || el.type === 'stars') && (
                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ color: el.props.color, marginBottom: '24px', fontSize: '18px' }}>{renderContent(el.props.question)}</h3>

                        {el.type === 'nps' && (
                            <div className="nps-scale">
                                <div className="nps-options">
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                        <button key={n} className="nps-btn-preview" style={{ borderColor: 'var(--border-color)', color: el.props.color }}>{n}</button>
                                    ))}
                                </div>
                                <div className="nps-labels" style={{ marginTop: '8px' }}>
                                    <span>Hiç Olası Değil</span>
                                    <span>Kesinlikle Tavsiye Ederim</span>
                                </div>
                            </div>
                        )}

                        {el.type === 'stars' && (
                            <div className="stars-options">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <span key={n} className="material-symbols-outlined star-icon-large">star</span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="mail-designer-container animate-fade-in">
                <div className="designer-header">
                    <div>
                        <h2 style={{ fontSize: '28px', color: 'var(--text-main)', marginBottom: '8px' }}>Mail Tasarımcısı</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>E-posta şablonunuzu oluşturun, placeholder'ları kullanın ve JSON modelini Firestore'a kaydedin.</p>
                    </div>
                    <div className="designer-actions">
                        <button className={`btn-secondary ${isPreview ? 'active' : ''}`} onClick={() => setIsPreview(!isPreview)}>
                            <span className="material-symbols-outlined">visibility</span>
                            {isPreview ? 'Düzenleme Modu' : 'Önizleme Modu'}
                        </button>
                        <button className="btn-primary" onClick={handleSaveToFirestore} disabled={isSaving || elements.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined">save</span>
                            {isSaving ? 'Kaydediliyor...' : 'JSON Olarak Firestore\'a Kaydet'}
                        </button>
                    </div>
                </div>

                <div className="designer-workspace">
                    {!isPreview && (
                        <div className="designer-sidebar">
                            <h4 style={{ marginBottom: '16px', color: 'var(--text-main)', fontSize: '15px' }}>Bileşen Ekle</h4>

                            <div className="component-list">
                                {COMPONENT_TYPES.map((comp) => (
                                    <button
                                        key={comp.type}
                                        className="add-component-btn"
                                        onClick={() => addElement(comp)}
                                    >
                                        <span className="material-symbols-outlined">{comp.icon}</span>
                                        {comp.label}
                                    </button>
                                ))}
                            </div>

                            <div className="placeholder-helper">
                                <h5>Kullanılabilir Etiketler</h5>
                                <code>{"{MUSTERI_ADI}"}</code>
                                <code>{"{URUN_ADI}"}</code>
                                <code>{"{SIPARIS_NO}"}</code>
                                <code>{"{SURVEY_LINK}"}</code>
                            </div>
                        </div>
                    )}

                    <div className="designer-canvas-wrapper" style={{ width: isPreview ? '100%' : 'calc(100% - 280px)' }}>
                        <div className="designer-canvas">
                            {elements.length === 0 && !isPreview ? (
                                <div className="empty-canvas">
                                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--primary)', opacity: 0.5 }}>design_services</span>
                                    <p>Şablonunuzu oluşturmak için sol panelden bir bileşene tıklayın.</p>
                                </div>
                            ) : (
                                <div className="email-preview-envelope">
                                    <div className="email-header-mock">
                                        <div className="mock-dot red"></div>
                                        <div className="mock-dot yellow"></div>
                                        <div className="mock-dot green"></div>
                                    </div>

                                    <div className="email-body">
                                        {isPreview ? (
                                            <div className="preview-mode-content" style={{ padding: '32px' }}>
                                                {elements.map(renderPreviewElement)}
                                            </div>
                                        ) : (
                                            <Droppable droppableId="email-body-droppable">
                                                {(provided, snapshot) => (
                                                    <div
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        className="editor-mode-content"
                                                        style={{ backgroundColor: snapshot.isDraggingOver ? 'var(--sidebar-hover)' : 'transparent', transition: 'background-color 0.2s', minHeight: '400px' }}
                                                    >
                                                        {elements.map((el, index) => renderEditorElement(el, index))}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DragDropContext>
    );
};

export default MailDesigner;
