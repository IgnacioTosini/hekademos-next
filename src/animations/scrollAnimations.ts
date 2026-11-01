import { gsap, ScrollTrigger } from './gsapConfig'

const SECTION_TRIGGER_START = "top 88%"
const ELEMENT_TRIGGER_START = "top 88%"
const CARD_TRIGGER_START = "top 90%"

export const createScrollAnimations = () => {
    // Animaciones de secciones
    const animateSections = () => {
        const sections = [
            '.teachers-section',
            '.training-schedule-section',
            '.membership-plans-section',
            '.comunity-section',
            '.philosophy-section',
            '.faq-section',
            '.contact-section'
        ]

        sections.forEach((selector) => {
            gsap.fromTo(selector,
                { autoAlpha: 0, y: 48, scale: 0.98 },
                {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.9,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: selector,
                        start: SECTION_TRIGGER_START,
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
            if (!element.closest('.aboutUs') && !element.closest('.philosophyContainer') && !element.closest('.contactSection')) {
                gsap.fromTo(element,
                    { autoAlpha: 0, y: 24 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: 0.7,
                        ease: "power2.out",
                        scrollTrigger: {
                            trigger: element,
                            start: ELEMENT_TRIGGER_START,
                            toggleActions: "play none none none"
                        }
                    }
                )
            }
        })
    }

    // Animación para cards o elementos que aparecen escalonados
    const animateStaggeredCards = () => {
        const cardGroups = new Map<Element, Element[]>()

        ;(gsap.utils.toArray('.stagger-card') as Element[]).forEach((element: Element) => {
            if (!element.closest('.aboutUs') && !element.closest('.contactSection') && !(element.closest('.teachers') && window.matchMedia('(max-width: 768px)').matches) && element.parentElement) {
                const parent = element.parentElement
                const group = cardGroups.get(parent) ?? []
                group.push(element)
                cardGroups.set(parent, group)
            }
        })

        cardGroups.forEach((cards, parent) => {
            gsap.fromTo(cards,
                { autoAlpha: 0, y: 36 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.7,
                    ease: "power2.out",
                    stagger: 0.12,
                    scrollTrigger: {
                        trigger: parent,
                        start: CARD_TRIGGER_START,
                        toggleActions: "play none none none"
                    }
                }
            )
        })
    }

    return {
        animateSections,
        animateElements,
        animateStaggeredCards
    }
}

export const createAboutAnimations = () => {
    const about = document.querySelector<HTMLElement>('.aboutUs')
    if (!about) return

    const story = about.querySelector<HTMLElement>('.aboutUsContent')
    const pillars = about.querySelector<HTMLElement>('.usPillars')
    if (!story || !pillars) return

    gsap.timeline({
        scrollTrigger: {
            trigger: story,
            start: 'top 82%',
            toggleActions: 'play none none none',
        },
    })
        .fromTo(about.querySelector('.aboutUsTitle'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out' })
        .fromTo(about.querySelector('.aboutUsText'), { autoAlpha: 0, x: 36 }, { autoAlpha: 1, x: 0, duration: 0.85, ease: 'power2.out' }, '-=0.2')
        .fromTo(about.querySelector('.aboutUsImage'), { autoAlpha: 0, x: -36, scale: 0.96 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.9, ease: 'power2.out' }, '<')

    gsap.timeline({
        scrollTrigger: {
            trigger: pillars,
            start: 'top 82%',
            toggleActions: 'play none none none',
        },
    })
        .fromTo(pillars.querySelector('.usPillarsTitle'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out' })
        .fromTo(pillars.querySelector('.sectionLead'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.2')
        .fromTo(pillars.querySelectorAll('.pillarsList > div'), { autoAlpha: 0, y: 36, scale: 0.96 }, {
            autoAlpha: 1, y: 0, scale: 1, duration: 0.65, ease: 'power2.out', stagger: 0.18,
        }, '-=0.1')
}

// Animaciones específicas para diferentes tipos de contenido
export const sectionAnimations = {
    // Para títulos
    animateTitle: (selector: string) => {
        gsap.fromTo(selector,
            { autoAlpha: 0, y: 24 },
            {
                autoAlpha: 1,
                y: 0,
                duration: 0.7,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: selector,
                    start: ELEMENT_TRIGGER_START,
                    toggleActions: "play none none none"
                }
            }
        )
    },

    // Para texto
    animateText: (selector: string) => {
        gsap.fromTo(selector,
            { autoAlpha: 0, y: 20 },
            {
                autoAlpha: 1,
                y: 0,
                duration: 0.6,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: selector,
                    start: ELEMENT_TRIGGER_START,
                    toggleActions: "play none none none"
                }
            }
        )
    },

    // Para botones
    animateButton: (selector: string) => {
        gsap.fromTo(selector,
            { autoAlpha: 0, scale: 0.9 },
            {
                autoAlpha: 1,
                scale: 1,
                duration: 0.6,
                ease: "back.out(1.7)",
                scrollTrigger: {
                    trigger: selector,
                    start: ELEMENT_TRIGGER_START,
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
                autoAlpha: 0,
                clipPath: 'inset(0 100% 0 0)'
            },
            {
                autoAlpha: 1,
                clipPath: 'inset(0 0% 0 0)',
                duration: 1,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: '.animate-title-reveal',
                    start: "top 82%",
                    toggleActions: "play none none none"
                }
            }
        )
    }

    // Animación fade-up para descripción
    const animateFadeUp = () => {
        gsap.fromTo('.animate-fade-up',
            {
                autoAlpha: 0,
                y: 30
            },
            {
                autoAlpha: 1,
                y: 0,
                duration: 0.7,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: '.animate-fade-up',
                    start: ELEMENT_TRIGGER_START,
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
                start: "top 86%",
                toggleActions: "play none none none"
            }
        })

        tl.fromTo('.animate-philosophy-left',
            {
                autoAlpha: 0,
                x: -56,
                rotationY: -8
            },
            {
                autoAlpha: 1,
                x: 0,
                rotationY: 0,
                duration: 0.9,
                ease: "power2.out"
            }
        )
            .fromTo('.animate-philosophy-right',
                {
                    autoAlpha: 0,
                    x: 56,
                    rotationY: 8
                },
                {
                    autoAlpha: 1,
                    x: 0,
                    rotationY: 0,
                    duration: 0.9,
                    ease: "power2.out"
                }, "-=0.5")
    }

    // Animación de la cita
    const animateQuoteReveal = () => {
        gsap.fromTo('.animate-quote-reveal',
            {
                autoAlpha: 0,
                scale: 0.9,
                y: 20
            },
            {
                autoAlpha: 1,
                scale: 1,
                y: 0,
                duration: 0.7,
                ease: "back.out(1.7)",
                scrollTrigger: {
                    trigger: '.animate-quote-reveal',
                    start: "top 90%",
                    toggleActions: "play none none none"
                }
            }
        )
    }

    const animateScrollFocus = () => {
        const list = document.querySelector<HTMLElement>('.philosophyList')
        if (!list) return
        const items = Array.from(list.querySelectorAll<HTMLElement>('.philosophyListItem'))
        if (items.length < 2) return
        let current = 0

        const focus = (index: number) => {
            if (index === current) return
            items[current]?.classList.remove('is-current')
            items[index]?.classList.add('is-current')
            current = index
        }

        const updateFocus = () => {
            const focusLine = window.innerHeight * 0.5
            const closest = items.reduce((best, item, index) => {
                const rect = item.getBoundingClientRect()
                const distance = Math.abs(rect.top + rect.height / 2 - focusLine)
                return distance < best.distance ? { index, distance } : best
            }, { index: 0, distance: Number.POSITIVE_INFINITY })
            focus(closest.index)
        }

        ScrollTrigger.create({
            trigger: list.closest('.philosophyContainer') ?? list,
            start: 'top bottom',
            end: 'bottom top',
            onUpdate: updateFocus,
            onRefresh: updateFocus,
            onEnter: updateFocus,
            onEnterBack: updateFocus,
            onLeaveBack: () => focus(0),
            onLeave: () => focus(items.length - 1),
        })
    }

    return {
        animateTitleReveal,
        animateFadeUp,
        animateSplitContainer,
        animateQuoteReveal,
        animateScrollFocus
    }
}

export const createContactAnimations = () => {
    // Split animation para formulario e información
    const animateContactSplit = () => {
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: '.animate-split-contact',
                start: "top 88%",
                toggleActions: "play none none none"
            }
        })

        tl.fromTo('.animate-from-left',
            {
                autoAlpha: 0,
                x: -56,
                rotationY: -8
            },
            {
                autoAlpha: 1,
                x: 0,
                rotationY: 0,
                duration: 0.9,
                ease: "power2.out"
            }
        )
            .fromTo('.animate-from-right',
                {
                    autoAlpha: 0,
                    x: 56,
                    rotationY: 8
                },
                {
                    autoAlpha: 1,
                    x: 0,
                    rotationY: 0,
                    duration: 0.9,
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
                        start: "top 92%",
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
                { autoAlpha: 0, y: 24 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.7,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: element,
                        start: ELEMENT_TRIGGER_START,
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
                { autoAlpha: 0, y: 32 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.7,
                    delay: index * 0.1,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: element,
                        start: "top 92%",
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
                autoAlpha: 0,
                y: 30
            },
            {
                autoAlpha: 1,
                y: 0,
                duration: 0.7,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: '.animate-buttons-group',
                    start: "top 92%",
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
                    autoAlpha: 0,
                    x: 20
                },
                {
                    autoAlpha: 1,
                    x: 0,
                    duration: 0.5,
                    delay: index * 0.08,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: '.animate-schedule',
                        start: "top 92%",
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
