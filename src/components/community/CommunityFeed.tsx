"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { FaComments, FaRegTrashAlt } from "react-icons/fa";
import { GoPencil } from "react-icons/go";
import { MdOutlineLocalOffer } from "react-icons/md";
import { toast } from "react-toastify";
import { createCommunityComment, deleteCommunityComment, getCommunityFeed, updateCommunityComment, type CommunityCommentItem, type CommunityFeedData, type CommunityPostItem } from "@/app/actions/community.actions";
import { EmptyState } from "@/components/ui/emptyState/EmptyState";
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

    useEffect(() => {
        let isMounted = true;
        let isSyncing = false;

        const synchronize = async () => {
            if (isSyncing || document.visibilityState !== "visible") return;
            isSyncing = true;
            try {
                const response = await getCommunityFeed();
                if (isMounted && response.ok) setFeedData(response.data);
            } catch {
                // Se vuelve a intentar en el siguiente ciclo de sincronización.
            } finally {
                isSyncing = false;
            }
        };

        const intervalId = window.setInterval(synchronize, 4000);
        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, []);

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
            setFeedData((current) => ({
                ...current,
                posts: current.posts.map((post) => post.id === postId
                    ? { ...post, comments: [...post.comments, result.data] }
                    : post),
            }));
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
            setFeedData((current) => ({
                ...current,
                posts: current.posts.map((post) => ({
                    ...post,
                    comments: post.comments.filter((comment) => comment.id !== commentId),
                })),
            }));
            toast.success("Aporte eliminado");
        });
    };

    return (
        <section className={`community-feed${embedded ? " community-feed-embedded" : ""}`}>
            <header className="community-feed-hero">
                <span>Espacio Hekademos</span>
                <h1>Comunidad</h1>
                <p>Un lugar para compartir preguntas, experiencias y aprendizajes sobre el movimiento.</p>
            </header>

            <div className="community-feed-list">
                {feedData.posts.map((post) => {
                    const authorName = getPostAuthor(post);
                    const authorImage = post.authorCoach?.user.image?.url;

                    return (
                        <article className="community-feed-post" key={post.id}>
                            <div className="community-feed-post-heading">
                                <span className="community-feed-type"><MdOutlineLocalOffer /> {post.type}</span>
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
                            <h2>{post.title}</h2>
                            {post.content && <p className="community-feed-post-content">{post.content}</p>}
                            {post.videoUrl && <YoutubeVideoButton videoUrl={post.videoUrl} title={post.title} />}

                            <div className="community-feed-comments-heading"><FaComments /><strong>{post.comments.length}</strong><span>{post.comments.length === 1 ? "aporte" : "aportes"}</span></div>
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
                                                <div className="community-feed-comment-heading"><strong>{authorName} <small className="community-feed-comment-role">{getCommentRole(comment)}</small></strong><time>{formatCommunityDateTime(comment.createdAt)}{new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime() ? " · editado" : ""}</time></div>
                                                {editingCommentId === comment.id ? (
                                                    <div className="community-feed-inline-edit">
                                                        <textarea value={editingContent} maxLength={1500} required rows={3} onChange={(event) => setEditingContent(event.target.value)} />
                                                        <div><button type="button" onClick={() => setEditingCommentId(null)}>Cancelar</button><button type="button" disabled={isPending} onClick={() => saveComment(comment.id)}>Guardar</button></div>
                                                    </div>
                                                ) : <p>{comment.content}</p>}
                                            </div>
                                            {canManage && editingCommentId !== comment.id && <div className="community-feed-comment-actions"><button type="button" onClick={() => beginEditComment(comment)} aria-label="Editar mi aporte"><GoPencil /></button><button type="button" onClick={() => removeOwnComment(comment.id)} aria-label="Eliminar mi aporte"><FaRegTrashAlt /></button></div>}
                                        </div>
                                    );
                                })}
                                {post.comments.length === 0 && <p className="community-feed-empty-comments">Todavía no hay aportes. Podés iniciar la conversación.</p>}
                            </div>

                            <form className="community-feed-comment-form" onSubmit={(event) => submitComment(event, post.id)}>
                                <label htmlFor={`community-comment-${post.id}`}>Tu aporte como {feedData.viewerRole === "COACH" ? "coach" : feedData.viewerRole === "ADMIN" ? "Administración" : "alumno"}</label>
                                <textarea id={`community-comment-${post.id}`} value={drafts[post.id] ?? ""} maxLength={1500} required rows={3} onChange={(event) => setDrafts((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Compartí tu respuesta, experiencia o reflexión..." />
                                <div><small>{(drafts[post.id] ?? "").length}/1500</small><button type="submit" disabled={isPending && activePostId === post.id}>{isPending && activePostId === post.id ? "Publicando..." : "Publicar aporte"}</button></div>
                            </form>
                        </article>
                    );
                })}
            </div>

            {feedData.posts.length === 0 && <EmptyState title="Todavía no hay publicaciones" description="Cuando el equipo publique una pregunta, reflexión o video aparecerá acá." />}
        </section>
    );
};
