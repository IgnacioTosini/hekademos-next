export const DEFAULT_CLASS_CATEGORY = "Calistenia";

export const normalizeClassCategoryName = (value: unknown) => (
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""
);

export const normalizeClassCategoryKey = (value: unknown) => (
    normalizeClassCategoryName(value).normalize("NFKC").toLocaleLowerCase("es")
);

export const getClassCategoryLabel = (value: unknown) => (
    normalizeClassCategoryName(value) || DEFAULT_CLASS_CATEGORY
);

export const isClassCategory = (value: unknown): value is string => {
    const category = normalizeClassCategoryName(value);

    return category.length >= 2 && category.length <= 60;
};
