const defaultAppBaseUrl = "http://localhost:3000";

const withoutTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const getConfiguredAppBaseUrl = () => {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_BASE_URL;

    return configuredUrl ? withoutTrailingSlash(configuredUrl) : null;
};

export const getAppBaseUrl = () => getConfiguredAppBaseUrl() ?? defaultAppBaseUrl;

export const getAppUrl = (path: string) => (
    `${getAppBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`
);
