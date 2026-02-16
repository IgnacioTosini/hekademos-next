import { gsap } from '../animations/gsapConfig'

export const useScrollToSection = () => {
    const scrollToSection = (sectionClass: string) => {
        const element = document.querySelector(`.${sectionClass}`)
        if (element) {
            gsap.to(window, {
                duration: 1,
                scrollTo: {
                    y: element,
                    offsetY: 80 // Ajusta según la altura de tu header
                },
                ease: "power2.inOut"
            })
        }
    }

    return { scrollToSection }
}