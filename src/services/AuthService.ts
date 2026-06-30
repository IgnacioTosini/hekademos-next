const isClient = typeof window !== 'undefined';

export const loginWithGoogle = () => {
    if (isClient) {
        window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL_LOCAL}/oauth2/authorization/google`;
    }
};

export const saveToken = (t: string) => {
    if (isClient) localStorage.setItem('token', t);
};

export const getToken = () => {
    if (isClient) return localStorage.getItem('token');
    return null;
};

export const logout = () => {
    if (isClient) localStorage.removeItem('token');
};
