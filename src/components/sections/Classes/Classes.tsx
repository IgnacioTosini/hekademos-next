import { ClassCard } from '@/components/ui/ClassCard/ClassCard'
import './_classes.scss'

export const Classes = () => {
    return (
        <div className='classes' id="clases">
            <h2 className='classesTitle animate-on-scroll'>Nuestras clases</h2>
            <p className='classesDescription animate-on-scroll'>Descubre nuestras propuestas de entrenamiento diseñadas para transformar tu relación con el movimiento</p>

            <div className='classesContainer'>
                <div className="stagger-card">
                    <ClassCard
                        title="Entrenamiento funcional consciente"
                        description="Mejora tu fuerza, movilidad y control corporal a través de ejercicios que desarrollan la conexión mente-cuerpo."
                        list={["Fortalecimiento integral", "Movilidad articular", "Control postural", "Conciencia corporal"]}
                        image="/hekademosTitle.jpg"
                    />
                </div>
                <div className="stagger-card">
                    <ClassCard
                        title='Calistenia y ejercicios avanzados'
                        description='Domina movimientos complejos como planche, front lever, muscle up y verticales con progresiones seguras.'
                        list={["Planche progresión", "Front lever", "Muscle up", "Verticales"]}
                        image="/hekademosTitle.jpg"
                    />
                </div>
                <div className="stagger-card">
                    <ClassCard
                        title='Planificación individualizada'
                        description='Programa diseñado específicamente según tu nivel actual, objetivos y necesidades particulares.'
                        list={["Evaluación inicial", "Plan personalizado", "Seguimiento continuo", "Ajustes periódicos"]}
                        image="/hekademosTitle.jpg"
                    />
                </div>
            </div>
        </div>
    )
}