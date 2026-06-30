export type StudentNameSource = {
    firstName: string | null;
    lastName: string | null;
    user?: {
        name?: string | null;
        email?: string | null;
    };
};

export const getStudentName = (student: StudentNameSource, fallback = "Sin nombre") => {
    const profileName = [student.firstName, student.lastName].filter(Boolean).join(" ");

    return profileName || student.user?.name || student.user?.email || fallback;
};
