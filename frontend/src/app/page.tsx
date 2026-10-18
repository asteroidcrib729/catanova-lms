import { AccessPortal } from "@/components/access-portal";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND_TAGLINE } from "@/lib/brand";

const capabilities = [
  {
    number: "01",
    title: "Catalog.",
    detail: "A place for every possibility.",
    description:
      "Bring titles, authors, categories, and available copies into one beautifully organized collection.",
    label: "Collections & availability",
  },
  {
    number: "02",
    title: "Manage.",
    detail: "Less admin. More library.",
    description:
      "Keep loans, reservations, renewals, and fines connected. Give your team clarity and your readers confidence.",
    label: "Circulation & collaboration",
  },
  {
    number: "03",
    title: "Discover.",
    detail: "Make room for your next favorite.",
    description:
      "Explore popular titles and reading recommendations, share feedback, and help shape what comes next.",
    label: "Recommendations & community",
  },
];

export default function Home() {
  return (
    <main
      id="main-content"
      className="mx-auto w-[min(1240px,calc(100%-80px))] max-[1000px]:w-[calc(100%-48px)] max-[760px]:w-[min(580px,calc(100%-36px))]"
    >
      <header className="flex min-h-28 items-center justify-between gap-6 border-b border-border max-[760px]:min-h-[92px] max-[760px]:gap-3">
        <BrandLogo responsive />
        <nav
          className="flex items-center gap-7 text-[0.83rem] font-[620]"
          aria-label="Main navigation"
        >
          <a
            className="text-foreground no-underline hover:text-accent-strong max-[760px]:hidden"
            href="#possibilities"
          >
            The possibilities
          </a>
          <a
            className="inline-flex min-h-[42px] items-center gap-5 rounded-full border border-border bg-surface px-[18px] py-2.5 text-foreground no-underline hover:text-accent-strong max-[760px]:gap-2 max-[760px]:px-3 max-[760px]:py-[9px] max-[760px]:text-[0.72rem]"
            href="#access"
          >
            Your workspace <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>

      <section
        className="grid grid-cols-[minmax(0,1.22fr)_minmax(340px,0.88fr)] items-center gap-[clamp(32px,5vw,76px)] pt-[72px] pb-[82px] max-[1000px]:gap-[30px] max-[760px]:grid-cols-1 max-[760px]:gap-9 max-[760px]:pt-[42px] max-[760px]:pb-[52px]"
        aria-labelledby="page-title"
      >
        <div>
          <p className="mb-[25px] flex items-center gap-2.5 font-mono text-[0.69rem] font-[650] tracking-[0.11em] text-accent-strong uppercase">
            <span className="text-[1.4rem]" aria-hidden="true">
              ✦
            </span>{" "}
            A new orbit for your library
          </p>
          <h1
            id="page-title"
            className="mb-6 text-[clamp(3rem,5.1vw,4.5rem)] leading-[1.03] font-[620] tracking-[-0.065em] max-[1000px]:text-[clamp(2.7rem,5.5vw,3.75rem)] max-[760px]:text-[clamp(2.8rem,8.8vw,4rem)]"
          >
            Your next chapter,
            <br />
            <span className="text-accent-strong">beautifully organized.</span>
          </h1>
          <p className="max-w-[480px] text-[1.03rem] leading-[1.8] text-muted">
            Great libraries are more than shelves. CataNova connects your
            collection, your people, and the discoveries waiting in between.
          </p>
          <p className="mt-[26px] text-[0.95rem] font-bold tracking-[-0.02em]">
            {BRAND_TAGLINE}
          </p>
          <div
            className="relative mt-[26px] h-[182px] max-w-[470px] overflow-hidden border-b border-border max-[760px]:h-40"
            aria-hidden="true"
          >
            <div className="absolute top-2.5 right-[34px] h-[120px] w-[170px] -rotate-24 rounded-[50%] border border-accent-strong/28" />
            <span className="absolute top-0 right-7 text-[68px] leading-none text-accent-strong">
              ✦
            </span>
            <div className="absolute bottom-0 left-0 flex items-end gap-2">
              <span className="flex w-10 items-center justify-center rounded-t-[5px] border border-[#152b29]/12 py-3 text-[0.64rem] font-[620] [writing-mode:vertical-rl] h-[145px] bg-accent text-[#152b29]">
                A world of ideas
              </span>
              <span className="flex w-10 items-center justify-center rounded-t-[5px] border border-[#152b29]/12 py-3 text-[0.64rem] font-[620] [writing-mode:vertical-rl] h-40 bg-[#ede1c5] text-[#152b29]">
                The next chapter
              </span>
              <span className="flex w-10 items-center justify-center rounded-t-[5px] border border-[#152b29]/12 py-3 text-[0.64rem] font-[620] [writing-mode:vertical-rl] h-[125px] bg-[#bfd1ca] text-[#152b29]">
                Collected stories
              </span>
              <span className="flex w-10 items-center justify-center rounded-t-[5px] border border-[#152b29]/12 py-3 text-[0.64rem] font-[620] [writing-mode:vertical-rl] h-[140px] origin-bottom-left -rotate-12 bg-[#28483f] text-[#f5f4ec]">
                New perspectives
              </span>
            </div>
            <span className="absolute right-0 bottom-[18px] font-mono text-[0.64rem] text-muted max-[1000px]:max-w-[120px] max-[1000px]:text-right">
              Good stories. Better systems.
            </span>
          </div>
        </div>
        <div id="access" className="min-w-0 scroll-mt-[30px]">
          <div className="mb-3.5 ml-2 flex items-center gap-[9px] font-mono text-[0.65rem] tracking-[0.04em] text-muted uppercase">
            <span
              className="size-[7px] rounded-full bg-accent-strong"
              aria-hidden="true"
            />
            One connected workspace
          </div>
          <AccessPortal />
          <p className="mx-2.5 mt-[18px] text-center text-[0.7rem] leading-[1.6] text-muted">
            Made for curious readers. Built for thoughtful library teams.
          </p>
        </div>
      </section>

      <section
        id="possibilities"
        className="scroll-mt-[30px] border-t border-border pt-12 pb-16"
        aria-labelledby="possibilities-title"
      >
        <div className="flex items-end justify-between gap-6 max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-3.5">
          <div>
            <p className="font-mono text-[0.69rem] font-[650] tracking-[0.11em] text-accent-strong uppercase">
              A little order. A lot of possibility.
            </p>
            <h2
              id="possibilities-title"
              className="text-[clamp(1.75rem,3vw,2.6rem)] font-[580] tracking-[-0.05em]"
            >
              Everything in its own orbit.
            </h2>
          </div>
          <p className="mb-[5px] text-[0.85rem] text-muted">
            One library. Three ways to bring it to life.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-4 max-[760px]:grid-cols-1">
          {capabilities.map((capability) => (
            <article
              className="flex min-w-0 flex-col rounded-[18px] border border-border bg-surface p-[26px] nth-2:bg-surface-tint"
              key={capability.number}
            >
              <div className="flex justify-between font-mono text-[0.72rem] text-accent-strong">
                <span>{capability.number}</span>
                <span className="text-[1.3rem]" aria-hidden="true">
                  ↗
                </span>
              </div>
              <h3 className="mt-6 mb-3 text-[2rem] font-[570] tracking-[-0.055em]">
                {capability.title}
              </h3>
              <strong className="text-[0.86rem] font-semibold">
                {capability.detail}
              </strong>
              <p className="mt-[13px] mb-[26px] text-[0.85rem] leading-[1.75] text-muted">
                {capability.description}
              </p>
              <span className="mt-auto border-t border-border pt-3.5 font-mono text-[0.6rem] tracking-[0.03em] text-muted uppercase">
                {capability.label}
              </span>
            </article>
          ))}
        </div>
      </section>

      <footer className="flex items-center justify-between gap-6 border-t border-border py-7 max-[760px]:flex-wrap max-[760px]:gap-[18px]">
        <BrandLogo compact />
        <p className="max-w-[310px] text-[0.73rem] leading-[1.65] text-muted max-[1000px]:hidden">
          Catalog with clarity. Manage with confidence. Discover with curiosity.
        </p>
        <a
          className="shrink-0 text-xs font-[650] text-foreground no-underline hover:text-accent-strong"
          href="#access"
        >
          Start your next chapter <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </main>
  );
}
