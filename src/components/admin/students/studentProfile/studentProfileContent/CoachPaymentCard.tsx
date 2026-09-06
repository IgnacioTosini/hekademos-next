"use client";

import { useState } from "react";
import { FaCheck, FaExternalLinkAlt, FaRegCopy, FaWhatsapp } from "react-icons/fa";
import { MdOutlinePayments } from "react-icons/md";
import { buildWhatsappUrl } from "@/utils/whatsapp";

type Props = {
    coachName: string;
    coachPhone: string | null;
    studentName: string;
    paymentAlias: string | null;
    paymentAccountHolder: string | null;
    amountLabel: string;
    paymentPeriodLabel: string;
    hasActiveMembership: boolean;
    isCurrentPaymentPaid: boolean;
    allowPaymentReport: boolean;
};

type CopyState = "idle" | "alias" | "details" | "error";

const mercadoPagoUrl = "https://www.mercadopago.com.ar/";

export const CoachPaymentCard = ({
    coachName,
    coachPhone,
    studentName,
    paymentAlias,
    paymentAccountHolder,
    amountLabel,
    paymentPeriodLabel,
    hasActiveMembership,
    isCurrentPaymentPaid,
    allowPaymentReport,
}: Props) => {
    const [copyState, setCopyState] = useState<CopyState>("idle");

    const copyText = async (value: string, successState: "alias" | "details") => {
        try {
            await navigator.clipboard.writeText(value);
            setCopyState(successState);
            window.setTimeout(() => setCopyState("idle"), 1800);
        } catch {
            setCopyState("error");
        }
    };

    const copyAlias = () => {
        if (!paymentAlias) return;

        void copyText(paymentAlias, "alias");
    };

    const copyPaymentDetails = () => {
        if (!paymentAlias || !paymentAccountHolder || !hasActiveMembership) return;

        void copyText([
            `Titular: ${paymentAccountHolder}`,
            `Alias: ${paymentAlias}`,
            `Importe: ${amountLabel}`,
        ].join("\n"), "details");
    };

    const canCopyPaymentDetails = Boolean(paymentAlias && paymentAccountHolder && hasActiveMembership);
    const canStartTransfer = Boolean(
        paymentAlias
        && paymentAccountHolder
        && hasActiveMembership
        && !isCurrentPaymentPaid
    );
    const availabilityLabel = isCurrentPaymentPaid
        ? "Cuota registrada"
        : canStartTransfer
            ? "Transferencia disponible"
            : "Datos incompletos";
    const paymentHelper = isCurrentPaymentPaid
        ? "El pago de este mes ya figura registrado."
        : canStartTransfer
            ? "El alias se copiará y se abrirá Mercado Pago. Elegí Transferir y verificá el titular y el importe antes de confirmar."
            : "El coach debe cargar el alias y el titular para habilitar la transferencia.";

    const paymentButtonLabel = !hasActiveMembership
        ? "Sin cuota disponible"
        : isCurrentPaymentPaid
            ? "Cuota del mes registrada"
            : `Transferir ${amountLabel}`;
    const paymentReportMessage = [
        `Hola ${coachName}, soy ${studentName}.`,
        `Te aviso que realicé la transferencia de ${amountLabel} correspondiente a la cuota de ${paymentPeriodLabel}.`,
        "¿Podés verificar el ingreso y marcar mi cuota como pagada en Hekademos? Gracias.",
    ].join("\n\n");
    const coachWhatsappUrl = buildWhatsappUrl(coachPhone, paymentReportMessage);
    const canReportPayment = Boolean(
        allowPaymentReport
        && coachWhatsappUrl
        && hasActiveMembership
        && !isCurrentPaymentPaid
    );

    return (
        <article className="student-profile-card student-profile-payment-method-card">
            <div className="student-profile-payment-method-heading">
                <div>
                    <span className="student-profile-payment-eyebrow">Transferencia</span>
                    <h2>Datos para el pago</h2>
                </div>
                <MdOutlinePayments aria-hidden="true" />
            </div>

            <dl className="student-profile-payment-details">
                <div>
                    <dt>Coach</dt>
                    <dd>{coachName}</dd>
                </div>
                <div>
                    <dt>Titular</dt>
                    <dd>{paymentAccountHolder || "Pendiente de cargar"}</dd>
                </div>
                <div>
                    <dt>Alias</dt>
                    <dd className="student-profile-payment-alias">
                        <span>{paymentAlias || "Pendiente de cargar"}</span>
                        {paymentAlias && (
                            <button type="button" onClick={copyAlias} aria-label="Copiar alias de pago">
                                {copyState === "alias" ? <FaCheck /> : <FaRegCopy />}
                                {copyState === "alias" ? "Copiado" : "Copiar"}
                            </button>
                        )}
                    </dd>
                </div>
                <div>
                    <dt>Cuota actual</dt>
                    <dd>{amountLabel}</dd>
                </div>
            </dl>

            {copyState === "error" && (
                <p className="student-profile-payment-copy-error">
                    No se pudo copiar automáticamente. Seleccioná el alias y copialo manualmente.
                </p>
            )}

            {!paymentAlias && (
                <p className="student-profile-payment-missing">
                    El coach todavía no cargó sus datos de cobro.
                </p>
            )}

            <button
                className="student-profile-copy-payment-details"
                type="button"
                onClick={copyPaymentDetails}
                disabled={!canCopyPaymentDetails}
            >
                {copyState === "details" ? <FaCheck /> : <FaRegCopy />}
                {copyState === "details" ? "Datos copiados" : "Copiar datos de pago"}
            </button>

            <div className="student-profile-mercado-pago-preview">
                <span>{availabilityLabel}</span>
                {canStartTransfer && paymentAlias ? (
                    <a
                        href={mercadoPagoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => void copyText(paymentAlias, "alias")}
                    >
                        <MdOutlinePayments aria-hidden="true" />
                        Copiar alias y abrir Mercado Pago
                        <FaExternalLinkAlt aria-hidden="true" />
                    </a>
                ) : (
                    <button type="button" disabled aria-disabled="true">
                        <MdOutlinePayments aria-hidden="true" />
                        {paymentButtonLabel}
                    </button>
                )}
                <small>{paymentHelper}</small>
            </div>

            {allowPaymentReport && hasActiveMembership && (
                <div className="student-profile-payment-report">
                    <div>
                        <strong>¿Ya hiciste la transferencia?</strong>
                        <small>El coach verificará el ingreso antes de marcar la cuota como pagada.</small>
                    </div>

                    {canReportPayment && coachWhatsappUrl ? (
                        <a href={coachWhatsappUrl} target="_blank" rel="noopener noreferrer">
                            <FaWhatsapp aria-hidden="true" />
                            Avisar pago por WhatsApp
                        </a>
                    ) : (
                        <button type="button" disabled aria-disabled="true">
                            {isCurrentPaymentPaid ? <FaCheck aria-hidden="true" /> : <FaWhatsapp aria-hidden="true" />}
                            {isCurrentPaymentPaid
                                ? "Pago ya registrado"
                                : "Coach sin WhatsApp válido"}
                        </button>
                    )}

                    {!isCurrentPaymentPaid && !coachWhatsappUrl && (
                        <small className="student-profile-payment-report-warning">
                            El coach debe cargar un celular válido para recibir el aviso.
                        </small>
                    )}
                </div>
            )}
        </article>
    );
};
