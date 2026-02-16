import { gsap } from './gsapConfig'

export const createScrollAnimations = () => {
    // Animación del banner
    const animateBanner = () => {
        gsap.fromTo('.banner',
            { opacity: 0, y: 50 },
            { opacity: 1, y: 0, duration: 1, ease: "power2.out" }
        )
    }

    // Animaciones de secciones
    const animateSections = () => {
        const sections = [
            '.about-us-section',
            '.teachers-section',
            '.classes-section',
            '.comunity-section',
            '.philosophy-section',
            '.contact-section'
        ]

        sections.forEach((selector) => {
            gsap.fromTo(selector,
                { opacity: 0, y: 80, scale: 0.95 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 1,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: selector,
                        start: "top 95%",
                        end: "bottom 20%",
                        toggleActions: "play none none none",
                    }
                }
            )
        })
    }

    // Animación para elementos individuales dentro de las secciones
    const animateElements = () => {
        (gsap.utils.toArray('.animate-on-scroll') as Element[]).forEach((element: Element) => {
            // Excluir elementos que están dentro de filosofía Y contacto
            if (!element.closest('.philosophyContainer') && !element.closest('.contactSection')) {
                gsap.fromTo(element,
                    { opacity: 0, x: -30 },
                    {
                        opacity: 1,
                        x: 0,
                        duration: 0.8,
                        scrollTrigger: {
                            trigger: element,
                            start: "top 100%",
                            toggleActions: "play none none none"
                        }
                    }
                )
            }
        })
    }

    // Animación para cards o elementos que aparecen escalonados
    const animateStaggeredCards = () => {
        (gsap.utils.toArray('.stagger-card') as Element[]).forEach((element: Element, index: number) => {
            // Solo aplicar a cards que NO están en contacto (para evitar conflictos)
            if (!element.closest('.contactSection')) {
                gsap.fromTo(element,
                    { opacity: 0, y: 50 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.8,
                        delay: index * 0.2, // Retraso escalonado
                        scrollTrigger: {
                            trigger: element,
                            start: "top 100%",
                            toggleActions: "play none none none"
                        }
                    }
                )
            }
        })
    }

    return {
        animateBanner,
        animateSections,
        animateElements,
        animateStaggeredCards
    }
}

// Animaciones específicas para diferentes tipos de contenido
export const sectionAnimations = {
    // Para títulos
    animateTitle: (selector: string) => {
        gsap.fromTo(selector,
            { opacity: 0, y: 30 },
            {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: selector,
                    start: "top 80%",
                    toggleActions: "play none none none"
                }
            }
        )
    },

    // Para texto
    animateText: (selector: string) => {
        gsap.fromTo(selector,
            { opacity: 0, y: 20 },
            {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: selector,
                    start: "top 100%",
                    toggleActions: "play none none none"
                }
            }
        )
    },

    // Para botones
    animateButton: (selector: string) => {
        gsap.fromTo(selector,
            { opacity: 0, scale: 0.8 },
            {
                opacity: 1,
                scale: 1,
                duration: 0.6,
                ease: "back.out(1.7)",
                scrollTrigger: {
                    trigger: selector,
                    start: "top 100%",
                    toggleActions: "play none none none"
                }
            }
        )
    }
}

export const createPhilosophyAnimations = () => {
    // Animación del título con clip-path reveal
    const animateTitleReveal = () => {
        gsap.fromTo('.animate-title-reveal',
            {
                opacity: 0,
                clipPath: 'inset(0 100% 0 0)'
            },
            {
                opacity: 1,
                clipPath: 'inset(0 0% 0 0)',
                duration: 1.2,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: '.animate-title-reveal',
                    start: "top 70%",
                    toggleActions: "play none none none"
                }
            }
        )
    }

    // Animación fade-up para descripción
    const animateFadeUp = () => {
        gsap.fromTo('.animate-fade-up',
            {
                opacity: 0,
                y: 30
            },
            {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: '.animate-fade-up',
                    start: "top 85%",
                    toggleActions: "play none none none"
                }
            }
        )
    }

    // Animación del split container
    const animateSplitContainer = () => {
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: '.animate-split-container',
                start: "top 75%",
                toggleActions: "play none none none"
            }
        })

        tl.fromTo('.animate-philosophy-left',
            {
                opacity: 0,
                x: -100,
                rotationY: -15
            },
            {
                opacity: 1,
                x: 0,
                rotationY: 0,
                duration: 1,
                ease: "power2.out"
            }
        )
            .fromTo('.animate-philosophy-right',
                {
                    opacity: 0,
                    x: 100,
                    rotationY: 15
                },
                {
                    opacity: 1,
                    x: 0,
                    rotationY: 0,
                    duration: 1,
                    ease: "power2.out"
                }, "-=0.5")
    }

    // Animación de la cita
    const animateQuoteReveal = () => {
        gsap.fromTo('.animate-quote-reveal',
            {
                opacity: 0,
                scale: 0.8,
                y: 20
            },
            {
                opacity: 1,
                scale: 1,
                y: 0,
                duration: 1,
                ease: "back.out(1.7)",
                scrollTrigger: {
                    trigger: '.animate-quote-reveal',
                    start: "top 85%",
                    toggleActions: "play none none none"
                }
            }
        )
    }

    // Animación de items de lista
    const animateListItems = () => {
        (gsap.utils.toArray('.animate-list-item') as Element[]).forEach((item: Element, index: number) => {
            gsap.fromTo(item,
                {
                    opacity: 0,
                    x: 50,
                    y: 30
                },
                {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    duration: 0.8,
                    delay: index * 0.2,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: item,
                        start: "top 85%",
                        toggleActions: "play none none none"
                    }
                }
            )
        })
    }

    return {
        animateTitleReveal,
        animateFadeUp,
        animateSplitContainer,
        animateQuoteReveal,
        animateListItems
    }
}

export const createContactAnimations = () => {
    // Split animation para formulario e información
    const animateContactSplit = () => {
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: '.animate-split-contact',
                start: "top 85%",
                toggleActions: "play none none none"
            }
        })

        tl.fromTo('.animate-from-left',
            {
                opacity: 0,
                x: -80,
                rotationY: -10
            },
            {
                opacity: 1,
                x: 0,
                rotationY: 0,
                duration: 1,
                ease: "power2.out"
            }
        )
            .fromTo('.animate-from-right',
                {
                    opacity: 0,
                    x: 80,
                    rotationY: 10
                },
                {
                    opacity: 1,
                    x: 0,
                    rotationY: 0,
                    duration: 1,
                    ease: "power2.out"
                }, "-=0.6"
            )
    }

    // Animación de iconos con bounce
    const animateContactIcons = () => {
        (gsap.utils.toArray('.animate-icon-bounce') as Element[]).forEach((icon: Element, index: number) => {
            gsap.fromTo(icon,
                {
                    scale: 0,
                    rotation: -180
                },
                {
                    scale: 1,
                    rotation: 0,
                    duration: 0.6,
                    delay: index * 0.1,
                    ease: "back.out(1.7)",
                    scrollTrigger: {
                        trigger: icon,
                        start: "top 100%",
                        toggleActions: "play none none none"
                    }
                }
            )
        })
    }

    // Animación específica para elementos de contacto
    const animateContactElements = () => {
        // Solo elementos dentro de contacto con .animate-on-scroll
        (gsap.utils.toArray('.contactSection .animate-on-scroll') as Element[]).forEach((element: Element) => {
            gsap.fromTo(element,
                { opacity: 0, y: 30 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    scrollTrigger: {
                        trigger: element,
                        start: "top 90%",
                        toggleActions: "play none none none"
                    }
                }
            )
        })
    }

    // Animación específica para cards de contacto
    const animateContactCards = () => {
        (gsap.utils.toArray('.contactSection .stagger-card') as Element[]).forEach((element: Element, index: number) => {
            gsap.fromTo(element,
                { opacity: 0, y: 50 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    delay: index * 0.2,
                    scrollTrigger: {
                        trigger: element,
                        start: "top 90%",
                        toggleActions: "play none none none"
                    }
                }
            )
        })
    }

    // Animación de botones de redes sociales
    const animateSocialButtons = () => {
        gsap.fromTo('.animate-buttons-group',
            {
                opacity: 0,
                y: 30
            },
            {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: '.animate-buttons-group',
                    start: "top 100%",
                    toggleActions: "play none none none"
                }
            }
        )
    }

    // Efecto del reloj que hace tick
    const animateClockTick = () => {
        gsap.to('.animate-clock-tick', {
            rotation: 360,
            duration: 2,
            ease: "power2.inOut",
            repeat: -1,
            scrollTrigger: {
                trigger: '.animate-clock-tick',
                start: "top 100%",
                toggleActions: "play none none pause"
            }
        })
    }

    // Horarios aparecen secuencialmente
    const animateScheduleItems = () => {
        (gsap.utils.toArray('.animate-schedule-item') as Element[]).forEach((item: Element, index: number) => {
            gsap.fromTo(item,
                {
                    opacity: 0,
                    x: 20
                },
                {
                    opacity: 1,
                    x: 0,
                    duration: 0.5,
                    delay: index * 0.1,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: '.animate-schedule',
                        start: "top 100%",
                        toggleActions: "play none none none"
                    }
                }
            )
        })
    }

    return {
        animateContactSplit,
        animateContactElements,
        animateContactCards,
        animateContactIcons,
        animateSocialButtons,
        animateClockTick,
        animateScheduleItems
    }
}