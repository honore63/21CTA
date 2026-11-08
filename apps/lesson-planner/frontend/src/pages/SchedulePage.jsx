import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FiClock, FiPlus, FiTrash2, FiSave, FiCalendar, FiMapPin, FiArrowLeft } from 'react-icons/fi';
import './Dashboard.css';

const SchedulePage = () => {
    const { classId, subjectId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [slots, setSlots] = useState([]);
    const [populating, setPopulating] = useState(false);
    const [classSubject, setClassSubject] = useState(null);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Find class_subject_id first
            const classResponse = await api.get(`/classes/${classId}`);
            const cs = classResponse.data.data.subjects.find(s => s.subject_id === parseInt(subjectId));

            if (!cs) {
                toast.error('Subject not found in this class');
                return;
            }

            setClassSubject(cs);
            const scheduleResponse = await api.get(`/schedules/${cs.id}`);
            setSlots(scheduleResponse.data.data);
        } catch (error) {
            console.error('Error fetching schedule:', error);
            toast.error('Failed to load schedule');
        } finally {
            setLoading(false);
        }
    };

    const addSlot = () => {
        setSlots([...slots, { day_of_week: 'Monday', start_time: '08:00', end_time: '08:40', location: 'Classroom' }]);
    };

    const removeSlot = (index) => {
        setSlots(slots.filter((_, i) => i !== index));
    };

    const updateSlot = (index, field, value) => {
        const newSlots = [...slots];
        newSlots[index][field] = value;
        setSlots(newSlots);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post(`/schedules/${classSubject.id}`, { slots });
            toast.success('Schedule saved successfully');
        } catch (error) {
            toast.error('Failed to save schedule');
        } finally {
            setSaving(false);
        }
    };

    const handlePopulate = async () => {
        if (!window.confirm('This will assign dates to all units and lessons based on this schedule. Continue?')) return;
        setPopulating(true);
        try {
            const startDate = prompt('Enter start date for first lesson (YYYY-MM-DD)', new Date().toISOString().split('T')[0]);
            if (!startDate) return;

            const response = await api.post(`/schedules/${classSubject.id}/populate-dates`, { startDate });
            toast.success(response.data.message);
            navigate(`/classes/${classId}/subjects/${subjectId}/units`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to populate dates');
        } finally {
            setPopulating(false);
        }
    };

    if (loading) return <div className="dashboard-container"><div className="skeleton" style={{ height: '400px' }}></div></div>;

    return (
        <div className="animate-fadeIn">
            <div className="dashboard-container">
                <div className="workspace-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button className="back-btn-premium" onClick={() => navigate(-1)}>
                            <FiArrowLeft />
                        </button>
                        <div>
                            <h1 className="workspace-title">Timetable Setup</h1>
                            <p className="workspace-subtitle">Set your weekly slots for this subject. AI uses this for lesson dates.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="update-btn-blue" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : <><FiSave /> Save Schedule</>}
                        </button>
                        <button className="update-btn-blue" style={{ background: '#10b981' }} onClick={handlePopulate} disabled={populating || slots.length === 0}>
                            {populating ? 'Processing...' : <><FiCalendar /> Populate Lesson Dates</>}
                        </button>
                    </div>
                </div>

                <div className="settings-section mt-5" style={{ padding: '32px' }}>
                    <div className="section-header">
                        <h2 className="class-title">Weekly Recurring Slots</h2>
                        <button className="update-btn-blue" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none' }} onClick={addSlot}>
                            <FiPlus /> Add Slot
                        </button>
                    </div>

                    <div className="mt-4" style={{ display: 'grid', gap: '16px' }}>
                        {slots.map((slot, index) => (
                            <div key={index} className="activity-item-premium" style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 2fr auto', gap: '16px', alignItems: 'center' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <select value={slot.day_of_week} onChange={(e) => updateSlot(index, 'day_of_week', e.target.value)}>
                                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FiClock size={14} color="var(--color-gray-400)" />
                                        <input type="time" value={slot.start_time} onChange={(e) => updateSlot(index, 'start_time', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FiClock size={14} color="var(--color-gray-400)" />
                                        <input type="time" value={slot.end_time} onChange={(e) => updateSlot(index, 'end_time', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FiMapPin size={14} color="var(--color-gray-400)" />
                                        <input type="text" placeholder="Room/Lab" value={slot.location || ''} onChange={(e) => updateSlot(index, 'location', e.target.value)} />
                                    </div>
                                </div>
                                <button className="delete-icon-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} onClick={() => removeSlot(index)}>
                                    <FiTrash2 />
                                </button>
                            </div>
                        ))}

                        {slots.length === 0 && (
                            <div className="empty-state-workspace" style={{ padding: '40px' }}>
                                <FiClock size={40} color="var(--color-gray-300)" />
                                <p className="workspace-subtitle mt-2">No weekly slots added yet. Add your lesson times to enable automation.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="info-box-premium mt-4">
                    <FiCalendar size={20} />
                    <p><strong>Note:</strong> Once you save your schedule, click <strong>"Populate Lesson Dates"</strong> to automatically calculate and assign teaching dates to all your generated lessons in chronological order, skipping holidays.</p>
                </div>
            </div>
        </div>
    );
};

export default SchedulePage;
