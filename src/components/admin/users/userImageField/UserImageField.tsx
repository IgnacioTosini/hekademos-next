'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { deleteImage, uploadImage, type UploadedImage } from '@/lib/client-cloudinary';
import type { UserImage } from '@/types/schema/users';
import { ImageCropModal } from '../imageCropModal/ImageCropModal';
import '../userForm/_userForm.scss';

export type PendingUserImage = {
    type: 'pending';
    file: File;
    previewUrl: string;
};

export type UserImageValue = UploadedImage | PendingUserImage | null | undefined;

export const isPendingUserImage = (image: UserImageValue): image is PendingUserImage => (
    image !== null && image !== undefined && typeof image === 'object' && 'type' in image && image.type === 'pending'
);

export const isUploadedUserImage = (image: UserImageValue): image is UploadedImage => (
    image !== null && image !== undefined && typeof image === 'object' && 'publicId' in image
);

export const resolveUserImageValue = async (image: UserImageValue) => {
    if (isPendingUserImage(image)) {
        const uploadedImage = await uploadImage(image.file);

        return {
            image: uploadedImage,
            uploadedImage,
        };
    }

    return {
        image,
        uploadedImage: null,
    };
};

type SaveWithResolvedUserImageParams<Result extends { ok: boolean }> = {
    image: UserImageValue;
    previousImagePublicId?: string | null;
    save: (image: UploadedImage | null | undefined) => Promise<Result>;
};

export const saveWithResolvedUserImage = async <Result extends { ok: boolean }>({
    image,
    previousImagePublicId,
    save,
}: SaveWithResolvedUserImageParams<Result>) => {
    let uploadedImage: UploadedImage | null = null;
    const resolvedImage = await resolveUserImageValue(image);
    uploadedImage = resolvedImage.uploadedImage;

    try {
        const result = await save(resolvedImage.image);

        if (!result.ok) {
            if (uploadedImage) {
                await deleteImage(uploadedImage.publicId).catch(() => undefined);
            }

            return {
                result,
                previousImageDeleteFailed: false,
            };
        }

        const shouldDeletePreviousImage = Boolean(
            previousImagePublicId
            && (resolvedImage.image === null || isUploadedUserImage(resolvedImage.image))
        );

        let previousImageDeleteFailed = false;

        if (shouldDeletePreviousImage && previousImagePublicId) {
            try {
                await deleteImage(previousImagePublicId);
            } catch {
                previousImageDeleteFailed = true;
            }
        }

        return {
            result,
            previousImageDeleteFailed,
        };
    } catch (error) {
        if (uploadedImage) {
            await deleteImage(uploadedImage.publicId).catch(() => undefined);
        }

        throw error;
    }
};

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
    if (isPendingUserImage(value)) return value.previewUrl;
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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const previewUrl = getPreviewUrl(value, existingImage);

    useEffect(() => () => {
        if (isPendingUserImage(value)) {
            URL.revokeObjectURL(value.previewUrl);
        }
    }, [value]);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;
        setSelectedFile(file);
    };

    const handleConfirmCrop = (file: File) => {
        if (isPendingUserImage(value)) {
            URL.revokeObjectURL(value.previewUrl);
        }

        onChange({
            type: 'pending',
            file,
            previewUrl: URL.createObjectURL(file),
        });
        setSelectedFile(null);
        toast.info('Imagen lista. Guardá los cambios para aplicarla.');
    };

    const handleRemove = () => {
        if (isPendingUserImage(value)) {
            URL.revokeObjectURL(value.previewUrl);
        }

        onChange(null);
    };

    return (
        <>
            <div className="form-group image-field">
                <label htmlFor={id}>{label}</label>
                <div className="image-field-control">
                    <div className="image-field-preview">
                        {previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={previewUrl} alt={label} />
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
                            disabled={disabled}
                        />
                        {previewUrl && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                disabled={disabled}
                            >
                                Quitar imagen
                            </button>
                        )}
                        {value && (
                            <p className="image-field-helper">Guardá los cambios para aplicar esta imagen.</p>
                        )}
                    </div>
                </div>
            </div>

            <ImageCropModal
                file={selectedFile}
                isOpen={Boolean(selectedFile)}
                onCancel={() => setSelectedFile(null)}
                onConfirm={handleConfirmCrop}
            />
        </>
    );
};
