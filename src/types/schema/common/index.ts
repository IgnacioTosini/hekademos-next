export type PrismaDate = Date | string;

export type TimestampFields = {
    createdAt: PrismaDate;
    updatedAt: PrismaDate;
};

export type ClassCategory = string;

export type ClassCategoryOption = TimestampFields & {
    id: string;
    name: string;
    normalizedName: string;
    isSpecialActivity: boolean;
};

export type ClassCategoryOptionInput = {
    name: string;
    isSpecialActivity: boolean;
};
