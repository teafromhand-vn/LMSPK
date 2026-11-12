import { useEffect, useRef, type ReactNode } from 'react';
import { BookOpen, FileText, Layers, ListTree, Heart, Sprout, Sun, Moon } from 'lucide-react';
import { useRoute } from '../app/router';
import { useTheme } from '../app/ThemeContext';
import { KeyBar, type KeyAction } from './KeyBar';
import { Link } from './Link';
import { SessionBanner } from './SessionBanner';

interface ScreenProps {
  path: string[];
  title: string;
  actions?: KeyAction[];
  children: ReactNode;
}
export function scrollScreenToTop(): void {
  window.scrollTo(0, 0);
}
/** LMSPK's shared frame and keyboard bar, restyled for a quiet study library. */
export function Screen({ title, actions = [], children }: ScreenProps) {
  const theme = useTheme();
  const route = useRoute();
  const screenRef = useRef<HTMLDivElement>(null);
  const titlebarRef = useRef<HTMLElement>(null);
  const active = route.name === 'document' ? 'documents' : route.name === 'deck' ? 'flashcards' : route.name;
  useEffect(() => {
    document.title = `${title} · LMSPK`;
  }, [title]);
  useEffect(() => {
    const screen = screenRef.current;
    const titlebar = titlebarRef.current;
    if (!screen || !titlebar) return;
    const updateHeight = () => {
      screen.style.setProperty('--titlebar-height', `${titlebar.getBoundingClientRect().height}px`);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(titlebar);
    window.addEventListener('resize', updateHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);
  return (
    <div className="screen" ref={screenRef}>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Chuyển đến nội dung
      </a>
      <header className="titlebar" ref={titlebarRef}>
        <div className="bar-inner">
          <Link to={{ name: 'library' }} className="brand">
            <span className="brand-symbol">
              <Sprout size={23} />
            </span>
            LMSPK<span className="brand-dot">.</span>
          </Link>
          <nav className="main-nav" aria-label="Điều hướng chính">
            {([
              ['library', 'Courses', BookOpen],
              ['documents', 'Documents', FileText],
              ['flashcards', 'Flashcards', Layers],
              ['syllabus', 'Syllabus', ListTree],
              ['donate', 'Donate', Heart],
            ] as const).map(([name, label, Icon]) => name === 'syllabus' ? (
              <span key={name} className="nav-link nav-soon" aria-disabled="true">
                <Icon size={17} aria-hidden="true" />{label}<small className="soon-badge">SOON</small>
              </span>
            ) : (
              <Link key={name} to={{ name }} className={`nav-link${active === name ? ' active' : ''}`} current={active === name}>
                <Icon size={17} aria-hidden="true" />{label}
              </Link>
            ))}
          </nav>
          <button
            className="theme-toggle"
            onClick={theme.toggle}
            aria-label={theme.dark ? 'Dùng giao diện sáng' : 'Dùng giao diện tối'}
          >
            {theme.dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <div className="screen-body">
        <main className="content" id="main" tabIndex={-1}>
          <SessionBanner />
          {children}
        </main>
      </div>
      {actions.length > 0 && (
        <div className="bottombar">
          <KeyBar actions={actions} />
        </div>
      )}
    </div>
  );
}
