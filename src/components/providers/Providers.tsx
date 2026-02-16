'use client';

import { useMemo } from "react";
import { AuthProvider } from "./authContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExerciseProvider } from "./exerciseStore";

interface Props {
    children: React.ReactNode;
}

export const Providers = ({ children }: Props) => {
    const queryClient = useMemo(() => new QueryClient(), []);
    return (
        <QueryClientProvider client={queryClient}>
            <ExerciseProvider>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </ExerciseProvider>
        </QueryClientProvider>
    )
}
