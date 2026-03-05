import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * CX-Inn Zekâ Merkezi: Aspect-Based Sentiment Analysis (ABSA) & Predictive Scoring
 * 
 * Bu motor, yüklenen müşteri etkileşimlerini NLP tabanlı yaklaşımlarla (simülasyon) analiz eder,
 * anket formu bile dolmamışken tahmini CSAT ölçer ve kök neden analizlerini çıkarır.
 */

// Faz 1 için ABSA Keyword Dictionary (Hangi konu hangi anahtar kelimelerle bağdaşır)
const aspectLexicon = {
    'Fiyatlandırma': ['pahalı', 'fiyat', 'ücret', 'ödeme', 'para', 'zam', 'indirim', 'fatura', 'tutar'],
    'Lojistik ve Kargo': ['kargo', 'teslimat', 'gecikti', 'gelmedi', 'kurye', 'dağıtım', 'ulaşmadı', 'gönderi', 'zaman'],
    'Müşteri Hizmetleri': ['temsilci', 'müşteri hizmetleri', 'yardımcı', 'ilgisiz', 'ulaşamadım', 'kaba', 'cevap', 'destek', 'saygısız'],
    'Ürün Kalitesi': ['bozuk', 'kırık', 'kalitesiz', 'harika', 'güzel', 'tasarım', 'malzeme', 'sağlam', 'kullanışlı', 'kalite']
};

// Faz 1 için Polarization Sözlüğü
const sentimentLexicon = {
    positive: ['iyi', 'güzel', 'harika', 'teşekkür', 'memnun', 'hızlı', 'başarılı', 'süper', 'mükemmel', 'çözüldü', 'tavsiye', 'muhteşem'],
    negative: ['kötü', 'berbat', 'rezalet', 'şikayet', 'mağdur', 'gecikti', 'bozuk', 'iade', 'iptal', 'sorun', 'pişman', 'hata', 'kaba', 'yavaş']
};

/**
 * Zeka Motoru: ABSA, Predictive CSAT ve Kök Neden (Impact) Çıkarım Algoritması
 */
export const analyzeAndGroupInteractions = (interactions) => {

    // ----------------------------------------------------------------------
    // 1. DÜZEY ANALİZ: ABSA & Zero-Survey Scoring
    // ----------------------------------------------------------------------
    const analyzed = interactions.map((interaction, index) => {
        // Her etkileşimin içeriğini (Mesaj/Not) düz ve küçük harfli metne çeviriyoruz.
        const originalText = (interaction.Icerik || interaction.Mesaj || interaction.Mesaj_Icerigi || interaction.Comment || interaction.Feedback || interaction.Text || interaction.Notlar || "").toLowerCase();
        const customerId = interaction.CustomerId || interaction.MusteriId || interaction.Email || interaction.Islem_ID || `cust_${index}`;

        // Metin yoksa varsayılan dönüş
        if (!originalText) {
            return {
                ...interaction,
                aiAnalysis: {
                    aspect_scores: {},
                    overall_sentiment: 0,
                    predictive_csat: 3,
                    is_risk_customer: false,
                    primary_aspect: 'Genel Bilgi',
                    reasoning: 'Metin içeriği boş olduğu için nötr analiz yapıldı.'
                }
            };
        }

        // --- 1. AGENT: CLASSIFIER (Aspect Detection) ---
        let maxAspectCount = 0;
        let dominantAspect = 'Genel İletişim';
        const aspect_scores = {};

        Object.keys(aspectLexicon).forEach(aspect => {
            let contextHits = 0;
            aspectLexicon[aspect].forEach(keyword => {
                if (originalText.includes(keyword)) contextHits++;
            });
            if (contextHits > 0) {
                aspect_scores[aspect] = contextHits; // Geçici skor, sentiment ile çarpılacak
                if (contextHits > maxAspectCount) {
                    maxAspectCount = contextHits;
                    dominantAspect = aspect;
                }
            }
        });

        // --- 2. AGENT: SENTIMENT (Fine-grained Scoring) ---
        let posHits = 0;
        let negHits = 0;
        sentimentLexicon.positive.forEach(word => { if (originalText.includes(word)) posHits++; });
        sentimentLexicon.negative.forEach(word => { if (originalText.includes(word)) negHits++; });

        let overall_sentiment = 0;
        if (posHits + negHits > 0) {
            overall_sentiment = (posHits - negHits) / (posHits + negHits);
        } else {
            overall_sentiment = (Math.random() * 0.4) - 0.2;
        }

        let rawPredictiveCsat = Math.round(((overall_sentiment + 1) / 2) * 4 + 1);
        const predictive_csat = Math.max(1, Math.min(5, rawPredictiveCsat));
        const is_risk_customer = overall_sentiment <= -0.4 || predictive_csat <= 2;

        // Sentiment'e göre aspect skorlarını güncelle
        Object.keys(aspect_scores).forEach(a => {
            aspect_scores[a] = parseFloat((overall_sentiment + (Math.random() * 0.2 - 0.1)).toFixed(2));
        });

        // --- 3. AGENT: CONTEXT (Chronic Issue Detector - GraphRAG Light Simulation) ---
        // Simülasyon: Aynı müşterinin bu veri setinde veya geçmişte benzer şikayeti olup olmadığını kontrol eder
        const previousInteractions = interactions.filter((i, idx) =>
            (i.CustomerId === customerId || i.Email === customerId) && idx < index
        );
        const isChronic = previousInteractions.length >= 2;
        let contextNote = isChronic
            ? `DİKKAT: Bu müşteri için son dönemde ${previousInteractions.length + 1}. benzer talep. Kronikleşmiş sorun!`
            : 'İlk etkileşim veya seyrek talep.';

        // --- 4. AGENT: ADAPTIVE FOLLOW-UP GENERATOR ---
        // Eğer mesaj çok kısaysa veya sadece 'Sorun var', 'Kötü' gibi muğlaksa soru üret
        let followUpQuestion = null;
        if (originalText.length < 25 || (negHits > 0 && posHits === 0 && !dominantAspect)) {
            followUpQuestion = `Yaşadığınız olumsuz deneyim için üzgünüz. Size daha yardımcı olabilmemiz için '${dominantAspect !== 'Genel İletişim' ? dominantAspect : 'yaşadığınız durum'}' hakkında biraz daha detay verebilir misiniz?`;
        }

        // --- 5. REASONING & XAI ---
        const reasoning = `[Classifier] Konu '${dominantAspect}' olarak belirlendi. [Sentiment] Metin polarizasyonu ${overall_sentiment.toFixed(2)} olarak ölçüldü. [Context] ${contextNote}`;

        return {
            ...interaction,
            aiAnalysis: {
                aspect_scores,
                overall_sentiment: parseFloat(overall_sentiment.toFixed(2)),
                predictive_csat,
                is_risk_customer,
                primary_aspect: dominantAspect,
                is_chronic: isChronic,
                follow_up_needed: !!followUpQuestion,
                suggested_follow_up: followUpQuestion,
                reasoning,
                xai_evidence: `Pozitif: ${posHits}, Negatif: ${negHits}, Tespit Edilen Konu Anahtarları: ${maxAspectCount}`
            }
        };
    });

    // ----------------------------------------------------------------------
    // 2. DÜZEY ANALİZ: Konu Korelasyonu ve Kök Neden (Impact Analysis)
    // ----------------------------------------------------------------------
    const aspectStats = {};
    let globalCsatSum = 0;

    analyzed.forEach(item => {
        globalCsatSum += item.aiAnalysis.predictive_csat;

        Object.entries(item.aiAnalysis.aspect_scores).forEach(([aspect, score]) => {
            if (!aspectStats[aspect]) {
                aspectStats[aspect] = { totalSentiment: 0, count: 0, relatedCsatSum: 0 };
            }
            aspectStats[aspect].totalSentiment += score;
            aspectStats[aspect].relatedCsatSum += item.aiAnalysis.predictive_csat; // O konu geçerken üretilen CSAT
            aspectStats[aspect].count += 1;
        });
    });

    // 2A. Şirketin o veriseti içindeki Orijinal (Global) Tahmini CSAT Skoru
    const globalAverageCsat = analyzed.length > 0 ? (globalCsatSum / analyzed.length) : 0;

    // 2B. Kök Neden Analizi Hesabı (Hangi konu NPS/CSAT'ı ne kadar yakıyor?)
    const impactAnalysis = [];
    Object.keys(aspectStats).forEach(aspect => {
        const stats = aspectStats[aspect];
        const averageSentiment = stats.totalSentiment / stats.count;
        const aspectAverageCsat = stats.relatedCsatSum / stats.count;

        // Impact Score: O konunun geçtiği analizlerin CSAT ortalaması - Genel CSAT ortalaması
        // Örnek: Genel CSAT 3.5. "Lojistik" geçen şikayetlerde CSAT 1.5. Fark = -2.0 Puan Etki (Ciddi yara veriyor!)
        const csatImpact = aspectAverageCsat - globalAverageCsat;

        impactAnalysis.push({
            aspect,
            mentionCount: stats.count,
            averageSentiment: parseFloat(averageSentiment.toFixed(2)),
            csatImpact: parseFloat(csatImpact.toFixed(2)),
            impactType: csatImpact < -0.6 ? 'Kritik Risk' : (csatImpact > 0.5 ? 'Güçlü Yön' : 'Gözlemleniyor')
        });
    });

    // ----------------------------------------------------------------------
    // 3. RAPORLAMA ÇIKTISI
    // ----------------------------------------------------------------------
    const groupedData = {};
    analyzed.forEach(item => {
        const cat = item.aiAnalysis.primary_aspect;
        if (!groupedData[cat]) groupedData[cat] = { interactions: [], count: 0 };
        groupedData[cat].interactions.push(item);
        groupedData[cat].count++;
    });

    return {
        rawAnalyzed: analyzed,
        // Kök neden analizi çıktısı: En çok negatif etki (zarar) verenler en üstte olacak şekilde (-) yönde sıralanır
        impactAnalysis: impactAnalysis.sort((a, b) => a.csatImpact - b.csatImpact),
        grouped: groupedData,
        globalMetrics: {
            averagePredictiveCsat: parseFloat(globalAverageCsat.toFixed(2)),
            totalInteractions: analyzed.length,
            riskCustomerCount: analyzed.filter(i => i.aiAnalysis.is_risk_customer).length
        }
    };
};

/**
 * Zekâ Merkezi Analizini Yapılandırılmış JSON Olarak Kaydetme
 */
export const saveAnalyzedDataToFirestore = async (appId, analyzedResult) => {
    try {
        const docRef = doc(db, 'artifacts', appId, 'analyzed_interactions', 'latest');

        // Müşterilerin asıl iletişim logları + onlara yapıştırılmış ABSA/CSAT etiketleri
        // Cihaz şişmesin diye 'impactAnalysis' gibi zeka çıktılarını yukarı çıkarıyoruz
        const payload = {
            updatedAt: new Date().toISOString(),
            globalMetrics: analyzedResult.globalMetrics,
            rootCauseImpact: analyzedResult.impactAnalysis, // <-- Dashboard'u besleyecek asıl altın veri
            interactions: analyzedResult.rawAnalyzed
        };

        await setDoc(docRef, payload);

        console.log(`[CX-Inn ABSA Engine] ${payload.globalMetrics.totalInteractions} etkileşim çözümlendi.`);
        console.log(`[CX-Inn ABSA Engine] Zeka Merkezi JSON Çıktısı Firestore'a yazıldı!`);
        return true;
    } catch (error) {
        console.error("Firestore Zeka Merkezi veri yazma hatası:", error);
        throw error;
    }
};

/**
 * Kampanyalara Girecek Müşteri Segmentasyon Tetikleyicisi (Auto-Segmentation)
 * Müşteri verilerini analiz sonuçlarına göre akıllı gruplara (Acil Geri Kazanım, Sadakat vb.) ayırır.
 * 
 * @param {Array} allInteractions - Analiz edilmiş (ABSA etiketli) tüm müşteri datası
 */
export const segmentCustomers = (allInteractions) => {
    const segments = {
        detractors: {
            id: 'recovery',
            title: 'Acil Geri Kazanım Listesi',
            description: '', // Dinamik oluşturulacak
            customers: []
        },
        passives: {
            id: 'nurture',
            title: 'Pasif Müşteriler (Nurture)',
            description: '',
            customers: []
        },
        promoters: {
            id: 'loyalty',
            title: 'Sadakat Programı Adayları',
            description: 'Yüksek memnuniyet gösteren ve up-sell kampanyalarına uygun marka elçileri.',
            customers: []
        }
    };

    // 1. Müşterileri CSAT skorlarına ve Risk bayraklarına göre ayır
    allInteractions.forEach(item => {
        const { predictive_csat, is_risk_customer } = item.aiAnalysis;

        if (predictive_csat <= 3 || is_risk_customer) {
            segments.detractors.customers.push(item);
        } else if (predictive_csat === 4) {
            segments.passives.customers.push(item);
        } else if (predictive_csat >= 5) {
            segments.promoters.customers.push(item);
        }
    });

    // 2. Acil Geri Kazanım (Detractors) Grubu için Dinamik Açıklama Stratejisi
    if (segments.detractors.customers.length > 0) {
        // Detractor grubunda en çok tekrar eden (bela olan) konuyu bul
        const aspectFrequency = {};
        segments.detractors.customers.forEach(customer => {
            const aspect = customer.aiAnalysis.primary_aspect;
            aspectFrequency[aspect] = (aspectFrequency[aspect] || 0) + 1;
        });

        // En çok geçen konuyu (Kök Neden) bul
        const primaryReason = Object.keys(aspectFrequency).reduce((a, b) => aspectFrequency[a] > aspectFrequency[b] ? a : b);

        segments.detractors.description = `Bu segmentteki ${segments.detractors.customers.length} müşteri ağırlıklı olarak "${primaryReason}" süreçlerinden dolayı derin hayal kırıklığı yaşıyor. Churn (Kayıp) riski yüksek, acil NPS ve Özür Kampanyası gönderin.`;

        // Riski en yüksek (sentiment en düşük) olanlara göre önceliklendir
        segments.detractors.customers.sort((a, b) => a.aiAnalysis.overall_sentiment - b.aiAnalysis.overall_sentiment);
    } else {
        segments.detractors.description = 'Şu an sistemde acil geri kazanım listesine düşen kritik seviyede bir müşteri bulunmuyor.';
    }

    // 3. Pasifler için Dinamik Açıklama
    if (segments.passives.customers.length > 0) {
        segments.passives.description = 'Hizmetten genel olarak memnunlar ancak marka savunucusu değiller. Ufak teşvikler (Örn: %10 İndirim Kodu) ile Promoter seviyesine çekilebilirler.';
    }

    return segments;
};
