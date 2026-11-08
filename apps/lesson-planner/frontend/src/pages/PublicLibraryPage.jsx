import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Download, Eye, FileText, Filter, Library, Search, Sparkles, Star, UserRound } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import Footer from '../components/Footer';
import { API_BASE_URL } from '../services/api';

const PUBLIC_LIBRARY_API = `${API_BASE_URL}/platform/public/library`;

const slugify = (value = '') => String(value)
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '') || 'resource';

const resourceSlug = (resource) => `${slugify(resource.title)}-${resource.id}`;

const fileExtension = (url = '') => {
  const clean = String(url).split('?')[0].split('#')[0];
  const ext = clean.split('.').pop();
  return ext ? ext.toUpperCase() : 'PDF';
};

const formatDate = (value) => {
  if (!value) return 'Recently added';
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
};

const formatBytes = (value) => {
  if (!value || Number(value) <= 0) return 'File available';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = Number(value);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const normalizeResource = (row = {}) => ({
  ...row,
  title: row.title || 'Untitled Resource',
  author: row.author || '21CTA Library',
  category: row.category || 'General',
  subject: row.subject || row.category || 'General',
  education_level: row.education_level || 'General',
  language: row.language || 'English',
  resource_type: row.resource_type || 'book',
  description: row.description || 'Educational resource for the classroom and learner community.',
  cover_url: row.cover_url || 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80',
  file_url: row.file_url || '',
  file_format: row.file_format || fileExtension(row.file_url),
  file_size: row.file_size || null,
  file_label: row.file_label || 'Public educational resource',
  slug: row.slug || resourceSlug(row),
  created_at: row.created_at || new Date().toISOString()
});

const getJson = async (url) => {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Unable to load library data');
  }
  return res.json();
};

const ResourceCard = ({ resource, compact = false }) => (
  <div className="library-card" style={compact ? { minHeight: 0 } : {}}>
    <div className="library-cover-wrap">
      <img src={resource.cover_url} alt={resource.title} className="library-cover" />
      <span className="library-badge">{resource.resource_type}</span>
    </div>
    <div className="library-card-body">
      <div className="library-card-meta">
        <span>{resource.subject}</span>
        <span>{resource.education_level}</span>
      </div>
      <h3>{resource.title}</h3>
      <p>{resource.author}</p>
      <div className="library-card-tags">
        <span>{resource.language}</span>
        <span>{resource.file_format}</span>
      </div>
      <div className="library-card-actions">
        <Link to={`/library/resources/${resource.slug}`} className="library-primary-btn">View details</Link>
        {resource.file_url ? <a href={`/library/preview/${resource.id}`} className="library-secondary-btn">Preview</a> : null}
      </div>
    </div>
  </div>
);

const LibraryHome = () => {
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const data = await getJson(`${PUBLIC_LIBRARY_API}/home`);
        if (!ignore) {
          setHomeData(data.data || {});
        }
      } catch (err) {
        if (!ignore) setError(err.message || 'Unable to load the public library.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, []);

  if (loading) return <LibraryPageShell><div className="library-loader">Loading the library…</div></LibraryPageShell>;
  if (error) return <LibraryPageShell><div className="library-error">{error}</div></LibraryPageShell>;

  const stats = homeData?.stats || { totalResources: 0, recentAdditions: 0, categoriesCount: 0 };
  const featured = (homeData?.featured || []).map(normalizeResource);
  const recent = (homeData?.recent || []).map(normalizeResource);
  const popular = (homeData?.popular || []).map(normalizeResource);
  const categories = homeData?.categories || [];
  const subjects = homeData?.subjects || [];

  return (
    <LibraryPageShell>
      <section className="library-hero">
        <div className="library-hero-copy">
          <span className="library-kicker">Knowledge for Every Learner</span>
          <h1>Public Digital Library for 21CTA</h1>
          <p>Discover quality educational resources for teachers, students, parents and school leaders across Rwanda.</p>
          <div className="library-search-row">
            <Link to="/library/resources" className="library-primary-btn large">Browse resources</Link>
            <Link to="/library/about" className="library-secondary-btn large">Learn more</Link>
          </div>
        </div>
        <div className="library-hero-panel">
          <div className="library-stat-box"><strong>{stats.totalResources}</strong><span>Resources</span></div>
          <div className="library-stat-box"><strong>{stats.recentAdditions}</strong><span>New this month</span></div>
          <div className="library-stat-box"><strong>{stats.categoriesCount}</strong><span>Categories</span></div>
        </div>
      </section>

      <section className="library-section">
        <div className="library-section-head">
          <h2>Featured resources</h2>
          <Link to="/library/resources">View all</Link>
        </div>
        <div className="library-grid">
          {featured.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}
        </div>
      </section>

      <section className="library-section two-col">
        <div>
          <div className="library-section-head">
            <h2>Recently added</h2>
          </div>
          <div className="library-listing">
            {recent.map((resource) => (
              <Link key={resource.id} to={`/library/resources/${resource.slug}`} className="library-list-item">
                <div className="library-list-cover"><img src={resource.cover_url} alt={resource.title} /></div>
                <div className="library-list-copy">
                  <strong>{resource.title}</strong>
                  <span>{resource.author}</span>
                  <small>{formatDate(resource.created_at)}</small>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="library-section-head">
            <h2>Browse by subject</h2>
          </div>
          <div className="library-tag-cloud">
            {subjects.map((subject) => (
              <Link key={subject.subject || subject.category} to="/library/resources" state={{ subject: subject.subject || subject.category }} className="library-tag">
                {subject.subject || subject.category}
              </Link>
            ))}
          </div>
          <div className="library-section-head" style={{ marginTop: '1.5rem' }}>
            <h2>Browse by category</h2>
          </div>
          <div className="library-tag-cloud">
            {categories.map((category) => (
              <Link key={category.category || category.name} to="/library/resources" state={{ category: category.category || category.name }} className="library-tag">
                {category.category || category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="library-section">
        <div className="library-section-head">
          <h2>Popular picks</h2>
        </div>
        <div className="library-grid">
          {popular.map((resource) => <ResourceCard key={resource.id} resource={resource} compact />)}
        </div>
      </section>
    </LibraryPageShell>
  );
};

const LibraryBrowse = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();
  const locationState = location.state || {};

  useEffect(() => {
    const initCategory = locationState.category || '';
    const initSubject = locationState.subject || '';
    setCategory(initCategory || category);
    if (initSubject) {
      setQuery(initSubject);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [resourceRes, categoryRes] = await Promise.all([
          getJson(`${PUBLIC_LIBRARY_API}/resources?limit=60${query ? `&q=${encodeURIComponent(query)}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}${type ? `&resource_type=${encodeURIComponent(type)}` : ''}`),
          getJson(`${PUBLIC_LIBRARY_API}/categories`)
        ]);
        if (!ignore) {
          setItems((resourceRes.data || []).map(normalizeResource));
          setCategories(categoryRes.data || []);
        }
      } catch (err) {
        if (!ignore) setError(err.message || 'Unable to load resources.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [query, category, type]);

  return (
    <LibraryPageShell>
      <section className="library-inner-hero">
        <div>
          <span className="library-kicker">Browse the collection</span>
          <h1>All public resources</h1>
        </div>
      </section>

      <div className="library-filter-bar">
        <div className="library-search-box">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, author, keyword…" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {(categories || []).map((item) => <option key={item.category || item.name} value={item.category || item.name}>{item.category || item.name}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All resource types</option>
          <option value="book">Book</option>
          <option value="ebook">E-book</option>
          <option value="article">Article</option>
          <option value="video">Video</option>
          <option value="past_paper">Past paper</option>
          <option value="other">Other</option>
        </select>
      </div>

      {loading ? <div className="library-loader">Loading resources…</div> : null}
      {error ? <div className="library-error">{error}</div> : null}

      {!loading && !error && items.length === 0 ? (
        <div className="library-empty">No resources match your search. Try a different title or filter.</div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="library-grid">
          {items.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}
        </div>
      ) : null}
    </LibraryPageShell>
  );
};

const LibraryDetail = ({ slug }) => {
  const id = slug && slug.match(/-(\d+)$/)?.[1] ? Number(slug.match(/-(\d+)$/)[1]) : null;
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Resource not found.');
      setLoading(false);
      return;
    }
    let ignore = false;
    const load = async () => {
      try {
        const data = await getJson(`${PUBLIC_LIBRARY_API}/resources/${id}`);
        if (!ignore) setResource(normalizeResource(data.data || {}));
      } catch (err) {
        if (!ignore) setError(err.message || 'This resource is unavailable.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [id]);

  if (loading) return <LibraryPageShell><div className="library-loader">Loading resource…</div></LibraryPageShell>;
  if (error) return <LibraryPageShell><div className="library-error">{error}</div></LibraryPageShell>;
  if (!resource) return null;

  return (
    <LibraryPageShell>
      <div className="library-detail-wrap">
        <div className="library-detail-cover-wrap">
          <img src={resource.cover_url} alt={resource.title} className="library-detail-cover" />
        </div>
        <div className="library-detail-copy">
          <span className="library-kicker">{resource.subject}</span>
          <h1>{resource.title}</h1>
          <p className="library-detail-author">By {resource.author}</p>
          <div className="library-detail-meta">
            <span>{resource.category}</span>
            <span>{resource.education_level}</span>
            <span>{resource.language}</span>
            <span>{resource.file_format}</span>
          </div>
          <p className="library-detail-description">{resource.description}</p>

          <div className="library-detail-actions">
            {resource.file_url ? <a href={`/library/preview/${resource.id}`} className="library-primary-btn">Preview resource</a> : null}
            {resource.file_url ? <a href={resource.file_url} target="_blank" rel="noreferrer" className="library-secondary-btn">Download</a> : null}
            <Link to="/library/resources" className="library-secondary-btn">Back to library</Link>
          </div>

          <div className="library-detail-stats">
            <div><strong>{resource.resource_type}</strong><span>Format</span></div>
            <div><strong>{formatDate(resource.created_at)}</strong><span>Published</span></div>
            <div><strong>{formatBytes(resource.file_size)}</strong><span>Resource size</span></div>
          </div>
        </div>
      </div>
    </LibraryPageShell>
  );
};

const LibraryPreview = ({ id }) => {
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('No resource selected.');
      setLoading(false);
      return;
    }
    let ignore = false;
    const load = async () => {
      try {
        const data = await getJson(`${PUBLIC_LIBRARY_API}/resources/${id}`);
        if (!ignore) setResource(normalizeResource(data.data || {}));
      } catch (err) {
        if (!ignore) setError(err.message || 'Unable to load preview.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [id]);

  if (loading) return <LibraryPageShell><div className="library-loader">Loading preview…</div></LibraryPageShell>;
  if (error) return <LibraryPageShell><div className="library-error">{error}</div></LibraryPageShell>;
  if (!resource) return null;

  const fileUrl = resource.file_url;
  const lower = String(fileUrl).toLowerCase();
  const isPdf = lower.endsWith('.pdf');
  const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((ext) => lower.endsWith(ext));
  const isVideo = ['.mp4', '.mov', '.webm', '.m4v'].some((ext) => lower.endsWith(ext));
  const isAudio = ['.mp3', '.wav', '.ogg'].some((ext) => lower.endsWith(ext));

  return (
    <LibraryPageShell>
      <div className="library-preview-header">
        <div>
          <span className="library-kicker">Resource preview</span>
          <h1>{resource.title}</h1>
        </div>
        <Link to={`/library/resources/${resource.slug}`} className="library-secondary-btn">Back to details</Link>
      </div>

      {!fileUrl ? <div className="library-empty">This resource is not currently available for public preview.</div> : null }

      {isPdf ? (
        <iframe title={resource.title} src={fileUrl} className="library-preview-frame" />
      ) : null}
      {isImage ? <img src={fileUrl} alt={resource.title} className="library-preview-image" /> : null}
      {isVideo ? <video controls src={fileUrl} className="library-preview-video" /> : null}
      {isAudio ? <audio controls src={fileUrl} className="library-preview-audio" /> : null}

      {!isPdf && !isImage && !isVideo && !isAudio && fileUrl ? (
        <div className="library-empty">This file type is not supported in the browser preview. You can still open or download it from the resource details page.</div>
      ) : null}
    </LibraryPageShell>
  );
};

const LibraryAbout = () => (
  <LibraryPageShell>
    <section className="library-about" style={{ maxWidth: 980, margin: '0 auto', padding: '2rem 0 4rem' }}>
      <span className="library-kicker">About the digital library</span>
      <h1>Knowledge for Every Learner</h1>
      <p>The 21CTA Digital Library is designed to make quality educational resources easier to discover, share and use across schools in Rwanda and beyond.</p>
      <div className="library-about-grid">
        <div><h3>For teachers</h3><p>Access lesson support, schemes of work, reference documents and practical teaching materials.</p></div>
        <div><h3>For students</h3><p>Find learning resources, revision notes, past papers and study support.</p></div>
        <div><h3>For school leaders</h3><p>Build a stronger digital learning culture with searchable, shareable educational content.</p></div>
      </div>
    </section>
  </LibraryPageShell>
);

const LibraryContribute = () => (
  <LibraryPageShell>
    <section className="library-about" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 0 4rem' }}>
      <span className="library-kicker">Contribute a resource</span>
      <h1>Share high-quality learning materials</h1>
      <p>Teachers, trainers and school staff can submit educational materials for review. Approved resources are added to the public library.</p>
      <div className="library-contribute-box">
        <p>To submit a resource, sign in to the main 21CTA platform and contact the library administrator or authorized school reviewer.</p>
        <Link to="/login" className="library-primary-btn">Go to sign in</Link>
      </div>
    </section>
  </LibraryPageShell>
);

const LibraryPageShell = ({ children }) => (
  <>
    <PublicNavbar />
    <main className="library-shell">{children}</main>
    <Footer />
    <style>{`
      .library-shell { max-width: 1200px; margin: 0 auto; padding: 2rem 1.25rem 4rem; font-family: Inter, system-ui, sans-serif; }
      .library-hero { display: grid; grid-template-columns: 1.5fr 1fr; gap: 2rem; align-items: center; padding: 2.5rem 0 1.5rem; }
      .library-kicker { display: inline-block; background: rgba(71, 124, 255, 0.12); color: #1d4ed8; border-radius: 999px; padding: 0.38rem 0.8rem; font-size: 0.76rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
      .library-hero h1, .library-inner-hero h1, .library-about h1, .library-preview-header h1 { margin: 0.75rem 0; font-size: clamp(2.2rem, 4vw, 4rem); line-height: 1.1; }
      .library-hero p, .library-about p { color: #475569; font-size: 1.05rem; }
      .library-search-row { display: flex; gap: 1rem; margin-top: 1.25rem; flex-wrap: wrap; }
      .library-primary-btn, .library-secondary-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.8rem 1.15rem; border-radius: 12px; text-decoration: none; font-weight: 600; }
      .library-primary-btn { background: linear-gradient(135deg, #1d4ed8, #2563eb); color: #fff; box-shadow: 0 10px 24px rgba(37,99,235,0.25); }
      .library-secondary-btn { background: #eff6ff; color: #1d4ed8; }
      .library-primary-btn.large, .library-secondary-btn.large { padding: 0.9rem 1.3rem; }
      .library-hero-panel { display: grid; gap: 1rem; }
      .library-stat-box { background: #fff; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 18px; padding: 1.2rem; display: flex; flex-direction: column; }
      .library-stat-box strong { font-size: 2rem; color: #0f172a; }
      .library-stat-box span { color: #475569; }
      .library-section { margin-top: 3rem; }
      .library-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
      .library-section-head h2 { margin: 0; font-size: clamp(1.25rem, 2vw, 2rem); }
      .library-section-head a { color: #1d4ed8; text-decoration: none; font-weight: 600; }
      .library-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.2rem; }
      .library-card { background: #fff; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 20px; overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease; }
      .library-card:hover { transform: translateY(-2px); box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08); }
      .library-cover-wrap { position: relative; }
      .library-cover { width: 100%; height: 200px; object-fit: cover; display: block; }
      .library-badge { position: absolute; top: 14px; left: 14px; background: rgba(15, 23, 42, 0.75); color: #fff; font-size: 0.7rem; border-radius: 999px; padding: 0.34rem 0.6rem; }
      .library-card-body { padding: 1rem; }
      .library-card-meta, .library-card-tags { display: flex; gap: 0.5rem; flex-wrap: wrap; font-size: 0.72rem; color: #475569; }
      .library-card-body h3 { margin: 0.75rem 0 0.4rem; font-size: 1.08rem; color: #0f172a; }
      .library-card-body p { margin: 0 0 0.75rem; color: #475569; }
      .library-card-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 0.75rem; }
      .library-listing { display: grid; gap: 0.9rem; }
      .library-list-item { background: #fff; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 16px; padding: 0.7rem; display: flex; gap: 0.8rem; text-decoration: none; color: inherit; }
      .library-list-cover img { width: 64px; height: 64px; object-fit: cover; border-radius: 10px; }
      .library-list-copy { display: flex; flex-direction: column; justify-content: center; }
      .library-list-copy strong { color: #0f172a; }
      .library-list-copy span, .library-list-copy small { color: #475569; }
      .library-tag-cloud { display: flex; gap: 0.7rem; flex-wrap: wrap; }
      .library-tag { background: #eff6ff; color: #1d4ed8; padding: 0.5rem 0.8rem; border-radius: 999px; text-decoration: none; font-weight: 600; }
      .library-filter-bar { display: flex; gap: 0.8rem; flex-wrap: wrap; background: rgba(255,255,255,0.85); border: 1px solid rgba(148,163,184,0.2); border-radius: 18px; padding: 0.9rem; margin: 2rem 0; }
      .library-search-box { display: flex; align-items: center; gap: 0.6rem; border: 1px solid rgba(148,163,184,0.25); border-radius: 12px; padding: 0.75rem 0.9rem; background: #fff; min-width: min(100%, 420px); flex: 1; }
      .library-search-box input, .library-filter-bar select { background: #fff; border: 1px solid rgba(148,163,184,0.25); border-radius: 12px; padding: 0.8rem 0.9rem; color: #0f172a; font: inherit; }
      .library-search-box input { border: 0; width: 100%; outline: none; }
      .library-loader, .library-error, .library-empty { padding: 2rem 1rem; color: #475569; background: #fff; border-radius: 18px; border: 1px solid rgba(148, 163, 184, 0.2); text-align: center; }
      .library-empty { margin-top: 1rem; }
      .library-detail-wrap { display: grid; grid-template-columns: 360px 1fr; gap: 2rem; padding-top: 1.8rem; }
      .library-detail-cover { width: 100%; border-radius: 24px; min-height: 440px; object-fit: cover; }
      .library-detail-copy h1 { margin-top: 0.5rem; }
      .library-detail-author { font-size: 1.1rem; color: #475569; margin: 0.5rem 0 1rem; }
      .library-detail-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
      .library-detail-meta span { background: #eff6ff; color: #1d4ed8; border-radius: 999px; padding: 0.35rem 0.7rem; font-size: 0.75rem; font-weight: 600; }
      .library-detail-description { color: #334155; line-height: 1.7; max-width: 60ch; }
      .library-detail-actions { display: flex; gap: 0.8rem; flex-wrap: wrap; margin-top: 1.25rem; }
      .library-detail-stats { display: grid; grid-template-columns: repeat(3, minmax(150px, 1fr)); gap: 0.8rem; margin-top: 1.6rem; }
      .library-detail-stats div { background: #fff; border: 1px solid rgba(148,163,184,0.2); padding: 1rem; border-radius: 14px; display: flex; flex-direction: column; }
      .library-detail-stats strong { font-size: 1rem; }
      .library-detail-stats span { color: #475569; font-size: 0.8rem; }
      .library-preview-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1.5rem; }
      .library-preview-frame { width: 100%; height: 76vh; margin-top: 1.25rem; border: 1px solid rgba(148,163,184,0.2); border-radius: 18px; background: #fff; }
      .library-preview-image, .library-preview-video, .library-preview-audio { width: 100%; margin-top: 1.25rem; border-radius: 18px; background: #fff; border: 1px solid rgba(148,163,184,0.2); }
      .library-about-grid { margin-top: 1.5rem; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
      .library-about-grid > div, .library-contribute-box { background: #fff; border: 1px solid rgba(148,163,184,0.2); border-radius: 18px; padding: 1.2rem; }
      .library-contribute-box { margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
      @media (max-width: 820px) {
        .library-hero, .library-detail-wrap { grid-template-columns: 1fr; }
        .library-about-grid { grid-template-columns: 1fr; }
        .library-filter-bar { flex-direction: column; }
        .library-preview-header { flex-direction: column; align-items: flex-start; }
      }
    `}</style>
  </>
);

export default function PublicLibraryPage({ view }) {
  const params = useParams();
  const routeView = view || (
    params.slug ? 'detail' :
    window.location.pathname.startsWith('/library/about') ? 'about' :
    window.location.pathname.startsWith('/library/contribute') ? 'contribute' :
    window.location.pathname.startsWith('/library/preview') ? 'preview' :
    window.location.pathname.startsWith('/library/resources') ? 'browse' :
    'home'
  );

  if (routeView === 'browse') return <LibraryBrowse />;
  if (routeView === 'detail') return <LibraryDetail slug={params.slug} />;
  if (routeView === 'preview') return <LibraryPreview id={params.id} />;
  if (routeView === 'about') return <LibraryAbout />;
  if (routeView === 'contribute') return <LibraryContribute />;
  return <LibraryHome />;
}
