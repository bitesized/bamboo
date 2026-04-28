"use client";

import { useState } from "react";

interface Props {
  value: number | null;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}

export default function StarRating({ value, onChange, readonly }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const displayed = hover ?? value ?? 0;

  function getHalfValue(star: number, e: React.MouseEvent<HTMLButtonElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return x < rect.width / 2 ? star - 0.5 : star;
  }

  function handleClick(star: number, e: React.MouseEvent<HTMLButtonElement>) {
    if (!onChange) return;
    const v = getHalfValue(star, e);
    // Clicking the same value clears the rating
    if (v === value) {
      onChange(0);
    } else {
      onChange(v);
    }
  }

  function handleMouseMove(star: number, e: React.MouseEvent<HTMLButtonElement>) {
    if (readonly) return;
    setHover(getHalfValue(star, e));
  }

  function renderStar(star: number) {
    const fill = displayed >= star ? 1 : displayed >= star - 0.5 ? 0.5 : 0;
    const id = `star-clip-${star}`;

    return (
      <button
        key={star}
        type="button"
        disabled={readonly}
        onClick={(e) => handleClick(star, e)}
        onMouseMove={(e) => handleMouseMove(star, e)}
        onMouseLeave={() => !readonly && setHover(null)}
        className={`relative text-base leading-none transition-colors ${
          readonly ? "cursor-default" : "cursor-pointer"
        }`}
        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        style={{ width: "1.1em", display: "inline-block" }}
      >
        {/* Background star (empty) */}
        <span className="text-stone-300 select-none" aria-hidden>★</span>
        {/* Filled overlay */}
        {fill > 0 && (
          <span
            className="absolute inset-0 text-amber-400 overflow-hidden select-none"
            style={{ width: fill === 0.5 ? "50%" : "100%" }}
            aria-hidden
          >
            ★
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="flex gap-0.5 items-center" title={value ? `${value} / 5` : undefined}>
      {[1, 2, 3, 4, 5].map(renderStar)}
      {!readonly && value !== null && value !== undefined && value > 0 && (
        <button
          type="button"
          onClick={() => onChange?.(0)}
          onMouseEnter={() => setHover(0)}
          onMouseLeave={() => setHover(null)}
          className="ml-1 text-xs text-stone-300 hover:text-stone-500 transition-colors leading-none"
          aria-label="Clear rating"
        >
          ×
        </button>
      )}
    </div>
  );
}
