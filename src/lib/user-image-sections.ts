export const userImageSections = ['usuarios', 'alumnos', 'profesores'] as const;

export type UserImageSection = typeof userImageSections[number];

export const isUserImageSection = (value: unknown): value is UserImageSection =>
    typeof value === 'string' && userImageSections.some((section) => section === value);
