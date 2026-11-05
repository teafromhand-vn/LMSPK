import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize, Minimize, Minus, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { assetUrl } from '../lib/content';
import { errorMessage } from '../lib/errors';
import type { LearningDocument } from '../models/types';
import { Notice } from './Notice';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export default function DocumentReader({ document: doc }: { document: LearningDocument }) {
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [textPages, setTextPages] = useState<string[]>([]);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [docxPages, setDocxPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [retry, setRetry] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    let dispose: (() => void) | undefined;
    setLoading(true);
    setError('');
    setPage(1);
    setZoom(100);
    setPdf(null);
    async function load() {
      const url = assetUrl(doc.file);
      if (doc.format === 'pdf') {
        const pdfjs = await import('pdfjs-dist');
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        if (!active) return;
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const task = pdfjs.getDocument({ url });
        dispose = () => {
          void task.destroy();
        };
        const document = await task.promise;
        if (active) {
          setPdf(document);
          setPages(document.numPages);
        }
      } else {
        const response = await fetch(url, { signal: abort.signal, credentials: 'omit' });
        if (!response.ok) throw new Error(`Không thể tải tài liệu (${response.status}).`);
        if (doc.format === 'docx') {
          const bytes = await response.arrayBuffer();
          const { renderAsync } = await import('docx-preview');
          const content = document.createElement('div');
          const styles = document.createElement('div');
          await renderAsync(bytes, content, styles, {
            inWrapper: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: false,
            useBase64URL: true,
            renderAltChunks: false,
          });
          // Embed converted content in a scriptless, opaque-origin frame; block remote resources.
          const rendered = Array.from(content.querySelectorAll('section.docx')).map(
            (section) => `${styles.innerHTML}${section.outerHTML}`,
          );
          if (!rendered.length) throw new Error('Tệp DOCX này không có trang đọc được.');
          if (active) {
            setDocxPages(rendered);
            setPages(rendered.length);
          }
        } else {
          const text = await response.text();
          const chunks = text.split(/\f|<!--\s*pagebreak\s*-->/i);
          if (active) {
            setTextPages(chunks);
            setPages(chunks.length);
          }
        }
      }
      if (active) setLoading(false);
    }
    void load().catch((e) => {
      if (active) {
        setError(errorMessage(e));
        setLoading(false);
      }
    });
    return () => {
      active = false;
      abort.abort();
      dispose?.();
    };
  }, [doc.file, doc.format, retry]);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let active = true;
    let cancel: (() => void) | undefined;
    setRendering(true);
    void pdf
      .getPage(page)
      .then(async (pdfPage) => {
        if (!active || !canvas.current) return;
        const viewport = pdfPage.getViewport({ scale: (1.25 * zoom) / 100 });
        const target = canvas.current;
        const ratio = window.devicePixelRatio || 1;
        target.width = Math.floor(viewport.width * ratio);
        target.height = Math.floor(viewport.height * ratio);
        target.style.width = `${viewport.width}px`;
        target.style.height = `${viewport.height}px`;
        const task = pdfPage.render({
          canvas: target,
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        cancel = () => task.cancel();
        await task.promise;
        if (active) setRendering(false);
      })
      .catch((e) => {
        if (active) {
          setError(errorMessage(e));
          setRendering(false);
        }
      });
    return () => {
      active = false;
      cancel?.();
    };
  }, [pdf, page, zoom]);
  useEffect(() => {
    host.current?.querySelector('.reader-scroll')?.scrollTo(0, 0);
  }, [page]);
  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === host.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (host.current?.requestFullscreen) await host.current.requestFullscreen();
      else setFullscreen((v) => !v);
    } catch {
      setFullscreen((v) => !v);
    }
  }
  return (
    <div ref={host} className={`document-reader ${fullscreen ? 'is-fullscreen' : ''}`}>
      <div className="reader-toolbar">
        <div className="toolbar-group">
          <button
            className="icon-btn"
            aria-label="Trang trước"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span aria-live="polite">
            Trang {page} / {pages}
          </span>
          <button
            className="icon-btn"
            aria-label="Trang tiếp"
            disabled={loading || page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="toolbar-group">
          <button
            className="icon-btn"
            aria-label="Thu nhỏ"
            disabled={zoom <= 50}
            onClick={() => setZoom((z) => z - 25)}
          >
            <Minus size={17} />
          </button>
          <span aria-label="Mức thu phóng">{zoom}%</span>
          <button
            className="icon-btn"
            aria-label="Phóng to"
            disabled={zoom >= 200}
            onClick={() => setZoom((z) => z + 25)}
          >
            <Plus size={17} />
          </button>
          <span className="toolbar-divider" />
          <button
            className="icon-btn"
            aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Đọc toàn màn hình'}
            onClick={() => void toggleFullscreen()}
          >
            {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>
      {error ? (
        <Notice title="Không thể hiển thị tệp này." tone="error">
          <p>{error}</p>
          <button className="btn" onClick={() => setRetry((v) => v + 1)}>
            Thử lại
          </button>
        </Notice>
      ) : (
        <div className="reader-scroll">
          {loading && <p role="status">Đang tải tài liệu…</p>}
          {doc.format === 'pdf' && (
            <>
              <canvas ref={canvas} className="pdf-canvas" aria-label={`${doc.name}, trang ${page}`} role="img" />
              {rendering && <p role="status">Đang hiển thị trang…</p>}
            </>
          )}
          {!loading && doc.format === 'docx' && (
            <iframe
              title={`${doc.name}, trang ${page}`}
              sandbox=""
              className="docx-frame"
              style={{ width: `${(816 * zoom) / 100}px`, height: `${(1120 * zoom) / 100}px` }}
              srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:;"><style>body{margin:0;background:white;color:#222}section.docx{box-shadow:none!important;margin:0!important}body{zoom:${zoom / 100}}</style></head><body>${docxPages[page - 1]}</body></html>`}
            />
          )}
          {!loading && (doc.format === 'md' || doc.format === 'txt') && (
            <article className="reading-paper" style={{ fontSize: `${zoom}%` }}>
              {doc.format === 'md' ? (
                <ReactMarkdown
                  components={{
                    img: ({ alt }) => <span>{alt ? `[Hình ảnh: ${alt}]` : ''}</span>,
                    a: ({ children }) => <span>{children}</span>,
                  }}
                >
                  {textPages[page - 1]}
                </ReactMarkdown>
              ) : (
                <pre>{textPages[page - 1]}</pre>
              )}
            </article>
          )}
        </div>
      )}
    </div>
  );
}
