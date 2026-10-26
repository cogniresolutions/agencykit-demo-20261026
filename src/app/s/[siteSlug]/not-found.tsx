export default function SiteNotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#06070b] px-6 text-center text-white">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">404</p>
        <h1 className="mt-3 text-2xl font-semibold">This site is not available</h1>
        <p className="mt-2 text-sm text-white/60">It may be unpublished or the address may be wrong.</p>
      </div>
    </div>
  );
}
