import { getCurrentAuthSession } from "./auth-session";

const adminRequiredErrorCode = "ADMIN_REQUIRED";

export const isAdminAuthenticated = async () => {
    const session = await getCurrentAuthSession();

    return session?.role === "ADMIN";
};

export const requireAdminSession = async () => {
    const session = await getCurrentAuthSession();

    if (session?.role !== "ADMIN") {
        throw new Error(adminRequiredErrorCode);
    }

    return session;
};

export const getAdminActionErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message === adminRequiredErrorCode) {
        return "No tenes permiso para realizar esta accion";
    }

    return fallback;
};

export const isAdminRequiredError = (error: unknown) => (
    error instanceof Error && error.message === adminRequiredErrorCode
);

export const logAdminActionError = (message: string, error: unknown) => {
    if (isAdminRequiredError(error)) return;

    console.error(message, error);
};
