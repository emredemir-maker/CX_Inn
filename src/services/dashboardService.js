import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

/**
 * 1. Anket Yanıtlarını Anlık Dinleme (Real-time Synchronization via Closed Loop)
 * İşlenmiş NPS/CSAT sonuçlarını `closed_loop_stats` üzerinden canlı çekip Dashboard'u besler.
 * @param {string} appId - Mevcut uygulama ID'si
 * @param {function} onUpdateCallback - Yeni veri geldiğinde Dashboard'u güncelleyecek fonksiyon
 */
export const listenToSurveyResponses = (appId, onUpdateCallback) => {
    // Tüm süreç merkezi olan closed_loop_stats'i dinliyoruz
    const closedLoopQuery = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'closed_loop_stats'),
        // orderBy('processedAt', 'desc') // Ensure index is created if uncommented
    );

    // Gerçek zamanlı (Real-time) dinleyici oluştur
    const unsubscribe = onSnapshot(closedLoopQuery, (snapshot) => {
        const responses = [];
        const criticalAlerts = [];

        let totalErrorMargin = 0;
        let evaluatedCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            responses.push(data);

            if (data.scores && Object.hasOwn(data.scores, 'deviationPercent')) {
                totalErrorMargin += data.scores.deviationPercent;
                evaluatedCount += 1;
            }

            // Eğer sistem 'Kritik Müdahale' işareti koymuşsa Dashboard Listesine düşür
            if (data.alerts && data.alerts.isCritical) {
                criticalAlerts.push({
                    id: doc.id,
                    customerEmail: data.customerEmail,
                    originalData: data.originalData,
                    score: `CSAT/NPS: ${data.scores.actual}`,
                    reason: data.alerts.reason || "Belirtilmedi",
                    respondedAt: data.processedAt?.toDate ? data.processedAt.toDate() : new Date(),
                    campaignId: data.campaignId,
                    recommendedAction: data.alerts.recommendedAction
                });
            }
        });

        // Hata payı ortalamasını hesapla 
        // 1 Puan Sapma = %20'dir. (Örn: averageErrorMargin -> ± %12 Sapma / ± 0.6 Puan)
        const averageDeviationPercentage = evaluatedCount > 0
            ? parseFloat((totalErrorMargin / evaluatedCount).toFixed(2))
            : 0;

        // Dashboard için UI'da Puan (Point) üzerinden görünmesi için dönüştürme: (1 Puan = %20)
        const averageErrorMarginPoint = parseFloat((averageDeviationPercentage / 20).toFixed(2));

        // Dashboard'a göndermek üzere analiz objesini hazırla
        const analysisResult = {
            totalResponses: responses.length,
            averageErrorMargin: averageErrorMarginPoint, // 1.2 Puan vb.
            requiresSystemCalibration: averageDeviationPercentage > 20, // Kalibrasyon Bayrağı
            criticalAlerts: criticalAlerts.sort((a, b) => b.respondedAt - a.respondedAt)
        };

        // Gelen işleyiciye sonuçları aktar
        onUpdateCallback(analysisResult);
    }, (error) => {
        console.error("[Dashboard] Closed Loop verisi dinlenirken hata oluştu:", error);
    });

    // Component unmount olduğunda dinlemeyi kapatmak için unsubscribe döndür
    return unsubscribe;
};
