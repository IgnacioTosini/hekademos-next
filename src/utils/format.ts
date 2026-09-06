export const formatCurrency = (
    amountCents: number | null | undefined,
    currency = "ARS",
    fallback = "-"
) => {
    if (amountCents === null || amountCents === undefined) return fallback;

    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(amountCents / 100);
};

export const formatDate = (
    value: Date | string | null | undefined,
    fallback = "-"
) => {
    if (!value) return fallback;

    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value));
};

export const formatDateTime = (
    value: Date | string,
    options?: Intl.DateTimeFormatOptions
) => (
    new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        ...options,
    }).format(new Date(value))
);

const communityMonthNames = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sept", "oct", "nov", "dic",
];

const communityDatePartsFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

export const formatCommunityDateTime = (value: Date | string) => {
    const parts = Object.fromEntries(
        communityDatePartsFormatter
            .formatToParts(new Date(value))
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value])
    );
    const monthName = communityMonthNames[Number(parts.month) - 1] ?? parts.month;

    return `${parts.day} ${monthName} ${parts.year} · ${parts.hour}:${parts.minute}`;
};

export const parsePesosToCents = (value: string) => {
    const normalizedValue = value.trim().replace(",", ".");
    if (!normalizedValue) return null;

    const amount = Number(normalizedValue);
    if (!Number.isFinite(amount)) return null;

    return Math.round(amount * 100);
};

export const centsToPesosInput = (amountCents: number | null | undefined) => (
    amountCents === null || amountCents === undefined ? "" : String(amountCents / 100)
);
