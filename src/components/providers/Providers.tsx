'use client';

import { AuthProvider } from "./authContext";
import { ExerciseProvider } from "./exerciseStore";
import { ReactQueryProvider } from "./ReactQueryProvider";

interface Props {
    children: React.ReactNode;
}

export const Providers = ({ children }: Props) => {
    return (
        <ReactQueryProvider>
            <ExerciseProvider>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </ExerciseProvider>
        </ReactQueryProvider>
    )
}
