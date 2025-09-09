import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

export function normalizePhoneNumber(
  phoneNumber: string,
  defaultCountry?: string
): string | null {
  try {
    // Remove any non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Parse the phone number
    const parsed = parsePhoneNumber(cleaned, defaultCountry as CountryCode);
    
    if (parsed && parsed.isValid()) {
      return parsed.format('E.164');
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export function validatePhoneNumber(
  phoneNumber: string,
  defaultCountry?: string
): boolean {
  try {
    return isValidPhoneNumber(phoneNumber, defaultCountry as CountryCode);
  } catch (error) {
    return false;
  }
}

export function deduplicateNumbers(numbers: string[]): {
  unique: string[];
  duplicatesCount: number;
} {
  const seen = new Set<string>();
  const unique: string[] = [];
  
  for (const number of numbers) {
    if (!seen.has(number)) {
      seen.add(number);
      unique.push(number);
    }
  }
  
  return {
    unique,
    duplicatesCount: numbers.length - unique.length,
  };
}

export function normalizeAndDeduplicateNumbers(
  numbers: string[],
  defaultCountry?: string
): {
  normalized: string[];
  invalid: string[];
  duplicatesCount: number;
} {
  const normalized: string[] = [];
  const invalid: string[] = [];
  
  // First normalize all numbers
  for (const number of numbers) {
    const normalizedNumber = normalizePhoneNumber(number, defaultCountry);
    if (normalizedNumber) {
      normalized.push(normalizedNumber);
    } else {
      invalid.push(number);
    }
  }
  
  // Then deduplicate
  const { unique, duplicatesCount } = deduplicateNumbers(normalized);
  
  return {
    normalized: unique,
    invalid,
    duplicatesCount,
  };
}
