import { useEffect } from 'react';
import { QuizProvider } from './app/QuizContext';
import { ThemeProvider } from './app/ThemeContext';
import { useRoute } from './app/router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Link } from './components/Link';
import { Notice } from './components/Notice';
import { Screen, scrollScreenToTop } from './components/Screen';
import { DeckView } from './views/DeckView';
import { LibraryView } from './views/LibraryView';
import { SubjectView } from './views/SubjectView';
import { DocumentView } from './views/DocumentView';
import { QuizView } from './views/QuizView';
import { ResultsView } from './views/ResultsView';
import { ResourcesView } from './views/ResourcesView';
import { DonateView } from './views/DonateView';
import { SyllabusView } from './views/SyllabusView';

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QuizProvider>
          <CurrentScreen />
        </QuizProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

/** Picks the view for the current URL (see app/router.ts). */
function CurrentScreen() {
  const route = useRoute();

  useEffect(() => {
    scrollScreenToTop();
  }, [route]);

  switch (route.name) {
    case 'documents':
    case 'flashcards':
      return <ResourcesView key={route.name} section={route.name} />;
    case 'donate':
      return <DonateView />;
    case 'syllabus':
      return <SyllabusView />;
    case 'library':
      return <LibraryView />;
    case 'deck':
      return <DeckView key={`${route.subjectId}-${route.deckId}`} subjectId={route.subjectId} deckId={route.deckId} />;
    case 'subject':
      return (
        <SubjectView
          key={route.subjectId}
          subjectId={route.subjectId}
          section={route.section}
          chapterId={route.chapterId}
        />
      );
    case 'document':
      return (
        <DocumentView
          key={`${route.subjectId}-${route.documentId}`}
          subjectId={route.subjectId}
          documentId={route.documentId}
        />
      );
    case 'quiz':
      return <QuizView subjectId={route.subjectId} />;
    case 'results':
      return <ResultsView subjectId={route.subjectId} />;
    case 'notFound':
      return (
        <Screen path={['not-found']} title="Không tìm thấy trang">
          <Notice title="Địa chỉ này không tồn tại.">
            <Link to={{ name: 'library' }}>Về danh sách môn học</Link>
          </Notice>
        </Screen>
      );
  }
}
