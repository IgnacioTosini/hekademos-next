"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { FaPencilAlt } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { updateCoachProfile } from "@/app/actions/profile.actions";
import { isValidOptionalPhone } from "@/lib/form-validation";
import type { UserImage } from "@/types/schema/users";
import { saveWithResolvedUserImage, UserImageField, type UserImageValue } from "@/components/admin/users";
import "@/components/admin/users/userForm/_userForm.scss";
import "./_coachProfileEditor.scss";

export type CoachProfileEditorAccount = {
    email: string;
    name: string | null;
    phone: string | null;
    bio: string | null;
    specialty: string | null;
    instagram: string | null;
    image?: UserImage | null;
};

type Props = {
    account: CoachProfileEditorAccount;
};

type FormState = {
    email: string;
    name: string;
    phone: string;
    bio: string;
    specialty: string;
    instagram: string;
};

const getInitialState = (account: CoachProfileEditorAccount): FormState => ({
    email: account.email,
    name: account.name ?? "",
    phone: account.phone ?? "",
    bio: account.bio ?? "",
    specialty: account.specialty ?? "",
    instagram: account.instagram ?? "",
});

export const CoachProfileEditor = ({ account }: Props) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState<FormState>(() => getInitialState(account));
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
        setForm(getInitialState(account));
        setImage(undefined);
        setError("");
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        if (!form.email.trim()) {
            setError("El email es obligatorio.");
            return;
        }

        if (!isValidOptionalPhone(form.phone)) {
            setError("Revisá el teléfono: usá solo números, espacios, +, - o paréntesis.");
            return;
        }

        startTransition(async () => {
            try {
                const { result, previousImageDeleteFailed } = await saveWithResolvedUserImage({
                    image,
                    previousImagePublicId: account.image?.publicId,
                    save: (resolvedImage) => updateCoachProfile({
                        email: form.email,
                        name: form.name || null,
                        phone: form.phone || null,
                        bio: form.bio || null,
                        specialty: form.specialty || null,
                        instagram: form.instagram || null,
                        image: resolvedImage,
                    }),
                });

                if (result.ok) {
                    if (previousImageDeleteFailed) {
                        toast.warning("Perfil guardado, pero no se pudo borrar la imagen anterior de Cloudinary");
                    }

                    toast.success("Cuenta actualizada");
                    router.refresh();
                    setIsOpen(false);
                    return;
                }

                setError(result.error);
                toast.error(result.error);
            } catch (error) {
                const message = error instanceof Error ? error.message : "No se pudo guardar la cuenta";
                setError(message);
                toast.error(message);
            }
        });
    };

    return (
        <>
            <button className="coach-profile-edit-button" type="button" onClick={() => setIsOpen(true)}>
                <FaPencilAlt />
                Mi cuenta
            </button>

            {isOpen && (
                <div className="coach-profile-editor-container">
                    <div className="coach-profile-editor-modal">
                        <div className="coach-profile-editor-header">
                            <div>
                                <h2>Mi cuenta</h2>
                                <p>Actualizá tus datos visibles y tu información profesional.</p>
                            </div>

                            <button type="button" onClick={closeModal} aria-label="Cerrar">
                                <IoMdClose />
                            </button>
                        </div>

                        <form className="user-form coach-profile-editor-form" onSubmit={handleSubmit}>
                            <UserImageField
                                id="coach-profile-image"
                                label="Foto de perfil"
                                existingImage={account.image}
                                value={image}
                                onChange={setImage}
                                disabled={isPending}
                            />

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="coach-profile-name">Nombre</label>
                                    <input
                                        id="coach-profile-name"
                                        value={form.name}
                                        onChange={(event) => updateField("name", event.target.value)}
                                        placeholder="Nombre visible"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="coach-profile-email">Email</label>
                                    <input
                                        id="coach-profile-email"
                                        type="email"
                                        value={form.email}
                                        onChange={(event) => updateField("email", event.target.value)}
                                        placeholder="coach@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="coach-profile-phone">Telefono</label>
                                    <input
                                        id="coach-profile-phone"
                                        inputMode="tel"
                                        value={form.phone}
                                        onChange={(event) => updateField("phone", event.target.value)}
                                        placeholder="11 5555-5555"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="coach-profile-instagram">Instagram</label>
                                    <input
                                        id="coach-profile-instagram"
                                        value={form.instagram}
                                        onChange={(event) => updateField("instagram", event.target.value)}
                                        placeholder="@usuario"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="coach-profile-specialty">Especialidad</label>
                                <input
                                    id="coach-profile-specialty"
                                    value={form.specialty}
                                    onChange={(event) => updateField("specialty", event.target.value)}
                                    placeholder="Entrenamiento funcional, fuerza, movilidad..."
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="coach-profile-bio">Bio</label>
                                <textarea
                                    id="coach-profile-bio"
                                    value={form.bio}
                                    onChange={(event) => updateField("bio", event.target.value)}
                                    placeholder="Descripcion breve para el perfil del coach"
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
