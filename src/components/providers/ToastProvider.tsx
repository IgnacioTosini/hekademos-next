'use client';

import { ToastContainer } from "react-toastify";

export const ToastProvider = () => (
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
);
