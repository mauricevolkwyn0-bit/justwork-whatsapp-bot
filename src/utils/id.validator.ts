/**
 * Validates a South African ID number (13 digits, Luhn check).
 * Parses date of birth and gender from the ID.
 */
export interface ParsedID {
    valid: boolean;
    dateOfBirth?: string; // YYYY-MM-DD
    gender?: "Male" | "Female";
    error?: string;
}

export function parseSAID(idNumber: string): ParsedID {
    const cleaned = idNumber.replace(/\s/g, "");

    if (!/^\d{13}$/.test(cleaned)) {
        return { valid: false, error: "ID number must be exactly 13 digits." };
    }

    // Extract date
    const year = cleaned.substring(0, 2);
    const month = cleaned.substring(2, 4);
    const day = cleaned.substring(4, 6);

    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
        return { valid: false, error: "ID number contains an invalid date." };
    }

    // Century: 00-99 → assume >= 25 is 19xx, < 25 is 20xx
    const fullYear = parseInt(year, 10) >= 25 ? `19${year}` : `20${year}`;
    const dateOfBirth = `${fullYear}-${month}-${day}`;

    // Gender: positions 6-9, >= 5000 = Male
    const genderCode = parseInt(cleaned.substring(6, 10), 10);
    const gender: "Male" | "Female" = genderCode >= 5000 ? "Male" : "Female";

    // Luhn algorithm
    const digits = cleaned.split("").map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = digits[i] ?? 0; // satisfies TS, safe since we validated 13 digits above
        if (i % 2 === 0) {
            sum += digit;
        } else {
            const doubled = digit * 2;
            sum += doubled > 9 ? doubled - 9 : doubled;
        }
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const lastDigit = digits[12] ?? -1;
    if (checkDigit !== lastDigit) {
        return { valid: false, error: "ID number failed validation check." };
    }

    return { valid: true, dateOfBirth, gender };
}