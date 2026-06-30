'use client';

import { ChangeEvent, useState } from 'react';
import { toast } from 'react-toastify';
import { deleteImage, uploadImage, type UploadedImage } from '@/lib/client-cloudinary';
import type { UserImage } from '@/types/schema/users';
import Image from 'next/image';
import '../userForm/_userForm.scss';

export type UserImageValue = UploadedImage | null | undefined;

type Props = {
    id: string;
    label?: string;
    existingImage?: UserImage | null;
    value: UserImageValue;
    onChange: (image: UserImageValue) => void;
    disabled?: boolean;
};

const getPreviewUrl = (value: UserImageValue, existingImage?: UserImage | null) => {
    if (value === null) return '';
    if (value) return value.url;

    return existingImage?.url ?? '';
};

export const UserImageField = ({
    id,
    label = 'Imagen',
    existingImage,
    value,
    onChange,
    disabled,
}: Props) => {
    const [isUploading, setIsUploading] = useState(false);
    const previewUrl = getPreviewUrl(value, existingImage);

    const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;

        try {
            setIsUploading(true);

            if (value?.publicId) {
                await deleteImage(value.publicId);
            }

            const uploadedImage = await uploadImage(file);
            onChange(uploadedImage);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo subir la imagen');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = async () => {
        try {
            setIsUploading(true);

            if (value?.publicId) {
                await deleteImage(value.publicId);
            }

            onChange(null);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo quitar la imagen');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="form-group image-field">
            <label htmlFor={id}>{label}</label>
            <div className="image-field-control">
                <div className="image-field-preview">
                    {previewUrl ? (
                        <Image src={previewUrl} alt={label} width={100} height={100} />
                    ) : (
                        <span>Sin imagen</span>
                    )}
                </div>

                <div className="image-field-actions">
                    <input
                        id={id}
                        type="file"
                        accept="image/*"
                        onChange={handleChange}
                        disabled={disabled || isUploading}
                    />
                    {previewUrl && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            disabled={disabled || isUploading}
                        >
                            Quitar imagen
                        </button>
                    )}
                    {isUploading && <p>Subiendo imagen...</p>}
                </div>
            </div>
        </div>
    );
};
