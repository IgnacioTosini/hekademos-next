import { AboutUs } from '../AboutUs/AboutUs';
import { Banner } from '../Banner/Banner';
import { Classes } from '../Classes/Classes';
import { Comunity } from '../Comunity/Comunity';
import { Contact } from '../Contact/Contact';
import { FAQ } from '../FAQ/FAQ';
import { MembershipPlans } from '../MembershipPlans/MembershipPlans';
import { Philosophy } from '../Philosophy/Philosophy';
import { Teachers } from '../Teachers/Teachers';
import { TrainingSchedule } from '../TrainingSchedule/TrainingSchedule';
import { HomeAnimations } from './HomeAnimations';
import { getHomePageContent } from '@/lib/site-content';
import './_homePage.scss';

export const HomePage = async () => {
    const content = await getHomePageContent();

    return (
        <HomeAnimations>
            <div className="banner">
                <Banner content={content.banner} />
            </div>
            <div className="about-us-section">
                <AboutUs content={content.about} />
            </div>
            <div className="teachers-section">
                <Teachers content={content.teachers} />
            </div>
            <div className="classes-section">
                <Classes content={content.classes} />
            </div>
            <div className="training-schedule-section">
                <TrainingSchedule content={content.trainingSchedule} />
            </div>
            <div className="membership-plans-section">
                <MembershipPlans content={content.membershipPlans} />
            </div>
            <div className="comunity-section">
                <Comunity content={content.community} />
            </div>
            <div className="philosophy-section">
                <Philosophy content={content.philosophy} />
            </div>
            <div className="faq-section">
                <FAQ content={content.faq} />
            </div>
            <div className="contact-section">
                <Contact content={content.contact} />
            </div>
        </HomeAnimations>
    );
};
