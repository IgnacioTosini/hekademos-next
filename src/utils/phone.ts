import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';

export const phoneValidationMessage = 'Revisá el teléfono: elegí el país e ingresá el código de área y el número completo.';

// Legacy unprefixed numbers belong to Argentina. Explicit international numbers
// keep their country. Never infer a foreign country from unprefixed digits.
export const normalizeContactPhone = (value?: string | null): string | null => {
    if (!value?.trim() || value.length > 40 || !/^\+?[0-9\s().-]+$/.test(value.trim())) return null;
    let compact = value.trim().replace(/[\s().-]/g, '').replace(/^00/, '+');
    const argentina = !compact.startsWith('+') || compact.startsWith('+54');
    if (argentina) {
        let national = compact.replace(/^\+?54/, '').replace(/^0/, '');
        if (national.length === 11 && national.startsWith('9')) national = national.slice(1);
        if (national.length === 12) {
            const index = [2, 3, 4].find((position) => national.slice(position, position + 2) === '15');
            if (index !== undefined) national = national.slice(0, index) + national.slice(index + 2);
        }
        if (national.length !== 10) return null;
        compact = `+549${national}`;
    }
    const parsed = parsePhoneNumberFromString(compact, { extract: false });
    return parsed?.isPossible() ? parsed.number : null;
};

export const isValidOptionalContactPhone = (value?: string | null) => !value?.trim() || normalizeContactPhone(value) !== null;

export const composeContactPhone = (country: CountryCode, national: string) => {
    if (!national.trim()) return '';
    const input = national.trim();
    const international = input.startsWith('+') || input.startsWith('00')
        ? input
        : `+${getCountryCallingCode(country)}${input}`;
    return normalizeContactPhone(international) ?? international;
};

export const splitContactPhone = (value: string): { country: CountryCode; national: string } => {
    const normalized = normalizeContactPhone(value);
    const parsed = normalized ? parsePhoneNumberFromString(normalized) : undefined;
    if (!parsed?.country) return { country: 'AR', national: value };
    return { country: parsed.country, national: parsed.country === 'AR'
        ? parsed.nationalNumber.replace(/^9/, '') : parsed.nationalNumber };
};
