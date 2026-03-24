import React, { useState, useRef, useEffect } from 'react';

interface InfoBubbleProps {
  title: string;
  content: string | React.ReactNode;
  learnMoreUrl?: string;
}

export default function InfoBubble({ title, content, learnMoreUrl }: InfoBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('mousedown', handleClick);
    return () => { document.removeEventListener('keydown', handleEsc); document.removeEventListener('mousedown', handleClick); };
  }, [isOpen]);

  return (
    <>
      <button
        className="info-bubble-trigger"
        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
        aria-label={`Learn more about ${title}`}
      >
        ⓘ
      </button>

      {isOpen && (
        <div className="info-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="info-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
            <div className="info-modal-header">
              <div className="info-modal-icon">ⓘ</div>
              <h3 className="info-modal-title">{title}</h3>
              <button className="info-modal-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>
            <div className="info-modal-body">
              {typeof content === 'string' ? <p>{content}</p> : content}
            </div>
            {learnMoreUrl && (
              <div className="info-modal-footer">
                <a href={learnMoreUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                  Learn More →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
