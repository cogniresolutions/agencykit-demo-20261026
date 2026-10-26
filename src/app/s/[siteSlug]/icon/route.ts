import { getPublicSite } from "@/lib/sites/load";

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] ?? c);
}

/** Per-site favicon: brand-colored monogram. */
export async function GET(_req: Request, { params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const site = await getPublicSite(siteSlug);
  if (!site) return new Response("Not found", { status: 404 });
  const letter = escapeXml((site.business.name.trim()[0] ?? "A").toUpperCase());
  const color = /^#[0-9a-f]{6}$/i.test(site.theme.accent) ? site.theme.accent : "#ff6b2c";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${color}"/><text x="32" y="44" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="700" text-anchor="middle" fill="#ffffff">${letter}</text></svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
