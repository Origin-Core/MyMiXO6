import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

// Always return email confirmation to the deployed GitHub Pages site.
const EMAIL_REDIRECT_URL = 'https://origin-core.github.io/MyMiXO6/';

const AVATARS = [
  { id: 'nova', name: 'Nova', symbol: '✦', color: '#b7f36b' },
  { id: 'vex', name: 'Vex', symbol: '◈', color: '#c2a7ff' },
  { id: 'orbit', name: 'Orbit', symbol: '◎', color: '#8dd9ff' },
  { id: 'pixel', name: 'Pixel', symbol: '▦', color: '#ffbf8a' },
  { id: 'ghost', name: 'Ghost', symbol: '◌', color: '#d4d9e5' },
  { id: 'ember', name: 'Ember', symbol: '✺', color: '#ff8e9c' },
  { id: 'luna', name: 'Luna', symbol: '☾', color: '#f2d68c' },
  { id: 'drift', name: 'Drift', symbol: '〰', color: '#83e6cf' },
];
const initialRooms = [
  { id: 'demo-1', game_name: 'VALORANT', title: 'یک اسکواد برای رنک امشب', description: 'میکروفون روشن، بازی تیمی و بدون حاشیه. تازه‌کارها هم خوش‌آمدند.', region: 'EU', max_players: 5, status: 'open', server_url: '', profiles: { username: 'nightshift', display_name: 'Night Shift', avatar_key: 'vex' }, lobby_members: [{ user_id: '1' }, { user_id: '2' }, { user_id: '3' }] },
  { id: 'demo-2', game_name: 'MINECRAFT', title: 'Survival — دنیای تازه', description: 'شروع از صفر؛ ساخت‌وساز و اکتشاف با یک گروه ریلکس.', region: 'EU', max_players: 8, status: 'open', server_url: '', profiles: { username: 'moss.exe', display_name: 'moss.exe', avatar_key: 'orbit' }, lobby_members: [{ user_id: '1' }, { user_id: '2' }] },
  { id: 'demo-3', game_name: 'APEX LEGENDS', title: 'Trios · دنبال دو هم‌تیمی', description: 'ارتباط خوب مهم‌تر از رنک. آماده‌ایم برای چند دست بازی.', region: 'EU', max_players: 3, status: 'open', server_url: '', profiles: { username: 'lowkey', display_name: 'lowkey', avatar_key: 'ember' }, lobby_members: [{ user_id: '1' }] },
];
const avatarFor = (key) => AVATARS.find(a => a.id === key) || AVATARS[0];
const memberCountFor = (room) => Number.isFinite(Number(room?.member_count)) && room?.member_count !== undefined && room?.member_count !== null ? Number(room.member_count) : (room?.lobby_members?.length || 1);

function Mark() { return <div className="brand-mark" aria-hidden="true"><span>M</span><i>×</i></div>; }
function Avatar({ profile, size = 'normal' }) { const a = avatarFor(profile?.avatar_key); return <div className={`avatar avatar-${size}`} style={{ '--avatar-color': a.color }} title={profile?.display_name || profile?.username || a.name}><span>{a.symbol}</span></div>; }
function Icon({ children }) { return <span className="icon" aria-hidden="true">{children}</span>; }

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [publicProfile, setPublicProfile] = useState(null);
  const [rooms, setRooms] = useState(() => isSupabaseConfigured ? [] : initialRooms);
  const [page, setPage] = useState('lobbies');
  const [modal, setModal] = useState('');
  const [authMode, setAuthMode] = useState('signup');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState('ALL');
  const [roomForm, setRoomForm] = useState({ game_name: 'VALORANT', title: '', server_url: '', description: '', region: 'EU', max_players: '5' });
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '', display_name: '' });
  const [profileForm, setProfileForm] = useState({ username: '', display_name: '', avatar_key: 'nova', bio: '' });

  const flash = useCallback((message) => { setNotice(message); window.setTimeout(() => setNotice(''), 4500); }, []);
  const loadProfile = useCallback(async (user) => {
    if (!supabase || !user) return;
    const { data, error } = await supabase.from('profiles').select('id,username,display_name,avatar_key,bio,created_at').eq('id', user.id).maybeSingle();
    if (error) { console.error(error); return; }
    if (data) { setProfile(data); setProfileForm({ username: data.username || '', display_name: data.display_name || '', avatar_key: data.avatar_key || 'nova', bio: data.bio || '' }); }
  }, []);
  const loadRooms = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('lobbies').select('id,owner_id,game_name,title,server_url,description,region,max_players,member_count,status,created_at,profiles!lobbies_owner_id_fkey(username,display_name,avatar_key)').eq('status', 'open').order('created_at', { ascending: false }).limit(60);
    if (error) { console.error('lobbies query:', error.message); return; }
    setRooms(data || []);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (data.session?.user) loadProfile(data.session.user); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); if (next?.user) { setTimeout(() => loadProfile(next.user), 0); } else setProfile(null); });
    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);
  useEffect(() => { loadRooms(); }, [loadRooms]);

  const filteredRooms = useMemo(() => rooms.filter(r => (gameFilter === 'ALL' || r.game_name.toUpperCase() === gameFilter) && `${r.game_name} ${r.title} ${r.description} ${r.region} ${r.profiles?.username || ''}`.toLowerCase().includes(search.toLowerCase())), [rooms, gameFilter, search]);
  const games = useMemo(() => ['ALL', ...new Set(rooms.map(r => r.game_name.toUpperCase()))], [rooms]);

  async function submitAuth(e) {
    e.preventDefault(); if (!supabase) { flash('اتصال Supabase تنظیم نشده است.'); return; }
    setBusy(true);
    try {
      if (authMode === 'signup') {
        const username = authForm.username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
        if (username.length < 3) throw new Error('نام کاربری باید حداقل ۳ حرف یا عدد داشته باشد.');
        if (username.length > 24) throw new Error('نام کاربری نمی‌تواند بیش از ۲۴ کاراکتر باشد.');
        const { data: existingUsername, error: usernameLookupError } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
        if (usernameLookupError) throw usernameLookupError;
        if (existingUsername) throw new Error('این نام کاربری قبلاً انتخاب شده است.');
        const { data, error } = await supabase.auth.signUp({ email: authForm.email.trim(), password: authForm.password, options: { emailRedirectTo: EMAIL_REDIRECT_URL, data: { username, display_name: authForm.display_name.trim() || username, avatar_key: 'nova' } } });
        if (error) throw error;
        if (data.session) { setSession(data.session); await loadProfile(data.user); setModal(''); flash('اکانت ساخته شد؛ خوش آمدی!'); }
        else { setModal(''); flash('لینک تأیید به ایمیلت ارسال شد. ایمیلت را تأیید کن و بعد وارد شو.'); }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authForm.email.trim(), password: authForm.password });
        if (error) throw error;
        setSession(data.session); await loadProfile(data.user); setModal(''); flash('خوش برگشتی!');
      }
    } catch (err) { flash(err.message || 'مشکلی پیش آمد. دوباره تلاش کن.'); } finally { setBusy(false); }
  }
  async function createRoom(e) {
    e.preventDefault(); if (!session) { setAuthMode('signup'); setModal('auth'); flash('برای ساخت لابی ابتدا وارد حسابت شو.'); return; }
    if (!roomForm.title.trim()) { flash('برای لابی یک عنوان وارد کن.'); return; }
    setBusy(true);
    try {
      const payload = { owner_id: session.user.id, game_name: roomForm.game_name.trim().toUpperCase(), title: roomForm.title.trim(), server_url: roomForm.server_url.trim(), description: roomForm.description.trim(), region: roomForm.region, max_players: Number(roomForm.max_players), status: 'open' };
      const { data, error } = await supabase.from('lobbies').insert(payload).select('id').single();
      if (error) throw error;
      const { error: memberError } = await supabase.from('lobby_members').insert({ lobby_id: data.id, user_id: session.user.id });
      if (memberError) {
        await supabase.from('lobbies').delete().eq('id', data.id).eq('owner_id', session.user.id);
        throw memberError;
      }
      setModal(''); setRoomForm({ game_name: 'VALORANT', title: '', server_url: '', description: '', region: 'EU', max_players: '5' }); await loadRooms(); setPage('lobbies'); flash('لابی ساخته شد و در فهرست قرار گرفت.');
    } catch (error) {
      flash(error.message?.includes('row-level security') ? 'اجازهٔ ساخت لابی وجود ندارد؛ دوباره وارد حسابت شو.' : error.message || 'ساخت لابی انجام نشد؛ دوباره تلاش کن.');
    } finally { setBusy(false); }
  }
  async function joinRoom(room) {
    if (!session) { setAuthMode('signup'); setModal('auth'); flash('برای پیوستن به لابی باید وارد شوی.'); return; }
    if (room.owner_id === session.user.id) { flash('این لابی را خودت ساخته‌ای.'); return; }
    const { error } = await supabase.from('lobby_members').insert({ lobby_id: room.id, user_id: session.user.id });
    if (error && !error.message.includes('duplicate key')) {
      const message = /full|capacity/i.test(error.message) ? 'ظرفیت این لابی تکمیل شده است.' : /no longer open|not found/i.test(error.message) ? 'این لابی دیگر باز نیست.' : error.message;
      flash(message); await loadRooms(); return;
    }
    await loadRooms(); flash('به لابی پیوستی! هماهنگی را از طریق اطلاعات سرور انجام بده.');
  }
  async function saveProfile(e) {
    e.preventDefault(); if (!session) return;
    const username = profileForm.username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (username.length < 3) { flash('نام کاربری باید حداقل ۳ کاراکتر باشد.'); return; }
    setBusy(true);
    const { data, error } = await supabase.from('profiles').upsert({ id: session.user.id, username, display_name: profileForm.display_name.trim() || username, avatar_key: profileForm.avatar_key, bio: profileForm.bio.trim() }, { onConflict: 'id' }).select().single();
    setBusy(false);
    if (error) { flash(error.message.includes('profiles_username_key') ? 'این نام کاربری قبلاً انتخاب شده است.' : error.message); return; }
    setProfile(data); setModal(''); flash('پروفایلت ذخیره شد.'); await loadRooms();
  }
  async function logout() { await supabase.auth.signOut(); setSession(null); setProfile(null); setPage('lobbies'); flash('از حساب خارج شدی.'); }
  async function openPublicProfile(username) {
    if (!username) return;
    if (profile?.username === username) { setPage('profile'); return; }
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('username,display_name,avatar_key,bio,created_at').eq('username', username).maybeSingle();
    if (error) { flash('بارگذاری پروفایل انجام نشد؛ دوباره تلاش کن.'); return; }
    if (!data) { flash('این پروفایل پیدا نشد.'); return; }
    setPublicProfile(data); setPage('public-profile');
  }

  return <div className="app-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <header className="topbar">
      <button className="brand" onClick={() => setPage('lobbies')} aria-label="MyMiXO6 home"><Mark/><span className="brand-word">MyMiXO<span>6</span></span></button>
      <nav className="main-nav" aria-label="ناوبری اصلی">
        <button className={page === 'lobbies' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('lobbies')}>لابی تورنومنت <span className="nav-dot"/></button>
        <button className={page === 'config' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('config')}>Config <span className="soon">به‌زودی</span></button>
        <button className={page === 'store' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('store')}>فروشگاه <span className="soon">به‌زودی</span></button>
      </nav>
      <div className="top-actions">{session ? <><button className="profile-chip" onClick={() => { setPage('profile'); setProfileForm({ username: profile?.username || '', display_name: profile?.display_name || '', avatar_key: profile?.avatar_key || 'nova', bio: profile?.bio || '' }); }}><Avatar profile={profile}/><span>{profile?.display_name || 'بازیکن'}</span><Icon>⌄</Icon></button><button className="icon-button" onClick={logout} title="خروج"><Icon>↗</Icon></button></> : <button className="login-button" onClick={() => { setAuthMode('signup'); setModal('auth'); }}>ورود / ثبت‌نام <Icon>↗</Icon></button>}</div>
    </header>

    <main>
      {page === 'lobbies' && <>
        <section className="hero">
          <div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> فضای بازی، با آدم‌های خودت <span className="eyebrow-line"/></div><h1>بازی بهتره،<br/><span>وقتی تنها نیستی.</span></h1><p className="hero-desc">لابی خودت رو بساز، هم‌تیمی پیدا کن و قبل از شروع بازی، اسکوادت رو کامل کن. ساده، سریع، بدون شلوغی.</p><div className="hero-actions"><button className="primary-button" onClick={() => session ? setModal('room') : (setAuthMode('signup'), setModal('auth'))}>＋ ساخت لابی <span>↗</span></button><button className="text-button" onClick={() => document.getElementById('lobby-board')?.scrollIntoView({ behavior: 'smooth' })}>پیدا کردن هم‌تیمی <span>↓</span></button></div><div className="hero-proof"><div className="proof-avatars"><Avatar profile={{avatar_key:'nova'}}/><Avatar profile={{avatar_key:'vex'}}/><Avatar profile={{avatar_key:'ember'}}/></div><div><strong>{rooms.length.toString().padStart(2, '0')} لابی فعال</strong><small>جای بعدی توئه</small></div><span className="proof-divider"/><div><strong>۰۱ / ۲۴</strong><small>نسخهٔ آغازین</small></div></div></div>
          <div className="hero-art" aria-label="تصویر گرافیکی تزئینی"><div className="art-grid"/><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="art-core"><Mark/><span>MM / 06</span></div><div className="floating-tag tag-top"><i/> PARTY FINDER <b>01</b></div><div className="floating-tag tag-bottom"><span>✦</span><div><b>YOUR NEXT SQUAD</b><small>WAITING IN THE LOBBY</small></div></div><div className="art-cross cross-a">＋</div><div className="art-cross cross-b">＋</div><div className="art-index">FIG. 001 — CONNECTION</div></div>
        </section>
        <section className="board-section" id="lobby-board"><div className="section-heading"><div><div className="section-kicker">THE LOBBY BOARD <span> / 01</span></div><h2>پیدا کن. وصل شو. <em>بازی کن.</em></h2></div><button className="create-small" onClick={() => session ? setModal('room') : (setAuthMode('signup'), setModal('auth'))}>ساخت لابی <span>＋</span></button></div>
          <div className="board-toolbar"><div className="board-title"><span className="live-dot"/> لابی‌های در دسترس <span className="count-pill">{filteredRooms.length.toString().padStart(2,'0')}</span></div><div className="toolbar-tools"><label className="search-box"><Icon>⌕</Icon><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجوی بازی یا لابی..." aria-label="جستجوی لابی"/><kbd>/</kbd></label><div className="filter-select"><select value={gameFilter} onChange={e => setGameFilter(e.target.value)} aria-label="فیلتر بازی">{games.map(g => <option key={g} value={g}>{g === 'ALL' ? 'همهٔ بازی‌ها' : g}</option>)}</select><Icon>⌄</Icon></div></div></div>
          <div className="lobby-list">{filteredRooms.map((room, i) => <article className="lobby-row" key={room.id}><div className="row-number">{String(i + 1).padStart(2, '0')}</div><div className="game-monogram" data-game={room.game_name}>{room.game_name.slice(0,2)}</div><div className="lobby-main"><div className="lobby-meta"><span className="game-name">{room.game_name}</span><span className="region-tag">{room.region || 'EU'} REGION</span></div><h3>{room.title}</h3><p>{room.description || 'بدون توضیحات'}</p><div className="lobby-owner"><Avatar profile={room.profiles || {avatar_key:'nova'}} size="small"/><span>{room.profiles?.display_name || room.profiles?.username || 'بازیکن'}</span><span className="owner-sep">·</span><button type="button" className="public-profile-link" onClick={() => openPublicProfile(room.profiles?.username)}>@{room.profiles?.username || 'player'}</button></div></div><div className="lobby-stats"><div className="player-count"><Icon>♙</Icon><strong>{memberCountFor(room)}<span> / {room.max_players}</span></strong></div><div className="player-bars">{Array.from({length: Math.min(Number(room.max_players) || 5, 8)}, (_, n) => <i key={n} className={n < memberCountFor(room) ? 'filled' : ''}/>)}</div><span className="open-label"><i/> OPEN</span></div><div className="lobby-join"><button onClick={() => session ? joinRoom(room) : (setAuthMode('signup'), setModal('auth'))} disabled={memberCountFor(room) >= room.max_players || room.status !== 'open'}>پیوستن <span>↗</span></button><small>{room.server_url ? <a href={room.server_url} target="_blank" rel="noopener noreferrer">ورود به سرور ↗</a> : 'هماهنگی درون لابی'}</small></div></article>)}
          {filteredRooms.length === 0 && <div className="empty-state"><div className="empty-icon">⌕</div><h3>لابی‌ای پیدا نشد</h3><p>فیلتر رو تغییر بده یا اولین لابی این بازی رو بساز.</p><button className="primary-button" onClick={() => session ? setModal('room') : (setAuthMode('signup'), setModal('auth'))}>ساخت لابی <span>↗</span></button></div>}</div>
          <div className="board-foot"><span>نمایش لابی‌های باز <b>·</b> اطلاعات خصوصی پنهان است</span><span>MYMIXO6 / LOBBY SYSTEM <b>↗</b></span></div>
        </section>
        <section className="bottom-cta"><div className="cta-symbol">✳</div><div><div className="section-kicker">YOUR PEOPLE ARE OUT THERE</div><h2>اسکوادت هنوز <em>کامل نیست.</em></h2><p>یک لابی بساز و آدم‌های بازی خودت رو پیدا کن.</p></div><button className="primary-button" onClick={() => session ? setModal('room') : (setAuthMode('signup'), setModal('auth'))}>شروع کن <span>↗</span></button></section>
      </>}
      {(page === 'config' || page === 'store') && <section className="coming-page"><div className="coming-mark"><Mark/></div><div className="section-kicker">MYMIXO6 / {page === 'config' ? 'CONFIG' : 'STORE'}</div><h1>{page === 'config' ? 'هر جزئیات،' : 'چیزهای خوب،'}<br/><em>{page === 'config' ? 'به سبک تو.' : 'در راه‌اند.'}</em></h1><p>این بخش در حال آماده‌سازی است. به‌زودی با تجربه‌ای تازه برمی‌گردیم.</p><span className="coming-pill"><i/> COMING SOON</span><button className="text-button" onClick={() => setPage('lobbies')}>بازگشت به لابی‌ها ↗</button></section>}
      {page === 'public-profile' && publicProfile && <section className="profile-page public-profile-page"><div className="section-kicker">PLAYER PROFILE / PUBLIC</div><div className="public-profile-card"><Avatar profile={publicProfile} size="large"/><div className="public-profile-identity"><h1>{publicProfile.display_name || publicProfile.username}</h1><div className="public-profile-handle">@{publicProfile.username}</div></div><span className="public-tag">PUBLIC PROFILE</span><div className="public-profile-bio"><div className="section-kicker">ABOUT PLAYER</div><p>{publicProfile.bio || 'این بازیکن هنوز چیزی دربارهٔ خودش ننوشته.'}</p></div><div className="public-profile-meta"><span>عضو MyMiXO6</span><b>{publicProfile.created_at ? new Date(publicProfile.created_at).toLocaleDateString('fa-IR') : '—'}</b></div><button className="text-button" onClick={() => setPage('lobbies')}>بازگشت به لابی‌ها ↗</button><p className="profile-privacy-note">اطلاعات ایمیل در پروفایل عمومی نمایش داده نمی‌شود.</p></div></section>}
      {page === 'profile' && <section className="profile-page"><div className="section-kicker">PLAYER IDENTITY / 03</div><h1>پروفایل <em>تو.</em></h1><p className="profile-intro">چیزی که هم‌تیمی‌ها می‌بینند؛ ایمیل تو هیچ‌وقت در لابی نمایش داده نمی‌شود.</p><form className="profile-editor" onSubmit={saveProfile}><div className="profile-preview"><Avatar profile={profileForm} size="large"/><div><b>{profileForm.display_name || 'نام بازیکن'}</b><span>@{profileForm.username || 'username'}</span></div><span className="public-tag">PUBLIC PROFILE</span></div><label>نام نمایشی<input maxLength="32" value={profileForm.display_name} onChange={e => setProfileForm({...profileForm, display_name:e.target.value})} placeholder="نامی که بقیه می‌بینند"/></label><label>نام کاربری<input required minLength="3" maxLength="24" value={profileForm.username} onChange={e => setProfileForm({...profileForm, username:e.target.value})} placeholder="your_handle"/></label><label>دربارهٔ من<textarea maxLength="180" rows="3" value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio:e.target.value})} placeholder="چه بازی‌هایی می‌کنی؟"/></label><div className="avatar-label">انتخاب آواتار <span>۰۸ / COLLECTION 01</span></div><div className="avatar-picker">{AVATARS.map(a => <button type="button" key={a.id} className={profileForm.avatar_key === a.id ? 'avatar-option selected' : 'avatar-option'} onClick={() => setProfileForm({...profileForm, avatar_key:a.id})}><Avatar profile={{avatar_key:a.id}} size="large"/><span>{a.name}</span>{profileForm.avatar_key === a.id && <b>✓</b>}</button>)}</div><button className="primary-button" type="submit" disabled={busy}>{busy ? 'در حال ذخیره...' : 'ذخیرهٔ پروفایل'} <span>↗</span></button></form></section>}
    </main>
    <footer className="footer"><div className="footer-brand"><Mark/><span>MYMIXO6</span></div><span>BUILT FOR THE NEXT ROUND <b>✳</b></span><span>© 2026 MYMIXO6</span></footer>

    {modal === 'auth' && <div className="modal-backdrop" onMouseDown={e => { if(e.target === e.currentTarget) setModal(''); }}><section className="modal-card auth-modal"><button className="modal-close" onClick={() => setModal('')} aria-label="بستن">×</button><div className="modal-brand"><Mark/></div><div className="section-kicker">PLAYER ACCESS / 01</div><h2>{authMode === 'signup' ? 'بازی از اینجا شروع می‌شه.' : 'دوباره خوش اومدی.'}</h2><p>{authMode === 'signup' ? 'اکانتت رو بساز؛ ایمیلت رو تأیید کن و وارد لابی شو.' : 'وارد شو تا لابی‌ها و پروفایلت منتظرت باشن.'}</p><form onSubmit={submitAuth} className="modal-form">{authMode === 'signup' && <><label>نام کاربری<input required minLength="3" maxLength="24" value={authForm.username} onChange={e => setAuthForm({...authForm,username:e.target.value})} placeholder="مثلاً nightshift" autoComplete="username"/></label><label>نام نمایشی <span className="optional">اختیاری</span><input maxLength="32" value={authForm.display_name} onChange={e => setAuthForm({...authForm,display_name:e.target.value})} placeholder="اسم داخل بازی"/></label></>}<label>ایمیل<input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm,email:e.target.value})} placeholder="you@example.com" autoComplete="email"/></label><label>رمز عبور<input type="password" required minLength="8" value={authForm.password} onChange={e => setAuthForm({...authForm,password:e.target.value})} placeholder="حداقل ۸ کاراکتر" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}/></label><button className="primary-button modal-submit" type="submit" disabled={busy}>{busy ? 'لطفاً صبر کن...' : authMode === 'signup' ? 'ساخت اکانت' : 'ورود به حساب'} <span>↗</span></button></form><div className="auth-switch">{authMode === 'signup' ? 'قبلاً اکانت ساختی؟' : 'تازه اومدی؟'} <button onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}>{authMode === 'signup' ? 'وارد شو' : 'ثبت‌نام کن'}</button></div><div className="privacy-note"><Icon>◇</Icon> ایمیل تو خصوصی می‌مونه و در لابی نمایش داده نمی‌شه.</div></section></div>}
    {modal === 'room' && <div className="modal-backdrop" onMouseDown={e => { if(e.target === e.currentTarget) setModal(''); }}><section className="modal-card room-modal"><button className="modal-close" onClick={() => setModal('')} aria-label="بستن">×</button><div className="section-kicker">CREATE A LOBBY / 02</div><h2>لابی خودت رو بساز.</h2><p>جزئیات رو وارد کن تا هم‌تیمی‌های مناسب پیدات کنن.</p><form className="modal-form" onSubmit={createRoom}><label>نام بازی<input required minLength="2" maxLength="60" value={roomForm.game_name} onChange={e => setRoomForm({...roomForm,game_name:e.target.value})} placeholder="VALORANT, Minecraft..."/></label><label>عنوان لابی<input required minLength="3" maxLength="80" value={roomForm.title} onChange={e => setRoomForm({...roomForm,title:e.target.value})} placeholder="دنبال دو هم‌تیمی برای رنک"/></label><label>لینک سرور یا دعوت <span className="optional">اختیاری</span><input type="url" maxLength="500" value={roomForm.server_url} onChange={e => setRoomForm({...roomForm,server_url:e.target.value})} placeholder="https://..."/></label><label>توضیحات<textarea rows="3" maxLength="1200" value={roomForm.description} onChange={e => setRoomForm({...roomForm,description:e.target.value})} placeholder="سبک بازی، رنک، میکروفون و ..."/></label><div className="form-pair"><label>منطقه<select value={roomForm.region} onChange={e => setRoomForm({...roomForm,region:e.target.value})}><option value="EU">Europe (EU)</option><option value="ME">Middle East (ME)</option><option value="NA">North America (NA)</option><option value="ASIA">Asia</option><option value="ANY">Any region</option></select></label><label>ظرفیت بازیکن<select value={roomForm.max_players} onChange={e => setRoomForm({...roomForm,max_players:e.target.value})}>{[2,3,4,5,6,8,10,20].map(n => <option key={n} value={n}>{n} بازیکن</option>)}</select></label></div><button className="primary-button modal-submit" type="submit" disabled={busy}>{busy ? 'در حال ساخت...' : 'انتشار لابی'} <span>↗</span></button></form></section></div>}
    {notice && <div className="toast" role="status"><span>✳</span>{notice}<button onClick={() => setNotice('')} aria-label="بستن پیام">×</button></div>}
    {!isSupabaseConfigured && <div className="dev-warning">Supabase هنوز متصل نشده است.</div>}
  </div>;
}
