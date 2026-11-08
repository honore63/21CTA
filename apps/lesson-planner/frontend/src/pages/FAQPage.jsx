import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, HelpCircle } from 'lucide-react';
import InformationLayout from '../components/InformationLayout';

const FAQPage = () => {
    const [openIndex, setOpenIndex] = useState(null);

    const faqs = [
        {
            question: "Is the lesson plan formatted strictly to REB standards?",
            answer: "Yes, our AI Engine outputs fully structured matrices adhering to the official Rwandan 5Es pedagogy methodology formatting. This ensuring your plan meets the Competence-Based Curriculum (CBC) requirements."
        },
        {
            question: "How long does it take to make an extensive lesson?",
            answer: "If you give proper AI context regarding topic and grade, you can generate comprehensive multi-hour plans within 30 to 60 seconds. You can then review and edit them in real-time."
        },
        {
            question: "Will I lose my lessons if I sign out?",
            answer: "Absolutely not. All workspaces automatically map to secure cloud storage. Everything you generate or import manually will be ready for you next time you sign in from any device."
        },
        {
            question: "Is the AI Guide capable of exporting to PDF/Excel?",
            answer: "Yes, you can natively print or download specific lesson plan matrices dynamically using the action buttons within an exported REB view."
        },
        {
            question: "Who developed this system?",
            answer: "This platform is a passionate project tailored for educational technology advancement in East Africa by Roger HODALI and Honore TUYISHIME, combining technical architecture with pedagogical expertise."
        }
    ];

    const toggleFAQ = (idx) => {
        setOpenIndex(openIndex === idx ? null : idx);
    };

    return (
        <InformationLayout title="Frequently Asked Questions" breadcrumb="Support">
            <h1 className="info-title">
                Got <span className="highlight-gradient">Questions?</span> We have Answers.
            </h1>
            <p className="info-subtitle">
                Get immediate responses to common queries regarding the 21st Century Lesson Plan environment and our AI pedagogical engine.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                {faqs.map((faq, idx) => {
                    const isOpen = openIndex === idx;
                    return (
                        <div key={idx} className="card" style={{ 
                            overflow: 'hidden',
                            transition: 'all var(--t-base)',
                            borderColor: isOpen ? 'var(--c-brand)' : 'var(--c-border)'
                        }}>
                            <button 
                                onClick={() => toggleFAQ(idx)}
                                style={{ 
                                    width: '100%', 
                                    padding: 'var(--sp-5) var(--sp-6)', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    color: 'var(--c-text-primary)',
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    textAlign: 'left'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <HelpCircle size={20} style={{ color: isOpen ? 'var(--c-brand)' : 'var(--c-text-muted)' }} />
                                    {faq.question}
                                </span>
                                {isOpen ? <Minus size={18} style={{ color: 'var(--c-brand)' }} /> : <Plus size={18} style={{ color: 'var(--c-text-muted)' }} />}
                            </button>
                            {isOpen && (
                                <div style={{ padding: '0 var(--sp-6) var(--sp-6) 52px' }} className="animate-fade">
                                    <p className="info-text" style={{ marginBottom: 0 }}>{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: 'var(--sp-12)', textAlign: 'center' }}>
                <p className="info-text">Still need help?</p>
                <Link to="/contact" className="btn btn-primary">Contact our team</Link>
            </div>
        </InformationLayout>
    );
};

export default FAQPage;
