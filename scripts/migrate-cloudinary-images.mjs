import 'dotenv/config';
import { createHash } from 'node:crypto';
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const root = (process.env.CLOUDINARY_UPLOAD_FOLDER ?? 'Hekademos').replace(/^\/+|\/+$/g, '');
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const apply = process.argv.includes('--apply');
const siteFolders = {
    header: 'cabecera', banner: 'inicio', about: 'sobre-nosotros',
    teachers: 'profesores', classes: 'clases', community: 'comunidad',
    philosophy: 'filosofia', footer: 'pie-de-pagina',
};

function signature(params) {
    const payload = Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`).join('&');
    return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

async function copyImage(sourceUrl, destination) {
    const source = await fetch(sourceUrl);
    if (!source.ok) throw new Error(`No se pudo leer la imagen original (${source.status}).`);
    const file = new Blob([await source.arrayBuffer()], { type: source.headers.get('content-type') ?? 'image/jpeg' });
    const folder = destination.slice(0, destination.lastIndexOf('/'));
    const publicId = destination.slice(destination.lastIndexOf('/') + 1);
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { folder, public_id: publicId, overwrite: 'false', timestamp };
    const body = new FormData();
    body.append('file', file, publicId);
    body.append('api_key', apiKey);
    for (const [key, value] of Object.entries(params)) body.append(key, String(value));
    body.append('signature', signature(params));
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body });
    const data = await response.json();
    if (!response.ok || data.public_id !== destination) {
        throw new Error(`Falló la copia a ${destination}: ${data.error?.message ?? 'ID inesperado'}`);
    }
    const check = await fetch(data.secure_url, { method: 'HEAD' });
    if (!check.ok) throw new Error(`La copia no está disponible (${check.status}): ${destination}`);
    return { url: data.secure_url, publicId: data.public_id };
}

function collectSiteImages(value) {
    const entries = [];
    for (const [section, folder] of Object.entries(siteFolders)) {
        function walk(node, path) {
            if (!node || typeof node !== 'object') return;
            if (typeof node.publicId === 'string' && node.publicId.startsWith(`${root}/`)
                && !node.publicId.startsWith(`${root}/contenidoInicio/`) && typeof node.url === 'string') {
                entries.push({ path, folder, oldId: node.publicId, oldUrl: node.url });
            }
            for (const [key, child] of Object.entries(node)) if (key !== 'url') walk(child, [...path, key]);
        }
        walk(value?.[section], [section]);
    }
    return entries;
}

function atPath(value, path) {
    return path.reduce((node, part) => node[part], value);
}

async function main() {
    if (apply && (!cloudName || !apiKey || !apiSecret)) throw new Error('Faltan credenciales de Cloudinary.');
    const [userImages, site] = await Promise.all([
        prisma.userImage.findMany({ select: { id: true, publicId: true, url: true, user: { select: { role: true } } } }),
        prisma.siteContent.findUnique({ where: { key: 'home-page' }, select: { value: true, updatedAt: true } }),
    ]);
    const users = userImages.filter((image) => image.publicId.startsWith(`${root}/`)
        && ![`alumnos`, `profesores`, `usuarios`].some((folder) => image.publicId.startsWith(`${root}/${folder}/`)))
        .map((image) => ({ ...image, destination: `${root}/${image.user.role === 'COACH' ? 'profesores' : image.user.role === 'STUDENT' ? 'alumnos' : 'usuarios'}/${image.publicId.split('/').at(-1)}` }));
    const siteImages = collectSiteImages(site?.value);
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', users: users.map(({ publicId, destination }) => ({ from: publicId, to: destination })), site: siteImages.map(({ oldId, folder }) => ({ from: oldId, to: `${root}/contenidoInicio/${folder}/${oldId.split('/').at(-1)}` })) }, null, 2));
    if (!apply) return;

    for (const image of users) {
        const copy = await copyImage(image.url, image.destination);
        const updated = await prisma.userImage.updateMany({ where: { id: image.id, publicId: image.publicId }, data: copy });
        if (updated.count !== 1) throw new Error(`La foto de perfil cambió durante la migración: ${image.publicId}`);
        console.log(`Actualizada: ${image.publicId} -> ${copy.publicId}`);
    }
    if (site && siteImages.length) {
        const nextValue = structuredClone(site.value);
        for (const image of siteImages) {
            const destination = `${root}/contenidoInicio/${image.folder}/${image.oldId.split('/').at(-1)}`;
            const copy = await copyImage(image.oldUrl, destination);
            Object.assign(atPath(nextValue, image.path), copy);
            console.log(`Copiada: ${image.oldId} -> ${copy.publicId}`);
        }
        const updated = await prisma.siteContent.updateMany({
            where: { key: 'home-page', updatedAt: site.updatedAt },
            data: { value: nextValue },
        });
        if (updated.count !== 1) throw new Error('El contenido del inicio cambió durante la migración. No se sobrescribió.');
        console.log('Referencias del inicio actualizadas.');
    }
}

try { await main(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
