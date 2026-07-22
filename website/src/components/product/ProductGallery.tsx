"use client";

import { useState } from "react";
import Image from "next/image";

export function ProductGallery({
  images,
  productName,
}: {
  images: { url: string; alt_text: string | null }[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  if (images.length === 0) {
    return <div className="aspect-square w-full rounded-l bg-box" />;
  }

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-l bg-box">
        <Image
          src={active.url}
          alt={active.alt_text || productName}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.url + index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-l bg-box " +
                (index === activeIndex ? "ring-2 ring-brand" : "opacity-70")
              }
            >
              <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
