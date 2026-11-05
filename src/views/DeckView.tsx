import { useState } from 'react';
import { ArrowLeft, RotateCw, Shuffle } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Link } from '../components/Link';
import { Notice } from '../components/Notice';
import { useAsync } from '../hooks/useAsync';
import { assetUrl, flashcards, loadSubject, loadDeck, resourceContext } from '../lib/content';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { shuffle } from '../lib/random';
import { errorMessage } from '../lib/errors';
import type { FlashcardContent, ResourceContext } from '../models/types';

export function DeckView({ deckId, subjectId }: { deckId: string; subjectId: string }) {
  const { data, error, reload } = useAsync(async () => {
    const catalog = await loadSubject(subjectId);
    const entry = catalog.flashcards.find((d) => d.id === deckId);
     if (!entry) throw new Error('Không tìm thấy bộ thẻ này.');
    return {
      entry,
      context: resourceContext(catalog.subject, entry),
      cards: flashcards((await loadDeck(entry.id, 'flashcards')).questions),
    };
  }, [deckId, subjectId]);
  if (data)
    return (
      <FlashcardStudy title={data.entry.name} subject={data.entry.subject} context={data.context} cards={data.cards} />
    );
  return (
    <Screen path={['flashcards']} title="Thẻ ghi nhớ">
      <Link to={{ name: 'subject', subjectId, section: 'flashcards' }}>← Thẻ ghi nhớ của môn học</Link>
      {error ? (
        <Notice title="Không thể mở bộ thẻ." tone="error">
          <p>{errorMessage(error)}</p>
          <button className="btn" onClick={reload}>
            Thử lại
          </button>
        </Notice>
      ) : (
        <p role="status">Đang tải thẻ…</p>
      )}
    </Screen>
  );
}
/** Dedicated version of Enyalië's revealable flashcard interaction, without self-grading. */
function FlashcardStudy({
  title,
  subject,
  cards,
  context,
}: {
  title: string;
  subject: string;
  cards: FlashcardContent[];
  context: ResourceContext;
}) {
  const [ordered, setOrdered] = useState(cards);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = ordered[position];
  const image = flipped ? card.backImage : card.image;
  const move = (delta: number) => {
    setPosition((p) => Math.max(0, Math.min(ordered.length - 1, p + delta)));
    setFlipped(false);
  };
  const reshuffle = () => {
    setOrdered(shuffle(cards));
    setPosition(0);
    setFlipped(false);
  };
  return (
    <Screen
      path={['flashcards', title]}
      title={title}
      actions={[
        { label: 'Trước', hotkey: 'arrowleft', keyLabel: '←', onAction: () => move(-1), disabled: position === 0 },
        {
          label: 'Lật thẻ',
          hotkey: 'space',
          alsoKeys: ['f'],
          keyLabel: 'Dấu cách',
          onAction: () => setFlipped((v) => !v),
          primary: true,
        },
        {
          label: 'Tiếp',
          hotkey: 'arrowright',
          keyLabel: '→',
          onAction: () => move(1),
          disabled: position === ordered.length - 1,
        },
        { label: 'Xáo trộn', hotkey: 's', onAction: reshuffle },
      ]}
    >
      <Breadcrumbs context={context} section="flashcards" title={title} />
      <Link
        to={{ name: 'subject', subjectId: context.subjectId, section: 'flashcards', chapterId: context.chapterId }}
        className="back-link"
      >
        <ArrowLeft size={16} /> Quay lại {context.chapterName ?? subject}
      </Link>
      <div className="study-heading">
        <div>
          <p className="page-kicker">{subject}</p>
          <h1>{title}</h1>
          <p>Dành chút thời gian suy nghĩ trước khi lật thẻ.</p>
        </div>
        <button className="btn" onClick={reshuffle}>
          <Shuffle size={16} /> Xáo trộn thẻ
        </button>
      </div>
      <div className="study-area">
        <div className="study-counter">
          <span>THẺ GHI NHỚ</span>
          <span aria-live="polite">
            Thẻ {position + 1} / {ordered.length}
          </span>
        </div>
        <button
          className={`flashcard ${flipped ? 'flipped' : ''}`}
          onClick={() => setFlipped((v) => !v)}
          aria-label={`Lật thẻ. ${flipped ? 'Mặt sau' : 'Mặt trước'}: ${flipped ? card.answer : card.prompt}`}
        >
          <span className="card-side">{flipped ? 'ĐÁP ÁN' : 'CÂU HỎI'}</span>
          <span key={`${position}-${flipped}`} className="flashcard-text flip-content" aria-live="polite">
            {flipped ? card.answer : card.prompt}
          </span>
          {image && <img className="flashcard-image" src={assetUrl(image.src)} alt={image.alt} />}
          {flipped && card.explanation && <span className="flashcard-explanation">{card.explanation}</span>}
          <span className="flip-hint">
            <RotateCw size={15} /> Nhấn để lật <span>hoặc nhấn F</span>
          </span>
        </button>
        <p className="study-note">Tự do ôn tập. Không chấm điểm, không lưu vị trí.</p>
      </div>
    </Screen>
  );
}
