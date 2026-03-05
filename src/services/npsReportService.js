import { db } from '../lib/firebase';
import { collection, doc, onSnapshot } from 'firebase/firestore';

/**
 * NPS Raporu için gerekli verileri dinler.
 * 1. Analiz Edilmiş Veriler: Impact Matrix (Root Cause Impact)
 * 2. Closed Loop İstatistikleri: Gap Analysis (Gerçek vs Tahmin)
 */
export const listenToNpsReportData = (appId, onUpdateCallback) => {
    const analyzedDocRef = doc(db, 'artifacts', appId, 'analyzed_interactions', 'latest');
    const closedLoopCollectionRef = collection(db, 'artifacts', appId, 'closed_loop_stats');

    let latestAnalyzedData = null;
    let latestClosedLoopData = [];

    const triggerUpdate = () => {
        if (latestAnalyzedData && latestClosedLoopData !== null) {
            onUpdateCallback({
                impactMatrix: latestAnalyzedData.rootCauseImpact || [],
                globalMetrics: latestAnalyzedData.globalMetrics || {},
                gapAnalysis: latestClosedLoopData,
                interactionsData: latestAnalyzedData.interactions || []
            });
        }
    };

    // 1. Analyzed Interactions Dinle (Impact Matrix için)
    const unsubAnalyzed = onSnapshot(analyzedDocRef, (snap) => {
        if (snap.exists()) {
            latestAnalyzedData = snap.data();
            triggerUpdate();
        }
    });

    // 2. Closed Loop Stats Dinle (Gap Analysis için)
    const unsubClosedLoop = onSnapshot(closedLoopCollectionRef, (snap) => {
        const results = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (data.scores) {
                results.push({
                    id: doc.id,
                    customerEmail: data.customerEmail,
                    actualScore: data.scores.actual,
                    predictedScore: data.scores.predicted,
                    deviation: data.scores.deviationPercent,
                    reason: data.alerts?.reason || 'Belirtilmedi',
                    date: data.processedAt?.toDate ? data.processedAt.toDate() : new Date()
                });
            }
        });
        latestClosedLoopData = results.sort((a, b) => b.date - a.date);
        triggerUpdate();
    });

    return () => {
        unsubAnalyzed();
        unsubClosedLoop();
    };
};
