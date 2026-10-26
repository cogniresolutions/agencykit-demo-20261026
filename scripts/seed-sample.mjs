// Fills one sub-account with realistic sample data so the dashboard has life:
// ~60 leads over 30 days, deals across pipeline stages and conversations.
// Usage: npm run seed:sample -- --sub <slug>
import postgres from "postgres";
import { requireEnv } from "./env.mjs";

const args = process.argv.slice(2);
const slug = args[args.indexOf("--sub") + 1];
if (!args.includes("--sub") || !slug) {
  console.error("Usage: npm run seed:sample -- --sub <sub-account-slug>");
  process.exit(1);
}

const sql = postgres(requireEnv("DATABASE_ADMIN_URL"), { max: 1, onnotice: () => {} });

// Deterministic pseudo-random generator so runs are reproducible.
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const weighted = (pairs) => {
  const total = pairs.reduce((a, [, w]) => a + w, 0);
  let r = rand() * total;
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
  return pairs[0][0];
};

const FIRST = ["Olivia", "Liam", "Emma", "Noah", "Ava", "Mateo", "Sophia", "Elijah", "Isabella", "Lucas", "Mia", "Ethan", "Amelia", "James", "Harper", "Benjamin", "Evelyn", "Henry", "Camila", "Daniel", "Priya", "Arjun", "Chloe", "Diego", "Grace", "Hiro", "Layla", "Marcus", "Nora", "Omar", "Zoe", "Samuel", "Aaliyah", "Leo", "Maya", "Caleb"];
const LAST = ["Johnson", "Garcia", "Chen", "Patel", "Williams", "Nguyen", "Brown", "Martinez", "Kim", "Davis", "Lopez", "Wilson", "Anderson", "Thomas", "Singh", "Moore", "Jackson", "Lee", "Harris", "Clark", "Lewis", "Walker", "Young", "Hall", "Rivera", "Brooks", "Reyes", "Foster"];
const DOMAINS = ["gmail.com", "outlook.com", "yahoo.com", "icloud.com", "proton.me"];
const SOURCES = [["website form", 30], ["website chat", 18], ["google ads", 16], ["referral", 12], ["facebook ads", 12], ["walk-in", 6], ["manual", 6]];
const TAGS = ["hot", "follow-up", "newsletter", "vip", "budget-approved", "price-shopper", "returning"];

const DEALS = {
  ai_automation: [["AI receptionist build", 4500, 12000], ["Lead follow-up automation", 2500, 8000], ["Workflow audit", 1500, 3500], ["Monthly AI retainer", 2000, 6000]],
  real_estate: [["Buyer representation", 6000, 18000], ["Listing agreement", 9000, 30000], ["Rental search", 1500, 3000]],
  fitness: [["Annual membership", 900, 1800], ["12-week coaching program", 600, 1500], ["Corporate wellness package", 3000, 9000]],
  dental: [["Invisible aligners", 3500, 6500], ["Whitening package", 400, 900], ["Family check-up plan", 600, 1400], ["Implant consultation", 2500, 5000]],
  restaurant: [["Private dining event", 1500, 6000], ["Corporate catering", 2000, 9000], ["Rehearsal dinner", 2500, 7000]],
  other: [["Consulting package", 1500, 6000], ["Project engagement", 3000, 12000], ["Support retainer", 800, 2500]],
};

const QUESTIONS = {
  ai_automation: ["Can you set up an AI receptionist for our clinic?", "How long does a typical automation project take?", "Do you integrate with our existing calendar tool?"],
  real_estate: ["Are there any 3 bedroom homes near good schools?", "What would my condo list for?", "Can we schedule a viewing this weekend?"],
  fitness: ["Do you have beginner classes in the evening?", "Is the first class really free?", "Do you offer personal training?"],
  dental: ["Are you accepting new patients?", "How much does whitening cost?", "Do you have an emergency slot today?"],
  restaurant: ["Do you have a table for 6 on Friday?", "Can you cater a team lunch for 30?", "Do you have vegan options?"],
  other: ["Can I get a quote?", "What are your opening hours?", "Do you work with small businesses?"],
};

const DAY = 86_400_000;

async function main() {
  const subs = await sql`select id, name, industry, agency_id from sub_accounts where slug = ${slug}`;
  if (subs.length === 0) throw new Error(`No sub-account with slug "${slug}".`);
  if (subs.length > 1) throw new Error(`Slug "${slug}" exists in several agencies. Rename one first.`);
  const sub = subs[0];
  const stages = await sql`select id, name, is_won from pipeline_stages where sub_account_id = ${sub.id} order by position`;
  if (!stages.length) throw new Error("This sub-account has no pipeline stages.");
  const dealTemplates = DEALS[sub.industry] ?? DEALS.other;
  const questions = QUESTIONS[sub.industry] ?? QUESTIONS.other;
  const now = Date.now();

  await sql.begin(async (tx) => {
    const contacts = [];
    for (let i = 0; i < 60; i++) {
      const first = pick(FIRST);
      const last = pick(LAST);
      // More recent days get more leads, so the trend line rises.
      const daysAgo = Math.floor(Math.pow(rand(), 1.35) * 30);
      const createdAt = new Date(now - daysAgo * DAY - Math.floor(rand() * DAY * 0.9));
      const source = weighted(SOURCES);
      const stage = weighted([["new", 30], ["contacted", 22], ["qualified", 18], ["customer", 18], ["lost", 8]]);
      const tags = Array.from(new Set([pick(TAGS), rand() > 0.6 ? pick(TAGS) : null].filter(Boolean)));
      const [row] = await tx`
        insert into contacts (sub_account_id, name, email, phone, source, tags, stage, created_at)
        values (${sub.id}, ${`${first} ${last}`}, ${`${first}.${last}${i}@${pick(DOMAINS)}`.toLowerCase()},
                ${`+1 (${200 + Math.floor(rand() * 700)}) 555-${String(Math.floor(rand() * 9000) + 1000)}`},
                ${source}, ${tags}, ${stage}, ${createdAt})
        returning id, name, created_at, source`;
      contacts.push(row);
    }

    for (let i = 0; i < 26; i++) {
      const [title, min, max] = pick(dealTemplates);
      const contact = pick(contacts);
      const stage = stages[Math.min(stages.length - 1, Math.floor(Math.pow(rand(), 1.2) * stages.length))];
      const value = Math.round((min + rand() * (max - min)) / 50) * 50;
      await tx`
        insert into deals (sub_account_id, stage_id, contact_id, title, value_cents, created_at, updated_at)
        values (${sub.id}, ${stage.id}, ${contact.id}, ${title}, ${value * 100}, ${contact.created_at}, ${contact.created_at})`;
    }

    const channelFor = (source) => (source === "website chat" ? "web_chat" : source === "website form" ? "form" : weighted([["email", 3], ["sms", 2]]));
    for (const contact of contacts.slice(0, 34)) {
      const channel = channelFor(contact.source);
      const started = new Date(contact.created_at);
      const responseSeconds = channel === "web_chat" ? 2 + Math.floor(rand() * 6) : 120 + Math.floor(rand() * 3600);
      const [convo] = await tx`
        insert into conversations (sub_account_id, contact_id, channel, subject, status, unread, first_response_seconds, last_message_at, created_at)
        values (${sub.id}, ${contact.id}, ${channel}, ${channel === "form" ? "Contact form" : channel === "web_chat" ? "Website chat" : "Enquiry"},
                ${rand() > 0.3 ? "open" : "closed"}, ${rand() > 0.6}, ${responseSeconds},
                ${new Date(started.getTime() + responseSeconds * 1000)}, ${started})
        returning id`;
      const q = pick(questions);
      await tx`insert into messages (sub_account_id, conversation_id, direction, author, body, created_at)
               values (${sub.id}, ${convo.id}, 'inbound', 'contact', ${q}, ${started})`;
      await tx`insert into messages (sub_account_id, conversation_id, direction, author, body, created_at)
               values (${sub.id}, ${convo.id}, 'outbound', ${channel === "web_chat" ? "ai" : "team"},
                       ${`Hi ${contact.name.split(" ")[0]}, thanks for reaching out to ${sub.name}! Happy to help with that. What is the best time to connect?`},
                       ${new Date(started.getTime() + responseSeconds * 1000)})`;
    }

    await tx`insert into audit_log (agency_id, sub_account_id, actor, action, entity, metadata)
             values (${sub.agency_id}, ${sub.id}, 'seed script', 'sample_data.seeded', 'sub_account', ${sql.json({ contacts: 60, deals: 26, conversations: 34 })})`;
  });
  console.log(`[seed:sample] Added 60 leads, 26 deals and 34 conversations to "${sub.name}".`);
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error("[seed:sample] failed:", err.message);
    await sql.end({ timeout: 1 });
    process.exit(1);
  });
