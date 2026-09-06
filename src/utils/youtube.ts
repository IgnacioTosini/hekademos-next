const youtubeHosts = new Set(["youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com"]);

export const getYoutubeVideoId = (value?: string | null) => {
    if (!value?.trim()) return null;

    try {
        const url = new URL(value);
        const host = url.hostname.toLowerCase().replace(/^www\./, "");
        if (!youtubeHosts.has(host)) return null;

        let videoId = host === "youtu.be"
            ? url.pathname.split("/").filter(Boolean)[0]
            : url.searchParams.get("v");

        if (!videoId) {
            const parts = url.pathname.split("/").filter(Boolean);
            const videoMarker = parts.findIndex((part) => ["embed", "shorts", "live"].includes(part));
            videoId = videoMarker >= 0 ? parts[videoMarker + 1] : null;
        }

        return videoId && /^[a-zA-Z0-9_-]{6,20}$/.test(videoId) ? videoId : null;
    } catch {
        return null;
    }
};

export const isValidYoutubeUrl = (value?: string | null) => Boolean(getYoutubeVideoId(value));
