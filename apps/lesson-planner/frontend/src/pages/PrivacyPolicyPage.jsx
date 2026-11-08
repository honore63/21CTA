import React from 'react';
import InformationLayout from '../components/InformationLayout';

const PrivacyPolicyPage = () => {
    return (
        <InformationLayout title="Privacy & Policies" breadcrumb="Legal">
            <h1 className="info-title">
                Your <span className="highlight-gradient">Privacy</span> is Paramount.
            </h1>
            <p className="info-subtitle">
                Learn how the 21st Century Lesson Plan Generator handles your data with high security standards.
            </p>

            <article>
                <h2 className="info-section-title">1. Introduction</h2>
                <p className="info-text">Welcome to the 21st Century Lesson Plan Generator. This robust academic tool, developed to assist Rwandan educators according to REB standards, handles your lesson plans and generic data securely.</p>

                <h2 className="info-section-title">2. Data Collection</h2>
                <p className="info-text">We collect essential identifier info (like email) for account administration, alongside your generated class structures, subjects, and lesson plans synced to our secure cloud databases in real-time.</p>

                <h2 className="info-section-title">3. How we use your Information</h2>
                <p className="info-text">We leverage highly secure endpoints exclusively to allow our Pedagogy AI to build context for your lessons, and securely return REB-formatted content to your personalized Dashboard. Your data is strictly yours.</p>

                <h2 className="info-section-title">4. AI Service Usage</h2>
                <p className="info-text">Conversations with the built-in AI assistant are transmitted strictly to synthesize lesson preparation assistance. No personally sensitive information unrelated to educational modeling should be submitted to the AI.</p>

                <h2 className="info-section-title">5. Contact Us</h2>
                <p className="info-text">Developed closely for the needs of modern teaching. If you have any inquiries regarding data processing, please view the Creators/About Us contact details.</p>
            </article>
        </InformationLayout>
    );
};

export default PrivacyPolicyPage;
