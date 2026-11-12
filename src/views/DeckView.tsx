import { useState } from 'react';
import { ArrowLeft, Check, RotateCw, Shuffle } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Link } from '../components/Link';
import { Notice } from '../components/Notice';
import { useAsync } from '../hooks/useAsync';
import { assetUrl, flashcards, loadSubject, loadDeck, resourceContext } from '../lib/content';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { shuffle } from '../lib/random';
import { createFlashcardQueue, markKnown, markUnknown, shuffleQueue } from '../lib/flashcardQueue';
import { classifyContentError } from '../lib/errors';
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
      <FlashcardStudy
        key={deckId}
        title={data.entry.name}
        subject={data.entry.subject}
        context={data.context}
        cards={data.cards}
      />
    );
  return (
    <Screen path={['flashcards']} title="Thẻ ghi nhớ">
      <Link to={{ name: 'subject', subjectId, section: 'flashcards' }}>← Thẻ ghi nhớ của môn học</Link>
      {error ? (
        <Notice title="Không thể mở bộ thẻ." tone="error">
          <p>{classifyContentError(error)}</p>
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
/**
 * Review loop for one deck: cards the learner has not memorised yet stay in
 * the queue until they answer "Đã nhớ". All progress lives in component state,
 * so reloading the page starts the deck from the beginning.
 */
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
  const [session, setSession] = useState(() => createFlashcardQueue(cards));
  const [flipped, setFlipped] = useState(false);
  const done = session.queue.length === 0;
  const card = session.queue[0];
  const image = card && (flipped ? card.backImage : card.image);

  const grade = (known: boolean) => {
    setSession((state) => (known ? markKnown(state) : markUnknown(state)));
    setFlipped(false);
  };
  const start = (shuffled: boolean) => {
    setSession(createFlashcardQueue(shuffled ? shuffle(cards) : cards));
    setFlipped(false);
  };
  const reshuffle = () => setSession((state) => shuffleQueue(state));

  return (
    <Screen
      path={['flashcards', title]}
      title={title}
      actions={
        done
          ? [
              { label: 'Học lại từ đầu', hotkey: 'r', onAction: () => start(false), primary: true },
              { label: 'Xáo trộn & học lại', hotkey: 's', onAction: () => start(true) },
            ]
          : [
              // 1/2 stay active on both faces so the learner can grade right
              // after revealing. They do not clash with F, Space or S; arrow
              // keys are intentionally unbound now that there is no "previous".
              { label: 'Chưa nhớ', hotkey: '1', keyLabel: '1', onAction: () => grade(false) },
              {
                label: 'Lật thẻ',
                hotkey: 'space',
                alsoKeys: ['f'],
                keyLabel: 'Dấu cách',
                onAction: () => setFlipped((v) => !v),
                primary: true,
              },
              { label: 'Đã nhớ', hotkey: '2', keyLabel: '2', onAction: () => grade(true) },
              { label: 'Xáo trộn', hotkey: 's', onAction: reshuffle },
            ]
      }
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
        </div>
        {!done && (
          <button className="btn" onClick={reshuffle}>
            <Shuffle size={16} /> Xáo trộn thẻ
          </button>
        )}
      </div>
      <div className="study-area">
        {done ? (
          <div className="study-summary">
            <p className="page-kicker">ÔN TẬP XONG</p>
            <h2>Hoàn thành!</h2>
            <p>Bạn đã đi hết {cards.length} thẻ trong bộ này.</p>
            <dl className="study-summary-stats">
              <div>
                <dt>Tổng số thẻ</dt>
                <dd>{cards.length}</dd>
              </div>
              <div>
                <dt>Lượt “chưa nhớ”</dt>
                <dd>{session.laps}</dd>
              </div>
            </dl>
            <div className="study-controls">
              <button className="btn btn-primary" onClick={() => start(false)}>
                Học lại từ đầu
              </button>
              <button className="btn" onClick={() => start(true)}>
                Xáo trộn &amp; học lại
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="study-counter">
              <span>THẺ GHI NHỚ</span>
              <span aria-live="polite">
                Còn {session.queue.length} thẻ cần ôn · Đã nhớ {session.known.size} / {cards.length}
              </span>
            </div>
            <button
              className={`flashcard ${flipped ? 'flipped' : ''}`}
              onClick={() => setFlipped((v) => !v)}
              aria-label={`Lật thẻ. ${flipped ? 'Mặt sau' : 'Mặt trước'}: ${flipped ? card.answer : card.prompt}`}
            >
              <span className="card-side">{flipped ? 'ĐÁP ÁN' : 'CÂU HỎI'}</span>
              <span key={`${card.id}-${flipped}`} className="flashcard-text flip-content" aria-live="polite">
                {flipped ? card.answer : card.prompt}
              </span>
              {image && <img className="flashcard-image" src={assetUrl(image.src)} alt={image.alt} />}
              {flipped && card.explanation && <span className="flashcard-explanation">{card.explanation}</span>}
              <span className="flip-hint">
                <RotateCw size={15} /> Nhấn để lật <span>hoặc nhấn F</span>
              </span>
            </button>
            <div className="study-controls">
              <button className="btn" aria-label="Chưa nhớ" onClick={() => grade(false)}>
                <RotateCw size={16} /> Chưa nhớ
              </button>
              <button className="btn" aria-label="Đã nhớ" onClick={() => grade(true)}>
                <Check size={16} /> Đã nhớ
              </button>
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}
