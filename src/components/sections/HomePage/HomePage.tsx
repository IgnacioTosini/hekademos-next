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
import './_homePage.scss';

export const HomePage = () => {
    return (
        <HomeAnimations>
            <div className="banner">
                <Banner />
            </div>
            <div className="about-us-section">
                <AboutUs />
            </div>
            <div className="teachers-section">
                <Teachers />
            </div>
            <div className="classes-section">
                <Classes />
            </div>
            <div className="training-schedule-section">
                <TrainingSchedule />
            </div>
            <div className="membership-plans-section">
                <MembershipPlans />
            </div>
            <div className="comunity-section">
                <Comunity />
            </div>
            <div className="philosophy-section">
                <Philosophy />
            </div>
            <div className="faq-section">
                <FAQ />
            </div>
            <div className="contact-section">
                <Contact />
            </div>
        </HomeAnimations>
    );
};
