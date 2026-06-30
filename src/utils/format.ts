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
