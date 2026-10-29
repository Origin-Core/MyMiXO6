import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const PUBLIC_BASE = import.meta.env.BASE_URL || '/';
const EMAIL_REDIRECT_URL = new URL(PUBLIC_BASE, window.location.origin).href;
const AVATARS = [
  { id: 'nova', name: 'Nova', accent: '#d8ff45' },
  { id: 'vex', name: 'Vex', accent: '#a99bff' },
  { id: 'orbit', name: 'Orbit', accent: '#71e6df' },
  { id: 'pixel', name: 'Pixel', accent: '#e2ebf6' },
  { id: 'ghost', name: 'Ghost', accent: '#a8f08a' },
  { id: 'ember', name: 'Ember', accent: '#ffad75' },
  { id: 'luna', name: 'Luna', accent: '#9deeff' },
  { id: 'drift', name: 'Drift', accent: '#f0cb7e' },
];
const DEMO_ROOMS = [
  { id: 'demo-1', game_name: 'VALORANT', title: 'اسکواد رنک امشب', description: 'بازی تیمی، ارتباط خوب و چند دست رنک باهم.', region: 'EU', max_players: 5, member_count: 3, status: 'open', profiles: { username: 'nightshift', display_name: 'Night Shift', avatar_key: 'vex' } },
  { id: 'demo-2', game_name: 'MINECRAFT', title: 'Survival از صفر', description: 'دنیای تازه؛ ساخت‌وساز و اکتشاف با یه تیم ریلکس.', region: 'EU', max_players: 8, member_count: 2, status: 'open', profiles: { username: 'moss.exe', display_name: 'moss.exe', avatar_key: 'orbit' } },
  { id: 'demo-3', game_name: 'APEX LEGENDS', title: 'Trios؛ دو هم‌تیمی کم داریم', description: 'هماهنگی مهم‌تر از رنک؛ آماده‌ایم برای چند دست بازی.', region: 'ME', max_players: 3, member_count: 1, status: 'open', profiles: { username: 'lowkey', display_name: 'lowkey', avatar_key: 'ember' } },
];
const avatarFor = (key) => AVATARS.find((item) => item.id === key) || AVATARS[0];
const countFor = (room) => Number(room && room.member_count != null ? room.member_count : 1);

function BrandLogo({ stacked = false, compact = false }) {
  return <div className={'brand-lockup' + (stacked ? ' brand-lockup-stacked' : '') + (compact ? ' brand-lockup-compact' : '')}>
    {stacked ? <>
      <img className="brand-mark-image" src={PUBLIC_BASE + 'mymixo6-mark.webp'} alt="نشان MyMiXO6" />
      <span className="brand-wordmark">MyMiXO<span>6</span></span>
    </> : <img className="brand-logo-image" src={PUBLIC_BASE + 'mymixo6-logo.webp'} alt="MyMiXO6" />}
  </div>;
}
function Avatar({ profile, size = 'md' }) {
  const avatar = avatarFor(profile && profile.avatar_key);
  return <span className={'avatar avatar-' + size} style={{ '--avatar-accent': avatar.accent }} title={(profile && (profile.display_name || profile.username)) || avatar.name}>
    <img className="avatar-image" src={PUBLIC_BASE + 'avatars/' + avatar.id + '.webp'} alt={avatar.name} loading="lazy" />
  </span>;
}
function Icon({ children }) { return <span className="icon" aria-hidden="true">{children}</span>; }
function Eyebrow({ children }) { return <div className="section-eyebrow"><span className="eyebrow-line"/>{children}</div>; }
function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [publicProfile, setPublicProfile] = useState(null);
  const [returnPage, setReturnPage] = useState('lobbies');
  const [rooms, setRooms] = useState(() => isSupabaseConfigured ? [] : DEMO_ROOMS);
  const [page, setPage] = useState('lobbies');
  const [modal, setModal] = useState('');
  const [authMode, setAuthMode] = useState('signup');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState('ALL');
  const [activeLobby, setActiveLobby] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [roomForm, setRoomForm] = useState({ game_name: 'VALORANT', title: '', server_url: '', description: '', region: 'EU', max_players: '5' });
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '', display_name: '' });
  const [profileForm, setProfileForm] = useState({ username: '', display_name: '', avatar_key: 'nova', bio: '' });
  const messagesEndRef = useRef(null);

  const flash = useCallback((message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4600);
  }, []);

  const loadProfile = useCallback(async (user) => {
    if (!supabase || !user) return;
    const { data, error } = await supabase.from('profiles').select('id,username,display_name,avatar_key,bio,created_at').eq('id', user.id).maybeSingle();
    if (error) { console.error('profile:', error.message); return; }
    if (data) {
      setProfile(data);
      setProfileForm({ username: data.username || '', display_name: data.display_name || '', avatar_key: data.avatar_key || 'nova', bio: data.bio || '' });
    }
  }, []);

  const loadRooms = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('lobbies').select('id,owner_id,game_name,title,server_url,description,region,max_players,member_count,status,created_at,profiles!lobbies_owner_id_fkey(username,display_name,avatar_key)').eq('status', 'open').order('created_at', { ascending: false }).limit(60);
    if (error) { console.error('lobbies:', error.message); return; }
    setRooms(data || []);
  }, []);

  const loadLobbyPanel = useCallback(async (lobbyId, silent = false) => {
    if (!supabase || !lobbyId) return;
    if (!silent) setPanelLoading(true);
    try {
      const { data: room, error: roomError } = await supabase.from('lobbies').select('id,owner_id,game_name,title,server_url,description,region,max_players,member_count,status,created_at,profiles!lobbies_owner_id_fkey(username,display_name,avatar_key,bio)').eq('id', lobbyId).maybeSingle();
      if (roomError) throw roomError;
      if (!room) throw new Error('این لابی پیدا نشد یا دسترسی آن را نداری.');
      const { data: membershipRows, error: memberError } = await supabase.from('lobby_members').select('lobby_id,user_id,joined_at').eq('lobby_id', lobbyId).order('joined_at', { ascending: true });
      if (memberError) throw memberError;
      const memberIds = [...new Set((membershipRows || []).map((row) => row.user_id))];
      let profileRows = [];
      if (memberIds.length) {
        const { data, error } = await supabase.from('profiles').select('id,username,display_name,avatar_key,bio,created_at').in('id', memberIds);
        if (error) throw error;
        profileRows = data || [];
      }
      const byId = Object.fromEntries(profileRows.map((item) => [item.id, item]));
      setMembers((membershipRows || []).map((row) => ({ ...row, profile: byId[row.user_id] || { username: 'player', display_name: 'بازیکن', avatar_key: 'nova' } })));
      const { data: rows, error: messageError } = await supabase.from('lobby_messages').select('id,lobby_id,user_id,body,created_at,profiles!lobby_messages_user_id_fkey(id,username,display_name,avatar_key,bio,created_at)').eq('lobby_id', lobbyId).order('created_at', { ascending: true }).limit(100);
      if (messageError) throw messageError;
      setMessages(rows || []);
      setActiveLobby(room);
    } catch (error) {
      console.error('lobby panel:', error.message);
      if (!silent) flash(error.message || 'بارگذاری پنل لابی انجام نشد.');
    } finally {
      if (!silent) setPanelLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) console.error('session:', error.message);
      const current = data && data.session ? data.session : null;
      setSession(current);
      if (current && current.user) loadProfile(current.user);
    });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (nextSession && nextSession.user) {
        window.setTimeout(() => loadProfile(nextSession.user), 0);
        if (event === 'SIGNED_IN') flash('وارد شدی؛ خوش برگشتی به MyMiXO6.');
      } else setProfile(null);
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, [flash, loadProfile]);

  useEffect(() => { loadRooms(); }, [loadRooms]);
  useEffect(() => {
    if (!supabase) return undefined;
    const channel = supabase.channel('mymixo6-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobbies' }, () => loadRooms())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_members' }, () => loadRooms())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadRooms]);
  useEffect(() => {
    if (!supabase || !activeLobby || !activeLobby.id || String(activeLobby.id).startsWith('demo-')) return undefined;
    let queued = false;
    const refresh = () => {
      if (queued) return;
      queued = true;
      window.setTimeout(() => { queued = false; loadLobbyPanel(activeLobby.id, true); loadRooms(); }, 160);
    };
    const channel = supabase.channel('lobby-panel-' + activeLobby.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_messages', filter: 'lobby_id=eq.' + activeLobby.id }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_members', filter: 'lobby_id=eq.' + activeLobby.id }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lobbies', filter: 'id=eq.' + activeLobby.id }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeLobby && activeLobby.id, loadLobbyPanel, loadRooms]);
  useEffect(() => {
    if (page === 'lobby-room' && messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [page, messages]);

  const filteredRooms = useMemo(() => rooms.filter((room) => {
    const game = String(room.game_name || '').toUpperCase();
    const content = [room.game_name, room.title, room.description, room.region, room.profiles && room.profiles.username].join(' ').toLowerCase();
    return (gameFilter === 'ALL' || game === gameFilter) && content.includes(search.trim().toLowerCase());
  }), [rooms, gameFilter, search]);
  const games = useMemo(() => ['ALL', ...new Set(rooms.map((room) => String(room.game_name || '').toUpperCase()))], [rooms]);

  function openAuth(mode = 'signup') { setAuthMode(mode); setModal('auth'); }
  async function submitAuth(event) {
    event.preventDefault();
    if (!supabase) { flash('اتصال Supabase تنظیم نشده است.'); return; }
    setBusy(true);
    try {
      if (authMode === 'signup') {
        const username = authForm.username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
        if (username.length < 3 || username.length > 24) throw new Error('نام کاربری باید بین ۳ تا ۲۴ کاراکتر باشد.');
        const { data: existing, error: lookupError } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
        if (lookupError) throw lookupError;
        if (existing) throw new Error('این نام کاربری قبلاً انتخاب شده است.');
        const { data, error } = await supabase.auth.signUp({ email: authForm.email.trim(), password: authForm.password, options: { emailRedirectTo: EMAIL_REDIRECT_URL, data: { username, display_name: authForm.display_name.trim() || username, avatar_key: 'nova' } } });
        if (error) throw error;
        setModal('');
        if (data.session && data.user) { setSession(data.session); await loadProfile(data.user); flash('اکانت ساخته شد؛ خوش آمدی!'); }
        else flash('لینک تأیید به ایمیلت ارسال شد. بعد از تأیید، سایت به‌صورت خودکار حسابت را می‌شناسد.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authForm.email.trim(), password: authForm.password });
        if (error) throw error;
        setSession(data.session); await loadProfile(data.user); setModal(''); flash('خوش برگشتی!');
      }
    } catch (error) { flash(error.message || 'ورود یا ثبت‌نام انجام نشد؛ دوباره تلاش کن.'); }
    finally { setBusy(false); }
  }

  async function createRoom(event) {
    event.preventDefault();
    if (!session) { openAuth('signup'); flash('برای ساخت لابی ابتدا وارد حسابت شو.'); return; }
    if (!supabase) { flash('اتصال Supabase آماده نیست.'); return; }
    if (roomForm.title.trim().length < 3) { flash('عنوان لابی باید حداقل ۳ کاراکتر داشته باشد.'); return; }
    setBusy(true);
    try {
      const payload = { owner_id: session.user.id, game_name: roomForm.game_name.trim().toUpperCase(), title: roomForm.title.trim(), server_url: roomForm.server_url.trim(), description: roomForm.description.trim(), region: roomForm.region, max_players: Number(roomForm.max_players), status: 'open' };
      const { data, error } = await supabase.from('lobbies').insert(payload).select('id').single();
      if (error) throw error;
      const { error: memberError } = await supabase.from('lobby_members').insert({ lobby_id: data.id, user_id: session.user.id });
      if (memberError) { await supabase.from('lobbies').delete().eq('id', data.id).eq('owner_id', session.user.id); throw memberError; }
      setRoomForm({ game_name: 'VALORANT', title: '', server_url: '', description: '', region: 'EU', max_players: '5' });
      setModal(''); setPage('lobby-room'); await loadRooms(); await loadLobbyPanel(data.id); flash('لابی ساخته شد؛ پنل اختصاصی‌اش آماده است.');
    } catch (error) { flash(error.message && error.message.includes('row-level security') ? 'اجازهٔ ساخت لابی داده نشد؛ نشست حساب را بررسی کن.' : (error.message || 'ساخت لابی انجام نشد.')); }
    finally { setBusy(false); }
  }

  async function openLobby(room) {
    if (!session) { openAuth('login'); flash('برای ورود به پنل لابی باید وارد شوی.'); return; }
    if (!supabase || !room) return;
    try {
      const { data: existing, error: memberError } = await supabase.from('lobby_members').select('lobby_id').eq('lobby_id', room.id).eq('user_id', session.user.id).maybeSingle();
      if (memberError) throw memberError;
      if (existing || room.owner_id === session.user.id) { setActiveLobby(room); setPage('lobby-room'); await loadLobbyPanel(room.id); return; }
      if (room.status !== 'open') { flash('این لابی بسته شده است.'); return; }
      await joinRoom(room);
    } catch (error) { flash(error.message || 'باز کردن پنل لابی انجام نشد.'); }
  }

  async function joinRoom(room) {
    if (!session) { openAuth('login'); flash('برای پیوستن به لابی باید وارد شوی.'); return; }
    if (!supabase || !room) return;
    try {
      const { data: existing, error: lookupError } = await supabase.from('lobby_members').select('lobby_id').eq('lobby_id', room.id).eq('user_id', session.user.id).maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) {
        if (room.status !== 'open') throw new Error('این لابی بسته شده است.');
        if (countFor(room) >= Number(room.max_players)) throw new Error('ظرفیت این لابی تکمیل شده است.');
        const { error } = await supabase.from('lobby_members').insert({ lobby_id: room.id, user_id: session.user.id });
        if (error) throw error;
      }
      setActiveLobby(room); setPage('lobby-room'); await loadLobbyPanel(room.id); await loadRooms();
      if (!existing) flash('وارد لابی شدی؛ به اعضای تیمت سلام کن!');
    } catch (error) { flash(error.message || 'پیوستن به لابی انجام نشد.'); await loadRooms(); }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const body = messageDraft.trim();
    if (!body || !activeLobby || !session || !supabase || busy) return;
    if (activeLobby.status !== 'open') { flash('این لابی بسته شده و چت آن فقط قابل مشاهده است.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from('lobby_messages').insert({ lobby_id: activeLobby.id, user_id: session.user.id, body });
      if (error) throw error;
      setMessageDraft(''); await loadLobbyPanel(activeLobby.id, true);
    } catch (error) { flash(error.message || 'ارسال پیام انجام نشد.'); }
    finally { setBusy(false); }
  }

  async function closeLobby() {
    if (!activeLobby || !session || activeLobby.owner_id !== session.user.id) return;
    if (!window.confirm('لابی بسته شود؟ بعد از بستن، ارسال پیام و پیوستن متوقف می‌شود.')) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from('lobbies').update({ status: 'closed' }).eq('id', activeLobby.id).eq('owner_id', session.user.id).select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('بستن لابی انجام نشد؛ شاید دیگر مالک آن نباشی.');
      setActiveLobby({ ...activeLobby, status: 'closed' }); await loadLobbyPanel(activeLobby.id, true); await loadRooms();
      flash('لابی بسته شد. اعضا دیگر نمی‌توانند پیام تازه بفرستند.');
    } catch (error) { flash(error.message || 'بستن لابی انجام نشد.'); }
    finally { setBusy(false); }
  }

  async function leaveLobby() {
    if (!activeLobby || !session || !supabase) return;
    if (activeLobby.owner_id === session.user.id) { flash('سازنده برای پایان لابی باید آن را ببندد.'); return; }
    const { error } = await supabase.from('lobby_members').delete().eq('lobby_id', activeLobby.id).eq('user_id', session.user.id);
    if (error) { flash(error.message || 'خروج از لابی انجام نشد.'); return; }
    setActiveLobby(null); setMembers([]); setMessages([]); setPage('lobbies'); await loadRooms(); flash('از لابی خارج شدی.');
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!session || !supabase) return;
    const username = profileForm.username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (username.length < 3 || username.length > 24) { flash('نام کاربری باید بین ۳ تا ۲۴ کاراکتر باشد.'); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.from('profiles').upsert({ id: session.user.id, username, display_name: profileForm.display_name.trim() || username, avatar_key: profileForm.avatar_key, bio: profileForm.bio.trim() }, { onConflict: 'id' }).select().single();
      if (error) throw error;
      setProfile(data); setModal(''); flash('پروفایلت ذخیره شد.'); await loadRooms();
    } catch (error) { flash(error.message && error.message.includes('profiles_username_key') ? 'این نام کاربری قبلاً انتخاب شده است.' : (error.message || 'ذخیرهٔ پروفایل انجام نشد.')); }
    finally { setBusy(false); }
  }

  async function logout() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) { flash(error.message || 'خروج انجام نشد.'); return; }
    }
    setSession(null); setProfile(null); setActiveLobby(null); setMembers([]); setMessages([]); setPage('lobbies'); flash('از حساب خارج شدی.');
  }

  async function openPublicProfile(username, fromPage = page, selectedProfile = null) {
    if (!username) return;
    if (profile && profile.username === username) {
      setReturnPage(fromPage);
      setProfileForm({ username: profile.username || '', display_name: profile.display_name || '', avatar_key: profile.avatar_key || 'nova', bio: profile.bio || '' });
      setPage('profile'); return;
    }
    let record = selectedProfile;
    if (!record && supabase) {
      const { data, error } = await supabase.from('profiles').select('username,display_name,avatar_key,bio,created_at').eq('username', username).maybeSingle();
      if (error) { flash('بارگذاری پروفایل انجام نشد؛ دوباره تلاش کن.'); return; }
      record = data;
    }
    if (!record) { flash('این پروفایل پیدا نشد.'); return; }
    setPublicProfile(record); setReturnPage(fromPage); setPage('public-profile');
  }
  function goHome() { setPage('lobbies'); setActiveLobby(null); setMembers([]); setMessages([]); loadRooms(); }

  return <div className="app-shell">
    <div className="ambient ambient-a"/><div className="ambient ambient-b"/><div className="ambient ambient-c"/>
    <header className="topbar">
      <button className="brand-button" onClick={goHome} aria-label="بازگشت به خانه"><BrandLogo compact/></button>
      <nav className="main-nav" aria-label="ناوبری اصلی">
        <button className={page === 'lobbies' || page === 'lobby-room' ? 'nav-link active' : 'nav-link'} onClick={goHome}><span className="nav-glyph">◈</span> لابی‌ها</button>
        <button className={page === 'config' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('config')}>Config <span className="nav-soon">به‌زودی</span></button>
        <button className={page === 'store' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('store')}>فروشگاه <span className="nav-soon">به‌زودی</span></button>
      </nav>
      <div className="top-actions">{session ? <>
        <button className="profile-chip" onClick={() => { setReturnPage(page); setProfileForm({ username: profile && profile.username || '', display_name: profile && profile.display_name || '', avatar_key: profile && profile.avatar_key || 'nova', bio: profile && profile.bio || '' }); setPage('profile'); }}><Avatar profile={profile} size="xs"/><span>{profile && profile.display_name || 'بازیکن'}</span><Icon>⌄</Icon></button>
        <button className="icon-button" title="خروج از حساب" onClick={logout}><Icon>↗</Icon></button>
      </> : <button className="login-button" onClick={() => openAuth('login')}>ورود / ثبت‌نام <span>↗</span></button>}</div>
    </header>

    <main>
      {page === 'lobbies' && <>
        <section className="hero">
          <div className="hero-copy"><Eyebrow>MYMIXO6 / FIND YOUR SQUAD</Eyebrow><h1>بازی وقتی<br/><em>قشنگ‌تره که</em><br/><span>با تیم خودت باشی.</span></h1>
            <p className="hero-description">لابی بساز، آدم‌های هم‌فاز پیدا کن و قبل از شروع بازی با تیمت هماهنگ شو. همه‌چیز در یک جای اختصاصی، با چت زنده و پروفایل اعضا.</p>
            <div className="hero-actions"><button className="primary-button" onClick={() => session ? setModal('room') : openAuth('signup')}>ساخت لابی <span>＋</span></button><button className="ghost-button" onClick={() => document.getElementById('lobby-board') && document.getElementById('lobby-board').scrollIntoView({ behavior: 'smooth' })}>پیدا کردن تیم <span>↓</span></button></div>
            <div className="hero-stats"><div className="hero-stat"><strong>{rooms.length.toLocaleString('fa-IR')}</strong><span>لابی باز</span></div><div className="stat-divider"/><div className="hero-stat"><strong>LIVE</strong><span>همگام‌سازی زنده</span></div><div className="stat-divider"/><div className="hero-stat"><strong>۰۸</strong><span>آواتار اختصاصی</span></div></div>
          </div>
          <div className="hero-visual"><div className="visual-ring ring-one"/><div className="visual-ring ring-two"/><div className="visual-grid"/><div className="visual-orbit-label orbit-label-top"><span className="status-pulse"/> LOBBY NETWORK / ONLINE</div>
            <div className="hero-brand-card"><BrandLogo stacked/><div className="hero-brand-caption">PLAY TOGETHER. STAY IN SYNC.</div></div>
            <div className="floating-avatar floating-avatar-one"><Avatar profile={{ avatar_key: 'nova' }} size="lg"/></div><div className="floating-avatar floating-avatar-two"><Avatar profile={{ avatar_key: 'luna' }} size="md"/></div><div className="floating-avatar floating-avatar-three"><Avatar profile={{ avatar_key: 'ember' }} size="sm"/></div>
            <div className="visual-tag visual-tag-bottom"><span className="tag-dot"/><div><strong>YOUR NEXT SQUAD</strong><small>IS WAITING FOR YOU</small></div><span className="tag-arrow">↗</span></div><div className="visual-index">MM / 06 — PLAYER CONNECTED</div>
          </div>
        </section>
        <section className="feature-strip"><div className="feature-item"><span className="feature-icon feature-icon-cyan">◉</span><div><strong>چت زندهٔ تیمی</strong><small>هماهنگی قبل از شروع</small></div></div><div className="feature-item"><span className="feature-icon feature-icon-violet">✧</span><div><strong>پروفایل‌های اختصاصی</strong><small>اعضای تیمت رو بشناس</small></div></div><div className="feature-item"><span className="feature-icon feature-icon-acid">⌁</span><div><strong>کنترل کامل سازنده</strong><small>لابی دست خودته</small></div></div></section>
        <section className="board-section" id="lobby-board">
          <div className="section-heading"><div><Eyebrow>THE LOBBY BOARD / 01</Eyebrow><h2>تیمت رو <em>پیدا کن.</em></h2><p>وارد پنل هر لابی شو، اعضا رو ببین و همان‌جا هماهنگ کنید.</p></div><button className="secondary-button" onClick={() => session ? setModal('room') : openAuth('signup')}><span>＋</span> لابی جدید</button></div>
          <div className="board-toolbar"><div className="board-title"><span className="status-pulse"/> لابی‌های در دسترس <span className="count-pill">{filteredRooms.length.toLocaleString('fa-IR')}</span></div><div className="toolbar-tools"><label className="search-box"><Icon>⌕</Icon><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجوی بازی یا لابی..." aria-label="جست‌وجوی لابی"/></label><label className="filter-box"><span>بازی</span><select value={gameFilter} onChange={(event) => setGameFilter(event.target.value)} aria-label="فیلتر بازی">{games.map((game) => <option key={game} value={game}>{game === 'ALL' ? 'همهٔ بازی‌ها' : game}</option>)}</select></label></div></div>
          {!isSupabaseConfigured && <div className="setup-note">اتصال Supabase تنظیم نشده؛ لابی‌های زیر فقط نمونه هستند.</div>}
          <div className="lobby-grid">{filteredRooms.map((room, index) => <article className="lobby-card" key={room.id} style={{ '--card-delay': (index * 70) + 'ms' }}>
            <div className={'lobby-card-cover cover-' + (index % 4)}><span className="cover-game">{room.game_name}</span><span className="cover-serial">MM / {String(index + 1).padStart(2, '0')}</span><div className="cover-orbit"/><div className="cover-mark"><BrandLogo compact/></div><span className="cover-state"><i/> {room.status === 'open' ? 'OPEN LOBBY' : 'CLOSED'}</span></div>
            <div className="lobby-card-body"><div className="card-meta"><span className="region-chip">{room.region || 'EU'} REGION</span><span className="card-members">♙ {countFor(room).toLocaleString('fa-IR')} / {Number(room.max_players).toLocaleString('fa-IR')}</span></div><h3>{room.title}</h3><p className="lobby-description">{room.description || 'برای این لابی توضیحی ثبت نشده.'}</p>
              <div className="card-owner"><Avatar profile={room.profiles} size="sm"/><div><span>سازندهٔ لابی</span><strong>{room.profiles && (room.profiles.display_name || room.profiles.username) || 'بازیکن'}</strong></div><span className="owner-handle">@{room.profiles && room.profiles.username || 'player'}</span></div>
              <button className="card-join-button" disabled={!supabase || (room.status !== 'open' && (!session || room.owner_id !== session.user.id))} onClick={() => openLobby(room)}>{room.status === 'open' ? 'ورود به پنل لابی' : 'مشاهدهٔ پنل'} <span>↗</span></button>
            </div>
          </article>)}
          {filteredRooms.length === 0 && <div className="empty-state"><div className="empty-illustration"><BrandLogo stacked/></div><h3>هنوز لابی‌ای پیدا نشده</h3><p>فیلتر رو تغییر بده یا اولین لابی این بازی رو بساز.</p><button className="primary-button" onClick={() => session ? setModal('room') : openAuth('signup')}>ساخت اولین لابی <span>＋</span></button></div>}</div>
          <div className="board-foot"><span>MYMIXO6 / SQUAD FINDER</span><span>فقط اعضای لابی به چت و فهرست کامل اعضا دسترسی دارند.</span></div>
        </section>
        <section className="closing-cta"><BrandLogo compact/><div className="closing-copy"><Eyebrow>READY WHEN YOU ARE</Eyebrow><h2>این لابی، <em>شروع یه تیمه.</em></h2><p>جمع خودت رو بساز؛ بقیه‌اش با بازی.</p></div><button className="primary-button" onClick={() => session ? setModal('room') : openAuth('signup')}>شروع کنیم <span>↗</span></button></section>
      </>}

      {page === 'lobby-room' && <section className="room-page"><button className="back-link" onClick={goHome}>← بازگشت به لابی‌ها</button>
        {panelLoading && !activeLobby ? <div className="loading-panel"><span className="loader-ring"/><strong>در حال آماده‌سازی پنل لابی...</strong></div> : activeLobby ? <>
          <div className="room-heading"><div className="room-heading-main"><Eyebrow>PRIVATE TEAM SPACE / {activeLobby.game_name}</Eyebrow><h1>{activeLobby.title}</h1><p>{activeLobby.description || 'پنل اختصاصی برای هماهنگی اعضای لابی.'}</p></div><div className="room-status-stack"><span className={activeLobby.status === 'open' ? 'live-status' : 'closed-status'}><i/>{activeLobby.status === 'open' ? 'لابی در حال اجرا' : 'لابی بسته شده'}</span><span className="room-id">ID / {String(activeLobby.id).slice(0, 8).toUpperCase()}</span></div></div>
          {activeLobby.status !== 'open' && <div className="closed-banner">این لابی توسط سازنده بسته شده است؛ پیام‌های قبلی قابل مشاهده‌اند اما ارسال پیام جدید و پیوستن غیرفعال است.</div>}
          <div className="room-layout"><section className="chat-panel">
            <div className="panel-heading"><div className="panel-title-icon">◉</div><div><h2>چت تیم</h2><p>صحبت‌ها فقط برای اعضای همین لابی نمایش داده می‌شوند.</p></div><span className={activeLobby.status === 'open' ? 'chat-live' : 'chat-archived'}><i/>{activeLobby.status === 'open' ? 'LIVE CHAT' : 'ARCHIVED'}</span></div>
            <div className="chat-messages">{!messages.length && <div className="chat-empty"><span>✧</span><strong>اولین پیام رو تو بفرست</strong><p>اینجا محل هماهنگی تیمه؛ شروع کن.</p></div>}
              {messages.map((message) => { const sender = message.profiles || {}; const own = session && message.user_id === session.user.id; return <article className={'chat-message' + (own ? ' own-message' : '')} key={message.id}><button className="message-avatar-button" title="مشاهدهٔ پروفایل" onClick={() => openPublicProfile(sender.username, 'lobby-room', sender)}><Avatar profile={sender} size="sm"/></button><div className="message-content"><div className="message-meta"><button onClick={() => openPublicProfile(sender.username, 'lobby-room', sender)}>{sender.display_name || sender.username || 'بازیکن'}</button><span>@{sender.username || 'player'}</span><time>{formatTime(message.created_at)}</time></div><p>{message.body}</p></div></article>; })}<div ref={messagesEndRef}/>
            </div>
            <form className="chat-composer" onSubmit={sendMessage}><input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} maxLength={1000} placeholder={activeLobby.status === 'open' ? 'پیامت رو برای اعضای تیم بنویس...' : 'این لابی بسته شده است.'} aria-label="متن پیام" disabled={activeLobby.status !== 'open' || !supabase}/><span className="message-length">{messageDraft.length.toLocaleString('fa-IR')} / ۱۰۰۰</span><button type="submit" disabled={busy || activeLobby.status !== 'open' || !messageDraft.trim() || !supabase}>ارسال <span>↗</span></button></form>
            <div className="chat-foot"><span><i/> فضای گفت‌وگوی اختصاصی</span><span>مودبانه بازی کنیم ✦</span></div>
          </section>
          <aside className="room-sidebar"><section className="members-panel"><div className="panel-heading member-heading"><div><Eyebrow>YOUR SQUAD</Eyebrow><h2>اعضای لابی <span>{members.length.toLocaleString('fa-IR')}</span></h2></div><span className="members-limit">{members.length} / {activeLobby.max_players}</span></div>
            <div className="member-list">{members.map((member) => { const person = member.profile || {}; const isOwner = member.user_id === activeLobby.owner_id; const isSelf = session && member.user_id === session.user.id; return <article className="member-row" key={member.user_id}><button className="member-avatar-button" onClick={() => openPublicProfile(person.username, 'lobby-room', person)} title="مشاهدهٔ پروفایل"><Avatar profile={person} size="md"/></button><button className="member-identity" onClick={() => openPublicProfile(person.username, 'lobby-room', person)}><strong>{person.display_name || person.username || 'بازیکن'}</strong><span>@{person.username || 'player'}{isSelf ? ' · تو' : ''}</span></button>{isOwner ? <span className="owner-badge">سازنده</span> : <button className="profile-open" onClick={() => openPublicProfile(person.username, 'lobby-room', person)} aria-label="نمایش پروفایل">↗</button>}</article>; })}{!members.length && <p className="muted-note">فهرست اعضا در حال بارگذاری است.</p>}</div>
            <div className="members-note"><span>◇</span> برای دیدن پروفایل هر بازیکن، روی تصویر یا نامش بزن.</div>
          </section>
          <section className="room-info-panel"><Eyebrow>LOBBY DETAILS</Eyebrow><div className="info-row"><span>بازی</span><strong>{activeLobby.game_name}</strong></div><div className="info-row"><span>منطقه</span><strong>{activeLobby.region || 'EU'}</strong></div><div className="info-row"><span>ظرفیت</span><strong>{members.length} از {activeLobby.max_players} بازیکن</strong></div>{activeLobby.server_url && <a className="server-link" href={activeLobby.server_url} target="_blank" rel="noreferrer">ورود به سرور بازی <span>↗</span></a>}</section>
          {activeLobby.owner_id === (session && session.user.id) && activeLobby.status === 'open' ? <button className="close-lobby-button" onClick={closeLobby} disabled={busy}><span>⊗</span><span><strong>بستن لابی</strong><small>پایان دادن به چت و پیوستن</small></span><b>↗</b></button> : activeLobby.status === 'open' ? <button className="leave-lobby-button" onClick={leaveLobby}><span>↗</span> خروج از لابی</button> : <button className="leave-lobby-button" onClick={goHome}>بازگشت به فهرست لابی‌ها</button>}
          </aside></div>
        </> : <div className="empty-state"><h3>پنل لابی در دسترس نیست</h3><p>از فهرست لابی‌ها یک لابی باز را انتخاب کن.</p><button className="primary-button" onClick={goHome}>بازگشت</button></div>}
      </section>}

      {(page === 'config' || page === 'store') && <section className="coming-page"><BrandLogo stacked/><Eyebrow>MYMIXO6 / {page === 'config' ? 'CONFIG' : 'STORE'}</Eyebrow><h1>{page === 'config' ? 'جزئیات،' : 'چیزهای خوب،'}<br/><em>{page === 'config' ? 'به سبک تو.' : 'در راه‌اند.'}</em></h1><p>این بخش در حال آماده‌سازی است. به‌زودی با تجربه‌ای تازه برمی‌گردیم.</p><span className="coming-pill"><i/> COMING SOON</span><button className="ghost-button" onClick={goHome}>بازگشت به لابی‌ها ↗</button></section>}

      {page === 'profile' && <section className="profile-page"><button className="back-link" onClick={() => setPage(returnPage || 'lobbies')}>← بازگشت</button><Eyebrow>PLAYER IDENTITY / 03</Eyebrow><h1>پروفایل <em>تو.</em></h1><p className="profile-intro">آواتار و مشخصاتت را تنظیم کن تا هم‌تیمی‌ها بهتر بشناسنت.</p>
        <form className="profile-editor" onSubmit={saveProfile}><div className="profile-preview"><Avatar profile={profileForm} size="xl"/><div><strong>{profileForm.display_name || 'نام بازیکن'}</strong><span>@{profileForm.username || 'username'}</span></div><span className="public-tag">PUBLIC PROFILE</span></div>
          <label>نام نمایشی<input maxLength={32} value={profileForm.display_name} onChange={(event) => setProfileForm({ ...profileForm, display_name: event.target.value })} placeholder="نامی که بقیه می‌بینند"/></label><label>نام کاربری<input required minLength={3} maxLength={24} value={profileForm.username} onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })} placeholder="your_handle"/></label><label>دربارهٔ من<textarea maxLength={180} rows={3} value={profileForm.bio} onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })} placeholder="بازی‌های مورد علاقه و سبک بازیت..."/></label>
          <div className="avatar-picker-heading"><span>انتخاب آواتار تصویری</span><small>۸ آواتار اختصاصی / COLLECTION 01</small></div><div className="avatar-picker">{AVATARS.map((avatar) => <button type="button" key={avatar.id} className={profileForm.avatar_key === avatar.id ? 'avatar-option selected' : 'avatar-option'} onClick={() => setProfileForm({ ...profileForm, avatar_key: avatar.id })}><Avatar profile={{ avatar_key: avatar.id }} size="xl"/><span>{avatar.name}</span>{profileForm.avatar_key === avatar.id && <b>✓</b>}</button>)}</div>
          <button className="primary-button profile-save" type="submit" disabled={busy}>{busy ? 'در حال ذخیره...' : 'ذخیرهٔ پروفایل'} <span>↗</span></button>
        </form></section>}

      {page === 'public-profile' && publicProfile && <section className="profile-page public-profile-page"><button className="back-link" onClick={() => setPage(returnPage || 'lobbies')}>← بازگشت به {returnPage === 'lobby-room' ? 'پنل لابی' : 'فهرست'}</button><Eyebrow>PLAYER PROFILE / PUBLIC</Eyebrow><div className="public-profile-card"><Avatar profile={publicProfile} size="xl"/><div className="public-profile-identity"><h1>{publicProfile.display_name || publicProfile.username}</h1><span>@{publicProfile.username}</span></div><span className="public-tag">PUBLIC PLAYER</span><div className="public-profile-bio"><Eyebrow>ABOUT PLAYER</Eyebrow><p>{publicProfile.bio || 'این بازیکن هنوز چیزی دربارهٔ خودش ننوشته.'}</p></div><div className="public-profile-meta"><span>عضو MyMiXO6</span><strong>{publicProfile.created_at ? new Date(publicProfile.created_at).toLocaleDateString('fa-IR') : '—'}</strong></div><button className="ghost-button" onClick={() => setPage(returnPage || 'lobbies')}>بازگشت ↗</button><p className="profile-privacy-note">ایمیل بازیکنان هیچ‌وقت در پروفایل عمومی نمایش داده نمی‌شود.</p></div></section>}
    </main>

    <footer className="footer"><BrandLogo compact/><span>BUILT FOR THE NEXT ROUND <b>✳</b></span><span>© 2026 MYMIXO6</span></footer>

    {modal === 'auth' && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(''); }}><section className="modal-card auth-modal"><button className="modal-close" onClick={() => setModal('')} aria-label="بستن">×</button><BrandLogo compact/><Eyebrow>PLAYER ACCESS / 01</Eyebrow><h2>{authMode === 'signup' ? 'تیمت از اینجا شروع می‌شه.' : 'دوباره خوش اومدی.'}</h2><p>{authMode === 'signup' ? 'اکانتت رو بساز و وارد دنیای تیمی MyMiXO6 شو.' : 'وارد شو تا لابی‌ها و پروفایلت منتظرت باشن.'}</p>
      <form onSubmit={submitAuth} className="modal-form">{authMode === 'signup' && <><label>نام کاربری<input required minLength={3} maxLength={24} value={authForm.username} onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })} placeholder="مثلاً nightshift" autoComplete="username"/></label><label>نام نمایشی <span className="optional">اختیاری</span><input maxLength={32} value={authForm.display_name} onChange={(event) => setAuthForm({ ...authForm, display_name: event.target.value })} placeholder="اسم داخل بازی"/></label></>}
        <label>ایمیل<input type="email" required value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="you@example.com" autoComplete="email"/></label><label>رمز عبور<input type="password" required minLength={8} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="حداقل ۸ کاراکتر" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}/></label><button className="primary-button modal-submit" type="submit" disabled={busy}>{busy ? 'لطفاً صبر کن...' : authMode === 'signup' ? 'ساخت اکانت' : 'ورود به حساب'} <span>↗</span></button></form>
      <div className="auth-switch">{authMode === 'signup' ? 'قبلاً اکانت ساختی؟' : 'تازه اومدی؟'} <button onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}>{authMode === 'signup' ? 'وارد شو' : 'ثبت‌نام کن'}</button></div><div className="privacy-note">◇ ایمیل تو خصوصی می‌مونه و در لابی نمایش داده نمی‌شه.</div>
    </section></div>}

    {modal === 'room' && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(''); }}><section className="modal-card room-modal"><button className="modal-close" onClick={() => setModal('')} aria-label="بستن">×</button><BrandLogo compact/><Eyebrow>CREATE A LOBBY / 02</Eyebrow><h2>لابی خودت رو بساز.</h2><p>جزئیات رو وارد کن تا هم‌تیمی‌های مناسب پیدات کنن.</p>
      <form className="modal-form" onSubmit={createRoom}><label>نام بازی<input required minLength={2} maxLength={60} value={roomForm.game_name} onChange={(event) => setRoomForm({ ...roomForm, game_name: event.target.value })} placeholder="VALORANT, Minecraft..."/></label><label>عنوان لابی<input required minLength={3} maxLength={80} value={roomForm.title} onChange={(event) => setRoomForm({ ...roomForm, title: event.target.value })} placeholder="دنبال دو هم‌تیمی برای رنک"/></label><label>لینک سرور یا دعوت <span className="optional">اختیاری</span><input type="url" maxLength={500} value={roomForm.server_url} onChange={(event) => setRoomForm({ ...roomForm, server_url: event.target.value })} placeholder="https://..."/></label><label>توضیحات<textarea rows={3} maxLength={1200} value={roomForm.description} onChange={(event) => setRoomForm({ ...roomForm, description: event.target.value })} placeholder="سبک بازی، رنک، میکروفون و ..."/></label>
        <div className="form-pair"><label>منطقه<select value={roomForm.region} onChange={(event) => setRoomForm({ ...roomForm, region: event.target.value })}><option value="EU">Europe (EU)</option><option value="ME">Middle East (ME)</option><option value="NA">North America (NA)</option><option value="ASIA">Asia</option><option value="ANY">Any region</option></select></label><label>ظرفیت بازیکن<select value={roomForm.max_players} onChange={(event) => setRoomForm({ ...roomForm, max_players: event.target.value })}>{[2,3,4,5,6,8,10,20].map((number) => <option key={number} value={number}>{number} بازیکن</option>)}</select></label></div><button className="primary-button modal-submit" type="submit" disabled={busy}>{busy ? 'در حال ساخت...' : 'ساخت پنل لابی'} <span>↗</span></button>
      </form></section></div>}
    {notice && <div className="toast" role="status"><span>✳</span>{notice}<button onClick={() => setNotice('')} aria-label="بستن پیام">×</button></div>}
    {!isSupabaseConfigured && <div className="dev-warning">Supabase هنوز متصل نشده است.</div>}
  </div>;
}
