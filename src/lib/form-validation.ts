export const phonePattern = /^[0-9+\-\s()]{6,24}$/;
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const blockedEmailDomains = new Set([
    "example.com",
    "example.org",
    "example.net",
    "test.com",
    "localhost",
]);

export const isValidOptionalPhone = (value?: string | null) => {
    const normalizedValue = value?.trim();
    if (!normalizedValue) return true;

    const digitsCount = normalizedValue.replace(/\D/g, "").length;

    return phonePattern.test(normalizedValue) && digitsCount >= 6 && digitsCount <= 18;
};

export const isValidBirthDate = (value?: string | Date | null) => {
    if (!value) return true;

    const birthDate = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(birthDate.getTime())) return false;

    const today = new Date();
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    const maxDate = new Date(today.getFullYear() - 4, today.getMonth(), today.getDate());

    return birthDate >= minDate && birthDate <= maxDate;
};

export const isDeliverableEmail = (value?: string | null) => {
    const email = value?.trim().toLowerCase();

    if (!email || !emailPattern.test(email)) return false;

    const domain = email.split("@")[1];

    return !!domain && !blockedEmailDomains.has(domain);
};
