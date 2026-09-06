"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { FaComments, FaRegTrashAlt } from "react-icons/fa";
import { GoPencil } from "react-icons/go";
import { IoMdClose } from "react-icons/io";
import { MdForum } from "react-icons/md";
import { toast } from "react-toastify";
import {
    createCommunityComment,
    createCommunityPost,
    deleteCommunityComment,
    deleteCommunityPost,
    getAdminCommunityPosts,
    updateCommunityComment,
    updateCommunityPost,
    type CommunityAuthorOption,
    type CommunityCommentItem,
    type CommunityPostInput,
    type CommunityPostItem,
} from "@/app/actions/community.actions";
import { EmptyState } from "@/components/ui/emptyState/EmptyState";
import { YoutubeVideoButton } from "@/components/ui/YoutubeVideoButton";
import { formatCommunityDateTime } from "@/utils/format";
import "./_adminCommunitySection.scss";

type Props = { posts: CommunityPostItem[]; authors: CommunityAuthorOption[]; errorMessage?: string | null };

const emptyForm: CommunityPostInput = {
    type: "",
    title: "",
    content: "",
    videoUrl: "",
    authorCoachId: "",
    isPublished: true,
};

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

const getCommentRole = (comment: CommunityCommentItem) => (
    comment.authorRole === "ADMIN" ? "Administración" : comment.authorRole === "COACH" ? "Coach" : "Alumno"
);

const getPostAuthor = (post: CommunityPostItem) => post.authorCoach?.user.name || "Administración";

export const AdminCommunitySection = ({ posts, authors, errorMessage }: Props) => {
    const [isPending, startTransition] = useTransition();
    const [visiblePosts, setVisiblePosts] = useState(posts);
    const [availableAuthors, setAvailableAuthors] = useState(authors);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<CommunityPostItem | null>(null);
    const [form, setForm] = useState<CommunityPostInput>(emptyForm);
    const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
    const [commentAuthors, setCommentAuthors] = useState<Record<string, string>>({});
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentContent, setEditingCommentContent] = useState("");
    const [activeOperation, setActiveOperation] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        let isSyncing = false;

        const synchronize = async () => {
            if (isSyncing || document.visibilityState !== "visible") return;
            isSyncing = true;
            try {
                const response = await getAdminCommunityPosts();
                if (isMounted && response.ok) {
                    setVisiblePosts(response.data.posts);
                    setAvailableAuthors(response.data.authors);
                }
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

    const openCreate = () => {
        setSelectedPost(null);
        setForm({ ...emptyForm });
        setIsModalOpen(true);
    };

    const openEdit = (post: CommunityPostItem) => {
        setSelectedPost(post);
        setForm({
            type: post.type,
            title: post.title,
            content: post.content,
            videoUrl: post.videoUrl ?? "",
            authorCoachId: post.authorCoachId ?? "",
            isPublished: post.isPublished,
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (isPending) return;
        setIsModalOpen(false);
        setSelectedPost(null);
    };

    const submitPost = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setActiveOperation("post");
        startTransition(async () => {
            const result = selectedPost
                ? await updateCommunityPost(selectedPost.id, form)
                : await createCommunityPost(form);

            if (!result.ok) {
                toast.error(result.error);
                setActiveOperation(null);
                return;
            }
            setVisiblePosts((current) => selectedPost
                ? current.map((post) => post.id === result.data.id ? result.data : post)
                : [result.data, ...current]);
            toast.success(selectedPost ? "Publicación actualizada" : "Publicación creada");
            setIsModalOpen(false);
            setSelectedPost(null);
            setActiveOperation(null);
        });
    };

    const removePost = (post: CommunityPostItem) => {
        if (!window.confirm(`¿Eliminar “${post.title}” y todos sus comentarios?`)) return;
        setActiveOperation(`delete-post-${post.id}`);
        startTransition(async () => {
            const result = await deleteCommunityPost(post.id);
            if (!result.ok) {
                toast.error(result.error);
                setActiveOperation(null);
                return;
            }
            setVisiblePosts((current) => current.filter((item) => item.id !== post.id));
            toast.success("Publicación eliminada");
            setActiveOperation(null);
        });
    };

    const submitComment = (event: FormEvent<HTMLFormElement>, postId: string) => {
        event.preventDefault();
        setActiveOperation(`comment-${postId}`);
        startTransition(async () => {
            const result = await createCommunityComment(postId, commentDrafts[postId] ?? "", commentAuthors[postId]);
            if (!result.ok) {
                toast.error(result.error);
                setActiveOperation(null);
                return;
            }
            setVisiblePosts((current) => current.map((post) => post.id === postId
                ? { ...post, comments: [...post.comments, result.data] }
                : post));
            setCommentDrafts((current) => ({ ...current, [postId]: "" }));
            toast.success("Aporte publicado");
            setActiveOperation(null);
        });
    };

    const beginEditComment = (comment: CommunityCommentItem) => {
        setEditingCommentId(comment.id);
        setEditingCommentContent(comment.content);
    };

    const saveComment = (commentId: string) => {
        setActiveOperation(`edit-comment-${commentId}`);
        startTransition(async () => {
            const result = await updateCommunityComment(commentId, editingCommentContent);
            if (!result.ok) {
                toast.error(result.error);
                setActiveOperation(null);
                return;
            }
            setVisiblePosts((current) => current.map((post) => ({
                ...post,
                comments: post.comments.map((comment) => comment.id === commentId ? result.data : comment),
            })));
            setEditingCommentId(null);
            setEditingCommentContent("");
            toast.success("Aporte actualizado");
            setActiveOperation(null);
        });
    };

    const removeComment = (commentId: string) => {
        if (!window.confirm("¿Eliminar este aporte?")) return;
        setActiveOperation(`delete-comment-${commentId}`);
        startTransition(async () => {
            const result = await deleteCommunityComment(commentId);
            if (!result.ok) {
                toast.error(result.error);
                setActiveOperation(null);
                return;
            }
            setVisiblePosts((current) => current.map((post) => ({
                ...post,
                comments: post.comments.filter((comment) => comment.id !== commentId),
            })));
            toast.success("Aporte eliminado");
            setActiveOperation(null);
        });
    };

    return (
        <section className="admin-community-section">
            <header className="admin-community-header">
                <div><h1>Comunidad y foro</h1><p>Publicá contenidos y respondé como Administración o en nombre de un coach.</p></div>
                <button type="button" onClick={openCreate}><MdForum /> Nueva publicación</button>
            </header>

            {errorMessage && <p className="admin-community-error">{errorMessage}</p>}

            <div className="admin-community-list">
                {visiblePosts.map((post) => (
                    <article className="admin-community-card" key={post.id}>
                        <div className="admin-community-card-header">
                            <div className="admin-community-badges">
                                <span>{post.type}</span>
                                <span className={post.isPublished ? "published" : "draft"}>{post.isPublished ? "Publicado" : "Borrador"}</span>
                            </div>
                            <div className="admin-community-actions">
                                <button type="button" onClick={() => openEdit(post)} aria-label={`Editar ${post.title}`}><GoPencil /></button>
                                <button type="button" disabled={isPending && activeOperation === `delete-post-${post.id}`} onClick={() => removePost(post)} aria-label={`Eliminar ${post.title}`}><FaRegTrashAlt /></button>
                            </div>
                        </div>

                        <h2>{post.title}</h2>
                        <p className="admin-community-author">Por {getPostAuthor(post)}</p>
                        {post.content && <p className="admin-community-content">{post.content}</p>}
                        {post.videoUrl && <YoutubeVideoButton videoUrl={post.videoUrl} title={post.title} />}
                        <div className="admin-community-meta"><span>{formatCommunityDateTime(post.createdAt)}</span><span><FaComments /> {post.comments.length} {post.comments.length === 1 ? "aporte" : "aportes"}</span></div>

                        <details className="admin-community-comments">
                            <summary>Ver aportes ({post.comments.length})</summary>
                            {post.comments.length === 0 ? <p className="admin-community-no-comments">Todavía no hay aportes.</p> : (
                                <div className="admin-community-comment-list">
                                    {post.comments.map((comment) => (
                                        <div className="admin-community-comment" key={comment.id}>
                                            <div>
                                                <strong>{getCommentAuthor(comment)} <small className="admin-community-role">{getCommentRole(comment)}</small></strong>
                                                <small>{formatCommunityDateTime(comment.createdAt)}{new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime() ? " · editado" : ""}</small>
                                                {editingCommentId === comment.id ? (
                                                    <div className="admin-community-inline-edit">
                                                        <textarea value={editingCommentContent} maxLength={1500} rows={3} onChange={(event) => setEditingCommentContent(event.target.value)} />
                                                        <div><button type="button" onClick={() => setEditingCommentId(null)}>Cancelar</button><button type="button" disabled={isPending && activeOperation === `edit-comment-${comment.id}`} onClick={() => saveComment(comment.id)}>Guardar</button></div>
                                                    </div>
                                                ) : <p>{comment.content}</p>}
                                            </div>
                                            {editingCommentId !== comment.id && <div className="admin-community-comment-actions"><button type="button" onClick={() => beginEditComment(comment)} aria-label="Editar aporte"><GoPencil /></button><button type="button" onClick={() => removeComment(comment.id)} aria-label="Eliminar aporte"><FaRegTrashAlt /></button></div>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <form className="admin-community-reply-form" onSubmit={(event) => submitComment(event, post.id)}>
                                <label><span>Responder como</span><select value={commentAuthors[post.id] ?? ""} onChange={(event) => setCommentAuthors((current) => ({ ...current, [post.id]: event.target.value }))}><option value="">Administración</option>{availableAuthors.map((author) => <option value={author.id} key={author.id}>{author.name}</option>)}</select></label>
                                <label><span>Respuesta o aporte</span><textarea value={commentDrafts[post.id] ?? ""} maxLength={1500} required rows={3} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Escribí una respuesta para la comunidad..." /></label>
                                <div><small>{(commentDrafts[post.id] ?? "").length}/1500</small><button type="submit" disabled={isPending && activeOperation === `comment-${post.id}`}>{isPending && activeOperation === `comment-${post.id}` ? "Publicando..." : "Publicar respuesta"}</button></div>
                            </form>
                        </details>
                    </article>
                ))}
            </div>

            {!errorMessage && visiblePosts.length === 0 && <EmptyState title="Todavía no hay publicaciones" description="Creá la primera publicación para la comunidad." />}

            {isModalOpen && (
                <div className="admin-community-modal" role="dialog" aria-modal="true" aria-label={selectedPost ? "Editar publicación" : "Nueva publicación"} onMouseDown={closeModal}>
                    <form className="admin-community-form" onSubmit={submitPost} onMouseDown={(event) => event.stopPropagation()}>
                        <div className="admin-community-form-header"><div><h2>{selectedPost ? "Editar publicación" : "Nueva publicación"}</h2><p>El contenido publicado será visible para toda la comunidad.</p></div><button type="button" onClick={closeModal} aria-label="Cerrar"><IoMdClose /></button></div>

                        <label><span>Tipo o categoría</span><input value={form.type} maxLength={50} required onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} placeholder="Ej: Pregunta semanal, Nutrición, Motivación..." /><small>Es una etiqueta libre que se mostrará en la publicación.</small></label>
                        <label><span>Autor</span><select value={form.authorCoachId ?? ""} onChange={(event) => setForm((current) => ({ ...current, authorCoachId: event.target.value }))}><option value="">Administración</option>{availableAuthors.map((author) => <option value={author.id} key={author.id}>{author.name}</option>)}</select><small>Elegí un coach si el contenido fue creado especialmente por él.</small></label>
                        <label><span>Título</span><input value={form.title} maxLength={140} required onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ej: ¿Qué aprendiste esta semana?" /></label>
                        <label><span>Contenido</span><textarea value={form.content} maxLength={6000} required rows={6} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="Escribí la pregunta, reflexión o contenido que verá la comunidad..." /></label>
                        <label><span>Video de YouTube (opcional)</span><input value={form.videoUrl} onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))} placeholder="https://www.youtube.com/watch?v=..." /><small>Este campo siempre está disponible. También se aceptan enlaces youtu.be, Shorts y Live.</small></label>
                        <label className="admin-community-checkbox"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))} /><span>Publicar para la comunidad</span></label>

                        <div className="admin-community-form-actions"><button type="button" onClick={closeModal}>Cancelar</button><button type="submit" disabled={isPending && activeOperation === "post"}>{isPending && activeOperation === "post" ? "Guardando..." : selectedPost ? "Guardar cambios" : "Crear publicación"}</button></div>
                    </form>
                </div>
            )}
        </section>
    );
};
