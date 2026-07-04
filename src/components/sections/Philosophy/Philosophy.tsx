import Image from 'next/image'
import './_philosophy.scss'

export const Philosophy = () => {
    return (
        <div className='philosophyContainer' id='filosofia'>
            <h2 className='philosophyTitle animate-title-reveal'>Filosofía del movimiento</h2>
            <p className='philosophyDescription animate-fade-up'>
                Nuestro enfoque trasciende el ejercicio tradicional. Creemos que el movimiento consciente es una herramienta de transformación personal que integra cuerpo, mente y espíritu.
            </p>

            <div className='philosophySection animate-split-container'>
                <picture className='imgContainer animate-philosophy-left parallax-image'>
                    <Image src="/banner.png" alt="Hekademos Logo" width={400} height={400} />
                    <p className='textOnImage animate-quote-reveal'>&ldquo;El cuerpo es el templo del alma, y el movimiento es su lenguaje.&rdquo;</p>
                </picture>

                <ul className='philosophyList animate-philosophy-right'>
                    <li className='philosophyListItem animate-list-item' data-index="0">
                        <h3 className='animate-philosophy-text'>Conciencia corporal</h3>
                        <p className='animate-philosophy-text'>Desarrollamos la capacidad de percibir y controlar nuestro cuerpo en cada movimiento, creando una conexión profunda entre mente y músculo.</p>
                    </li>
                    <li className='philosophyListItem animate-list-item' data-index="1">
                        <h3 className='animate-philosophy-text'>Movimiento natural</h3>
                        <p className='animate-philosophy-text'>Priorizamos patrones de movimiento que respetan la biomecánica humana, promoviendo la salud articular y la funcionalidad a largo plazo.</p>
                    </li>
                    <li className='philosophyListItem animate-list-item' data-index="2">
                        <h3 className='animate-philosophy-text'>Progresión consciente</h3>
                        <p className='animate-philosophy-text'>Cada avance se construye sobre bases sólidas, respetando los tiempos individuales y evitando el riesgo de lesiones por precipitación.</p>
                    </li>
                    <li className='philosophyListItem animate-list-item' data-index="3">
                        <h3 className='animate-philosophy-text'>Integración holística</h3>
                        <p className='animate-philosophy-text'>Entendemos que el bienestar físico está interconectado con el mental y emocional, trabajando desde una perspectiva integral.</p>
                    </li>
                </ul>
            </div>
        </div>
    )
}