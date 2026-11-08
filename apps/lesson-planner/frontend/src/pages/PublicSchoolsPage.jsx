import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, BookOpen, CalendarDays, ChevronDown, ExternalLink, GraduationCap, MapPin, Search, ShieldCheck, Users } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import PublicNavbar from '../components/PublicNavbar';
import Footer from '../components/Footer';
import './PublicSchoolsPage.css';

const API = `${API_BASE_URL}/platform/public/schools`;

const parseList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value) return [];
  try { return JSON.parse(value); } catch { return []; }
};

const getData = async (url, signal) => {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(body.message || 'Unable to load public school information.');
  return body;
};

const SchoolCard = ({ school, featured = false }) => (
  <article className={`school-card${featured ? ' school-card--featured' : ''}`}>
    <Link className="school-card__image-link" to={`/schools/${school.slug}`} aria-label={`View ${school.name} portal`}>
      <img
        src={school.hero_image_url || school.school_photo_url || school.logo_url || '/images/reallogo.png'}
        alt={`${school.name} campus`}
        className="school-card__image"
        onError={(event) => { event.currentTarget.src = '/images/reallogo.png'; }}
      />
      {featured && <span className="school-card__featured">Featured school</span>}
    </Link>
    <div className="school-card__body">
      <div className="school-card__heading">
        {school.logo_url && <img src={school.logo_url} alt="" className="school-card__logo" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
        <div>
          <span className="school-card__type">{school.school_type?.replace('_', ' ') || 'School'}</span>
          <h3><Link to={`/schools/${school.slug}`}>{school.name}</Link></h3>
        </div>
      </div>
      <p className="school-card__description">{school.short_description || school.motto || 'Explore the school profile, public information and learning resources.'}</p>
      <div className="school-card__location">
        <MapPin size={15} aria-hidden="true" />
        <span>{[school.sector, school.district, school.province].filter(Boolean).join(', ') || 'Rwanda'}</span>
      </div>
      <div className="school-card__levels">
        {parseList(school.education_levels).slice(0, 3).map((level) => <span key={level}>{level}</span>)}
      </div>
      <div className="school-card__actions">
        <Link className="school-button school-button--primary" to={`/schools/${school.slug}`}>View school portal <ArrowRight size={16} /></Link>
        {school.website ? <a className="school-card__external" href={school.website} target="_blank" rel="noreferrer" aria-label={`Visit ${school.name} official website`}><ExternalLink size={17} /></a> : null}
      </div>
    </div>
  </article>
);

const Directory = () => {
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [province, setProvince] = useState('');
  const [category, setCategory] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], featured: [], recentlyAdded: [], filters: {}, pagination: { pages: 0, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), limit: '9' });
    if (query.trim()) params.set('q', query.trim());
    if (district.trim()) params.set('district', district.trim());
    if (sector.trim()) params.set('sector', sector.trim());
    if (province) params.set('province', province);
    if (category) params.set('category', category);
    if (educationLevel) params.set('education_level', educationLevel);

    setLoading(true);
    setError('');
    getData(`${API}?${params}`, controller.signal)
      .then(setData)
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, district, sector, province, category, educationLevel, page]);

  const hasFilters = Boolean(query || district || sector || province || category || educationLevel);
  const resetFilters = () => {
    setQuery(''); setDistrict(''); setSector(''); setProvince(''); setCategory(''); setEducationLevel(''); setPage(1);
  };

  return (
    <>
      <PublicNavbar />
      <main className="schools-public">
        <section className="schools-directory-hero">
          <div className="schools-directory-hero__copy">
            <span className="schools-eyebrow"><span /> 21CTA School Network</span>
            <h1>Find a school.<br /><em>Meet its community.</em></h1>
            <p>Explore approved school profiles, public information and learning opportunities across Rwanda.</p>
            <a href="#school-directory" className="schools-hero-link">Explore the directory <ArrowDown size={16} /></a>
          </div>
            <div className="schools-hero-art">
              <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=85" alt="Learners taking part in a classroom lesson" />
              <span className="schools-hero-art__caption">Learning is a shared journey</span>
            </div>
        </section>

        <section className="schools-directory-content" id="school-directory">
          <div className="schools-section-heading">
            <div>
              <span className="schools-eyebrow">Discover locally</span>
              <h2>Schools across Rwanda</h2>
              <p>Browse public profiles from schools approved to appear in the 21CTA directory.</p>
            </div>
            <span className="schools-result-count">{data.pagination.total || 0} schools</span>
          </div>

          <form className="schools-filters" onSubmit={(event) => { event.preventDefault(); setPage(1); }}>
            <label className="schools-search"><Search size={18} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="School name or location" aria-label="Search schools" /></label>
            <input value={district} onChange={(event) => { setDistrict(event.target.value); setPage(1); }} placeholder="District" aria-label="Search by district" />
            <input value={sector} onChange={(event) => { setSector(event.target.value); setPage(1); }} placeholder="Sector" aria-label="Search by sector" />
            <select value={province} onChange={(event) => { setProvince(event.target.value); setPage(1); }} aria-label="Filter by province">
              <option value="">All provinces</option>{(data.filters.provinces || []).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} aria-label="Filter by school category">
              <option value="">All school categories</option>{(data.filters.categories || []).map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}
            </select>
            <select value={educationLevel} onChange={(event) => { setEducationLevel(event.target.value); setPage(1); }} aria-label="Filter by education level">
              <option value="">All education levels</option>{(data.filters.education_levels || []).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            {hasFilters && <button className="schools-clear" type="button" onClick={resetFilters}>Clear filters</button>}
          </form>

          {error && <div className="schools-feedback schools-feedback--error" role="alert">{error}</div>}
          {loading && <div className="schools-feedback">Loading approved school profiles…</div>}
          {!loading && !error && data.featured.length > 0 && !hasFilters && (
            <section className="schools-featured">
              <div className="schools-subheading"><h3>Featured schools</h3><span>Selected from approved public portals</span></div>
              <div className="schools-grid schools-grid--featured">{data.featured.map((school) => <SchoolCard key={school.id} school={school} featured />)}</div>
            </section>
          )}
          {!loading && !error && data.recentlyAdded.length > 0 && !hasFilters && (
            <section className="schools-recent">
              <div className="schools-subheading"><h3>Recently added</h3></div>
              <div className="schools-recent__list">{data.recentlyAdded.slice(0, 3).map((school) => <Link key={school.id} to={`/schools/${school.slug}`}><span className="schools-recent__mark">{school.name?.slice(0, 1)}</span><span><strong>{school.name}</strong><small>{[school.district, school.province].filter(Boolean).join(', ')}</small></span><ArrowRight size={16} /></Link>)}</div>
            </section>
          )}
          {!loading && !error && (
            <section className="schools-results">
              <div className="schools-subheading"><h3>{hasFilters ? 'Search results' : 'Directory'}</h3><span>{data.pagination.total || 0} results</span></div>
              {data.data.length === 0 ? <div className="schools-feedback">No approved public school profiles match these filters.</div> : <div className="schools-grid">{data.data.map((school) => <SchoolCard key={school.id} school={school} />)}</div>}
              {data.pagination.pages > 1 && <nav className="schools-pagination" aria-label="School directory pages"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {data.pagination.pages}</span><button disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>Next</button></nav>}
            </section>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
};

const PORTAL_NAV = [
  ['home', 'Overview'], ['about', 'About'], ['academics', 'Academics'], ['assessments', 'Assessments'],
  ['announcements', 'News'], ['library', 'Library'], ['gallery', 'Gallery'], ['admissions', 'Admissions'],
  ['calendar', 'Calendar'], ['timetable', 'Timetable'], ['contact', 'Contact']
];

const PortalContent = ({ section, school, announcements, resources }) => {
  const navigate = useNavigate();
  const visibleSections = parseList(school.portal_sections);
  const visible = (name) => visibleSections.length === 0 || visibleSections.includes(name);
  const publicAnnouncements = announcements || [];
  const assessments = publicAnnouncements.filter((item) => /assessment|exam|result|paper/i.test(`${item.category || ''} ${item.title || ''}`));

  if (section === 'classroom' || section === 'assessments/student-login') {
    navigate('/login');
    return null;
  }

  if (!visible(section) && section !== 'home') return <div className="portal-empty">This school section is currently unavailable.</div>;

  if (section === 'about') return <div className="portal-copy-grid"><article><span className="schools-eyebrow">Our story</span><h2>About {school.name}</h2><p>{school.history || school.short_description || `${school.name} is a registered school in ${school.district || 'Rwanda'}.`}</p></article><article><h3>Vision</h3><p>{school.vision || 'School vision has not been published yet.'}</p><h3>Mission</h3><p>{school.mission || 'School mission has not been published yet.'}</p></article><article><h3>Leadership message</h3><p>{school.headteacher_message || school.welcome_message || 'A leadership message has not been published yet.'}</p>{school.headteacher_name && <strong>{school.headteacher_name}, Headteacher</strong>}</article><article><h3>Core values</h3><p>{school.core_values || 'Core values have not been published yet.'}</p><h3>Facilities</h3><ul>{parseList(school.facilities).map((item) => <li key={item}>{item}</li>)}</ul></article></div>;

  if (section === 'academics') return <section className="portal-section-content"><span className="schools-eyebrow">Teaching and learning</span><h2>Academic information</h2><p>Publicly listed education levels and academic information for {school.name}.</p><div className="portal-pill-list">{parseList(school.education_levels).length ? parseList(school.education_levels).map((item) => <span key={item}><GraduationCap size={16} />{item}</span>) : <div className="portal-empty">Education levels have not been published yet.</div>}</div><p className="portal-note">Class-level records, private timetables and student information are not shown on public pages.</p></section>;

  if (section === 'assessments') return <section className="portal-section-content"><span className="schools-eyebrow">Public assessment notices</span><h2>Assessments and examinations</h2><p>Only general notices and resources intended for public release appear here. Individual results and submissions remain private.</p><AnnouncementList items={assessments} empty="No public assessment notices have been published." /><Link to="/login" className="school-button school-button--primary">Student sign in <ArrowRight size={16} /></Link></section>;

  if (section === 'announcements') return <section className="portal-section-content"><span className="schools-eyebrow">News and notices</span><h2>School announcements</h2><AnnouncementList items={publicAnnouncements} empty="No public announcements have been published." /></section>;

  if (section === 'library') return <section className="portal-section-content"><span className="schools-eyebrow">Learning collection</span><h2>School digital library</h2><p>Only resources approved for public access are listed.</p>{resources.length ? <ResourceList items={resources} /> : <div className="portal-empty">No public learning resources have been published by this school.</div>}</section>;

  if (section === 'gallery') return <section className="portal-section-content"><span className="schools-eyebrow">Campus life</span><h2>School gallery</h2><div className="portal-empty">There are no approved public gallery items yet.</div><p className="portal-note">Learner images are only published when appropriate consent and authorization are in place.</p></section>;

  if (section === 'admissions') return <section className="portal-section-content"><span className="schools-eyebrow">Join our community</span><h2>Admissions</h2><p>{school.admissions_info || 'Admissions information has not been published yet. Please contact the school office for current guidance.'}</p><ContactSummary school={school} /></section>;

  if (section === 'calendar' || section === 'timetable') return <section className="portal-section-content"><span className="schools-eyebrow">School dates</span><h2>{section === 'calendar' ? 'School calendar' : 'Public timetable'}</h2><div className="portal-empty">No public {section === 'calendar' ? 'calendar events' : 'timetable'} have been published yet. Private student and teacher schedules require sign-in.</div></section>;

  if (section === 'contact') return <section className="portal-contact"><div><span className="schools-eyebrow">Get in touch</span><h2>Contact {school.name}</h2><ContactSummary school={school} /></div><div className="portal-map">{school.map_url ? <a href={school.map_url} target="_blank" rel="noreferrer"><MapPin size={22} /> Open school location <ExternalLink size={15} /></a> : <span><MapPin size={22} /> Location details available from the school office</span>}</div></section>;

  return (
    <>
      <div className="portal-home-grid">
        <article className="portal-welcome"><span className="schools-eyebrow">Welcome</span><h2>{school.motto || `Welcome to ${school.name}`}</h2><p>{school.welcome_message || school.short_description || `${school.name} welcomes learners, families and community partners.`}</p><div className="portal-welcome__byline">{school.headteacher_name && <span>{school.headteacher_name}<small>Headteacher</small></span>}<Link className="school-button school-button--light" to={`/schools/${school.slug}/about`}>About our school <ArrowRight size={16} /></Link></div></article>
        <aside className="portal-contact-card"><span className="schools-eyebrow">Visit us</span><h3>{school.name}</h3><p><MapPin size={15} />{[school.sector, school.district, school.province].filter(Boolean).join(', ') || 'Rwanda'}</p><ContactSummary school={school} />{school.website ? <a href={school.website} className="portal-external-link" target="_blank" rel="noreferrer">Official website <ExternalLink size={15} /></a> : <span className="portal-no-website">No official website listed</span>}</aside>
      </div>
      <div className="portal-quick-links">
        {PORTAL_NAV.filter(([key]) => ['academics', 'assessments', 'announcements', 'library', 'admissions', 'contact'].includes(key) && visible(key)).map(([key, label]) => <Link key={key} to={`/schools/${school.slug}/${key}`}><span className="portal-quick-icon">{key === 'library' ? <BookOpen size={19} /> : key === 'academics' ? <GraduationCap size={19} /> : key === 'calendar' ? <CalendarDays size={19} /> : <ArrowRight size={19} />}</span><strong>{label}</strong><ArrowRight size={16} /></Link>)}
        <Link className="portal-quick-link--enter" to="/login"><span className="portal-quick-icon"><Users size={19} /></span><strong>Enter My Class</strong><ArrowRight size={16} /></Link>
      </div>
      <div className="portal-home-lower">
        <section><div className="portal-section-title"><div><span className="schools-eyebrow">What’s happening</span><h2>Latest announcements</h2></div><Link to={`/schools/${school.slug}/announcements`}>All news <ArrowRight size={15} /></Link></div><AnnouncementList items={publicAnnouncements.slice(0, 3)} empty="No public announcements have been published." compact /></section>
        <section><div className="portal-section-title"><div><span className="schools-eyebrow">Learning materials</span><h2>From the library</h2></div><Link to={`/schools/${school.slug}/library`}>Browse library <ArrowRight size={15} /></Link></div>{resources.length ? <ResourceList items={resources.slice(0, 3)} compact /> : <div className="portal-empty">No public resources published yet.</div>}</section>
      </div>
      <div className="portal-enter-banner"><ShieldCheck size={22} /><div><strong>Part of the 21CTA learning platform</strong><span>Use your existing school account to access your learning environment.</span></div><Link to="/login" className="school-button school-button--primary">Enter My Class <ArrowRight size={16} /></Link></div>
    </>
  );
};

const AnnouncementList = ({ items, empty, compact = false }) => !items.length ? <div className="portal-empty">{empty}</div> : <div className={`portal-announcements${compact ? ' portal-announcements--compact' : ''}`}>{items.map((item) => <article key={item.id} className="portal-announcement">{item.cover_image_url && <img src={item.cover_image_url} alt="" />}<div><div className="portal-announcement__meta"><span>{item.category || 'School news'}</span><time>{item.published_at ? new Date(item.published_at).toLocaleDateString() : ''}</time></div><h3>{item.title}</h3><p>{item.body}</p>{item.attachment_url && <a href={item.attachment_url} target="_blank" rel="noreferrer">Open attachment <ExternalLink size={14} /></a>}</div></article>)}</div>;

const ResourceList = ({ items, compact = false }) => <div className={`portal-resources${compact ? ' portal-resources--compact' : ''}`}>{items.map((item) => <article key={item.id} className="portal-resource">{item.cover_url ? <img src={item.cover_url} alt="" /> : <span className="portal-resource__icon"><BookOpen size={20} /></span>}<div><h3>{item.title}</h3><span>{[item.category, item.resource_type].filter(Boolean).join(' · ')}</span></div>{item.file_url && <a href={item.file_url} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}><ExternalLink size={16} /></a>}</article>)}</div>;

const ContactSummary = ({ school }) => <div className="portal-contact-summary">{school.address && <span>{school.address}</span>}{school.phone && <a href={`tel:${school.phone}`}>{school.phone}</a>}{school.email && <a href={`mailto:${school.email}`}>{school.email}</a>}{school.office_hours && <span>Office hours: {school.office_hours}</span>}</div>;

const SchoolPortal = () => {
  const { slug, '*': wildcard = '' } = useParams();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const section = wildcard || 'home';

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getData(`${API}/${encodeURIComponent(slug)}`, controller.signal)
      .then((response) => setPayload(response.data))
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug]);

  const school = payload?.school;
  const primary = school?.brand_primary || '#126b56';
  const accent = school?.brand_accent || '#e5a84b';
  const sections = parseList(school?.portal_sections);
  const nav = PORTAL_NAV.filter(([key]) => (sections.length === 0 || sections.includes(key)) && key !== 'home');

  useEffect(() => {
    if (!school) return;
    document.title = school.seo_title || `${school.name} | 21CTA School Portal`;
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.appendChild(description);
    }
    description.content = school.seo_description || school.short_description || `${school.name} public school portal on 21CTA.`;
  }, [school]);

  if (loading) return <><PublicNavbar /><main className="schools-public schools-public--loading"><div className="schools-feedback">Loading public school portal…</div></main><Footer /></>;
  if (error || !school) return <><PublicNavbar /><main className="schools-public"><div className="schools-not-found"><span className="schools-eyebrow">School portal</span><h1>{error || 'Public school portal not found'}</h1><p>This portal may not be public or may not have been approved for listing.</p><Link className="school-button school-button--primary" to="/schools"><ArrowLeft size={16} /> Browse schools</Link></div></main><Footer /></>;

  return (
    <div className="school-portal" style={{ '--portal-primary': primary, '--portal-accent': accent }}>
      <PublicNavbar />
      <header className="portal-header">
        <Link to={`/schools/${school.slug}`} className="portal-brand">{school.logo_url ? <img src={school.logo_url} alt="" /> : <span className="portal-brand__initial">{school.name.slice(0, 1)}</span>}<span><strong>{school.name}</strong><small>{school.motto || school.district || '21CTA School Portal'}</small></span></Link>
        {school.website ? <a className="portal-official" href={school.website} target="_blank" rel="noreferrer">Official website <ExternalLink size={14} /></a> : null}
      </header>
      <nav className="portal-nav" aria-label={`${school.name} portal navigation`}><div><Link to={`/schools/${school.slug}`} className={!section || section === 'home' ? 'active' : ''}>Home</Link>{nav.map(([key, label]) => <Link key={key} to={`/schools/${school.slug}/${key}`} className={section === key ? 'active' : ''}>{label}</Link>)}<Link to="/login" className="portal-nav__class">Enter My Class <ArrowRight size={15} /></Link></div></nav>
      <main className="schools-public portal-main">
        {loading ? <div className="schools-feedback">Loading…</div> : <>
          {section === 'home' && <section className="portal-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(6,34,32,.88), rgba(6,34,32,.2)), url("${school.hero_image_url || school.school_photo_url || ''}")` }}><div><span className="schools-eyebrow">{[school.school_type, school.ownership].filter(Boolean).join(' · ')}</span><h1>{school.name}</h1><p>{school.welcome_message || school.short_description || `Welcome to ${school.name}, ${school.district || 'Rwanda'}.`}</p><div className="portal-hero__actions"><Link to={`/schools/${school.slug}/about`} className="school-button school-button--light">About our school <ArrowRight size={16} /></Link><Link to={`/schools/${school.slug}/library`} className="school-button school-button--outline">Explore our library <BookOpen size={16} /></Link></div></div><span className="portal-hero__location"><MapPin size={15} />{[school.sector, school.district, school.province].filter(Boolean).join(', ')}</span></section>}
          <PortalContent section={section} school={school} announcements={payload.announcements || []} resources={payload.resources || []} />
        </>}
      </main>
      <footer className="portal-footer"><div><strong>{school.name}</strong><span>{school.motto || 'Connecting school, learners and community.'}</span></div><div className="portal-footer__links">{school.website && <a href={school.website} target="_blank" rel="noreferrer">Official website <ExternalLink size={14} /></a>}<Link to={`/schools/${school.slug}/contact`}>Contact</Link><Link to="/schools">21CTA school directory</Link></div><small>School information is published and managed through the 21CTA platform.</small></footer>
      <Footer />
    </div>
  );
};

export default function PublicSchoolsPage() {
  const { slug } = useParams();
  return slug ? <SchoolPortal /> : <Directory />;
}
