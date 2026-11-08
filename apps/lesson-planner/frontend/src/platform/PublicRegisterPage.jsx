import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, School, UserPlus } from 'lucide-react';
import platform from '../services/platformApi';
import { LANGUAGES, translate } from './i18n';
import { Alert, Button, Field, Input, Select, Tabs, Textarea } from './ui';
import './pages/pages.css';

const PUBLIC_ROLES = [
  'teacher', 'student', 'parent', 'librarian', 'secretary', 'accountant',
  'ict_admin', 'exam_officer', 'hod', 'cpd_coordinator', 'staff'
];

const emptyUser = () => ({ full_name: '', email: '', phone: '', school_id: '', role_code: 'teacher', message: '' });
const emptySchool = () => ({
  school_name: '', school_type: 'secondary', ownership: 'public', district: '', province: '',
  sector: '', cell: '', contact_name: '', email: '', phone: '', message: ''
});

const PublicRegisterPage = () => {
  const [language, setLanguage] = useState(() => localStorage.getItem('platform_language') || 'en');
  const [tab, setTab] = useState('user');
  const [schools, setSchools] = useState([]);
  const [userForm, setUserForm] = useState(emptyUser());
  const [schoolForm, setSchoolForm] = useState(emptySchool());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const t = (key) => translate(language, key);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem('platform_language', language);
  }, [language]);

  useEffect(() => {
    platform.publicSchools()
      .then((response) => setSchools(response.data || []))
      .catch(() => setSchools([]));
  }, []);

  const submitUser = async (event) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      const response = await platform.registerUserRequest({
        ...userForm,
        school_id: Number(userForm.school_id)
      });
      setSuccess(response.message || t('auth.requestSuccess'));
      setUserForm(emptyUser());
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const submitSchool = async (event) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      const response = await platform.registerSchoolRequest(schoolForm);
      setSuccess(response.message || t('auth.requestSuccess'));
      setSchoolForm(emptySchool());
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pf-public">
      <div className="pf-public__card">
        <div className="pf-public__brand">
          <img src="/images/reallogo.png" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div>
            <strong>{t('app.name')}</strong>
            <small>{t('app.tagline')}</small>
          </div>
          <span className="pf-spacer" />
          <Select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label={t('common.language')}>
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </Select>
        </div>

        <p className="pf-page-title" style={{ fontSize: '1.4rem' }}>{t('auth.registerTitle')}</p>
        <p className="pf-page-subtitle" style={{ marginBottom: 18 }}>{t('auth.registerSubtitle')}</p>

        {success ? <Alert tone="success">{success}</Alert> : null}
        {error ? <Alert>{error}</Alert> : null}

        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'user', label: t('registrations.userRequest'), icon: UserPlus },
            { value: 'school', label: t('registrations.schoolRequest'), icon: School }
          ]}
        />

        {tab === 'user' ? (
          <form onSubmit={submitUser}>
            <div className="pf-form-grid">
              <Field label={t('auth.fullName')} required span={2}>
                <Input value={userForm.full_name} required
                       onChange={(e) => setUserForm((prev) => ({ ...prev, full_name: e.target.value }))} />
              </Field>
              <Field label={t('common.email')} required>
                <Input type="email" value={userForm.email} required
                       onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))} />
              </Field>
              <Field label={t('common.phone')}>
                <Input value={userForm.phone}
                       onChange={(e) => setUserForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </Field>
              <Field label={t('auth.requestSchool')} required>
                <Select value={userForm.school_id} required
                        onChange={(e) => setUserForm((prev) => ({ ...prev, school_id: e.target.value }))}>
                  <option value="">{t('common.select')}</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>{school.name}{school.district ? ` · ${school.district}` : ''}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('auth.requestRole')} required>
                <Select value={userForm.role_code} required
                        onChange={(e) => setUserForm((prev) => ({ ...prev, role_code: e.target.value }))}>
                  {PUBLIC_ROLES.map((code) => (
                    <option key={code} value={code}>{t(`role.${code}`)}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('common.notes')} span={2}>
                <Textarea value={userForm.message}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, message: e.target.value }))} />
              </Field>
            </div>
            <div className="pf-inline" style={{ marginTop: 16 }}>
              <Button type="submit" icon={CheckCircle2} disabled={sending}>
                {sending ? t('common.saving') : t('auth.register')}
              </Button>
              <Link to="/login" className="pf-link">{t('auth.signIn')}</Link>
              <span className="pf-spacer" />
              <span className="pf-text-small">{t('auth.requestSuccess')}</span>
            </div>
          </form>
        ) : (
          <form onSubmit={submitSchool}>
            <div className="pf-form-grid">
              <Field label={t('auth.requestSchool')} required span={2}>
                <Input value={schoolForm.school_name} required
                       onChange={(e) => setSchoolForm((prev) => ({ ...prev, school_name: e.target.value }))} />
              </Field>
              <Field label={t('school.type')}>
                <Select value={schoolForm.school_type}
                        onChange={(e) => setSchoolForm((prev) => ({ ...prev, school_type: e.target.value }))}>
                  <option value="nursery">Nursery</option>
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="tvet">TVET</option>
                  <option value="combined">Combined</option>
                </Select>
              </Field>
              <Field label={t('school.ownership')}>
                <Select value={schoolForm.ownership}
                        onChange={(e) => setSchoolForm((prev) => ({ ...prev, ownership: e.target.value }))}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="government-aided">Government aided</option>
                  <option value="faith-based">Faith based</option>
                </Select>
              </Field>
              <Field label={t('school.district')}>
                <Input value={schoolForm.district}
                       onChange={(e) => setSchoolForm((prev) => ({ ...prev, district: e.target.value }))} />
              </Field>
              <Field label={t('school.province')}>
                <Input value={schoolForm.province}
                       onChange={(e) => setSchoolForm((prev) => ({ ...prev, province: e.target.value }))} />
              </Field>
              <Field label={t('registrations.contact')} required>
                <Input value={schoolForm.contact_name} required
                       onChange={(e) => setSchoolForm((prev) => ({ ...prev, contact_name: e.target.value }))} />
              </Field>
              <Field label={t('common.email')} required>
                <Input type="email" value={schoolForm.email} required
                       onChange={(e) => setSchoolForm((prev) => ({ ...prev, email: e.target.value }))} />
              </Field>
              <Field label={t('common.phone')}>
                <Input value={schoolForm.phone}
                       onChange={(e) => setSchoolForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </Field>
              <Field label={t('common.notes')} span={2}>
                <Textarea value={schoolForm.message}
                          onChange={(e) => setSchoolForm((prev) => ({ ...prev, message: e.target.value }))} />
              </Field>
            </div>
            <div className="pf-inline" style={{ marginTop: 16 }}>
              <Button type="submit" icon={CheckCircle2} disabled={sending}>
                {sending ? t('common.saving') : t('auth.register')}
              </Button>
              <Link to="/login" className="pf-link">{t('auth.signIn')}</Link>
            </div>
          </form>
        )}

        <p style={{ marginTop: 20 }}>
          <Link to="/" className="pf-link pf-inline"><ArrowLeft size={14} /> {t('common.back')}</Link>
        </p>
      </div>
    </div>
  );
};

export default PublicRegisterPage;
