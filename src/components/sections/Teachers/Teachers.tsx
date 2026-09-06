import { TeacherCard } from '@/components/ui/TeacherCard/TeacherCard'
import './_teachers.scss'
import type { HomePageContent } from '@/lib/home-page-content'

type Props = { content: HomePageContent['teachers'] }

export const Teachers = ({ content }: Props) => {
    return (
        <div className="teachers" id="profesores">
            <h2 className='teachersTitle animate-typewriter'>{content.title}</h2>
            <h3 className='teachersSubtitle animate-reveal-text'>{content.subtitle}</h3>
            <div className='teacherList animate-team-entrance'>
                {content.items.map((teacher, index) => (
                    <div className="teacher-item stagger-card" data-delay={`${index * .2}`} key={`${teacher.name}-${index}`}>
                        <TeacherCard name={teacher.name} image={teacher.image.url} description={teacher.description} instagramLink={teacher.instagramUrl} videoUrl={teacher.videoUrl} />
                    </div>
                ))}
            </div>
        </div>
    )
}
