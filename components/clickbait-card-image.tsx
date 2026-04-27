"use client"

import Image from "next/image"
import { ImageOff } from "lucide-react"
import { useMemo, useState } from "react"

interface ClickbaitCardImageProps {
  src?: string
  alt: string
  source: string
}

function normalizeImageUrl(src?: string): string | null {
  if (!src) return null

  const clean = src.trim()
  if (!clean) return null

  return clean.replace(/^http:\/\//i, "https://")
}

export function ClickbaitCardImage({ src, alt, source }: ClickbaitCardImageProps) {
  const normalizedSrc = useMemo(() => normalizeImageUrl(src), [src])
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set())
  const failed = !normalizedSrc || failedUrls.has(normalizedSrc)

  if (!normalizedSrc || failed) {
    return (
      <div className="aspect-[16/9] overflow-hidden border-b border-stone-200 bg-[linear-gradient(135deg,_rgba(243,238,229,0.96),_rgba(231,226,216,0.92))]">
        <div className="flex h-full flex-col justify-between p-4 text-stone-600">
          <span className="inline-flex w-fit rounded-full border border-stone-300/90 bg-white/70 px-2.5 py-1 text-[11px] tracking-wide uppercase">
            {source}
          </span>

          <div className="space-y-2">
            <ImageOff className="h-5 w-5 text-stone-500" />
            <p className="text-sm leading-relaxed text-stone-500">
              Imagen no disponible para esta nota.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="aspect-[16/9] overflow-hidden bg-stone-200">
      <Image
        src={normalizedSrc}
        alt={alt}
        width={1200}
        height={675}
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        className="h-full w-full object-cover"
        unoptimized
        onError={() => {
          if (!normalizedSrc) return
          setFailedUrls(previous => new Set(previous).add(normalizedSrc))
        }}
      />
    </div>
  )
}
