import { FaClock } from 'react-icons/fa'
import type { HomePageContent } from '@/lib/home-page-content'
import type { ScheduleGroup } from './TrainingSchedule'
import './_trainingSchedule.scss'

export const TrainingScheduleView = ({ content, scheduleGroups }: { content: HomePageContent['trainingSchedule']; scheduleGroups: ScheduleGroup[] }) => (
    <div className="trainingSchedule" id="horarios">
        <div className="sectionHeader">
            <span className="sectionEyebrow">ENCONTRÁ TU MOMENTO</span>
            <h2 className="trainingScheduleTitle sectionTitle animate-on-scroll">{content.title}</h2>
            <p className="trainingScheduleDescription sectionLead animate-on-scroll">{content.subtitle}</p>
        </div>
        <div className="trainingScheduleCards">
            {scheduleGroups.map((group, index) => <div className="scheduleCard stagger-card" key={`${group.category}-${group.days}`}>
                <span className="scheduleCardIndex" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div className="scheduleCardHeader"><span className="scheduleIcon"><FaClock /></span><h3>{group.category} · {group.days}</h3></div>
                <div className="scheduleTimes" aria-label={`Horarios para ${group.days}`}>{group.times.map((time) => <span className="scheduleTime" key={time}>{time}</span>)}</div>
            </div>)}
            {scheduleGroups.length === 0 && <p className="trainingScheduleEmpty">{content.emptyMessage}</p>}
        </div>
    </div>
)
