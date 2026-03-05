import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Pisano / Qualtrics vizyonuna uygun 'Closed Loop' (Süreci Kapatma) Mekanizması
 * @param {string} appId 
 * @param {string} trackingId 
 * @param {object} deliveryData 
 * @param {object} surveyResult 
 */
export const processFeedbackLoop = async (appId, trackingId, deliveryData, surveyResult) => {
    try {
        // 1. MODEL ACCURACY (SAPMA HESABI)
        // Müşterinin verdiği gerçek puanı al (Eğer sadece NPS geldiyse CSAT gibi 1-5 aralığına normalize et veya gelen CSAT'i kullan)
        const actualScore = surveyResult.csatScore || surveyResult.score || 3;

        // Zeka Motorumuzun (ABSA) önceden atadığı puan (Yoksa nötr 3 say)
        const predictedScore = deliveryData.originalData?.aiAnalysis?.predictive_csat || 3;

        // Sapma Oranı Hesabı: (5 üzerinden sapmayı yüzdelik olarak hesaplar, 1 Puan Sapma = %20)
        const pointDifference = Math.abs(actualScore - predictedScore);
        const deviationPercent = (pointDifference / 5) * 100;

        // Modelin Sapma Payı > %20 ise Kalibrasyon Uyarısı tetiklenecek
        const requiresCalibration = deviationPercent > 20;

        // 2. REAL-TIME ALERT (KRİTİK DURUM TETİKLEYİCİSİ)
        let isCritical = false;
        let recommendedAction = null;

        // CSAT 2'nin altındaysa veya müşteri şikayet yazmışsa (pisano & qualtrics red-alert mantığı)
        if (actualScore < 2) {
            isCritical = true;
            recommendedAction = "MÜŞTERİYİ HEMEN ARA - ACİL KURTARMA! Memnuniyetsizlik kök nedenini telefonda adresleyin.";
        }

        const alertReason = surveyResult.feedback || surveyResult.comment || "Belirtilmedi";

        // 3. CLOSED LOOP STATS RAPORLAMASI (Firestore Kaydı)
        const closedLoopRef = doc(db, 'artifacts', appId, 'closed_loop_stats', trackingId);

        const record = {
            trackingId,
            customerId: deliveryData.customerId || 'Bilinmiyor',
            customerEmail: deliveryData.customerEmail || 'unknown@example.com',
            campaignId: deliveryData.campaignId || 'Unknown',
            processedAt: serverTimestamp(),
            scores: {
                actual: actualScore,
                predicted: predictedScore,
                deviationPercent: deviationPercent
            },
            modelCalibration: {
                requiresCalibration,
                reason: requiresCalibration ? `Sistem müşterinin ${predictedScore} vereceğini tahmin etti ancak ${actualScore} verildi. Hata payı yüksek.` : 'Model tahmini stabil seyrediyor.'
            },
            alerts: {
                isCritical,
                recommendedAction,
                reason: alertReason
            },
            originalData: deliveryData.originalData || {} // Dashboard'da kullanmak üzere
        };

        // Kök raporlama alanına kaydet
        await setDoc(closedLoopRef, record);

        console.log(`[Feedback Loop] ${trackingId} analiz edildi. Sapma: %${deviationPercent}. Kalibrasyon Gerekli: ${requiresCalibration}`);

        return record;

    } catch (error) {
        console.error("Closed Loop işleme hatası:", error);
        // Ana akışı bozmamak için fırlatma opsiyoneldir.
    }
};
