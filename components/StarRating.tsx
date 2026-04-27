"use client";

interface Props {
  value: number | null;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}

export default function StarRating({ value, onChange, readonly }: Props) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`text-base leading-none transition-colors ${
            readonly ? "cursor-default" : "cursor-pointer hover:text-amber-400"
          } ${(value ?? 0) >= star ? "text-amber-400" : "text-stone-300"}`}
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
