import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

/**
 * 1. Şablon Değişkenlerini (Placeholders) Dinamik Eşleştirme
 * Müşteri verilerindeki (İsim, İşlem Tarihi, Ürün vb.) bilgileri şablondaki {DEGISKEN} tagleriyle değiştirir.
 */
const replaceDynamicPlaceholders = (templateDesign, customerData) => {
    // Tasarım dizisini derinlemesine kopyala (orijinal objeyi bozmamak için)
    const customizedDesign = JSON.parse(JSON.stringify(templateDesign));

    customizedDesign.forEach(element => {
        if (element.props && element.props.text) {
            let text = element.props.text;

            // Mevcut değişkenleri müşteri datası ile eşleştirme
            // Müşterinin 'ad, isim, musteri_adi, name' gibi olası kolon isimlerini kontrol et
            const musteriAdi = customerData.Musteri_Adi || customerData.İsim || customerData.isim || customerData.Name || 'Değerli Müşterimiz';
            const urunAdi = customerData.Urun_Adi || customerData.Urun || customerData.Product || 'Ürün/Hizmet';
            const siparisNo = customerData.Siparis_No || customerData.Islem_ID || customerData.ID || '#000000';

            text = text.replace(/\{MUSTERI_ADI\}/g, musteriAdi)
                .replace(/\{URUN_ADI\}/g, urunAdi)
                .replace(/\{SIPARIS_NO\}/g, siparisNo)
                .replace(/\{SURVEY_LINK\}/g, `https://cx-inn.app/survey?tid=${customerData.trackingId || 'TEST_ID'}`);

            element.props.text = text;
        }
    });

    return customizedDesign;
};

/**
 * 2. Kampanya Gönderim Sürecini Başlatma
 * Şablonu çeker, gruba göre mailleri hazırlar ve durumlarını Firestore'a yazar.
 */
export const startCampaignDistribution = async (appId, campaignName, templateId, targetGroup) => {
    try {
        // A. Firestore'dan ilgili mail şablonunu çek
        const templateRef = doc(db, 'artifacts', appId, 'public', 'templates', templateId);
        const templateSnap = await getDoc(templateRef);

        if (!templateSnap.exists()) {
            throw new Error("Seçilen şablon bulunamadı.");
        }

        const templateData = templateSnap.data();
        const campaignId = uuidv4();

        // B. Ana Kampanya Dökümanını Oluştur
        const campaignRef = doc(db, 'artifacts', appId, 'public', 'campaigns', campaignId);
        await setDoc(campaignRef, {
            id: campaignId,
            name: campaignName,
            templateId: templateId,
            targetCount: targetGroup.length,
            status: 'HAZIRLANIYOR', // Hazırlanıyor, İşleniyor, Tamamlandı
            createdAt: serverTimestamp(),
            stats: {
                sent: 0,
                failed: 0,
                pending: targetGroup.length
            }
        });

        console.log(`[Campaign] Kampanya oluşturuldu: ${campaignId}. Toplam hedef: ${targetGroup.length}`);

        // C. Her müşteri için benzersiz tracking ID ile gönderim kuyruğu (queue) oluştur
        // User Request: /public/data/outbound_logs altına 'Hazırlanıyor' statüsüyle yaz.
        const outboundLogsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'outbound_logs');

        const deliveryPromises = targetGroup.map(async (customer) => {
            const trackingId = uuidv4(); // Önemli: Anket dönüşlerini geri eşlemek için eşsiz ID

            const customizedContent = replaceDynamicPlaceholders(templateData.design, { ...customer, trackingId });

            const emailDoc = {
                trackingId: trackingId,
                campaignId: campaignId,
                customerId: customer.id || customer.ID || uuidv4(),
                customerEmail: customer.Email || customer.email || customer.Eposta || 'unknown@example.com',
                customizedDesign: customizedContent, // Sadece bu müşteriye özel oluşturulmuş mail DOM/JSON'u
                status: 'HAZIRLANIYOR', // Hazırlanıyor, Gönderildi, Hatalı,
                originalData: customer, // Yanıt geldiğinde hangi veriye ait olduğunu bilmek için
                sentAt: null,
                errorDetails: null
            };

            // Log kaydını outbounds hedefine yaz
            const newDocRef = doc(outboundLogsCollection, trackingId);
            await setDoc(newDocRef, emailDoc);

            return { trackingId, docRef: newDocRef, customerEmail: emailDoc.customerEmail };
        });

        // Tüm maillerin veritabanında 'Hazırlanıyor' olarak oluşturulmasını bekle
        const queuedEmails = await Promise.all(deliveryPromises);

        // Kampanya durumunu işleniyor olarak güncelle
        await updateDoc(campaignRef, { status: 'ISLENIYOR' });

        // D. Arka planda gerçek zamanlı gönderimi simüle et (Büyük verilerde bu kısım Cloud Functions ile yapılır)
        simulateEmailSending(campaignRef, queuedEmails, targetGroup.length);

        return { success: true, campaignId, message: "Kampanya gönderim kuyruğuna alındı." };

    } catch (error) {
        console.error("Kampanya başlatılırken hata:", error);
        throw error;
    }
};

/**
 * 3. Gerçek Zamanlı Gönderim Simülasyonu ve Statü Yönetimi
 * Her bir mailin durumunu rastgele başarı/hata vererek günceller.
 */
const simulateEmailSending = async (campaignRef, queuedEmails, totalCount) => {
    let sentCount = 0;
    let failedCount = 0;

    for (const email of queuedEmails) {
        // Gerçek dünyada burada sendgrid/aws ses vb. API çağrısı olur
        // Biz simüle ediyoruz: %95 başarı, %5 hata şansı
        const isSuccess = Math.random() > 0.05;

        try {
            if (isSuccess) {
                await updateDoc(email.docRef, {
                    status: 'GONDERILDI',
                    sentAt: serverTimestamp()
                });
                sentCount++;
            } else {
                await updateDoc(email.docRef, {
                    status: 'HATALI',
                    errorDetails: 'Geçersiz e-posta adresi veya SMTP reddi.',
                    sentAt: serverTimestamp()
                });
                failedCount++;
            }

            // Ana kampanyanın istatistiklerini gerçek zamanlı güncelle
            await updateDoc(campaignRef, {
                'stats.sent': sentCount,
                'stats.failed': failedCount,
                'stats.pending': totalCount - (sentCount + failedCount)
            });

            // Gerçekçi bir gecikme ekle (Her 500ms'de bir mail atılıyormuş gibi)
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error(`Mail güncelleme hatası (${email.trackingId}):`, error);
        }
    }

    // Gönderim bittiğinde
    await updateDoc(campaignRef, { status: 'TAMAMLANDI' });
    console.log(`[Campaign] Gönderim süreci tamamlandı. Başarılı: ${sentCount}, Hatalı: ${failedCount}`);
};

import { processFeedbackLoop } from './feedbackLoopService';

/**
 * 4. Gelen Anket Yanıtlarını İlişkilendirme Fonksiyonu
 * Kullanıcı maildeki butona tıkladığında URL'de ?trackingId=XYZ olacaktır.
 * Anket tamamlandığında bu trackingId kullanılarak Müşteri profili güncellenir.
 */
export const linkSurveyResponseToCustomer = async (appId, trackingId, surveyResult) => {
    try {
        const deliveryRef = doc(db, 'artifacts', appId, 'public', 'data', 'outbound_logs', trackingId);

        // Gönderilmiş olan spesifik e-posta verisini çek
        const deliverySnap = await getDoc(deliveryRef);

        if (!deliverySnap.exists()) {
            throw new Error("Geçersiz Tracking ID. Eşleşen kampanya kaydı bulunamadı.");
        }

        const deliveryData = deliverySnap.data();

        // Yanıtı sisteme kaydet ve müşterinin statüsünü 'Kurtarıldı' vb. yap
        await updateDoc(deliveryRef, {
            surveyCompleted: true,
            surveyResponse: surveyResult, // { score: 9, csat: 4, comment: 'Teşekkürler', responseTime: '...' }
            respondedAt: serverTimestamp()
        });

        // --- Pisano & Qualtrics usulü CLOSED LOOP STATS & CALIBRATION Süreci ---
        await processFeedbackLoop(appId, trackingId, deliveryData, surveyResult);
        // -------------------------------------------------------------------------

        // 5. Analiz Veritabanındaki Orijinal Kaydı 'Yanıtlandı' Olarak İşaretle
        const analyzedDocRef = doc(db, 'artifacts', appId, 'public', 'analyzed_interactions');
        const analyzedSnap = await getDoc(analyzedDocRef);
        if (analyzedSnap.exists()) {
            const interactions = analyzedSnap.data().interactions;
            const targetId = deliveryData.customerId;
            const updatedInteractions = interactions.map(i => {
                const currentId = i.id || i.ID;
                if (currentId === targetId) {
                    return { ...i, status: 'Yanıtlandı', surveyResult };
                }
                return i;
            });
            await updateDoc(analyzedDocRef, { interactions: updatedInteractions });
        }

        console.log(`[Campaign] TrackingID: ${trackingId} için anket yanıtı başarıyla ilişkilendirildi. Müşteri: ${deliveryData.customerEmail}`);

        return { success: true, customer: deliveryData.originalData };

    } catch (error) {
        console.error("Anket ilişkilendirme hatası:", error);
        throw error;
    }
};

/**
 * 5. Anket Gönderim Simülasyonu (Testing Helper)
 * Bu fonksiyon, bir müşterinin mailindeki linke tıkladığını ve anketi doldurduğunu simüle eder.
 */
export const simulateSurveySubmission = async (appId, trackingId) => {
    const scores = [1, 2, 3, 4, 5];
    const comments = ["Kargo çok geç geldi!", "Harika hizmet, teşekkürler.", "Fiyatlar biraz yüksek.", "Temsilci çok ilgiliydi.", "Ürün beklediğimden kötü çıktı."];

    const randomScore = scores[Math.floor(Math.random() * scores.length)];
    const randomComment = comments[Math.floor(Math.random() * comments.length)];

    return await linkSurveyResponseToCustomer(appId, trackingId, {
        csatScore: randomScore,
        comment: randomComment,
        submittedAt: new Date().toISOString()
    });
};

/**
 * Kullanıcı isteğine göre dispatchCampaign isimli Alias fonksiyon proxy'si
 */
export const dispatchCampaign = startCampaignDistribution;
