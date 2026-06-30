export const navLinks = [
    { name: 'Inicio', href: '/' },
    { name: 'Sobre Nosotros', href: '/#sobre-nosotros' },
    { name: 'Profesores', href: '/#profesores' },
    { name: 'Clases', href: '/#clases' },
    { name: 'Horarios', href: '/#horarios' },
    { name: 'Planes', href: '/#planes' },
    { name: 'Comunidad', href: '/#comunidad' },
    { name: 'Filosofía', href: '/#filosofia' },
    { name: 'Preguntas frecuentes', href: '/#preguntas-frecuentes' },
    { name: 'Contacto', href: '/#contacto' }
]

export const primaryNavLinks = [
    { name: 'Inicio', href: '/' },
    { name: 'Clases', href: '/#clases' },
    { name: 'Horarios', href: '/#horarios' },
    { name: 'Planes', href: '/#planes' },
    { name: 'Contacto', href: '/#contacto' }
]

export const handleScrollTo = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export const getSectionIdFromHref = (href: string) => {
    if (!href.startsWith('/#')) return null
    return href.replace('/#', '')
}
