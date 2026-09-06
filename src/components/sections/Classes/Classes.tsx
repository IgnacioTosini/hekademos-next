import { ClassCard } from '@/components/ui/ClassCard/ClassCard'
import './_classes.scss'
import type { HomePageContent } from '@/lib/home-page-content'

type Props = { content: HomePageContent['classes'] }

export const Classes = ({ content }: Props) => {
    return (
        <div className='classes' id="clases">
            <h2 className='classesTitle animate-on-scroll'>{content.title}</h2>
            <p className='classesDescription animate-on-scroll'>{content.subtitle}</p>

            <div className='classesContainer'>
                {content.items.map((classItem, index) => (
                    <div className="stagger-card" key={`${classItem.title}-${index}`}>
                        <ClassCard title={classItem.title} description={classItem.description} list={classItem.features} image={classItem.image.url} videoUrl={classItem.videoUrl} />
                    </div>
                ))}
            </div>
        </div>
    )
}
