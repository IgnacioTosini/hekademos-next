'use client';

import { AuthProvider } from "./authContext";
import { ReactQueryProvider } from "./ReactQueryProvider";
import { ToastContainer } from "react-toastify";

interface Props {
    children: React.ReactNode;
}

export const Providers = ({ children }: Props) => {
    return (
        <ReactQueryProvider>
            <AuthProvider>
                {children}
                <ToastContainer
                    position="top-right"
                    autoClose={3200}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="dark"
                />
            </AuthProvider>
        </ReactQueryProvider>
    )
}
