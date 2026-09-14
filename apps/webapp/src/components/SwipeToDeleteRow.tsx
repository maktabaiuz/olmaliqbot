import React, { useRef, useState } from 'react';

interface SwipeToDeleteRowProps {
  onDelete: () => void;
  deleteLabel?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

const REVEAL_WIDTH = 88;

/**
 * iOS Mail/Reminders uslubidagi surish-orqali-o'chirish qatori — chapga
 * surilsa (sichqoncha bilan ham, barmoq bilan ham) ostidan qizil
 * "O'chirish" tugmasi chiqadi. Oddiy bosish (surmasdan) bolalar
 * elementining o'z onClick'iga o'tadi — faqat haqiqiy surish harakati
 * uni to'sib qo'yadi.
 */
export const SwipeToDeleteRow: React.FC<SwipeToDeleteRowProps> = ({
  onDelete,
  deleteLabel = "O'chirish",
  disabled,
  children,
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number | null>(null);
  const startTranslateRef = useRef(0);
  const draggedRef = useRef(false);

  const clamp = (v: number) => Math.max(-REVEAL_WIDTH, Math.min(0, v));

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    startXRef.current = e.clientX;
    startTranslateRef.current = translateX;
    draggedRef.current = false;
    setIsDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 4) draggedRef.current = true;
    setTranslateX(clamp(startTranslateRef.current + dx));
  };
  const endDrag = () => {
    startXRef.current = null;
    setIsDragging(false);
    setTranslateX((tx) => (tx < -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0));
  };

  return (
    <div className="relative overflow-hidden">
      <button
        type="button"
        onClick={() => {
          onDelete();
          setTranslateX(0);
        }}
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-[#FF3B30] text-white text-[13px] font-semibold active:opacity-80"
        style={{ width: REVEAL_WIDTH }}
      >
        {deleteLabel}
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={() => { if (isDragging) endDrag(); }}
        onClickCapture={(e) => {
          if (draggedRef.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
          touchAction: 'pan-y',
        }}
        className="relative"
      >
        {children}
      </div>
    </div>
  );
};
