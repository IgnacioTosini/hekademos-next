import { FaExternalLinkAlt } from 'react-icons/fa';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import type { CoachDashboardStudent } from './CoachDashboard';

type ScheduleGroup = {
    schedule: string;
    time: string;
    category: string;
    students: CoachDashboardStudent[];
};

type Props = {
    scheduleDays: [string, ScheduleGroup[]][];
    scheduleCount: number;
};

export const CoachWeekCard = ({ scheduleDays, scheduleCount }: Props) => (
    <article className="coach-dashboard-card">
        <div className="coach-dashboard-card-header">
            <div>
                <span className="coach-dashboard-section-label">03 / ORGANIZACIÓN</span>
                <h2>Tu semana de clases</h2>
                <p>Horarios, alumnos y rutinas organizados por día.</p>
            </div>
            <span className="coach-dashboard-count">{scheduleCount} {scheduleCount === 1 ? 'turno' : 'turnos'}</span>
        </div>

        {scheduleCount > 0 ? (
            <div className="coach-schedule-days">
                {scheduleDays.map(([day, turns]) => (
                    <section className="coach-schedule-day" key={day} aria-label={`Clases del ${day}`}>
                        <div className="coach-schedule-day-header">
                            <h3>{day}</h3>
                            <span>{turns.length} {turns.length === 1 ? 'turno' : 'turnos'}</span>
                        </div>
                        <div className="coach-schedule-day-turns">
                            {turns.map((group) => (
                                <div className="coach-schedule-turn" key={group.schedule}>
                                    <div className="coach-schedule-turn-header">
                                        <div>
                                            <strong>{group.time}</strong>
                                            <span>{group.category}</span>
                                        </div>
                                        <small>{group.students.length} {group.students.length === 1 ? 'alumno' : 'alumnos'}</small>
                                    </div>
                                    <div className="coach-schedule-students">
                                        {group.students.map((student) => (
                                            <div className="coach-schedule-student" key={student.id}>
                                                <span>{student.name}</span>
                                                {student.routineExcelUrl ? (
                                                    <a href={student.routineExcelUrl} target="_blank" rel="noreferrer" aria-label={`Ver rutina de ${student.name}`}>
                                                        Rutina <FaExternalLinkAlt />
                                                    </a>
                                                ) : <small>Sin rutina</small>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        ) : (
            <EmptyState
                compact
                className="coach-dashboard-empty"
                title="Sin horarios asignados"
                description="Todavia no hay alumnos con turnos elegidos."
            />
        )}
    </article>

);
