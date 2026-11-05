import { useEffect, type ReactNode } from 'react';
import { BookOpen, FileText, Layers, ListTree, Heart, Sprout, Sun, Moon } from 'lucide-react';
import { useRoute } from '../app/router';
import { useTheme } from '../app/ThemeContext';
import { KeyBar, type KeyAction } from './KeyBar';
import { Link } from './Link';
import { AdSlot } from './AdSlot';

interface ScreenProps {
  path: string[];
  title: string;
  actions?: KeyAction[];
  children: ReactNode;
  sideAds?: boolean;
}
export function scrollScreenToTop(): void {
  window.scrollTo(0, 0);
}
/** Enyalië's shared frame and keyboard bar, restyled for a quiet study library. */
export function Screen({ title, actions = [], children, sideAds = false }: ScreenProps) {
  const theme = useTheme();
  const route = useRoute();
  const active = route.name === 'document' ? 'documents' : route.name === 'deck' ? 'flashcards' : route.name;
  useEffect(() => {
    document.title = `${title} · Enyalië`;
  }, [title]);
  return (
    <div className="screen">
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
      <header className="titlebar">
        <div className="bar-inner">
          <Link to={{ name: 'library' }} className="brand">
            <span className="brand-symbol">
              <Sprout size={23} />
            </span>
            Enyalië<span className="brand-dot">.</span>
          </Link>
          <nav className="main-nav" aria-label="Điều hướng chính">
            {([
              ['library', 'Courses', BookOpen],
              ['documents', 'Documents', FileText],
              ['flashcards', 'Flashcards', Layers],
              ['syllabus', 'Syllabus', ListTree],
              ['donate', 'Donate', Heart],
            ] as const).map(([name, label, Icon]) => (
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
      <div className={`screen-body${sideAds ? ' with-side-ads' : ''}`}>
        {sideAds && <div className="ad-rail ad-rail-left"><AdSlot placement="side-left" /></div>}
        <main className="content" id="main" tabIndex={-1}>
          {children}
        </main>
        {sideAds && <div className="ad-rail ad-rail-right"><AdSlot placement="side-right" /></div>}
      </div>
      <footer className="site-footer">
        <span>
          Enyalië <span className="dim">/ không gian học tập của bạn</span>
        </span>
        <span>Chỉ trong phiên hiện tại. Tiến độ không được lưu.</span>
      </footer>
      {actions.length > 0 && (
        <div className="bottombar">
          <KeyBar actions={actions} />
        </div>
      )}
    </div>
  );
}
