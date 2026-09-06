const hekademosWhatsappNumber = "5492234268951";

export const normalizeWhatsappPhoneNumber = (value?: string | null) => {
    if (!value?.trim()) return null;

    const hasInternationalPrefix = value.trim().startsWith("+") || value.trim().startsWith("00");
    let digits = value.replace(/\D/g, "");

    if (digits.startsWith("00")) digits = digits.slice(2);

    if (digits.startsWith("54")) {
        let nationalNumber = digits.slice(2).replace(/^0/, "");

        if (nationalNumber.startsWith("9")) {
            return nationalNumber.length === 11 ? `54${nationalNumber}` : null;
        }

        if (nationalNumber.length === 12) {
            const mobilePrefixIndex = [2, 3, 4].find((index) => nationalNumber.slice(index, index + 2) === "15");

            if (mobilePrefixIndex !== undefined) {
                nationalNumber = nationalNumber.slice(0, mobilePrefixIndex)
                    + nationalNumber.slice(mobilePrefixIndex + 2);
            }
        }

        return nationalNumber.length === 10 ? `549${nationalNumber}` : null;
    }

    if (hasInternationalPrefix) {
        return digits.length >= 8 && digits.length <= 15 ? digits : null;
    }

    let nationalNumber = digits.replace(/^0/, "");

    if (nationalNumber.length === 12) {
        const mobilePrefixIndex = [2, 3, 4].find((index) => nationalNumber.slice(index, index + 2) === "15");

        if (mobilePrefixIndex !== undefined) {
            nationalNumber = nationalNumber.slice(0, mobilePrefixIndex)
                + nationalNumber.slice(mobilePrefixIndex + 2);
        }
    }

    return nationalNumber.length === 10 ? `549${nationalNumber}` : null;
};

export const buildWhatsappUrl = (phone: string | null | undefined, message: string) => {
    const normalizedPhone = normalizeWhatsappPhoneNumber(phone);

    return normalizedPhone
        ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
        : null;
};

export const buildHekademosWhatsappUrl = (message: string) => (
    buildWhatsappUrl(hekademosWhatsappNumber, message) ?? "https://wa.me/"
);
