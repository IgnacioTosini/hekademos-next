import { Prisma } from "@prisma/client";
import {
    isClassCategory,
    normalizeClassCategoryKey,
    normalizeClassCategoryName,
} from "@/utils/class-category";

export const getExistingClassCategoryOption = async (
    database: Pick<Prisma.TransactionClient, "classCategoryOption">,
    value: unknown
) => {
    const name = normalizeClassCategoryName(value);

    if (!isClassCategory(name)) {
        throw new Error("La categoria debe tener entre 2 y 60 caracteres");
    }

    const category = await database.classCategoryOption.findUnique({
        where: {
            normalizedName: normalizeClassCategoryKey(name),
        },
    });

    if (!category) {
        throw new Error("La categoria seleccionada no existe");
    }

    return category;
};
