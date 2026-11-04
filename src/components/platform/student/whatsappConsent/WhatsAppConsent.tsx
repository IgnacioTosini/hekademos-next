"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { updateStudentWhatsAppConsent } from "@/app/actions/profile.actions";
import { isDeliverableEmail } from "@/lib/form-validation";
import { normalizeWhatsappPhoneNumber } from "@/utils/whatsapp";
import "./_whatsappConsent.scss";

export const WhatsAppConsent = ({
    enabled: initialEnabled, phone, email,
}: {
    enabled: boolean;
    phone: string | null;
    email: string;
}) => {
    const router = useRouter();
    const [enabled, setEnabled] = useState(initialEnabled);
    const [isPending, startTransition] = useTransition();
    const hasPhone = Boolean(normalizeWhatsappPhoneNumber(phone));
    const hasEmail = isDeliverableEmail(email);

    const toggle = () => {
        const next = !enabled;
        startTransition(async () => {
            const result = await updateStudentWhatsAppConsent(next);
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            setEnabled(next);
            toast.success(next ? "Avisos por WhatsApp activados" : "Avisos por WhatsApp desactivados");
            router.refresh();
        });
    };

    return (
        <section className="student-whatsapp-consent" aria-labelledby="student-whatsapp-title">
            <div>
                <span className="student-whatsapp-consent-eyebrow">TUS AVISOS</span>
                <h2 id="student-whatsapp-title">Mensajes por WhatsApp</h2>
                <p>Elegí si Hekademos puede enviarte recordatorios mensuales de pago y confirmaciones de cambios de horario al número de tu perfil.</p>
                <p>{hasEmail
                    ? "Si lo desactivás, recibirás estos avisos por email. Podés cambiar tu elección cuando quieras."
                    : "Si lo desactivás, no hay un email válido para el respaldo. Actualizalo en Editar perfil."}</p>
                <p>Consultá la <Link href="/privacidad">Política de privacidad</Link>.</p>
            </div>
            <button
                type="button"
                className={`student-whatsapp-consent-toggle ${enabled ? "enabled" : ""}`}
                role="switch"
                aria-checked={enabled}
                aria-label="Recibir avisos de Hekademos por WhatsApp"
                onClick={toggle}
                disabled={isPending || (!enabled && !hasPhone)}
            >
                <span aria-hidden="true" />
                {isPending ? "Guardando…" : enabled ? "Activado" : "Desactivado"}
            </button>
            {!hasPhone && <p className="student-whatsapp-consent-hint">Agregá un teléfono válido en Editar perfil para activar WhatsApp.</p>}
        </section>
    );
};
