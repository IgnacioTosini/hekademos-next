export type SiteContentImage = { url: string; publicId: string; alt: string };

export type HomePageContent = {
    navigation: { primaryLinks: Array<{ label: string; href: string }>; menuLinks: Array<{ label: string; href: string }> };
    header: { logo: SiteContentImage; ctaLabel: string; ctaHref: string };
    banner: { title: string; subtitle: string; background: SiteContentImage; primaryAction: { label: string; href: string }; secondaryAction: { label: string; href: string } };
    about: { title: string; storyTitle: string; paragraphs: string[]; quote: string; image: SiteContentImage; pillarsTitle: string; pillarsSubtitle: string; pillars: Array<{ title: string; description: string; videoUrl: string }> };
    teachers: { title: string; subtitle: string; items: Array<{ name: string; description: string; instagramUrl: string; videoUrl: string; image: SiteContentImage }> };
    classes: { title: string; subtitle: string; items: Array<{ title: string; description: string; features: string[]; videoUrl: string; image: SiteContentImage }> };
    trainingSchedule: { title: string; subtitle: string; emptyMessage: string };
    membershipPlans: { title: string; subtitle: string; recommendedLabel: string; actionLabel: string; emptyMessage: string; whatsappMessage: string };
    community: { title: string; subtitle: string; items: Array<{ title: string; description: string; icon: "people" | "heart" | "trend"; videoUrl: string; image: SiteContentImage }> };
    philosophy: { title: string; subtitle: string; quote: string; image: SiteContentImage; items: Array<{ title: string; description: string }> };
    faq: { title: string; subtitle: string; items: Array<{ question: string; answer: string }> };
    contact: {
        title: string; subtitle: string;
        form: { title: string; namePlaceholder: string; emailPlaceholder: string; messagePlaceholder: string; submitLabel: string; submittingLabel: string; successMessage: string };
        infoTitle: string; email: string; phone: string; address: string; whatsappLabel: string; whatsappMessage: string; instagramLabel: string; instagramUrl: string; scheduleTitle: string;
        schedule: Array<{ day: string; hours: string }>;
    };
    footer: { logo: SiteContentImage; tagline: string; linksTitle: string; socialTitle: string; instagramUrl: string; youtubeUrl: string; copyright: string; credit: string; closingText: string };
};

export const defaultHomePageContent: HomePageContent = {
    navigation: {
        primaryLinks: [
            { label: "Inicio", href: "/" }, { label: "Clases", href: "/#clases" }, { label: "Horarios", href: "/#horarios" },
            { label: "Planes", href: "/#planes" }, { label: "Contacto", href: "/#contacto" },
        ],
        menuLinks: [
            { label: "Inicio", href: "/" }, { label: "Sobre Nosotros", href: "/#sobre-nosotros" }, { label: "Profesores", href: "/#profesores" },
            { label: "Clases", href: "/#clases" }, { label: "Horarios", href: "/#horarios" }, { label: "Planes", href: "/#planes" },
            { label: "Comunidad", href: "/#comunidad" }, { label: "Filosofía", href: "/#filosofia" },
            { label: "Preguntas frecuentes", href: "/#preguntas-frecuentes" }, { label: "Contacto", href: "/#contacto" },
        ],
    },
    header: {
        logo: { url: "/LogoHekademos.png", publicId: "", alt: "Logo de Hekademos" },
        ctaLabel: "Sumate a Hekademos", ctaHref: "/#contacto",
    },
    banner: {
        title: "Bienvenido a Hekademos",
        subtitle: "Entrenamientos conscientes para ganar fuerza, movilidad y presencia.",
        background: { url: "/banner.png", publicId: "", alt: "Entrenamiento en Hekademos" },
        primaryAction: { label: "Conocé nuestras clases", href: "/#clases" },
        secondaryAction: { label: "Nuestra Filosofía", href: "/#filosofia" },
    },
    about: {
        title: "Sobre Nosotros", storyTitle: "Nuestra Historia",
        paragraphs: [
            "Hekademos nació de la necesidad de crear un espacio donde el entrenamiento fuera más que solo ejercicio. Queríamos desarrollar una metodología que integrara la conciencia corporal con el desarrollo físico, creando una experiencia transformadora completa.",
            "Creemos que cada persona tiene un potencial único que puede ser desbloqueado a través del movimiento consciente y la práctica constante. Nuestro enfoque va más allá de los resultados físicos.",
        ],
        quote: "No entrenamos solo para vernos mejor, entrenamos para estar mejor.",
        image: { url: "/aboutUsImage.jpg", publicId: "", alt: "Comunidad de Hekademos" },
        pillarsTitle: "Nuestros Pilares",
        pillarsSubtitle: "Cuatro principios fundamentales que guían todo lo que hacemos en Hekademos",
        pillars: [
            { title: "Conciencia", description: "Desarrollamos la conexión mente-cuerpo para un entrenamiento más efectivo y consciente.", videoUrl: "" },
            { title: "Comunidad", description: "Creamos un espacio de respeto y compañerismo donde todos pueden crecer juntos.", videoUrl: "" },
            { title: "Movimiento", description: "Exploramos el potencial del cuerpo humano a través del movimiento natural y funcional.", videoUrl: "" },
            { title: "Transformación", description: "Facilitamos cambios profundos que van más allá de lo físico, hacia el bienestar integral.", videoUrl: "" },
        ],
    },
    teachers: {
        title: "Nuestros Instructores",
        subtitle: "Conocé al equipo de profesionales que te acompañará en tu transformación. Cada uno aporta su experiencia y pasión por el movimiento consciente.",
        items: [
            { name: "Juani Iglesias", description: "Entrenador especializado en calistenia🤸", instagramUrl: "https://www.instagram.com/juaniglesias.move", videoUrl: "", image: { url: "/teachers/juanIglesias.png", publicId: "", alt: "Juani Iglesias" } },
            { name: "Victoria Menendez", description: "Prof. Educación Física\nMovimiento y educación corporal", instagramUrl: "https://www.instagram.com/vitomenendez", videoUrl: "", image: { url: "/teachers/victoriaMenendez.png", publicId: "", alt: "Victoria Menendez" } },
            { name: "Dalmiro Mandrini", description: "🤸🏻Profesor de educación física y aprendiz constante.", instagramUrl: "https://www.instagram.com/dalmiro_mandrini", videoUrl: "", image: { url: "/teachers/dalmiroMandrini.png", publicId: "", alt: "Dalmiro Mandrini" } },
            { name: "Marian Calomino", description: "Atleta e instructor de Calistenia y StreetWorkout 🥷🏼", instagramUrl: "https://www.instagram.com/mariancsw", videoUrl: "", image: { url: "/teachers/marianCalomino.png", publicId: "", alt: "Marian Calomino" } },
        ],
    },
    classes: {
        title: "Nuestras clases",
        subtitle: "Descubre nuestras propuestas de entrenamiento diseñadas para transformar tu relación con el movimiento",
        items: [
            { title: "Entrenamiento funcional consciente", description: "Mejora tu fuerza, movilidad y control corporal a través de ejercicios que desarrollan la conexión mente-cuerpo.", features: ["Fortalecimiento integral", "Movilidad articular", "Control postural", "Conciencia corporal"], videoUrl: "", image: { url: "/hekademosTitle.jpg", publicId: "", alt: "Entrenamiento funcional consciente" } },
            { title: "Calistenia y ejercicios avanzados", description: "Domina movimientos complejos como planche, front lever, muscle up y verticales con progresiones seguras.", features: ["Planche progresión", "Front lever", "Muscle up", "Verticales"], videoUrl: "", image: { url: "/hekademosTitle.jpg", publicId: "", alt: "Calistenia y ejercicios avanzados" } },
            { title: "Planificación individualizada", description: "Programa diseñado específicamente según tu nivel actual, objetivos y necesidades particulares.", features: ["Evaluación inicial", "Plan personalizado", "Seguimiento continuo", "Ajustes periódicos"], videoUrl: "", image: { url: "/hekademosTitle.jpg", publicId: "", alt: "Planificación individualizada" } },
        ],
    },
    trainingSchedule: {
        title: "Horarios de entrenamiento",
        subtitle: "Elegí el turno que mejor acompaña tu rutina y sostené tu práctica con constancia.",
        emptyMessage: "Por ahora no hay horarios disponibles. Escribinos y te contamos los turnos vigentes.",
    },
    membershipPlans: {
        title: "Planes de membresía",
        subtitle: "Opciones simples para que entrenes con frecuencia, seguimiento y una progresión sostenible.",
        recommendedLabel: "Recomendado", actionLabel: "Quiero este plan",
        emptyMessage: "Por ahora no hay planes disponibles. Escribinos y te contamos las opciones vigentes.",
        whatsappMessage: "Hola Hekademos, quiero consultar por el plan {plan} de {categoria}, {dias} días por semana ({precio}).",
    },
    community: {
        title: "Nuestra comunidad",
        subtitle: "Más que entrenar juntos, creamos vínculos auténticos basados en el respeto mutuo y el crecimiento compartido",
        items: [
            { title: "Respeto", description: "Cada persona es valorada sin importar su nivel.", icon: "people", videoUrl: "", image: { url: "/siempreEnMovimiento.png", publicId: "", alt: "Respeto" } },
            { title: "Compañerismo", description: "Nos apoyamos mutuamente en cada paso del camino.", icon: "heart", videoUrl: "", image: { url: "/siempreEnMovimiento.png", publicId: "", alt: "Compañerismo" } },
            { title: "Progreso compartido", description: "Celebramos juntos cada logro, grande o pequeño.", icon: "trend", videoUrl: "", image: { url: "/siempreEnMovimiento.png", publicId: "", alt: "Progreso compartido" } },
        ],
    },
    philosophy: {
        title: "Filosofía del movimiento",
        subtitle: "Nuestro enfoque trasciende el ejercicio tradicional. Creemos que el movimiento consciente es una herramienta de transformación personal que integra cuerpo, mente y espíritu.",
        quote: "El cuerpo es el templo del alma, y el movimiento es su lenguaje.",
        image: { url: "/banner.png", publicId: "", alt: "Filosofía de Hekademos" },
        items: [
            { title: "Conciencia corporal", description: "Desarrollamos la capacidad de percibir y controlar nuestro cuerpo en cada movimiento, creando una conexión profunda entre mente y músculo." },
            { title: "Movimiento natural", description: "Priorizamos patrones de movimiento que respetan la biomecánica humana, promoviendo la salud articular y la funcionalidad a largo plazo." },
            { title: "Progresión consciente", description: "Cada avance se construye sobre bases sólidas, respetando los tiempos individuales y evitando el riesgo de lesiones por precipitación." },
            { title: "Integración holística", description: "Entendemos que el bienestar físico está interconectado con el mental y emocional, trabajando desde una perspectiva integral." },
        ],
    },
    faq: {
        title: "Preguntas frecuentes", subtitle: "Respuestas simples para que puedas empezar con claridad y confianza.",
        items: [
            { question: "¿Necesito experiencia previa?", answer: "No. Adaptamos las progresiones a tu nivel actual para que entrenes con seguridad y puedas avanzar paso a paso." },
            { question: "¿Pueden sumarse principiantes?", answer: "Sí. La propuesta está pensada para acompañar tanto a quienes recién empiezan como a quienes ya tienen experiencia entrenando." },
            { question: "¿Qué tengo que llevar?", answer: "Ropa cómoda, agua y ganas de moverte. Nosotros te orientamos con el resto durante la clase." },
            { question: "¿Puedo recuperar clases perdidas?", answer: "Podés coordinar la recuperación según disponibilidad de cupos y horarios. Lo vemos caso por caso para cuidar la organización del grupo." },
            { question: "¿Cómo me inscribo?", answer: "Escribinos desde el formulario o por WhatsApp y te ayudamos a elegir el plan y horario que mejor se adapte a tu rutina." },
        ],
    },
    contact: {
        title: "Contacto", subtitle: "Da el primer paso hacia tu transformación. Estamos aquí para acompañarte en tu camino.",
        form: { title: "Envíanos un mensaje", namePlaceholder: "Tu nombre", emailPlaceholder: "Tu email", messagePlaceholder: "Tu mensaje", submitLabel: "Enviar", submittingLabel: "Enviando...", successMessage: "¡Mensaje enviado correctamente!" },
        infoTitle: "Información de Contacto", email: "info@hekademos.com", phone: "+54 9 11 2234-5698", address: "Av. Ejemplo 1234, Buenos Aires",
        whatsappLabel: "Escribir por WhatsApp", whatsappMessage: "Hola Hekademos, quiero consultar por las clases.",
        instagramLabel: "Seguir en Instagram", instagramUrl: "https://www.instagram.com/hekademos.em", scheduleTitle: "Horario de Atención",
        schedule: [
            { day: "Lunes", hours: "7:00 - 21:00" }, { day: "Martes", hours: "7:00 - 21:00" },
            { day: "Miércoles", hours: "7:00 - 21:00" }, { day: "Jueves", hours: "7:00 - 21:00" },
            { day: "Viernes", hours: "7:00 - 21:00" }, { day: "Sábados y Domingos", hours: "Cerrado" },
        ],
    },
    footer: {
        logo: { url: "/LogoHekademos.png", publicId: "", alt: "Logo de Hekademos" },
        tagline: "Movimiento consciente para una vida con propósito.", linksTitle: "Enlaces rápidos", socialTitle: "Seguinos",
        instagramUrl: "https://www.instagram.com/hekademos.em", youtubeUrl: "https://www.youtube.com/@HekademosE.M",
        copyright: "Hekademos. Todos los derechos reservados.", credit: "Creado por Ignacio Tosini",
        closingText: "Hekademos — Movimiento consciente para una vida con propósito.",
    },
};

export const cloneDefaultHomePageContent = (): HomePageContent => JSON.parse(JSON.stringify(defaultHomePageContent)) as HomePageContent;
