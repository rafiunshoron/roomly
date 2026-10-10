import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter, NavLink, Link, Routes, Route, Navigate,
  useLocation, useNavigate,
} from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, CalendarCheck2, CalendarDays, CheckCircle2,
  ChevronRight, Clock3, DoorOpen, Headphones, LockKeyhole, LogOut,
  Menu, ShieldCheck, Sparkles, X, Zap,
} from "lucide-react";
import RoomCard from "./components/RoomCard.jsx";
import RoomDetails from "./components/RoomDetails.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import { api, getToken, saveToken, clearToken } from "./api.js";
import "./App.css";

function Brand() {
  return (
    <Link className="rl-brand" to="/rooms" aria-label="Roomly home">
      <span className="rl-brand-icon"><DoorOpen size={22} strokeWidth={2.4} /></span>
      <span>roomly<span className="rl-brand-dot">.</span></span>
    </Link>
  );
}

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const loggedIn = Boolean(getToken());

  useEffect(() => setMenuOpen(false), [location.pathname]);

  function logout() {
    clearToken();
    setMenuOpen(false);
    navigate("/login", { replace: true });
  }

  return (
    <header className="rl-site-header">
      <div className="rl-container rl-header-inner">
        <Brand />
        <button className="rl-mobile-menu-btn rl-icon-btn" onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav className={`rl-nav ${menuOpen ? "rl-nav--open" : ""}`} aria-label="Main navigation">
          <NavLink to="/rooms" className={({ isActive }) => `rl-nav-link ${isActive ? "active" : ""}`}>
            Explore rooms
          </NavLink>
          {loggedIn ? (
            <>
              <NavLink to="/my-bookings" className={({ isActive }) => `rl-nav-link ${isActive ? "active" : ""}`}>
                My bookings
              </NavLink>
              <button className="rl-btn rl-btn--soft rl-btn--sm" onClick={logout}>
                <LogOut size={16} /> Log out
              </button>
            </>
          ) : (
            <Link className="rl-btn rl-btn--primary rl-btn--sm" to="/login">
              Sign in <ArrowRight size={16} />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="rl-footer">
      <div className="rl-container rl-footer-inner">
        <div className="rl-footer-brand"><DoorOpen size={19} /> roomly<span>.</span></div>
        <p>Better spaces for brighter ideas.</p>
        <span>© {new Date().getFullYear()} Roomly · Demo application</span>
      </div>
    </footer>
  );
}

function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/api/rooms")
      .then(data => { if (active) setRooms(data); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <>
      <main>
        <section className="rl-hero">
          <div className="rl-container rl-hero-grid">
            <div className="rl-hero-copy">
              <div className="rl-eyebrow rl-eyebrow--light"><span className="rl-pulse" /> YOUR SPACE, YOUR WAY</div>
              <h1>Good ideas deserve <em>great spaces.</em></h1>
              <p>From focused solo work to your next big team meeting. Find a room that works as hard as you do.</p>
              <div className="rl-hero-actions">
                <a href="#spaces" className="rl-btn rl-btn--white rl-btn--lg">Explore spaces <ArrowRight size={18} /></a>
                <a href="#how-it-works" className="rl-btn rl-btn--hero-outline rl-btn--lg">How it works</a>
              </div>
              <div className="rl-hero-trust"><span><CheckCircle2 size={16} /> Simple booking</span><span><CheckCircle2 size={16} /> Flexible options</span></div>
            </div>
            <div className="rl-hero-art" aria-hidden="true">
              <div className="rl-hero-orbit rl-hero-orbit--one" />
              <div className="rl-hero-orbit rl-hero-orbit--two" />
              <div className="rl-illustration-scene">
                <div className="rl-scene-window"><span /><span /><span /></div>
                <div className="rl-scene-light" />
                <div className="rl-scene-plant"><i /><i /><i /></div>
                <div className="rl-scene-table" /><div className="rl-scene-leg left" /><div className="rl-scene-leg right" />
                <div className="rl-scene-chair left" /><div className="rl-scene-chair right" />
                <div className="rl-scene-floor" />
              </div>
              <div className="rl-float-card rl-float-card--top"><span className="rl-float-icon"><CalendarCheck2 size={19}/></span><span><strong>Make room for more</strong><small>Book in a few clicks</small></span></div>
              <div className="rl-float-card rl-float-card--bottom"><span className="rl-float-avatar"><Sparkles size={19}/></span><span><strong>Need a hand?</strong><small>Ask Roomly AI anytime</small></span></div>
            </div>
          </div>
        </section>

        <section className="rl-spaces-section" id="spaces">
          <div className="rl-container">
            <div className="rl-section-head">
              <div><div className="rl-eyebrow">DISCOVER YOUR NEXT SPACE</div><h2>Spaces made for <span>what's next.</span></h2><p>Pick the perfect fit and get back to doing your best work.</p></div>
              <div className="rl-section-count"><DoorOpen size={17}/>{loading ? "Loading spaces" : `${rooms.length} spaces available to explore`}</div>
            </div>
            {error && <div className="rl-alert rl-alert--error" role="alert">Unable to load rooms: {error}</div>}
            {loading && <div className="rl-room-grid" aria-label="Loading rooms">{[1,2,3].map(i => <div key={i} className="rl-room-skeleton" />)}</div>}
            {!loading && rooms.length === 0 && !error && <div className="rl-empty">No rooms are listed right now. Please check back soon.</div>}
            {!loading && rooms.length > 0 && <div className="rl-room-grid">{rooms.map((room, index) => <RoomCard key={room.id} room={room} index={index} />)}</div>}
          </div>
        </section>

        <section className="rl-how-section" id="how-it-works">
          <div className="rl-container">
            <div className="rl-how-intro"><div className="rl-eyebrow">THE EASY WAY TO MEET</div><h2>Three steps to your next great meeting.</h2></div>
            <div className="rl-steps">
              <div className="rl-step"><span className="rl-step-icon"><DoorOpen size={24}/></span><span className="rl-step-no">01</span><h3>Find your space</h3><p>Explore rooms, capacities, and hourly rates.</p></div>
              <div className="rl-step"><span className="rl-step-icon"><CalendarDays size={24}/></span><span className="rl-step-no">02</span><h3>Choose your time</h3><p>Check live availability and reserve your slot.</p></div>
              <div className="rl-step"><span className="rl-step-icon"><CheckCircle2 size={24}/></span><span className="rl-step-no">03</span><h3>You're all set</h3><p>View or cancel your booking from one place.</p></div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function AuthPage() {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (register) {
        await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ full_name: name.trim(), email: email.trim(), password }),
        });
      }
      const result = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      saveToken(result.access_token);
      navigate(location.state?.from || "/rooms", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="rl-auth-wrap">
      <div className="rl-container rl-auth-layout">
        <div className="rl-auth-aside">
          <div className="rl-eyebrow rl-eyebrow--light">MAKE SPACE FOR BETTER WORK</div>
          <h2>Where great work finds its place.</h2>
          <p>Book meeting rooms, manage reservations, and get answers from your own AI assistant.</p>
          <div className="rl-auth-perks"><span><ShieldCheck size={19}/> Secure account</span><span><Zap size={19}/> Quick booking</span><span><Headphones size={19}/> AI-powered help</span></div>
          <div className="rl-auth-decor" aria-hidden="true"><div/><div/><div/></div>
        </div>
        <section className="rl-auth-panel">
          <div className="rl-auth-icon"><LockKeyhole size={23}/></div>
          <div className="rl-eyebrow">WELCOME TO ROOMLY</div>
          <h1>{register ? "Create your account" : "Welcome back"}</h1>
          <p className="rl-auth-subtitle">{register ? "Your next great workspace is just a minute away." : "Sign in to manage your spaces and reservations."}</p>
          <form onSubmit={handleSubmit} className="rl-form">
            {register && <label className="rl-field"><span>Full name</span><input type="text" autoComplete="name" required placeholder="e.g. Alex Morgan" value={name} onChange={e => setName(e.target.value)} /></label>}
            <label className="rl-field"><span>Email address</span><input type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
            <label className="rl-field"><span>Password</span><input type="password" autoComplete={register ? "new-password" : "current-password"} required placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} /></label>
            {error && <div className="rl-alert rl-alert--error" role="alert">{error}</div>}
            <button className="rl-btn rl-btn--primary rl-btn--block rl-btn--lg" type="submit" disabled={loading}>{loading ? "Please wait…" : register ? "Create account" : "Sign in"}<ArrowRight size={18}/></button>
          </form>
          <div className="rl-auth-switch">{register ? "Already have an account?" : "New to Roomly?"} <button type="button" onClick={() => {setRegister(!register);setError("");}}>{register ? "Sign in" : "Create an account"}</button></div>
        </section>
      </div>
    </main>
  );
}

function dateLabel(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([api("/api/bookings/me"), api("/api/rooms")])
      .then(([bookingData, roomData]) => { if (active) {setBookings(bookingData);setRooms(roomData);} })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const roomMap = useMemo(() => Object.fromEntries(rooms.map(room => [room.id, room])), [rooms]);
  const ordered = useMemo(() => [...bookings].sort((a, b) => new Date(b.start_at) - new Date(a.start_at)), [bookings]);
  const upcoming = bookings.filter(b => b.status === "confirmed" && new Date(b.start_at) > new Date()).length;

  async function cancelBooking(bookingId) {
    if (!window.confirm("Cancel this booking? The reserved time will become available again.")) return;
    setCancelling(bookingId);
    setError("");
    try {
      const updated = await api(`/api/bookings/${bookingId}/cancel`, { method: "PATCH" });
      setBookings(previous => previous.map(b => b.id === bookingId ? updated : b));
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(null);
    }
  }

  return (
    <main className="rl-page-main">
      <div className="rl-container">
        <div className="rl-page-heading">
          <div><div className="rl-eyebrow">YOUR SPACE, YOUR SCHEDULE</div><h1>My bookings<span className="rl-heading-dot">.</span></h1><p>Everything you've reserved, all in one place.</p></div>
          <Link to="/rooms" className="rl-btn rl-btn--primary">Book another room <ArrowUpRight size={17}/></Link>
        </div>
        <div className="rl-booking-stats"><div><CalendarCheck2 size={21}/><strong>{bookings.length}</strong><span>Total bookings</span></div><div><Clock3 size={21}/><strong>{upcoming}</strong><span>Upcoming reservations</span></div></div>
        {error && <div className="rl-alert rl-alert--error" role="alert">{error}</div>}
        {loading ? <div className="rl-booking-loading">Loading your bookings…</div> : ordered.length === 0 ? (
          <div className="rl-empty rl-empty--big"><CalendarDays size={40}/><h2>Your calendar is waiting</h2><p>No bookings yet. Find a space and make it yours.</p><Link to="/rooms" className="rl-btn rl-btn--primary">Explore rooms <ArrowRight size={17}/></Link></div>
        ) : (
          <div className="rl-booking-list">
            {ordered.map(booking => {
              const room = roomMap[booking.room_id];
              const canCancel = booking.status === "confirmed" && new Date(booking.start_at) > new Date();
              return (
                <article className="rl-booking-card" key={booking.id}>
                  <div className="rl-booking-room-icon"><DoorOpen size={23}/></div>
                  <div className="rl-booking-details"><div className="rl-booking-title-row"><h2>{room?.name || `Room ${booking.room_id}`}</h2><span className={`rl-status rl-status--${booking.status}`}>{booking.status}</span></div><div className="rl-booking-dates"><span><CalendarDays size={16}/>{dateLabel(booking.start_at)}</span><ChevronRight size={15}/><span>{dateLabel(booking.end_at)}</span></div><span className="rl-booking-reference">Booking #{booking.id}</span></div>
                  {canCancel && <button className="rl-btn rl-btn--outline rl-btn--sm rl-booking-cancel" disabled={cancelling === booking.id} onClick={() => cancelBooking(booking.id)}>{cancelling === booking.id ? "Cancelling…" : "Cancel booking"}</button>}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  return getToken() ? children : <Navigate to="/login" replace state={{from: location.pathname}} />;
}

function App() {
  return (
    <BrowserRouter>
      <div className="rl-app-shell">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/rooms" replace />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/rooms/:roomId" element={<RoomDetails />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/rooms" replace />} />
        </Routes>
        <Footer />
        <ChatWidget />
      </div>
    </BrowserRouter>
  );
}

export default App;
