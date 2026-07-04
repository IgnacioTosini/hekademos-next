import { ComunityCard } from '@/components/ui'
import './_comunity.scss'

export const Comunity = () => {
    return (
        <div className="comunity" id='comunidad'>
            <h2 className='comunityTitle animate-on-scroll'>Nuestra comunidad</h2>
            <h3 className='comunitySubtitle animate-on-scroll'>Más que entrenar juntos, creamos vínculos auténticos basados en el respeto mutuo y el crecimiento compartido</h3>
            <div className='comunityCardList'>
                <div className="stagger-card">
                    <ComunityCard
                        title="Respeto"
                        description="Cada persona es valorada sin importar su nivel."
                        image="Respeto"
                        imageUrl="/siempreEnMovimiento.png"
                    />
                </div>
                <div className="stagger-card">
                    <ComunityCard
                        title="Compañerismo"
                        description="Nos apoyamos mutuamente en cada paso del camino."
                        image="Compañerismo"
                        imageUrl="/siempreEnMovimiento.png"
                    />
                </div>
                <div className="stagger-card">
                    <ComunityCard
                        title="Progreso compartido"
                        description="Celebramos juntos cada logro, grande o pequeño."
                        image="Progreso compartido"
                        imageUrl="/siempreEnMovimiento.png"
                    />
                </div>
            </div>
        </div>
    )
}
