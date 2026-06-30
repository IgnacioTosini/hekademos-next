import { FaClock } from 'react-icons/fa'
import './_trainingSchedule.scss'

const scheduleGroups = [
    {
        days: 'Lunes / Miércoles / Viernes',
        times: ['07:30', '09:00', '10:30', '16:00', '17:30', '19:00'],
    },
    {
        days: 'Martes / Jueves',
        times: ['16:00', '17:30', '19:00'],
    },
]

export const TrainingSchedule = () => {
    return (
        <div className="trainingSchedule" id="horarios">
            <h2 className="trainingScheduleTitle animate-on-scroll">Horarios de entrenamiento</h2>
            <p className="trainingScheduleDescription animate-on-scroll">
                Elegí el turno que mejor acompaña tu rutina y sostené tu práctica con constancia.
            </p>

            <div className="trainingScheduleCards">
                {scheduleGroups.map((group) => (
                    <div className="scheduleCard stagger-card" key={group.days}>
                        <div className="scheduleCardHeader">
                            <span className="scheduleIcon">
                                <FaClock />
                            </span>
                            <h3>{group.days}</h3>
                        </div>

                        <div className="scheduleTimes" aria-label={`Horarios para ${group.days}`}>
                            {group.times.map((time) => (
                                <span className="scheduleTime" key={time}>
                                    {time}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
