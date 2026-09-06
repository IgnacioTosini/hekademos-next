import { normalizeContactPhone } from '@/utils/phone';

const hekademosWhatsappNumber = "5492234268951";

export const normalizeWhatsappPhoneNumber = (value?: string | null) => (
    normalizeContactPhone(value)?.slice(1) ?? null
);

export const buildWhatsappUrl = (phone: string | null | undefined, message: string) => {
    const normalizedPhone = normalizeWhatsappPhoneNumber(phone);

    return normalizedPhone
        ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
        : null;
};

export const buildHekademosWhatsappUrl = (message: string) => (
    buildWhatsappUrl(hekademosWhatsappNumber, message) ?? "https://wa.me/"
);
