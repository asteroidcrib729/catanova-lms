export default function DashboardLoading() {
  return (
    <main
      id="main-content"
      className="mx-auto grid min-h-screen w-[min(900px,calc(100%-40px))] content-center gap-4"
      aria-label="Loading dashboard"
    >
      <div className="h-[110px] rounded-[18px] bg-border/55 motion-safe:animate-pulse" />
      <div className="h-[110px] rounded-[18px] bg-border/55 motion-safe:animate-pulse" />
      <div className="h-[110px] rounded-[18px] bg-border/55 motion-safe:animate-pulse" />
    </main>
  );
}
