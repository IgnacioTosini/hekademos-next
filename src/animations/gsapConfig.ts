import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

// Registrar plugins
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

// Configuración global
export const gsapConfig = {
    duration: 1,
    ease: "power2.out",
    scrollTriggerDefaults: {
        start: "top 80%",
        end: "bottom 20%",
        toggleActions: "play none none reverse"
    }
}

export { gsap, ScrollTrigger }