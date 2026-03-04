export const isTckn = (value) => {
    if (!value || value.length !== 11 || isNaN(value)) return false;
    if (value[0] === '0') return false;

    // Basic TCKN validation logic could go here
    return true;
};

// Heuristic regex strategies for Turkish text
const PATTERNS = {
    // 11 digits starting with 1-9
    TCKN: /\b[1-9][0-9]{10}\b/g,

    // Turkish mobile phones (e.g., +905..., 05..., 5...)
    PHONE: /(?:\+90|0)?\s?5\d{2}\s?\d{3}\s?\d{2}\s?\d{2}\b/g,

    // Simple Name-Surname heuristics (Title Case Words >= 2) -> Used mostly for unknown open-text fields
    // Matches "Ahmet Yılmaz", "Ayşe Fatma Demir"
    NAME: /\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s(?:[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)?)\b/g
};

export const maskPII = (text, columnName = '') => {
    if (typeof text !== 'string') text = String(text || '');
    if (!text) return text;

    // Check if we already know this column is "Name", "Surname", "Phone" etc.
    const lowerCol = columnName.toLowerCase();

    // If explicitly a name column, just mask the whole thing (unless empty)
    if (lowerCol.includes('ad') || lowerCol.includes('soyad') || lowerCol.includes('isim') || lowerCol.includes('name')) {
        return '[PII_MASKED]';
    }

    if (lowerCol.includes('tc') || lowerCol.includes('kimlik')) {
        return '[PII_MASKED]';
    }

    if (lowerCol.includes('tel') || lowerCol.includes('phone')) {
        return '[PII_MASKED]';
    }

    // Otherwise, apply Regex Pre-processing on the general text
    let maskedText = text;

    // 1. Mask TCKN
    maskedText = maskedText.replace(PATTERNS.TCKN, (match) => {
        return isTckn(match) ? '[PII_MASKED]' : match;
    });

    // 2. Mask Phone Numbers
    maskedText = maskedText.replace(PATTERNS.PHONE, '[PII_MASKED]');

    // 3. Mask Names (Heuristic fallback, can be aggressive in some contexts)
    // Warning: This could mask normal title-cased phrases. 
    // In a real scenario, NLP or strict dictionaries are safer.
    maskedText = maskedText.replace(PATTERNS.NAME, '[PII_MASKED]');

    return maskedText;
};
