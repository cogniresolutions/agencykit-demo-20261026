// End-to-end smoke test against a running instance (default http://localhost:3000).
// Signs up (or logs in), creates a sub-account, generates and publishes a website,
// submits the public contact form and chat, and checks the lead was captured.
//
// Usage:
//   npm run test:smoke
//   SMOKE_EMAIL=demo@agencykit.local SMOKE_PASSWORD=... npm run test:smoke   (when signup is closed)
import { randomBytes } from "node:crypto";

const BASE = (process.env.SMOKE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const results = [];
let cookie = "";

function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function req(path, init = {}) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", ...init, headers });
  const set = res.headers.getSetCookie?.() ?? [];
  for (const c of set) {
    if (!c.startsWith("ak_session=")) continue;
    const value = c.split(";")[0];
    cookie = value === "ak_session=" ? "" : value;
  }
  return res;
}

const jsonInit = (body) => ({
  method: "POST",
  headers: { "content-type": "application/json", origin: BASE },
  body: JSON.stringify(body),
});

function hiddenInputs(html) {
  const out = [];
  const re = /<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?\/>/g;
  const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  for (const m of html.matchAll(re)) out.push([decode(m[1]), decode(m[2] ?? "")]);
  return out;
}

async function postForm(path, fields) {
  const page = await req(path);
  const html = await page.text();
  const form = new FormData();
  for (const [k, v] of hiddenInputs(html)) form.append(k, v);
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return req(path, { method: "POST", body: form, headers: { origin: BASE } });
}

async function main() {
  console.log(`\nAgencyKit smoke test against ${BASE}\n`);

  const health = await req("/api/health");
  check("health endpoint", health.status === 200);

  const headers = (await req("/login")).headers;
  check("CSP with nonce and no unsafe-eval", /nonce-/.test(headers.get("content-security-policy") ?? "") && !/unsafe-eval/.test(headers.get("content-security-policy") ?? ""));
  check("X-Frame-Options DENY on app pages", headers.get("x-frame-options") === "DENY");
  check("HSTS, nosniff, Referrer-Policy, Permissions-Policy", ["strict-transport-security", "x-content-type-options", "referrer-policy", "permissions-policy"].every((h) => headers.has(h)));
  check("no X-Powered-By header", !headers.has("x-powered-by"));

  const guarded = await req("/app");
  check("unauthenticated /app redirects to /login", guarded.status === 307 && (guarded.headers.get("location") ?? "").includes("/login"));

  const email = process.env.SMOKE_EMAIL ?? `owner-${randomBytes(3).toString("hex")}@smoke.test`;
  const password = process.env.SMOKE_PASSWORD ?? `Smoke-${randomBytes(9).toString("base64url")}`;
  if (process.env.SMOKE_EMAIL) {
    const res = await postForm("/login", { email, password, next: "" });
    check("login with provided credentials", res.status === 303 && Boolean(cookie), `status ${res.status}`);
  } else {
    const short = await postForm("/signup", { name: "x", agencyName: "xx", email: "weak@smoke.test", password: "short" });
    const shortBody = await short.text();
    check("weak password is rejected on signup", short.status === 200 && !cookie && shortBody.includes("at least 12"), `status ${short.status}`);
    const res = await postForm("/signup", { name: "Smoke Owner", agencyName: "Smoke Test Agency", email, password });
    check("signup creates the agency owner and a session", res.status === 303 && Boolean(cookie), `status ${res.status}`);
  }
  if (!cookie) throw new Error("No session. If signup is closed, set SMOKE_EMAIL and SMOKE_PASSWORD.");

  const subRes = await req("/api/v1/sub-accounts", jsonInit({ name: `Summit Fitness ${randomBytes(2).toString("hex")}`, industry: "fitness", brandColor: "#ff6b2c" }));
  const sub = await subRes.json();
  check("create sub-account", subRes.status === 200 && Boolean(sub.id), sub.slug);

  const siteRes = await req(
    `/api/v1/sub-accounts/${sub.id}/websites`,
    jsonInit({
      industry: "fitness",
      style: "athletic",
      business: {
        name: `Summit Fitness Co. ${randomBytes(2).toString("hex")}`,
        tagline: "Coach-led strength training for busy people.",
        services: ["Small group training", "1:1 personal coaching", "Nutrition coaching"],
        phone: "(512) 555-0142",
        email: "hello@summitfitness.test",
        city: "Austin, TX",
      },
      features: { contactForm: true, chatWidget: true },
    }),
  );
  const site = await siteRes.json();
  check("generate website", siteRes.status === 200 && Boolean(site.slug), `generatedBy=${site.generatedBy}`);

  const unpublished = await req(`/s/${site.slug}`);
  check("unpublished site is not public", unpublished.status === 404);

  const pub = await req(`/api/v1/sub-accounts/${sub.id}/websites/${site.id}/publish`, jsonInit({ published: true }));
  check("publish website", pub.status === 200);

  const pageRes = await req(`/s/${site.slug}`);
  const html = await pageRes.text();
  check("public site renders", pageRes.status === 200 && html.includes("Summit Fitness Co."));
  check("SEO: canonical, Open Graph, Twitter card, JSON-LD LocalBusiness", html.includes('rel="canonical"') && html.includes('property="og:title"') && html.includes('name="twitter:card"') && html.includes('"@type":"LocalBusiness"'));
  check("public site may be framed by the app only", pageRes.headers.get("x-frame-options") === "SAMEORIGIN");

  const leadEmail = `lead-${randomBytes(3).toString("hex")}@example.com`;
  const form = await req("/api/public/forms", jsonInit({ site: site.slug, name: "Jordan Lee", email: leadEmail, phone: "+1 512 555 0199", message: "Do you have evening classes?", website: "" }));
  check("public contact form accepts a valid submission", form.status === 200);

  const honeypot = await req("/api/public/forms", jsonInit({ site: site.slug, name: "Bot", email: "bot@spam.test", website: "http://spam.test" }));
  check("honeypot submission is silently dropped", honeypot.status === 200);

  const invalid = await req("/api/public/forms", jsonInit({ site: site.slug, name: "X", email: "not-an-email" }));
  check("invalid form input is rejected (zod)", invalid.status === 400);

  const crossSite = await fetch(`${BASE}/api/public/forms`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({ site: site.slug, name: "X", email: "x@example.com" }),
  });
  check("cross-site form post is blocked", crossSite.status === 403);

  const chat = await req("/api/public/chat", jsonInit({ site: site.slug, message: "What time are your evening classes?" }));
  const chatBody = await chat.json();
  check("chat widget replies", chat.status === 200 && typeof chatBody.reply === "string", chatBody.ai ? "Claude" : "canned reply, no API key");

  const chatLead = await req("/api/public/chat", jsonInit({ site: site.slug, conversationId: chatBody.conversationId, message: "I'm Sam, sam@example.com", name: "Sam Rivera", email: `sam-${randomBytes(2).toString("hex")}@example.com` }));
  check("chat captures a lead", chatLead.status === 200 && (await chatLead.json()).leadCaptured === true);

  const tooLong = await req("/api/public/chat", jsonInit({ site: site.slug, message: "x".repeat(1001) }));
  check("chat enforces max message length", tooLong.status === 400);

  const list = await (await req(`/api/v1/sub-accounts/${sub.id}/contacts`)).json();
  const lead = list.contacts?.find((c) => c.email === leadEmail);
  check("form lead was created as a contact", Boolean(lead) && lead.source === "website form" && lead.tags.includes("contact form"), lead ? `${lead.name}, tags=${lead.tags.join("|")}` : "missing");
  check("honeypot did not create a contact", !list.contacts?.some((c) => c.email === "bot@spam.test"));
  check("chat lead was created as a contact", list.contacts?.some((c) => c.source === "website chat"));

  const otherTenant = await req(`/api/v1/sub-accounts/00000000-0000-4000-8000-000000000000/contacts`);
  check("unknown sub-account returns 404", otherTenant.status === 404);

  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed.\n`);
  if (!process.env.SMOKE_EMAIL) console.log(`Smoke account: ${email} (password generated for this run)\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("[smoke] error:", err.message);
  process.exit(1);
});
