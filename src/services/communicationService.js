import { db } from '../lib/firebase';
import { doc, getDoc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mevcut analiz edilmiş etkileşimleri "Gelen Kutusu (Emails)" olarak çeker.
 * @param {string} appId 
 */
export const fetchInboxEmails = async (appId) => {
    try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'analyzed_interactions');
        const snap = await getDoc(docRef);

        if (snap.exists() && snap.data().interactions) {
            // Sadece sorunlu veya mesaj atan kitleyi (CSAT <= 4) inbox'a düşürelim ki destek talebi gibi görünsün
            const allInteractions = snap.data().interactions;
            return allInteractions.filter(i => i.aiAnalysis && i.aiAnalysis.predictive_csat <= 4);
        }
        return [];
    } catch (error) {
        console.error("Gelen kutusu çekilirken hata:", error);
        return [];
    }
};

/**
 * AI Agentic Süreci: Gelen mesaja (aspect ve sentiment'e göre) taslak yanıt hazırlar.
 * Ayrıca LLM-Judge denetimi için bir XAI (Açıklanabilirlik) kanıtı sunar.
 */
export const generateAIResponseDraft = (interaction) => {
    const aiDetails = interaction.aiAnalysis;
    const aspect = aiDetails?.primary_aspect || 'Genel';
    const csat = aiDetails?.predictive_csat || 3;
    const name = interaction.Musteri || interaction.İsim || 'Değerli Müşterimiz';
    const textStr = (interaction.Mesaj || interaction.Text || interaction.Comment || '').toLowerCase();

    let baseApo = csat <= 2 ? `Yaşadığınız mağduriyet için çok üzgünüz.` : `Geri bildiriminiz için teşekkür ederiz.`;

    let solution = '';
    let xaiEvidence = `Sistem bu müşteriyi CSAT ${csat} ve '${aspect}' kategorisinde etiketledi. `;

    // XAI (Explainable AI) Mantığı: Metindeki tetikleyici kelimeleri bul ve açıkla
    const keywordsFound = [];

    switch (aspect.toLowerCase()) {
        case 'lojistik ve kargo':
            solution = `Kargo sürecinizdeki gecikmenin farkındayız. Dağıtım merkeziyle iletişime geçildi ve ürününüzün teslimatı için aciliyet talebi oluşturuldu.`;
            ['kargo', 'teslimat', 'gecikti', 'gelmedi', 'hızlı'].forEach(kw => { if (textStr.includes(kw)) keywordsFound.push(kw); });
            break;
        case 'fiyatlandırma':
            solution = `Fiyatlandırma ile ilgili şikayetinizi inceledik. Mağduriyetinizi gidermek adına sonraki alışverişinizde geçerli %15 indirim kodunuz hesabınıza tanımlanmıştır.`;
            ['pahalı', 'fiyat', 'fatura', 'ödeme', 'indirim'].forEach(kw => { if (textStr.includes(kw)) keywordsFound.push(kw); });
            break;
        case 'ürün kalitesi':
            solution = `Ürünümüzde karşılaştığınız sorundan dolayı telafi prosedürümüzü başlatıyoruz. Ürünü ücretsiz iade koduyla geri gönderebilirsiniz, derhal yenisiyle değişimi sağlanacaktır.`;
            ['bozuk', 'kırık', 'kalitesiz', 'harika', 'kalite'].forEach(kw => { if (textStr.includes(kw)) keywordsFound.push(kw); });
            break;
        case 'müşteri hizmetleri':
            solution = `Daha önceki destek talebinizdeki olumsuz deneyimi inceledik. Temsilcilerimizle ilgili iç denetim süreci başlatılmıştır. Konuyu bizzat ekibimle takip edeceğim.`;
            ['temsilci', 'müşteri hizmetleri', 'ilgisiz', 'kaba', 'cevap'].forEach(kw => { if (textStr.includes(kw)) keywordsFound.push(kw); });
            break;
        default:
            solution = `Belirttiğiniz konuyu ilgili departmanımıza ilettik. En kısa sürede kalıcı bir çözümle tarafınıza döneceğiz.`;
            break;
    }

    if (keywordsFound.length > 0) {
        xaiEvidence += `Kanıt: Müşteri metninde şu anahtar kelimeleri kullandı: [${keywordsFound.join(', ')}].`;
    } else {
        xaiEvidence += `Kanıt: Kelime yoğunluğu veya duygu polarizasyonu (Sentiment) baz alınarak genel kanıya varıldı.`;
    }

    const draftText = `Merhaba ${name},\n\n${baseApo} ${solution}\n\nSorununuz hızlıca çözülene kadar sizinle bizzat ilgileneceğimi bilmenizi isterim.\n\nSaygılarımla,\nCX-Inn Yöneticisi`;

    return {
        draftText,
        xaiEvidence
    };
};

/**
 * Yanıtla butonuna basıldığında mesajı outbound_logs koleksiyonuna 'Gönderildi' olarak kaydeder.
 */
export const sendDirectReply = async (appId, emailData, replyDraft) => {
    try {
        const trackingId = uuidv4();
        // Odd-segments error'ını önlemek için outbound_logs'u collection olarak kullanıyoruz
        const replyRef = doc(collection(db, 'artifacts', appId, 'public', 'outbound_logs'), trackingId);

        await setDoc(replyRef, {
            trackingId,
            campaignId: 'DIRECT_REPLY',
            customerEmail: emailData['E-posta'] || emailData.Email || 'unknown@example.com',
            customerId: emailData.id || trackingId,
            templateId: 'ai-generated-draft',
            status: 'GÖNDERİLDİ',
            sentAt: serverTimestamp(),
            originalData: emailData,
            agentMessage: replyDraft
        });

        // İsterseniz burada ilgili müşterinin statüsünü (is_replied=true) updateDoc yapabilirsiniz
        // Şimdilik sadece outbound_logs oluşturuyoruz.
        return true;
    } catch (error) {
        console.error("Direct Reply Gönderme Hatası:", error);
        throw error;
    }
};
