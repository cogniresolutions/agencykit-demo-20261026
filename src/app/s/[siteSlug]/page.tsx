import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SiteRenderer } from "@/components/site/site-renderer";
import { getPublicSite } from "@/lib/sites/load";

function baseUrl() {
  const url = process.env.APP_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export async function generateMetadata({ params }: { params: Promise<{ siteSlug: string }> }): Promise<Metadata> {
  const { siteSlug } = await params;
  const site = await getPublicSite(siteSlug);
  if (!site) return { title: "Not found", robots: { index: false } };
  const url = `${baseUrl()}/s/${site.slug}`;
  const { seo } = site.sections;
  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    icons: { icon: `/s/${site.slug}/icon` },
    openGraph: {
      type: "website",
      url,
      title: seo.title,
      description: seo.description,
      siteName: site.business.name,
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description },
  };
}

export default async function PublicSitePage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const site = await getPublicSite(siteSlug);
  if (!site) notFound();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const b = site.business;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: b.name,
    description: site.sections.seo.description,
    url: `${baseUrl()}/s/${site.slug}`,
    ...(b.phone ? { telephone: b.phone } : {}),
    ...(b.email ? { email: b.email } : {}),
    ...(b.city ? { address: { "@type": "PostalAddress", addressLocality: b.city } } : {}),
    makesOffer: site.sections.services.items.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.title } })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        // JSON is generated server-side from validated data; "<" is escaped so it cannot close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
      />
      <SiteRenderer site={site} />
    </>
  );
}
