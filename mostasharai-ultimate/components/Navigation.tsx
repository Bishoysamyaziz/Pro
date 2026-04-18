'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import NotificationBell from './NotificationBell';
import Image from 'next/image';
import {
  FaHome, FaUsers, FaWallet, FaVideo, FaSearch,
  FaSignInAlt, FaUserPlus, FaSignOutAlt, FaUser,
  FaCog, FaShieldAlt, FaSun, FaMoon, FaBars, FaTimes,
  FaCalendarAlt, FaGlobeArabic, FaTh
} from 'react-icons/fa';

const NAV_ITEMS = [
  { href: '/', label: 'الرئيسية', labelEn: 'Home', icon: FaHome },
  { href: '/experts', label: 'الخبراء', labelEn: 'Experts', icon: FaUsers },
  { href: '/sessions', label: 'جلساتي', labelEn: 'Sessions', icon: FaCalendarAlt },
  { href: '/wallet', label: 'المحفظة', labelEn: 'Wallet', icon: FaWallet },
  { href: '/reels', label: 'ريلز', labelEn: 'Reels', icon: FaVideo },
];

export default function Navigation() {
  const { user, profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLogout = async () => { await logout(); router.push('/login'); };
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) { router.push(`/search?q=${encodeURIComponent(searchQ)}`); setSearchQ(''); }
  };

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* Sidebar – Desktop */}
      <aside className="hidden lg:flex flex-col fixed right-0 top-0 h-full w-64 border-l z-40"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-black text-xl"
            style={{ background: 'var(--color-accent)' }}>م</div>
          <div>
            <p className="font-black text-lg leading-none" style={{ color: 'var(--color-text)' }}>مستشاري</p>
            <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>Mostasharai</p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="px-4 pt-4">
          <div className="relative">
            <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-3)' }} />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="بحث... / Search"
              className="w-full rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none border transition-colors"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
          </div>
        </form>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, labelEn, icon: Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                isActive(href)
                  ? 'text-black font-bold'
                  : 'hover:opacity-90'
              }`}
              style={isActive(href)
                ? { background: 'var(--color-accent)', color: '#000' }
                : { color: 'var(--color-text-2)' }}>
              <Icon className={`w-5 h-5 ${isActive(href) ? 'text-black' : ''}`} />
              <span>{label}</span>
              <span className="mr-auto text-xs opacity-60">{labelEn}</span>
            </Link>
          ))}
          {profile?.role === 'admin_owner' && (
            <Link href="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              style={{ color: 'var(--color-warning)' }}>
              <FaShieldAlt className="w-5 h-5" />
              <span>غرفة العمليات</span>
              <span className="mr-auto text-xs opacity-60">Control</span>
            </Link>
          )}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme}
              className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-2)' }}>
              {theme === 'dark' ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
              <span>{theme === 'dark' ? 'وضع النهار' : 'الوضع الليلي'}</span>
            </button>
            {user && <NotificationBell />}
          </div>

          {user && profile ? (
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                style={{ background: 'var(--color-surface-2)' }}>
                {profile.photoURL ? (
                  <Image src={profile.photoURL} alt={profile.displayName} width={36} height={36} className="rounded-full" />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-black text-sm"
                    style={{ background: 'var(--color-accent)' }}>
                    {profile.displayName?.[0] || '?'}
                  </div>
                )}
                <div className="flex-1 text-right min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>{profile.displayName}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-2)' }}>
                    {profile.balanceNEX} NEX
                  </p>
                </div>
              </button>
              {userMenuOpen && (
                <div className="absolute bottom-full right-0 left-0 mb-2 rounded-xl border shadow-2xl overflow-hidden z-50"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <Link href={`/profile/${user.uid}`} onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm transition-all hover:opacity-80"
                    style={{ color: 'var(--color-text)' }}>
                    <FaUser className="w-4 h-4" /> الملف الشخصي
                  </Link>
                  <Link href="/settings" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm transition-all hover:opacity-80"
                    style={{ color: 'var(--color-text)' }}>
                    <FaCog className="w-4 h-4" /> الإعدادات
                  </Link>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all"
                    style={{ color: 'var(--color-error)' }}>
                    <FaSignOutAlt className="w-4 h-4" /> تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all"
                style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
                <FaSignInAlt className="w-4 h-4" /> دخول
              </Link>
              <Link href="/register" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-black transition-all"
                style={{ background: 'var(--color-accent)' }}>
                <FaUserPlus className="w-4 h-4" /> سجّل
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Top bar – Mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 border-b glass"
        style={{ borderColor: 'var(--color-border)' }}>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-xl" style={{ color: 'var(--color-text)' }}>
          {mobileOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
        </button>
        <Link href="/" className="font-black text-lg" style={{ color: 'var(--color-accent)' }}>مستشاري</Link>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ color: 'var(--color-text-2)' }}>
            {theme === 'dark' ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
          </button>
          {user && <NotificationBell />}
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute right-0 top-16 bottom-0 w-72 border-l shadow-2xl overflow-y-auto"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onClick={e => e.stopPropagation()}>
            <nav className="p-3 space-y-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
                  style={isActive(href)
                    ? { background: 'var(--color-accent)', color: '#000' }
                    : { color: 'var(--color-text-2)' }}>
                  <Icon className="w-5 h-5" /> {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Bottom tab bar – Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t glass"
        style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-around py-2">
          {[...NAV_ITEMS.slice(0, 4), { href: user ? `/profile/${user.uid}` : '/login', label: 'حسابي', icon: FaUser }].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs transition-all"
              style={isActive(href)
                ? { color: 'var(--color-accent)' }
                : { color: 'var(--color-text-3)' }}>
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
