import React, { useState } from 'react';
import { Mail, User, MessageSquare, Send, Tag, Phone, Shield } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import PublicNavbar from '../components/PublicNavbar';
import Footer from '../components/Footer';
import './AboutUsPage.css'; // Reusing about page layout styles

const ContactUsPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://digital-lesson-plan.onrender.com/api';
            await axios.post(`${apiUrl}/contact`, formData);
            toast.success('Your message has been received! Our support team will review it shortly.');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (error) {
            console.error('Submission failed', error);
            toast.error(error.response?.data?.message || 'Failed to send message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="about-page-root">
            <PublicNavbar />
            
            <section className="about-hero animate-fade">
                <div className="container">
                    <span className="badge badge-brand">Support Center</span>
                    <h1>How can we <span className="text-gradient">Help?</span></h1>
                    <p className="hero-p">
                        Encountered an issue or have a suggestion? Our team is dedicated to providing Rwandan educators with the best platform possible. Reach out directly.
                    </p>
                </div>
            </section>

            <section style={{ paddingBottom: 'var(--sp-16)' }}>
                <div className="container" style={{ maxWidth: 700 }}>
                    <div className="card card-body animate-slide-up">
                        <form onSubmit={handleSubmit} className="form-group" style={{ gap: 'var(--sp-6)' }}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-muted)' }} />
                                    <input
                                        type="text"
                                        name="name"
                                        className="form-input"
                                        style={{ paddingLeft: 42 }}
                                        placeholder="Your full name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-muted)' }} />
                                    <input
                                        type="email"
                                        name="email"
                                        className="form-input"
                                        style={{ paddingLeft: 42 }}
                                        placeholder="you@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Subject</label>
                                <div style={{ position: 'relative' }}>
                                    <Tag size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-muted)' }} />
                                    <input
                                        type="text"
                                        name="subject"
                                        className="form-input"
                                        style={{ paddingLeft: 42 }}
                                        placeholder="What is this regarding?"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Message</label>
                                <div style={{ position: 'relative' }}>
                                    <MessageSquare size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--c-text-muted)' }} />
                                    <textarea
                                        name="message"
                                        className="form-input"
                                        style={{ paddingLeft: 42, minHeight: 150 }}
                                        placeholder="Describe your issue or suggestion in detail..."
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg btn-full"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="spinner"></div>
                                ) : (
                                    <>
                                        <span>Send Message</span>
                                        <Send size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div style={{ marginTop: 'var(--sp-10)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 'var(--sp-8)', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--c-text-secondary)', fontSize: '.9rem' }}>
                                <Mail size={16} /> support@lp-generator.rw
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--c-text-secondary)', fontSize: '.9rem' }}>
                                <Phone size={16} /> +250 780 988 783
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default ContactUsPage;
