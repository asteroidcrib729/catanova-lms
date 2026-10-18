import Image from "next/image";
import Link from "next/link";

import { BRAND_TAGLINE } from "@/lib/brand";

export function BrandLogo({
  compact = false,
  responsive = false,
  className = "",
}: {
  compact?: boolean;
  responsive?: boolean;
  className?: string;
}) {
  return (
    <Link
      className={`inline-flex items-center gap-[11px] text-[1.45rem] font-[760] tracking-[-0.04em] text-foreground no-underline ${responsive ? "max-[760px]:gap-2 max-[760px]:text-[1.2rem]" : ""} ${className}`}
      href="/"
      aria-label="CataNova home"
    >
      <Image
        className={`size-11 shrink-0 ${responsive ? "max-[760px]:size-9" : ""}`}
        src="/brand/catanova-mark.svg"
        alt=""
        width={44}
        height={44}
        unoptimized
      />
      <span className="grid gap-[3px]">
        <strong className="font-[730] leading-[1.15]">
          Cata<span className="text-accent-strong">Nova</span>
        </strong>
        {!compact ? (
          <span
            className={`text-[0.58rem] font-medium tracking-[0.015em] whitespace-nowrap text-muted ${responsive ? "max-[760px]:hidden" : ""}`}
          >
            {BRAND_TAGLINE}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
