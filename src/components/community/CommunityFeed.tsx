"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { FaComments, FaRegTrashAlt, FaSearch } from "react-icons/fa";
import { GoPencil } from "react-icons/go";
import { MdOutlineLocalOffer } from "react-icons/md";
import { toast } from "react-toastify";
import { createCommunityComment, deleteCommunityComment, getCommunityComments, getCommunityFeed, updateCommunityComment, type CommunityCommentItem, type CommunityFeedData, type CommunityPostItem } from "@/app/actions/community.actions";
import { EmptyState } from "@/components/ui/emptyState/EmptyState";
import { Pagination } from "@/components/ui/pagination/Pagination";
import { YoutubeVideoButton } from "@/components/ui/YoutubeVideoButton";
import { formatCommunityDateTime } from "@/utils/format";
import { getInitials } from "@/utils/strings";
import "./_communityFeed.scss";

type Props = { data: CommunityFeedData; embedded?: boolean };

const getCommentAuthor = (comment: CommunityCommentItem) => {
    if (comment.authorName) return comment.authorName;
    if (comment.coach?.user.name) return comment.coach.user.name;
    if (comment.student) {
        return [comment.student.firstName, comment.student.lastName].filter(Boolean).join(" ")
            || comment.student.user.name
            || "Alumno";
    }
    return comment.authorRole === "ADMIN" ? "Administración" : comment.authorRole === "COACH" ? "Coach" : "Alumno";
};

const getCommentImage = (comment: CommunityCommentItem) => (
    comment.coach?.user.image?.url || comment.student?.user.image?.url || null
);

const getCommentRole = (comment: CommunityCommentItem) => (
    comment.authorRole === "ADMIN" ? "Administración" : comment.authorRole === "COACH" ? "Coach" : "Alumno"
);

const getPostAuthor = (post: CommunityPostItem) => post.authorCoach?.user.name || "Administración";

export const CommunityFeed = ({ data, embedded = false }: Props) => {
    const [isPending, startTransition] = useTransition();
    const [feedData, setFeedData] = useState(data);
    const [activePostId, setActivePostId] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState("Todas");
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [page, setPage] = useState(data.page);
    const [commentPage, setCommentPage] = useState(1);

    const loadCommentPage = async (postId: string, requestedPage: number) => {
        const response = await getCommunityComments(postId, requestedPage);
        if (!response.ok) { toast.error(response.error); return; }
        setFeedData((current) => ({ ...current, posts: current.posts.map((post) => post.id === postId
            ? { ...post, comments: response.data.comments, _count: { comments: response.data.total } }
            : post) }));
        setCommentPage(response.data.page);
    };

    useEffect(() => {
        let isMounted = true;
        let isSyncing = false;

        const synchronize = async () => {
            if (isSyncing || commentPage > 1 || document.visibilityState !== "visible") return;
            isSyncing = true;
            try {
                const response = await getCommunityFeed({ page, query: searchQuery, type: selectedType });
                if (isMounted && response.ok) setFeedData(response.data);
            } catch {
                // Se vuelve a intentar en el siguiente ciclo de sincronización.
            } finally {
                isSyncing = false;
            }
        };

        const timeoutId = window.setTimeout(synchronize, 300);
        const intervalId = window.setInterval(synchronize, 30000);
        return () => {
            isMounted = false;
            window.clearTimeout(timeoutId);
            window.clearInterval(intervalId);
        };
    }, [page, searchQuery, selectedType, commentPage]);

    const submitComment = (event: FormEvent<HTMLFormElement>, postId: string) => {
        event.preventDefault();
        const content = drafts[postId] ?? "";
        setActivePostId(postId);
        startTransition(async () => {
            const result = await createCommunityComment(postId, content);
            if (!result.ok) {
                setActivePostId(null);
                toast.error(result.error);
                return;
            }
            setDrafts((current) => ({ ...current, [postId]: "" }));
            const post = feedData.posts.find((item) => item.id === postId);
            await loadCommentPage(postId, Math.ceil(((post?._count.comments ?? 0) + 1) / 10));
            setActivePostId(null);
            toast.success("Tu aporte fue publicado");
        });
    };

    const beginEditComment = (comment: CommunityCommentItem) => {
        setEditingCommentId(comment.id);
        setEditingContent(comment.content);
    };

    const saveComment = (commentId: string) => {
        startTransition(async () => {
            const result = await updateCommunityComment(commentId, editingContent);
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            setFeedData((current) => ({
                ...current,
                posts: current.posts.map((post) => ({
                    ...post,
                    comments: post.comments.map((comment) => comment.id === commentId ? result.data : comment),
                })),
            }));
            setEditingCommentId(null);
            setEditingContent("");
            toast.success("Tu aporte fue actualizado");
        });
    };

    const removeOwnComment = (commentId: string) => {
        if (!window.confirm("¿Eliminar tu aporte?")) return;
        startTransition(async () => {
            const result = await deleteCommunityComment(commentId);
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            const post = feedData.posts.find((item) => item.comments.some((comment) => comment.id === commentId));
            if (post) await loadCommentPage(post.id, commentPage);
            toast.success("Aporte eliminado");
        });
    };

    const currentPost = feedData.posts.find((post) => post.id === selectedPostId) ?? feedData.posts[0];
    const visiblePosts = currentPost ? [currentPost] : [];

    const selectPost = (postId: string) => {
        setSelectedPostId(postId);
        setCommentPage(1);
        void loadCommentPage(postId, 1);
        if (window.matchMedia("(max-width: 760px)").matches) {
            document.getElementById("community-post-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    return (
        <section className={`community-feed${embedded ? " community-feed-embedded" : ""}`}>
            <header className="community-feed-hero">
                <div>
                    <span className="community-feed-eyebrow">ESPACIO HEKADEMOS</span>
                    <h1>Comunidad<span className="community-feed-title-dot">.</span></h1>
                    <p>Un lugar para compartir preguntas, experiencias y aprendizajes sobre el movimiento.</p>
                </div>
                <div className="community-feed-count" aria-label={`${feedData.totalPosts} publicaciones`}>
                    <strong>{String(feedData.totalPosts).padStart(2, "0")}</strong>
                    <span>{feedData.totalPosts === 1 ? "CONVERSACIÓN" : "CONVERSACIONES"}</span>
                </div>
            </header>

            {feedData.totalPosts > 1 && (
                <div className="community-feed-filters" aria-label="Filtrar publicaciones">
                    <label className="community-feed-search"><FaSearch aria-hidden="true" /><input type="search" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setPage(1); setSelectedPostId(null); setCommentPage(1); }} placeholder="Buscar una publicación..." aria-label="Buscar publicaciones" /></label>
                    <div className="community-feed-type-filters" aria-label="Filtrar por tipo">
                        {["Todas", ...feedData.types].map((type) => <button type="button" key={type} className={selectedType === type ? "is-active" : ""} aria-pressed={selectedType === type} onClick={() => { setSelectedType(type); setPage(1); setSelectedPostId(null); setCommentPage(1); }}>{type}</button>)}
                    </div>
                </div>
            )}

            <div className={`community-feed-browser${feedData.totalPosts > 1 ? " community-feed-browser-has-navigation" : ""}`}>
                {feedData.totalPosts > 1 && (
                    <nav className="community-feed-navigation" aria-label="Publicaciones de la comunidad">
                        <div className="community-feed-navigation-heading"><strong>Publicaciones</strong><span>{feedData.filteredTotal} de {feedData.totalPosts}</span></div>
                        <div className="community-feed-navigation-list">
                            {feedData.posts.map((post) => <button type="button" key={post.id} className={currentPost?.id === post.id ? "is-active" : ""} aria-current={currentPost?.id === post.id ? "true" : undefined} onClick={() => selectPost(post.id)}><span>{post.type} · {formatCommunityDateTime(post.createdAt)}</span><strong>{post.title}</strong><small><FaComments aria-hidden="true" /> {post._count.comments} {post._count.comments === 1 ? "aporte" : "aportes"}</small></button>)}
                            {feedData.filteredTotal === 0 && <p>No hay publicaciones con esos filtros.</p>}
                        </div>
                        <Pagination page={feedData.page} pageSize={10} totalItems={feedData.filteredTotal} onPageChange={(nextPage) => { setSelectedPostId(null); setCommentPage(1); setPage(nextPage); }} label="publicaciones" />
                    </nav>
                )}

            <div className="community-feed-list">
                {visiblePosts.map((post) => {
                    const authorName = getPostAuthor(post);
                    const authorImage = post.authorCoach?.user.image?.url;
                    const postNumber = (feedData.page - 1) * 10 + feedData.posts.findIndex((item) => item.id === post.id) + 1;

                    return (
                        <article className="community-feed-post" id="community-post-detail" key={post.id}>
                            <div className="community-feed-post-main">
                            <div className="community-feed-post-heading">
                                <div className="community-feed-post-meta"><span className="community-feed-post-number" aria-hidden="true">{String(postNumber).padStart(2, "0")}</span><span className="community-feed-type"><MdOutlineLocalOffer /> {post.type}</span></div>
                                <time>{formatCommunityDateTime(post.createdAt)}</time>
                            </div>
                            <div className="community-feed-author">
                                <div className="community-feed-author-avatar">
                                    {authorImage
                                        ? <Image src={authorImage} alt={authorName} width={40} height={40} />
                                        : <span>{getInitials(authorName)}</span>}
                                </div>
                                <div><span>Publicado por</span><strong>{authorName}</strong>{post.authorCoach?.specialty && <small>{post.authorCoach.specialty}</small>}</div>
                            </div>
                            <div className="community-feed-question"><span>LA CONVERSACIÓN</span><h2>{post.title}</h2></div>
                            {post.content && <div className="community-feed-post-content"><span>Sobre esta publicación</span><p>{post.content}</p></div>}
                            {post.videoUrl && <YoutubeVideoButton videoUrl={post.videoUrl} title={post.title} />}
                            </div>

                            <div className="community-feed-discussion">
                            <div className="community-feed-comments-heading"><FaComments /><strong>{post._count.comments}</strong><span>{post._count.comments === 1 ? "aporte" : "aportes"}</span></div>
                            <div className="community-feed-comments">
                                {post.comments.map((comment) => {
                                    const authorName = getCommentAuthor(comment);
                                    const authorImage = getCommentImage(comment);
                                    const canManage = feedData.viewerRole === "ADMIN" || comment.createdByUserId === feedData.viewerUserId;
                                    return (
                                        <div className="community-feed-comment" key={comment.id}>
                                            <div className="community-feed-avatar">
                                                {authorImage
                                                    ? <Image src={authorImage} alt={authorName} width={42} height={42} />
                                                    : <span>{getInitials(authorName)}</span>}
                                            </div>
                                            <div className="community-feed-comment-body">
                                                <div className="community-feed-comment-heading"><div><strong>{authorName}</strong><small className="community-feed-comment-role">{getCommentRole(comment)}</small></div><time>{formatCommunityDateTime(comment.createdAt)}{new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime() ? " · editado" : ""}</time></div>
                                                {editingCommentId === comment.id ? (
                                                    <div className="community-feed-inline-edit">
                                                        <textarea value={editingContent} maxLength={1500} required rows={3} onChange={(event) => setEditingContent(event.target.value)} />
                                                        <div><button type="button" onClick={() => setEditingCommentId(null)}>Cancelar</button><button type="button" disabled={isPending} onClick={() => saveComment(comment.id)}>Guardar</button></div>
                                                    </div>
                                                ) : <p>{comment.content}</p>}
                                                {canManage && editingCommentId !== comment.id && <div className="community-feed-comment-actions"><button type="button" onClick={() => beginEditComment(comment)} aria-label="Editar mi aporte"><GoPencil /></button><button type="button" onClick={() => removeOwnComment(comment.id)} aria-label="Eliminar mi aporte"><FaRegTrashAlt /></button></div>}
                                            </div>
                                        </div>
                                    );
                                })}
                                {post._count.comments === 0 && <p className="community-feed-empty-comments">Todavía no hay aportes. Podés iniciar la conversación.</p>}
                            </div>
                            <Pagination page={commentPage} pageSize={10} totalItems={post._count.comments} onPageChange={(nextPage) => { void loadCommentPage(post.id, nextPage); }} label="aportes" />

                            <form className="community-feed-comment-form" onSubmit={(event) => submitComment(event, post.id)}>
                                <label htmlFor={`community-comment-${post.id}`}>Tu aporte como {feedData.viewerRole === "COACH" ? "coach" : feedData.viewerRole === "ADMIN" ? "Administración" : "alumno"}</label>
                                <textarea id={`community-comment-${post.id}`} value={drafts[post.id] ?? ""} maxLength={1500} required rows={3} onChange={(event) => setDrafts((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Compartí tu respuesta, experiencia o reflexión..." />
                                <div><small>{(drafts[post.id] ?? "").length}/1500</small><button type="submit" disabled={isPending && activePostId === post.id}>{isPending && activePostId === post.id ? "Publicando..." : "Publicar aporte"}</button></div>
                            </form>
                            </div>
                        </article>
                    );
                })}
            </div>
            </div>

            {feedData.totalPosts === 0 && <EmptyState title="Todavía no hay publicaciones" description="Cuando el equipo publique una pregunta, reflexión o video aparecerá acá." />}
            {feedData.totalPosts > 0 && feedData.filteredTotal === 0 && <EmptyState title="Sin resultados" description="Probá otra búsqueda o elegí un tipo de publicación diferente." />}
        </section>
    );
};
