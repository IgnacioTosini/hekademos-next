"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FaPencilAlt } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { toast } from "react-toastify";
import { updateStudentRoutine } from "@/app/actions/profile.actions";
import { isValidOptionalUrl } from "@/lib/form-validation";
import "./_studentRoutineEditor.scss";

type Props = {
    routineExcelUrl?: string | null;
};

export const StudentRoutineEditor = ({ routineExcelUrl }: Props) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [routineUrl, setRoutineUrl] = useState(routineExcelUrl ?? "");
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    const closeModal = () => {
        setIsOpen(false);
        setRoutineUrl(routineExcelUrl ?? "");
        setError("");
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        if (!isValidOptionalUrl(routineUrl)) {
            setError("El link de la rutina debe empezar con http:// o https://.");
            return;
        }

        startTransition(async () => {
            const result = await updateStudentRoutine({
                routineExcelUrl: routineUrl || null,
            });

            if (result.ok) {
                toast.success("Rutina actualizada");
                router.refresh();
                setIsOpen(false);
                return;
            }

            setError(result.error);
            toast.error(result.error);
        });
    };

    return (
        <>
            <button className="student-routine-edit-button" type="button" onClick={() => setIsOpen(true)}>
                <FaPencilAlt />
                {routineExcelUrl ? "Editar link" : "Agregar link"}
            </button>

            {isOpen && (
                <div className="student-routine-editor-container">
                    <div className="student-routine-editor-modal">
                        <div className="student-routine-editor-header">
                            <div>
                                <h2>Rutina</h2>
                                <p>Agregá o modificá el enlace de tu rutina.</p>
                            </div>

                            <button type="button" onClick={closeModal} aria-label="Cerrar">
                                <IoMdClose />
                            </button>
                        </div>

                        <form className="student-routine-editor-form" onSubmit={handleSubmit}>
                            <label htmlFor="student-routine-link">Link de rutina / Excel</label>
                            <input
                                id="student-routine-link"
                                type="url"
                                value={routineUrl}
                                onChange={(event) => setRoutineUrl(event.target.value)}
                                placeholder="https://docs.google.com/spreadsheets/..."
                            />
                            <p>Dejalo vacío si querés quitar el enlace actual.</p>

                            {error && <span className="student-routine-editor-error">{error}</span>}

                            <div className="student-routine-editor-actions">
                                <button type="button" onClick={closeModal} disabled={isPending}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isPending}>
                                    {isPending ? "Guardando..." : "Guardar cambios"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};
