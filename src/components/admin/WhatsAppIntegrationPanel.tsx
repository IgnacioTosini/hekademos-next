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

type RecentMessage = {
    messageId: string;
    kind: string | null;
    referenceId: string | null;
    status: string;
    statusAt: string | null;
    acceptedAt: string | null;
    errorCode: number | null;
    errorText: string | null;
};

const deliveryLabels: Record<string, string> = {
    ACCEPTED: "Aceptado por Meta",
    SENT: "Enviado",
    DELIVERED: "Entregado",
    READ: "Leído",
    FAILED: "Falló la entrega",
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
    recentMessages,
}: {
    appId: string | null;
    configId: string | null;
    serverConfigured: boolean;
    apiVersion: string;
    integration: IntegrationSummary | null;
    recentMessages: RecentMessage[];
}) => {
    const router = useRouter();
    const [sdkReady, setSdkReady] = useState(false);
    const [isWorking, setIsWorking] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [isError, setIsError] = useState(false);
    const codeRef = useRef<string | null>(null);
    const wabaIdRef = useRef<string | null>(null);
    const submissionStartedRef = useRef(false);
    const workingIndicatorRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!isWorking || !workingIndicatorRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let cancelled = false;
        let cleanup: (() => void) | undefined;
        void import("@/animations/gsapConfig").then(({ gsap }) => {
            if (cancelled || !workingIndicatorRef.current) return;
            const context = gsap.context(() => {
                gsap.to(workingIndicatorRef.current, { rotation: 360, duration: .8, ease: "none", repeat: -1 });
            });
            cleanup = () => context.revert();
        });
        return () => { cancelled = true; cleanup?.(); };
    }, [isWorking]);

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
        setIsError(!result.ok);
        setMessage(result.ok
            ? "La conexión guardada se desactivó. Hekademos volverá a usar las credenciales del entorno."
            : result.error);
        if (result.ok) router.refresh();
        setIsWorking(false);
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
                    <span className="whatsapp-integration-eyebrow">CANAL DE MENSAJERÍA</span>
                    <h1>WhatsApp Business</h1>
                    <p>Conectá un número existente mediante el modo de coexistencia oficial de Meta.</p>
                </div>
            </header>

            <div className="whatsapp-integration-grid">
                <article className="whatsapp-integration-card whatsapp-integration-status">
                    <div className="whatsapp-integration-card-heading">
                        <div><span className="whatsapp-integration-eyebrow">ESTADO ACTUAL</span><h2>Conexión</h2></div>
                        <span className={`whatsapp-integration-badge ${integration ? "connected" : "inactive"}`}>
                            <span aria-hidden="true" />{integration ? "Conectado" : "Sin conexión en el panel"}
                        </span>
                    </div>
                    {integration ? (
                        <>
                            <p className="whatsapp-integration-number">{integration.displayPhoneNumber || "Número no informado por Meta"}</p>
                            <p className="whatsapp-integration-account">{integration.verifiedName || "Cuenta sin nombre verificado"}</p>
                            <details className="whatsapp-integration-details">
                                <summary>Ver datos técnicos</summary>
                                <dl>
                                    <div><dt>Phone Number ID</dt><dd>{integration.phoneNumberId}</dd></div>
                                    <div><dt>WABA ID</dt><dd>{integration.wabaId}</dd></div>
                                    <div><dt>Token</dt><dd>{integration.tokenExpiresAt ? "Con vencimiento informado" : "Sin vencimiento informado"}</dd></div>
                                </dl>
                            </details>
                        </>
                    ) : (
                        <p className="whatsapp-integration-empty">
                            Todavía no hay un número conectado desde este panel. Los envíos siguen usando las variables actuales de Vercel.
                        </p>
                    )}
                    <div className={`whatsapp-integration-config ${configured ? "ready" : "missing"}`}>
                        <span aria-hidden="true" className="whatsapp-integration-config-dot" />
                        <span>{configured ? "Configuración de Meta lista para conectar" : "Falta completar la configuración de Meta en Vercel"}</span>
                    </div>
                </article>

                <article className="whatsapp-integration-card whatsapp-integration-setup">
                    <span className="whatsapp-integration-eyebrow">CONFIGURACIÓN GUIADA</span>
                    <h2>{integration ? "Conectar otro número" : "Conectar un número"}</h2>
                    <ol className="whatsapp-integration-steps">
                        <li><span className="whatsapp-integration-step-number">01</span><span>Abrí el asistente de Meta e iniciá sesión con la cuenta administradora de Hekademos.</span></li>
                        <li><span className="whatsapp-integration-step-number">02</span><span>Elegí la cuenta de WhatsApp Business que ya usás.</span></li>
                        <li><span className="whatsapp-integration-step-number">03</span><span>Confirmá el enlace desde la aplicación del teléfono cuando Meta lo solicite.</span></li>
                    </ol>
                    <div className="whatsapp-integration-actions">
                        <button type="button" onClick={connect} disabled={!configured || !sdkReady || isWorking} aria-busy={isWorking}>
                            <FaWhatsapp /> {integration ? "Conectar otro número" : "Conectar con Meta"}
                        </button>
                    </div>
                    {isWorking && <p className="whatsapp-integration-progress" role="status"><span ref={workingIndicatorRef} className="whatsapp-integration-spinner" aria-hidden="true" />{message || "Procesando conexión…"}</p>}
                    {!isWorking && message && <p className={`whatsapp-integration-feedback ${isError ? "error" : "success"}`} role={isError ? "alert" : "status"}>{message}</p>}
                    {integration && <div className="whatsapp-integration-danger"><p>Si desactivás la conexión, Hekademos volverá a usar las credenciales del entorno.</p><button className="secondary" type="button" onClick={disconnect} disabled={isWorking}>Desactivar conexión</button></div>}
                </article>
            </div>

            <aside className="whatsapp-integration-note">
                <strong>Importante:</strong> este flujo no borra la cuenta ni los chats del teléfono. No uses la opción directa “Agregar número” de Configuración de la API, porque esa pantalla inicia una migración.
            </aside>
            <section className="whatsapp-integration-deliveries" aria-labelledby="whatsapp-deliveries-title">
                <div className="whatsapp-integration-deliveries-heading">
                    <div>
                        <span className="whatsapp-integration-eyebrow">SEGUIMIENTO</span>
                        <h2 id="whatsapp-deliveries-title">Entregas recientes</h2>
                    </div>
                    <button type="button" onClick={() => router.refresh()}>Actualizar estados</button>
                </div>
                <p>«Aceptado por Meta» confirma la recepción por la API. «Entregado» confirma la llegada al dispositivo según el webhook.</p>
                {recentMessages.length === 0 ? <p>Todavía no hay mensajes registrados.</p> : (
                    <div className="whatsapp-integration-delivery-list">
                        {recentMessages.map((message) => (
                            <article className="whatsapp-integration-delivery" key={message.messageId}>
                                <div>
                                    <strong>{message.kind === "PAYMENT_REMINDER" ? "Recordatorio de cuota" : "Cambio de horario"}</strong>
                                    <small>{message.referenceId ? `Referencia ${message.referenceId}` : message.messageId}</small>
                                </div>
                                <div>
                                    <span className={`whatsapp-integration-delivery-status ${message.status.toLowerCase()}`}>
                                        {deliveryLabels[message.status] ?? message.status}
                                    </span>
                                    <small>{message.statusAt || message.acceptedAt
                                        ? new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" })
                                            .format(new Date(message.statusAt ?? message.acceptedAt!))
                                        : "Sin fecha informada"}</small>
                                    {message.status === "FAILED" && (message.errorCode || message.errorText) && (
                                        <small>{message.errorCode ? `Error ${message.errorCode}: ` : ""}{message.errorText}</small>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </section>
    );
};
