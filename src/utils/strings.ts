export const getInitials = (name: string | null | undefined, fallback = "") => {
    const source = name?.trim() || fallback;

    return source
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
};
