import { db } from '../lib/firebase';
import { collectionGroup, query, where, onSnapshot } from 'firebase/firestore';

/**
 * 1. Anket Yanıtlarını Anlık Dinleme (Real-time Synchronization)
 * Tüm kampanyalardaki (collectionGroup: deliveries) tamamlanmış anket yanıtlarını canlı olarak dinler.
 * @param {string} appId - Mevcut uygulama ID'si
 * @param {function} onUpdateCallback - Yeni veri geldiğinde Dashboard'u güncelleyecek fonksiyon
 */
export const listenToSurveyResponses = (appId, onUpdateCallback) => {
    // collectionGroup ile Firestore içindeki tüm 'deliveries' alt koleksiyonlarını tararız.
    const deliveriesQuery = query(
        collectionGroup(db, 'deliveries'),
        where('surveyCompleted', '==', true)
    );

    // Gerçek zamanlı (Real-time) dinleyici oluştur
    const unsubscribe = onSnapshot(deliveriesQuery, (snapshot) => {
        const responses = [];
        const criticalAlerts = [];

        let totalErrorMargin = 0;
        let evaluatedCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            responses.push(data);

            // 1. Modelin Hata Payı Hesaplaması (AI vs Gerçek)
            // AI tahmini (Örn: sentimentScore -1 ile +1 arası, biz bunu 0-10 skalasına çevirmiş farz edelim veya churn risk)
            if (data.surveyResponse && data.originalData && data.originalData.aiAnalysis) {
                const actualNps = data.surveyResponse.npsScore; // 0-10

                // Yapay zeka tahminini 0-10 NPS skalasına uydurma (-1 = 0, +1 = 10 gibi basit bir çevirim)
                const predictedSentiment = data.originalData.aiAnalysis.sentimentScore;
                const predictedNps = Math.round((predictedSentiment + 1) * 5); // -1 -> 0, 0 -> 5, 1 -> 10

                // Gerçek puan ile tahmini puan arasındaki fark (Mutlak değer)
                const errorMargin = Math.abs(actualNps - predictedNps);

                totalErrorMargin += errorMargin;
                evaluatedCount += 1;
            }

            // 2. Kritik Düşük Puan Tetikleyicisi (NPS <= 4 veya CSAT <= 2 ise Acil Müdahale!)
            const nps = data.surveyResponse?.npsScore;
            const csat = data.surveyResponse?.csatScore;

            if ((nps !== undefined && nps <= 4) || (csat !== undefined && csat <= 2)) {
                criticalAlerts.push({
                    id: doc.id,
                    customerEmail: data.customerEmail,
                    originalData: data.originalData,
                    score: nps !== undefined ? `NPS: ${nps}` : `CSAT: ${csat}`,
                    reason: data.surveyResponse?.feedback || "Belirtilmedi",
                    respondedAt: data.respondedAt?.toDate ? data.respondedAt.toDate() : new Date(),
                    campaignId: data.campaignId || 'Bilinmiyor'
                });
            }
        });

        // Hata payı ortalamasını hesapla (Örn: Model ortalama 1.2 puan sapma ile çalışıyor)
        const averageErrorMargin = evaluatedCount > 0
            ? parseFloat((totalErrorMargin / evaluatedCount).toFixed(2))
            : 0;

        // Dashboard'a göndermek üzere analiz objesini hazırla
        const analysisResult = {
            totalResponses: responses.length,
            averageErrorMargin: averageErrorMargin, // AI'nın tahmin başarısı
            criticalAlerts: criticalAlerts.sort((a, b) => b.respondedAt - a.respondedAt) // En yeni aciliyetler en üstte
        };

        // Gelen işleyiciye sonuçları aktar
        onUpdateCallback(analysisResult);
    }, (error) => {
        console.error("[Dashboard] Anket yanıtları dinlenirken hata oluştu:", error);
    });

    // Component unmount olduğunda dinlemeyi kapatmak için unsubscribe fonksiyonunu döndür
    return unsubscribe;
};
