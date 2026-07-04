const hekademosWhatsappNumber = "5492234268951";

export const buildHekademosWhatsappUrl = (message: string) => (
    `https://wa.me/${hekademosWhatsappNumber}?text=${encodeURIComponent(message)}`
);
