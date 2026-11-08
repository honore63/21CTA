import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, ExternalLink, Users, Code, BookOpen, Star } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import Footer from '../components/Footer';
import './AboutUsPage.css';

const AboutUsPage = () => {
    const creators = [
        {
            name: "Honore TUYISHIME",
            role: "Founder & Education Specialist",
            desc: "A dedicated teacher with a passion for educational technology. Honore ensures that every lesson plan generated perfectly aligns with Rwanda's CBC and REB standards.",
            image: "/images/Honore.jpeg",
            position: "center 15%",
            links: {
                github: "https://github.com/Honore-T",
                email: "tuyishimehonore63@gmail.com",
                phone: "+250 791 684 429"
            }
        },
        {
            name: "Roger HODALI",
            role: "Co-Founder & Lead Developer",
            desc: "Expert in scalable web architecture and AI integration. Roger designed the core engine of the 21st Century Lesson Plan Generator to ensure speed and reliability for thousands of users.",
            image: "/images/Roger.jpg",
            position: "center center",
            links: {
                github: "https://github.com/Rogersho",
                email: "hodaliroger@gmail.com",
                phone: "+250 780 988 783"
            }
        }
    ];

    return (
        <div className="about-page-root">
            <PublicNavbar />

            {/* Hero Section */}
            <section className="about-hero animate-fade">
                <div className="container">
                    <span className="badge badge-brand">Our Mission</span>
                    <h1>Bridging the gap between <span className="text-gradient">Technology</span> and <span className="text-gradient">Teaching</span>.</h1>
                    <p className="hero-p">
                        We are on a mission to modernize Rwandan education by providing teachers with world-class AI tools that simplify administration and enhance pedagogical quality.
                    </p>
                </div>
            </section>

            {/* Vision Section */}
            <section className="vision-section animate-slide-up">
                <div className="container">
                    <div className="vision-grid">
                        <div className="vision-card">
                            <div className="icon-wrapper"><BookOpen size={32} /></div>
                            <h3>CBC Aligned</h3>
                            <p>Every feature we build is strictly mapped to the Rwanda Competence-Based Curriculum (CBC).</p>
                        </div>
                        <div className="vision-card">
                            <div className="icon-wrapper"><Users size={32} /></div>
                            <h3>Teacher Centric</h3>
                            <p>Built by teachers, for teachers. We understand the daily challenges in the classroom.</p>
                        </div>
                        <div className="vision-card">
                            <div className="icon-wrapper"><Code size={32} /></div>
                            <h3>State of the Art</h3>
                            <p>Using the latest DLP AI models to ensure professional output.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Creators Section */}
            <section className="creators-section">
                <div className="container">
                    <div className="section-header">
                        <h2>The Creators</h2>
                        <p>Meet the team behind the 21st Century Lesson Plan Generator</p>
                    </div>

                    <div className="creators-grid">
                        {creators.map((c, i) => (
                            <div key={i} className="creator-card card">
                                <div className="creator-image">
                                    <img
                                        src={c.image}
                                        alt={c.name}
                                        style={{ objectPosition: c.position }}
                                        onError={(e) => e.target.src = "https://ui-avatars.com/api/?name=" + c.name}
                                    />
                                </div>
                                <div className="creator-info">
                                    <h3>{c.name}</h3>
                                    <span className="role">{c.role}</span>
                                    <p>{c.desc}</p>
                                    <div className="creator-links">
                                        <a href={c.links.github} target="_blank" rel="noopener noreferrer"><Code size={18} /></a>
                                        <a href={`mailto:${c.links.email}`}><Mail size={18} /></a>
                                        <a href={`tel:${c.links.phone}`} title={c.links.phone}><Phone size={18} /></a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why we built this */}
            <section className="why-built-section glass">
                <div className="container">
                    <div className="why-content">
                        <h2>Why we built this?</h2>
                        <p>
                            In 2024, we noticed that while Rwanda was rapidly digitalizing, teachers were still spending hours every evening writing lesson plans by hand. We saw an opportunity to use AI not to replace teachers, but to empower them—giving them back their time to focus on what matters most: **Teaching.**
                        </p>
                        <div className="stats-mini">
                            <div className="stat-item">
                                <strong>100%</strong>
                                <span>REB Compliant</span>
                            </div>
                            <div className="stat-item">
                                <strong>10+</strong>
                                <span>Hours saved per week</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="about-cta container animate-fade">
                <div className="cta-card card-brand">
                    <h2>Ready to transform your teaching?</h2>
                    <p>Join thousands of Rwandan teachers using the 21st Century Lesson Plan Generator.</p>
                    <div className="cta-actions">
                        <Link to="/register" className="btn btn-primary">Start Your Free Trial</Link>
                        <Link to="/docs" className="btn btn-ghost" style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>View Documentation <ExternalLink size={16} /></Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default AboutUsPage;
