"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { FaPencilAlt } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { toast } from "react-toastify";
import { updateStudentProfile } from "@/app/actions/profile.actions";
import { saveWithResolvedUserImage, UserImageField, type UserImageValue } from "@/components/admin/users";
import { isValidBirthDate, isValidOptionalPhone } from "@/lib/form-validation";
import type { AdminStudentProfile } from "@/types/schema/users";
import { toDateInputValue } from "@/utils/date";
import "@/components/admin/users/userForm/_userForm.scss";
import "./_studentProfileEditor.scss";

type Props = {
    student: AdminStudentProfile;
};

type FormState = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthDate: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
};

const getInitialState = (student: AdminStudentProfile): FormState => ({
    firstName: student.firstName ?? "",
    lastName: student.lastName ?? "",
    email: student.user.email,
    phone: student.user.phone ?? "",
    birthDate: toDateInputValue(student.birthDate),
    emergencyContactName: student.emergencyContactName ?? "",
    emergencyContactPhone: student.emergencyContactPhone ?? "",
});

export const StudentProfileEditor = ({ student }: Props) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState<FormState>(() => getInitialState(student));
    const [image, setImage] = useState<UserImageValue>(undefined);
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    const updateField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const closeModal = () => {
        setIsOpen(false);
        setError("");
        setForm(getInitialState(student));
        setImage(undefined);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        if (!form.email.trim()) {
            setError("El email es obligatorio.");
            return;
        }

        if (!isValidOptionalPhone(form.phone) || !isValidOptionalPhone(form.emergencyContactPhone)) {
            setError("Revisá los teléfonos: usá solo números, espacios, +, - o paréntesis.");
            return;
        }

        if (!isValidBirthDate(form.birthDate)) {
            setError("La fecha de nacimiento no parece válida.");
            return;
        }

        startTransition(async () => {
            try {
                const { result, previousImageDeleteFailed } = await saveWithResolvedUserImage({
                    image,
                    previousImagePublicId: student.user.image?.publicId,
                    save: (resolvedImage) => updateStudentProfile({
                        email: form.email,
                        phone: form.phone || null,
                        firstName: form.firstName || null,
                        lastName: form.lastName || null,
                        birthDate: form.birthDate || null,
                        emergencyContactName: form.emergencyContactName || null,
                        emergencyContactPhone: form.emergencyContactPhone || null,
                        image: resolvedImage,
                    }),
                });

                if (result.ok) {
                    if (previousImageDeleteFailed) {
                        toast.warning("Perfil guardado, pero no se pudo borrar la imagen anterior de Cloudinary");
                    }

                    toast.success("Perfil actualizado");
                    router.refresh();
                    setIsOpen(false);
                    return;
                }

                setError(result.error);
                toast.error(result.error);
            } catch (error) {
                const message = error instanceof Error ? error.message : "No se pudo guardar el perfil";
                setError(message);
                toast.error(message);
            }
        });
    };

    return (
        <>
            <button className="student-profile-edit-button" type="button" onClick={() => setIsOpen(true)}>
                <FaPencilAlt />
                Editar perfil
            </button>

            {isOpen && (
                <div className="student-profile-editor-container">
                    <div className="student-profile-editor-modal">
                        <div className="student-profile-editor-header">
                            <div>
                                <h2>Editar perfil</h2>
                                <p>Actualizá tus datos personales y tu foto de perfil.</p>
                            </div>

                            <button type="button" onClick={closeModal} aria-label="Cerrar">
                                <IoMdClose />
                            </button>
                        </div>

                        <form className="user-form student-profile-editor-form" onSubmit={handleSubmit}>
                            <UserImageField
                                id="student-profile-image"
                                label="Foto de perfil"
                                existingImage={student.user.image}
                                value={image}
                                onChange={setImage}
                                disabled={isPending}
                            />

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="profile-first-name">Nombre</label>
                                    <input
                                        id="profile-first-name"
                                        value={form.firstName}
                                        onChange={(event) => updateField("firstName", event.target.value)}
                                        placeholder="Nombre"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="profile-last-name">Apellido</label>
                                    <input
                                        id="profile-last-name"
                                        value={form.lastName}
                                        onChange={(event) => updateField("lastName", event.target.value)}
                                        placeholder="Apellido"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="profile-email">Email</label>
                                    <input
                                        id="profile-email"
                                        type="email"
                                        value={form.email}
                                        onChange={(event) => updateField("email", event.target.value)}
                                        placeholder="alumno@email.com"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="profile-phone">Telefono</label>
                                    <input
                                        id="profile-phone"
                                        inputMode="tel"
                                        value={form.phone}
                                        onChange={(event) => updateField("phone", event.target.value)}
                                        placeholder="11 5555-5555"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="profile-birth-date">Nacimiento</label>
                                    <input
                                        id="profile-birth-date"
                                        type="date"
                                        value={form.birthDate}
                                        onChange={(event) => updateField("birthDate", event.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="profile-emergency-phone">Telefono emergencia</label>
                                    <input
                                        id="profile-emergency-phone"
                                        inputMode="tel"
                                        value={form.emergencyContactPhone}
                                        onChange={(event) => updateField("emergencyContactPhone", event.target.value)}
                                        placeholder="11 5555-5555"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="profile-emergency-name">Contacto de emergencia</label>
                                <input
                                    id="profile-emergency-name"
                                    value={form.emergencyContactName}
                                    onChange={(event) => updateField("emergencyContactName", event.target.value)}
                                    placeholder="Nombre del contacto"
                                />
                            </div>

                            {error && <p className="form-error">{error}</p>}

                            <div className="button-group">
                                <button className="cancel-button" type="button" onClick={closeModal} disabled={isPending}>
                                    Cancelar
                                </button>
                                <button className="submit-button" type="submit" disabled={isPending}>
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
