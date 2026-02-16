import { gsap } from './gsapConfig'

export const pageTransitions = {
    // Transición de entrada para páginas
    fadeIn: (element: string | Element) => {
        return gsap.fromTo(element,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
        )
    },

    // Transición de salida para páginas
    fadeOut: (element: string | Element) => {
        return gsap.to(element, {
            opacity: 0,
            y: -30,
            duration: 0.6,
            ease: "power2.in"
        })
    },

    // Transición deslizante desde la derecha
    slideInRight: (element: string | Element) => {
        return gsap.fromTo(element,
            { x: "100%", opacity: 0 },
            { x: "0%", opacity: 1, duration: 1, ease: "power2.out" }
        )
    },

    // Transición deslizante desde la izquierda
    slideInLeft: (element: string | Element) => {
        return gsap.fromTo(element,
            { x: "-100%", opacity: 0 },
            { x: "0%", opacity: 1, duration: 1, ease: "power2.out" }
        )
    },

    // Efecto de escala
    scaleIn: (element: string | Element) => {
        return gsap.fromTo(element,
            { scale: 0.8, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)" }
        )
    }
}

// Hook para usar transiciones de página
export const usePageTransition = () => {
    const animatePageEnter = (element: HTMLElement | null) => {
        if (element) {
            pageTransitions.fadeIn(element)
        }
    }

    const animatePageExit = (element: HTMLElement | null) => {
        if (element) {
            return pageTransitions.fadeOut(element)
        }
    }

    return { animatePageEnter, animatePageExit }
}