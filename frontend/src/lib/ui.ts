// Shared Tailwind recipes keep repeated controls consistent without custom CSS.
// Keep complete class names here so Tailwind can discover every variant.
const textButton =
  "border-0 bg-transparent p-[0.35rem] font-[680] underline underline-offset-[3px]";
const workForm = "grid gap-4 rounded-[18px] border bg-surface p-6";
const stateCard =
  "flex items-center justify-between gap-[18px] rounded-2xl border bg-surface p-[22px] max-[760px]:flex-col max-[760px]:items-stretch";
const metricCard = "rounded-2xl border bg-surface p-5";

export const ui = {
  button:
    "inline-flex min-h-[42px] items-center justify-center rounded-[11px] border px-4 py-[0.68rem] font-[680]",
  primary:
    "border-transparent bg-accent text-[#152b29] enabled:hover:bg-[#b6e369]",
  secondary: "border-border bg-surface text-foreground",
  danger: "border-transparent bg-danger text-white dark:text-background",
  textButton: `${textButton} text-accent-strong`,
  textButtonDanger: `${textButton} text-danger`,
  label: "grid gap-[0.42rem] text-[0.86rem] font-[630] text-foreground",
  input:
    "w-full rounded-[11px] border border-muted bg-surface px-[0.8rem] py-[0.72rem] text-foreground",
  form: "grid gap-4",
  accessCard:
    "grid min-h-[420px] gap-[22px] rounded-3xl border border-border bg-surface p-[clamp(22px,4vw,34px)] shadow-card",
  eyebrow:
    "mb-2.5 font-mono text-[0.72rem] font-bold tracking-[0.14em] text-accent-strong uppercase",
  panelStack: "grid min-w-0 gap-[38px] *:min-w-0",
  panelHeading:
    "flex items-end justify-between gap-7 border-b border-border pb-7 max-[760px]:flex-col max-[760px]:items-stretch",
  panelTitle:
    "mb-2.5 text-[clamp(2rem,5vw,3.6rem)] font-[620] tracking-[-0.06em]",
  panelDescription: "max-w-[620px] text-muted leading-[1.6]",
  grid: "grid grid-cols-1 gap-4 min-[761px]:grid-cols-2 min-[1041px]:grid-cols-3",
  formGrid: "grid grid-cols-1 gap-4 min-[761px]:grid-cols-2",
  workForm: `${workForm} border-border`,
  workFormDanger: `${workForm} border-danger/45`,
  meta: "mb-[9px] font-mono text-[0.66rem] text-accent-strong uppercase",
  stateCard: `${stateCard} border-border`,
  stateCardError: `${stateCard} border-danger/38`,
  spinner:
    "size-[22px] shrink-0 rounded-full border-[3px] border-border border-t-accent motion-safe:animate-spin motion-safe:[animation-duration:850ms]",
  notice:
    "mt-2 rounded-[10px] bg-warning/12 px-[13px] py-[11px] text-[0.86rem] text-foreground",
  noticeSuccess:
    "mt-2 rounded-[10px] bg-accent/13 px-[13px] py-[11px] text-[0.86rem] text-foreground",
  noticeError:
    "mt-2 flex items-center justify-between gap-3 rounded-[10px] bg-danger/12 px-[13px] py-[11px] text-[0.86rem] text-foreground max-[760px]:flex-col max-[760px]:items-stretch",
  noticeAction: "border-0 bg-transparent font-bold text-inherit underline",
  badge:
    "inline-flex rounded-full bg-accent/13 px-[9px] py-[5px] text-[0.7rem] font-bold text-accent-strong capitalize",
  badgeDanger:
    "inline-flex rounded-full bg-danger/13 px-[9px] py-[5px] text-[0.7rem] font-bold text-danger capitalize",
  recordList:
    "m-0 grid list-none gap-px overflow-hidden rounded-2xl border border-border bg-border p-0",
  record:
    "flex items-center justify-between gap-3.5 bg-surface px-[18px] py-4 max-[760px]:flex-wrap",
  recordDetail: "mt-1 block text-muted",
  inlineActions: "flex flex-wrap items-center justify-between gap-2.5",
  metricCard: `${metricCard} border-border`,
  metricAlert: `${metricCard} border-danger/38`,
  cardTitle: "mb-[7px] text-[1.04rem] font-bold",
  centerPage: "grid min-h-screen place-items-center p-6",
} as const;
