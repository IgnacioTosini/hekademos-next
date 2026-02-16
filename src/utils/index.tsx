export const navLinks = [
    { name: 'Inicio', href: '/#inicio' },
    { name: 'Sobre Nosotros', href: '/#sobre-nosotros' },
    { name: 'Profesores', href: '/#profesores' },
    { name: 'Ejercicios', href: '/exercises' },
    { name: 'Clases', href: '/#clases' },
    { name: 'Comunidad', href: '/#comunidad' },
    { name: 'Filosofía', href: '/#filosofia' },
    { name: 'Contacto', href: '/#contacto' }
]

export const handleScrollTo = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}