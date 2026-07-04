import { PillarCard } from '@/components/ui'
import './_aboutUs.scss'
import Image from 'next/image'

export const AboutUs = () => {
    return (
        <div className="aboutUs" id="sobre-nosotros">
            <h2 className="aboutUsTitle animate-title">Sobre Nosotros</h2>
            <div className='aboutUsContent'>
                <div className='aboutUsText animate-text-left'>
                    <h3 className="animate-on-scroll">Nuestra Historia</h3>
                    <p className="animate-on-scroll">
                        Hekademos nació de la necesidad de crear un espacio donde el entrenamiento fuera más que solo ejercicio. Queríamos desarrollar una metodología que integrara la conciencia corporal con el desarrollo físico, creando una experiencia transformadora completa.
                    </p>

                    <p className="animate-on-scroll">Creemos que cada persona tiene un potencial único que puede ser desbloqueado a través del movimiento consciente y la práctica constante. Nuestro enfoque va más allá de los resultados físicos.</p>

                    <p className='especialText animate-special-text'>&ldquo;No entrenamos solo para vernos mejor, entrenamos para estar mejor.&rdquo;</p>
                </div>
                <picture className='aboutUsImage animate-image-right'>
                    <Image
                        src="/aboutUsImage.jpg"
                        alt="Sobre Nosotros"
                        width={600}
                        height={400}
                        priority={false}
                        quality={85}
                        placeholder="blur"
                        blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'%3E%3Crect fill='%23f0f0f0'/%3E%3C/svg%3E"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                    />
                </picture>
            </div>

            <div className='usPillars'>
                <h2 className="usPillarsTitle animate-title">Nuestros Pilares</h2>
                <p className="animate-on-scroll">Cuatro principios fundamentales que guían todo lo que hacemos en Hekademos</p>
                <div className='pillarsList'>
                    <div className="stagger-card">
                        <PillarCard
                            title="Conciencia"
                            description="Desarrollamos la conexión mente-cuerpo para un entrenamiento más efectivo y consciente."
                        />
                    </div>
                    <div className="stagger-card">
                        <PillarCard
                            title="Comunidad"
                            description="Creamos un espacio de respeto y compañerismo donde todos pueden crecer juntos."
                        />
                    </div>
                    <div className="stagger-card">
                        <PillarCard
                            title="Movimiento"
                            description="Exploramos el potencial del cuerpo humano a través del movimiento natural y funcional."
                        />
                    </div>
                    <div className="stagger-card">
                        <PillarCard
                            title="Transformación"
                            description="Facilitamos cambios profundos que van más allá de lo físico, hacia el bienestar integral."
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
