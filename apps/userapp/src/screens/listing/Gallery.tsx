import React, { useState } from 'react';
import { Blob, SHAPE_BY_TYPE } from '../../components/Blob';
import type { Listing } from '../../lib/types';

/** Rasm karuseli (scroll-snap) yoki rasm bo'lmasa — katta pastel fon + kategoriya shakli. */
export const Gallery: React.FC<{ listing: Listing; className: string; children?: React.ReactNode; dots?: boolean }> = ({ listing, className, children, dots }) => {
  const [idx, setIdx] = useState(0);
  const photos = listing.photoUrls;
  return (
    <div className={`relative w-full overflow-hidden bg-surface-container-high select-none ${className}`}>
      {photos.length === 0 ? (
        <div className="w-full h-full bg-gradient-to-br from-primary-fixed via-surface-container-low to-secondary-fixed/60 flex items-center justify-center">
          <Blob shape={SHAPE_BY_TYPE[listing.type] || 'sphere'} size={132} mood="idle" />
        </div>
      ) : (
        <div
          className="w-full h-full flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
          style={{ scrollbarWidth: 'none' }}
          onScroll={(e) => {
            const el = e.currentTarget;
            setIdx(Math.round(el.scrollLeft / el.clientWidth));
          }}
        >
          {photos.map((src, i) => (
            <img key={src + i} src={src} alt={listing.name} loading={i ? 'lazy' : 'eager'} className="w-full h-full object-cover shrink-0 snap-center" />
          ))}
        </div>
      )}
      {photos.length > 0 && <div className="absolute inset-0 bg-gradient-to-t from-on-surface/50 via-transparent to-black/10 pointer-events-none" />}
      {children}
      {photos.length > 1 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 pointer-events-none">
          {dots && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-inverse-surface/60 backdrop-blur-md">
              {photos.map((_, i) => (
                <span key={i} className={`rounded-full transition-all duration-300 ${i === idx ? 'w-2 h-2 bg-on-primary' : 'w-1.5 h-1.5 bg-on-primary/40'}`} />
              ))}
            </div>
          )}
          <div className="bg-on-surface/70 backdrop-blur-md px-space-md py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <span className="material-symbols-outlined text-surface-bright text-[15px]">photo_camera</span>
            <span className="font-label-sm text-label-sm text-surface-bright tracking-wider">
              {idx + 1} / {photos.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/** Ochiq/yopiq holat pill'i; 'unknown' bo'lsa hech narsa. */
export const OpenPill: React.FC<{ listing: Listing; className?: string }> = ({ listing, className = '' }) => {
  if (listing.open.status === 'unknown') return null;
  const open = listing.open.status === 'open';
  return (
    <div className={`px-space-md py-1.5 rounded-full flex items-center gap-2 shadow-sm backdrop-blur-md ${open ? 'bg-tertiary-fixed/90' : 'bg-error-container/90'} ${className}`}>
      {open ? (
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-fixed-dim opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary" />
        </span>
      ) : (
        <span className="inline-flex rounded-full h-2.5 w-2.5 bg-error" />
      )}
      <span className={`font-label-md text-label-md ${open ? 'text-on-tertiary-fixed' : 'text-on-error-container'}`}>{listing.open.label}</span>
    </div>
  );
};
