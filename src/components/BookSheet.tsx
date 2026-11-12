import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { Book } from '../domain/types';
import { fetchDescription } from '../services/books';
import { BookCover } from './BookCover';
import { IconX } from './icons';

interface Props {
  book: Book | null;
  onClose: () => void;
}

/** Detail sheet (long-press on a cover). Never shows who proposed the book. */
export function BookSheet({ book, onClose }: Props) {
  const [desc, setDesc] = useState<string | undefined>();
  useEffect(() => {
    if (!book) return;
    setDesc(book.description);
    const ac = new AbortController();
    if (!book.description) void fetchDescription(book, ac.signal).then(setDesc);
    return () => ac.abort();
  }, [book]);

  return (
    <AnimatePresence>
      {book && (
        <motion.div
          className="sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="sheet"
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <BookCover book={book} width="min(170px, 26vw)" eager />
            <div className="sheet-body">
              <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <h2 className="display" style={{ fontSize: 24 }}>
                    {book.title}
                  </h2>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {book.authors.join(', ') || 'Autor desconegut'}
                  </div>
                </div>
                <button className="icon-btn" onClick={onClose} aria-label="Tancar">
                  <IconX />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {book.genre && <span className="badge">{book.genre}</span>}
                {book.year && <span className="badge">{book.year}</span>}
                {book.pages && <span className="badge">{book.pages} pàgines</span>}
                {book.language && <span className="badge">Original en {book.language}</span>}
              </div>
              <p className="sheet-desc">{desc ?? 'Sense sinopsi disponible.'}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
