export type Exercise = {
    id: string;
    name: string;
    videoUrl: string;
    youtubeVideoId?: string;
    thumbnailUrl?: string;
    publishedAt?: string;
    isShort?: boolean;
    syncedAt?: string;
}

export type ShortItem = {
    title: string;
    url: string;
}

export type YouTubeShort = {
    title: string;
    url: string;
    videoId: string;
    thumbnail: string;
    publishedAt: string;
}

export type YouTubeVideoSnippet = {
    title: string;
    description?: string; // Hacer opcional para evitar errores
    publishedAt: string;
    thumbnails: {
        default: { url: string; width?: number; height?: number };
        medium?: { url: string; width?: number; height?: number };
        high?: { url: string; width?: number; height?: number };
    };
    channelId: string;
    channelTitle: string;
}

export type YouTubeContentDetails = {
    duration: string;
    dimension?: string;
    definition?: string;
    caption?: string;
}

// UNIFICADO: Solo una definición de YouTubeSearchItem
export type YouTubeSearchItem = {
    id: {
        kind: string;
        videoId: string;
    };
    snippet: YouTubeVideoSnippet;
}

export type YouTubeVideoItem = {
    id: string;
    snippet: YouTubeVideoSnippet;
    contentDetails: YouTubeContentDetails;
}

export type YouTubeSearchResponse = {
    items: YouTubeSearchItem[];
    nextPageToken?: string;
    prevPageToken?: string;
    pageInfo: {
        totalResults: number;
        resultsPerPage: number;
    };
}

export type YouTubeVideosResponse = {
    items: YouTubeVideoItem[];
}

export type User = {
    id: string;
    email: string;
    name?: string;
    image?: string;
    rutine?: string;
    authorities: 'USER' | 'ADMIN';
};

export type JwtPayload = {
    sub: string;
    name?: string;
    exp?: number;
    picture?: string;
    [key: string]: unknown
};

export type ApiResponse<T> = {
    data: T;
    message: string;
    success: boolean;
}