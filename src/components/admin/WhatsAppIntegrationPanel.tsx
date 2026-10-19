"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import {
    completeWhatsAppCoexistence,
    disconnectManagedWhatsApp,
} from "@/app/actions/whatsappIntegration.actions";
import "./_whatsappIntegrationPanel.scss";

type IntegrationSummary = {
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string | null;
    verifiedName: string | null;
    tokenExpiresAt: string | null;
};

type FacebookLoginResponse = {
    authResponse?: { code?: string };
    status?: string;
};

type FacebookSdk = {
    init: (options: Record<string, unknown>) => void;
    login: (
        callback: (response: FacebookLoginResponse) => void,
        options: Record<string, unknown>
    ) => void;
};

declare global {
    interface Window {
        FB?: FacebookSdk;
    }
}

const allowedMetaOrigins = new Set([
    "https://www.facebook.com",
    "https://web.facebook.com",
]);

export const WhatsAppIntegrationPanel = ({
    appId,
    configId,
    serverConfigured,
    apiVersion,
    integration,
}: {
    appId: string | null;
    configId: string | null;
    serverConfigured: boolean;
    apiVersion: string;
    integration: IntegrationSummary | null;
}) => {
    const router = useRouter();
    const [sdkReady, setSdkReady] = useState(false);
    const [isWorking, setIsWorking] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [isError, setIsError] = useState(false);
    const codeRef = useRef<string | null>(null);
    const wabaIdRef = useRef<string | null>(null);
    const submissionStartedRef = useRef(false);

    const initializeSdk = useCallback(() => {
        if (!window.FB || !appId) return;
        window.FB.init({
            appId,
            cookie: true,
            xfbml: false,
            version: apiVersion,
        });
        setSdkReady(true);
    }, [apiVersion, appId]);

    const finishConnection = useCallback(async () => {
        const code = codeRef.current;
        const wabaId = wabaIdRef.current;
        if (!code || !wabaId || submissionStartedRef.current) return;

        submissionStartedRef.current = true;
        setMessage("Validando y guardando la conexión…");
        const result = await completeWhatsAppCoexistence({ code, wabaId });

        if (!result.ok) {
            submissionStartedRef.current = false;
            codeRef.current = null;
            wabaIdRef.current = null;
            setIsWorking(false);
            setIsError(true);
            setMessage(result.error);
            return;
        }

        setIsError(false);
        setMessage(`WhatsApp conectado: ${result.data.displayPhoneNumber || result.data.phoneNumberId}.`);
        setIsWorking(false);
        router.refresh();
    }, [router]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (!allowedMetaOrigins.has(event.origin)) return;

            let payload: unknown = event.data;
            if (typeof payload === "string") {
                try {
                    payload = JSON.parse(payload);
                } catch {
                    return;
                }
            }

            if (!payload || typeof payload !== "object") return;
            const data = payload as {
                type?: string;
                event?: string;
                data?: { waba_id?: string };
            };
            if (data.type !== "WA_EMBEDDED_SIGNUP") return;

            if (data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") {
                const wabaId = data.data?.waba_id;
                if (wabaId && /^\d+$/.test(wabaId)) {
                    wabaIdRef.current = wabaId;
                    void finishConnection();
                }
                return;
            }

            if (data.event === "CANCEL" || data.event === "ERROR") {
                setIsWorking(false);
                setIsError(data.event === "ERROR");
                setMessage(data.event === "ERROR"
                    ? "Meta informó un error durante la conexión. Revisá la configuración y volvé a intentar."
                    : "La conexión fue cancelada; no se modificó el WhatsApp activo.");
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [finishConnection]);

    const connect = () => {
        if (!window.FB || !configId || !sdkReady) return;
        codeRef.current = null;
        wabaIdRef.current = null;
        submissionStartedRef.current = false;
        setIsWorking(true);
        setIsError(false);
        setMessage("Completá el asistente de Meta para conectar el número existente.");

        window.FB.login((response) => {
            const code = response.authResponse?.code;
            if (!code) {
                setIsWorking(false);
                setIsError(response.status !== "unknown");
                setMessage("Meta no entregó la autorización. Si cerraste la ventana, podés volver a intentar.");
                return;
            }
            codeRef.current = code;
            void finishConnection();
        }, {
            config_id: configId,
            response_type: "code",
            override_default_response_type: true,
            extras: {
                setup: {},
                featureType: "whatsapp_business_app_onboarding",
                sessionInfoVersion: "3",
            },
        });
    };

    const disconnect = async () => {
        if (!window.confirm("¿Desactivar este número en Hekademos? El WhatsApp Business del teléfono seguirá funcionando.")) return;
        setIsWorking(true);
        setIsError(false);
        const result = await disconnectManagedWhatsApp();
        setIsWorking(false);
        setIsError(!result.ok);
        setMessage(result.ok
            ? "La conexión guardada se desactivó. Hekademos volverá a usar las credenciales del entorno."
            : result.error);
        if (result.ok) router.refresh();
    };

    const configured = Boolean(appId && configId && serverConfigured);

    return (
        <section className="whatsapp-integration">
            <Script
                src="https://connect.facebook.net/es_LA/sdk.js"
                strategy="afterInteractive"
                onLoad={initializeSdk}
                onReady={initializeSdk}
            />

            <header className="whatsapp-integration-header">
                <div className="whatsapp-integration-icon"><FaWhatsapp /></div>
                <div>
                    <h1>WhatsApp Business</h1>
                    <p>Conectá un número existente mediante el modo de coexistencia oficial de Meta.</p>
                </div>
            </header>

            <div className="whatsapp-integration-grid">
                <article className="whatsapp-integration-card">
                    <h2>Conexión activa</h2>
                    {integration ? (
                        <dl>
                            <div><dt>Cuenta</dt><dd>{integration.verifiedName || "Sin nombre verificado"}</dd></div>
                            <div><dt>Número</dt><dd>{integration.displayPhoneNumber || "No informado por Meta"}</dd></div>
                            <div><dt>Phone Number ID</dt><dd>{integration.phoneNumberId}</dd></div>
                            <div><dt>WABA ID</dt><dd>{integration.wabaId}</dd></div>
                            <div><dt>Token</dt><dd>{integration.tokenExpiresAt ? "Con vencimiento informado" : "Sin vencimiento informado"}</dd></div>
                        </dl>
                    ) : (
                        <p className="whatsapp-integration-empty">
                            Todavía no hay un número conectado desde este panel. Los envíos siguen usando las variables actuales de Vercel.
                        </p>
                    )}
                </article>

                <article className="whatsapp-integration-card">
                    <h2>{integration ? "Cambiar número" : "Conectar número"}</h2>
                    <ol>
                        <li>Abrí el asistente e iniciá sesión con el administrador del negocio de So Ham.</li>
                        <li>Elegí conectar la cuenta de WhatsApp Business existente.</li>
                        <li>Confirmá el enlace desde la app del teléfono cuando Meta lo solicite.</li>
                    </ol>
                    {!configured && (
                        <p className="whatsapp-integration-warning">
                            La configuración de Embedded Signup todavía está incompleta en Vercel.
                        </p>
                    )}
                    <div className="whatsapp-integration-actions">
                        <button type="button" onClick={connect} disabled={!configured || !sdkReady || isWorking}>
                            <FaWhatsapp /> {isWorking ? "Procesando…" : integration ? "Conectar otro número" : "Conectar con Meta"}
                        </button>
                        {integration && (
                            <button className="secondary" type="button" onClick={disconnect} disabled={isWorking}>
                                Desactivar conexión
                            </button>
                        )}
                    </div>
                    {message && <p className={isError ? "whatsapp-integration-error" : "whatsapp-integration-message"}>{message}</p>}
                </article>
            </div>

            <aside className="whatsapp-integration-note">
                <strong>Importante:</strong> este flujo no borra la cuenta ni los chats del teléfono. No uses la opción directa “Agregar número” de Configuración de la API, porque esa pantalla inicia una migración.
            </aside>
        </section>
    );
};
