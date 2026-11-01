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

const defaultHeaderOffset = 80
const titleTopSpacing = 48

export const handleScrollTo = (sectionId: string, behavior: ScrollBehavior = 'smooth', pinnedStart?: number) => {
    const element = document.getElementById(sectionId)
    if (!element) return

    if (sectionId === 'inicio') {
        window.scrollTo({ top: 0, behavior })
        return
    }

    const header = document.querySelector<HTMLElement>('.header')
    const scrollTarget = element.querySelector<HTMLElement>('h1, h2, h3') ?? element
    const headerOffset = header?.offsetHeight ?? defaultHeaderOffset
    const sectionTop = element.getBoundingClientRect().top + window.scrollY
    const availableHeight = window.innerHeight - headerOffset
    const centeredTop = sectionTop - headerOffset - Math.max(0, (availableHeight - element.offsetHeight) / 2)
    const headingTop = scrollTarget.getBoundingClientRect().top + window.scrollY - headerOffset - titleTopSpacing
    const targetTop = pinnedStart ?? (element.offsetHeight <= availableHeight ? centeredTop : headingTop)

    window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior,
    })
}

export const getSectionIdFromHref = (href: string) => {
    if (!href.startsWith('/#')) return null
    return href.replace('/#', '')
}
