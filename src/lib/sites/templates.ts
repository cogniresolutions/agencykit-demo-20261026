import type { Business, Industry, Sections, StylePreset } from "@/lib/sites/schema";

type IndustryPack = {
  serviceCopy: Record<string, string>;
  defaultStyle: StylePreset;
  defaultServices: string[];
  sampleTagline: string;
  eyebrow: (b: Business) => string;
  headline: (b: Business) => string;
  sub: (b: Business) => string;
  primaryCta: string;
  secondaryCta: string;
  servicesTitle: string;
  servicesIntro: (b: Business) => string;
  serviceBlurb: (service: string, b: Business) => string;
  whyTitle: string;
  why: { title: string; description: string }[];
  processTitle: string;
  process: { title: string; description: string }[];
  faq: (b: Business) => { question: string; answer: string }[];
  ctaHeadline: (b: Business) => string;
  ctaBody: string;
  ctaButton: string;
};

const where = (b: Business) => (b.city ? ` in ${b.city}` : "");
const contactLine = (b: Business) =>
  [b.phone && `call ${b.phone}`, b.email && `email ${b.email}`].filter(Boolean).join(" or ") ||
  "use the form on this page";

export const INDUSTRY_PACKS: Record<Industry, IndustryPack> = {
  ai_automation: {
    serviceCopy: {
      "AI voice receptionist": "A natural-sounding phone assistant that answers every call, books appointments into your calendar and hands complex calls to your team.",
      "Lead follow-up automation": "Instant text and email follow-up for every new enquiry, with smart reminders until the lead books or says no.",
      "Custom GPT assistants": "Private assistants trained on your docs and processes, so your team gets accurate answers in seconds.",
      "Workflow audits": "A practical review of where hours are lost each week, with a prioritised list of what to automate first.",
    },
    defaultStyle: "midnight",
    defaultServices: ["AI voice receptionist", "Lead follow-up automation", "Custom GPT assistants", "Workflow audits"],
    sampleTagline: "We build AI systems that answer, qualify and book while you sleep.",
    eyebrow: (b) => `AI automation${where(b)}`,
    headline: () => "Put your busywork on autopilot with AI that actually ships",
    sub: (b) =>
      `${b.name} designs, builds and runs AI assistants and automations that answer every lead in seconds, keep your pipeline moving and give your team their hours back.`,
    primaryCta: "Book a strategy call",
    secondaryCta: "See what we automate",
    servicesTitle: "Automations that pay for themselves",
    servicesIntro: () =>
      "Every engagement starts with your real workflows, not a demo script. We map where time leaks out, then build the smallest system that plugs it.",
    serviceBlurb: (s) =>
      `${s} designed around your tools and data, tested against real conversations, and handed over with clear docs so you stay in control.`,
    whyTitle: "Why teams choose us",
    why: [
      { title: "Outcome first", description: "We scope every build around one measurable result, such as faster replies or more booked calls, before writing a line of code." },
      { title: "Your stack, not ours", description: "We plug into the email, calendar and phone systems you already use instead of forcing a new platform on your team." },
      { title: "Human in the loop", description: "Sensitive conversations hand off to a person automatically, with full context, so nothing important is left to chance." },
      { title: "Owned by you", description: "Prompts, workflows and data stay in your accounts. No black boxes and no lock-in." },
    ],
    processTitle: "From idea to live automation",
    process: [
      { title: "Discovery call", description: "We walk through your current lead flow and pick the single highest-impact process to automate first." },
      { title: "Build and test", description: "We build the automation in a sandbox and test it on real examples until it behaves the way you would." },
      { title: "Launch and tune", description: "We go live, watch the first conversations closely and keep improving the system every week." },
    ],
    faq: (b) => [
      { question: "Do I need technical skills to use what you build?", answer: "No. Everything is delivered with a simple dashboard and a recorded walkthrough. If something needs changing, you can message us or adjust it yourself." },
      { question: "Which tools do you integrate with?", answer: "Common email, calendar, phone, form and messaging tools, plus anything with an API. We confirm the exact integrations on the discovery call." },
      { question: "How is customer data handled?", answer: "Data stays in your own accounts wherever possible, access is limited to what each automation needs, and we document every integration we create." },
      { question: "How do we get started?", answer: `Book a strategy call with ${b.name}, or ${contactLine(b)}. We will reply with a short plan and a fixed quote.` },
    ],
    ctaHeadline: () => "Ready to stop answering the same question twice?",
    ctaBody: "Tell us about your busiest workflow. We will show you exactly what can be automated and what should stay human.",
    ctaButton: "Get my automation plan",
  },
  real_estate: {
    serviceCopy: {
      "Home buying": "Curated listings, honest advice on every property and confident offers that protect your budget.",
      "Listing and selling": "Pricing strategy, professional presentation and active marketing to bring serious buyers through the door.",
      "Market valuations": "A clear, written estimate of your home's value based on recent local sales and current demand.",
      "Relocation support": "Neighbourhood briefings, video viewings and local introductions for a smooth move from out of town.",
    },
    defaultStyle: "editorial",
    defaultServices: ["Home buying", "Listing and selling", "Market valuations", "Relocation support"],
    sampleTagline: "Local expertise, honest advice and a calm path home.",
    eyebrow: (b) => `Real estate${where(b)}`,
    headline: (b) => (b.city ? `Find your place in ${b.city}, with a guide who knows every street` : "Find your next home with a guide who knows every street"),
    sub: (b) =>
      `${b.name} helps buyers and sellers move with confidence: clear pricing advice, sharp negotiation and a calm, organised process from first viewing to keys in hand.`,
    primaryCta: "Book a consultation",
    secondaryCta: "Explore services",
    servicesTitle: "How we can help",
    servicesIntro: (b) =>
      `Whether you are buying your first home or selling a long-time family property${where(b)}, you get one point of contact and a plan built around your timeline.`,
    serviceBlurb: (s) =>
      `${s} handled with clear communication at every step, local market insight and paperwork you never have to chase.`,
    whyTitle: "What working with us feels like",
    why: [
      { title: "Straight answers", description: "Pricing advice grounded in recent local sales, explained plainly, so every decision is yours to make with confidence." },
      { title: "Always reachable", description: "Quick replies by phone, text or email. You will never wonder what is happening with your move." },
      { title: "Skilled negotiation", description: "We prepare every offer and counter-offer carefully to protect your budget and your timeline." },
      { title: "Trusted network", description: "Introductions to inspectors, lenders and movers we have vetted, so the whole move runs smoothly." },
    ],
    processTitle: "Your move in three steps",
    process: [
      { title: "Consultation", description: "We learn your goals, budget and timeline, then share an honest view of the market." },
      { title: "Strategy", description: "A tailored search or listing plan with pricing, marketing and viewing schedule agreed up front." },
      { title: "Closing", description: "We coordinate offers, inspections and paperwork until the keys are in your hand." },
    ],
    faq: (b) => [
      { question: "How do you price a home for sale?", answer: "We review recent comparable sales, current competition and the condition of your home, then recommend a price range with the reasoning behind it." },
      { question: "Can you help if I am relocating from out of town?", answer: "Yes. We offer video viewings, neighbourhood briefings and help coordinating local services before you arrive." },
      { question: "What does a consultation cost?", answer: "The first consultation is free and comes with no obligation." },
      { question: "How do I get in touch?", answer: `Send a message using the form below, or ${contactLine(b)}. We usually reply the same business day.` },
    ],
    ctaHeadline: () => "Let us talk about your next move",
    ctaBody: "Share a little about what you are looking for. We will come back with honest advice and clear next steps.",
    ctaButton: "Start the conversation",
  },
  fitness: {
    serviceCopy: {
      "Small group training": "Coach-led sessions of up to a handful of people, with programming that adapts to every level.",
      "1:1 personal coaching": "Private sessions built entirely around your goals, schedule and training history.",
      "Strength and conditioning": "Structured lifting and conditioning blocks that build real strength and lasting fitness.",
      "Nutrition coaching": "Simple, sustainable habits and weekly check-ins that support your training without strict diets.",
    },
    defaultStyle: "athletic",
    defaultServices: ["Small group training", "1:1 personal coaching", "Strength and conditioning", "Nutrition coaching"],
    sampleTagline: "Train hard. Train smart. Show up for yourself.",
    eyebrow: (b) => `Fitness studio${where(b)}`,
    headline: () => "Stronger every week. Coached every rep.",
    sub: (b) =>
      `${b.name} is a coach-led training studio for people who want real results without guesswork. Expert programming, a crew that pushes you, and sessions that fit your schedule.`,
    primaryCta: "Claim a free class",
    secondaryCta: "View programs",
    servicesTitle: "Programs built to move you forward",
    servicesIntro: () => "Every program is coached, scalable to any starting point and designed to build strength that carries into everyday life.",
    serviceBlurb: (s) => `${s} with expert coaching, progress tracking and form feedback in every session, scaled to where you are today.`,
    whyTitle: "Why members stay",
    why: [
      { title: "Real coaching", description: "A certified coach runs every session, corrects your form and adjusts the workout to you." },
      { title: "Programming that progresses", description: "Structured training blocks so you can see and feel your strength improve week after week." },
      { title: "A crew that shows up", description: "Train alongside people who will notice when you are missing and cheer when you hit a new best." },
      { title: "Flexible schedule", description: "Early, lunch and evening sessions so training fits around work and family." },
    ],
    processTitle: "Start in three simple steps",
    process: [
      { title: "Book a free class", description: "Pick a time that suits you and come try a full coached session on us." },
      { title: "Goal session", description: "Sit down with a coach to set targets and choose the right program for you." },
      { title: "Start training", description: "Join your sessions, track your progress and keep levelling up." },
    ],
    faq: (b) => [
      { question: "I am a total beginner. Is this for me?", answer: "Absolutely. Every movement is scaled to your level and coaches teach technique before intensity." },
      { question: "What should I bring to my first class?", answer: "Comfortable training clothes, trainers and a water bottle. We provide all the equipment." },
      { question: "Do you offer personal training?", answer: "Yes. One-to-one coaching is available on its own or alongside group sessions." },
      { question: "How do I book my free class?", answer: `Use the form on this page, or ${contactLine(b)}, and we will find a session that suits you.` },
    ],
    ctaHeadline: () => "Your first class is on us",
    ctaBody: "No pressure and no long contracts. Come meet the coaches, train with the crew and see if it is the right fit.",
    ctaButton: "Book my free class",
  },
  dental: {
    serviceCopy: {
      "Check-ups and cleaning": "Thorough, gentle examinations and professional cleaning to keep your teeth and gums healthy.",
      "Teeth whitening": "Safe, dentist-supervised whitening for a noticeably brighter smile.",
      "Invisible aligners": "Discreet clear aligners to straighten teeth, with a personalised plan and regular reviews.",
      "Emergency appointments": "Time set aside for urgent pain, chips and breaks, so you are seen as quickly as possible.",
    },
    defaultStyle: "editorial",
    defaultServices: ["Check-ups and cleaning", "Teeth whitening", "Invisible aligners", "Emergency appointments"],
    sampleTagline: "Gentle, modern dental care for the whole family.",
    eyebrow: (b) => `Dental clinic${where(b)}`,
    headline: () => "Gentle dental care that makes you want to smile",
    sub: (b) =>
      `At ${b.name} we combine modern technology with an unhurried, gentle approach, so every visit is comfortable, clearly explained and focused on your long-term health.`,
    primaryCta: "Book an appointment",
    secondaryCta: "Our treatments",
    servicesTitle: "Treatments for every smile",
    servicesIntro: () => "From routine check-ups to cosmetic treatments, every plan is explained clearly with pricing agreed before we begin.",
    serviceBlurb: (s) => `${s} delivered by an experienced, gentle team, with every step explained before treatment starts.`,
    whyTitle: "Care you can feel good about",
    why: [
      { title: "Anxiety-friendly", description: "Unhurried appointments, clear explanations and the option to pause at any time." },
      { title: "Clear pricing", description: "You receive a written treatment plan and cost before any work begins, with no surprises." },
      { title: "Modern technology", description: "Digital imaging and up-to-date techniques for accurate, comfortable treatment." },
      { title: "Family friendly", description: "Care for every age, with appointment times that work around school and work." },
    ],
    processTitle: "Your visit, step by step",
    process: [
      { title: "Book online", description: "Request an appointment in under a minute and we will confirm a time that suits you." },
      { title: "Consultation", description: "A thorough, gentle examination and a clear conversation about your options." },
      { title: "Personal plan", description: "A written plan with transparent pricing, so you can decide with confidence." },
    ],
    faq: (b) => [
      { question: "Are you accepting new patients?", answer: "Yes. New patients of all ages are welcome. Request an appointment and we will find a time that suits you." },
      { question: "What if I am nervous about the dentist?", answer: "Tell us when you book. We will take extra time, explain each step and agree a signal so you can pause whenever you need." },
      { question: "Do you see dental emergencies?", answer: "We keep time aside for urgent cases. Contact us as early as possible and we will do our best to see you the same day." },
      { question: "How can I book?", answer: `Use the appointment form on this page, or ${contactLine(b)}.` },
    ],
    ctaHeadline: () => "A healthier, brighter smile starts here",
    ctaBody: "Request an appointment and our friendly team will confirm a time that works for you.",
    ctaButton: "Request appointment",
  },
  restaurant: {
    serviceCopy: {
      "Seasonal dinner menu": "A short, changing menu built around the best local produce of the moment.",
      "Weekend brunch": "Slow mornings with house-baked pastries, seasonal plates and great coffee.",
      "Private dining": "A dedicated space and a tailored menu for birthdays, anniversaries and team dinners.",
      "Catering and events": "Our kitchen's cooking delivered to your venue, from relaxed lunches to full celebrations.",
    },
    defaultStyle: "editorial",
    defaultServices: ["Seasonal dinner menu", "Weekend brunch", "Private dining", "Catering and events"],
    sampleTagline: "Seasonal cooking, warm hospitality, a table worth coming back to.",
    eyebrow: (b) => `Restaurant${where(b)}`,
    headline: () => "Seasonal plates, slow evenings and a table waiting for you",
    sub: (b) =>
      `${b.name} cooks with what is fresh and local, pours with care and treats every guest like a regular. Come for dinner, stay for the conversation.`,
    primaryCta: "Reserve a table",
    secondaryCta: "See the menu",
    servicesTitle: "Ways to join us",
    servicesIntro: () => "From a quiet dinner for two to a celebration for the whole family, there is a seat for every occasion.",
    serviceBlurb: (s) => `${s} prepared with seasonal ingredients and served with the warm, attentive hospitality we are known for.`,
    whyTitle: "What makes an evening here",
    why: [
      { title: "Cooked from scratch", description: "Sauces, breads and desserts made in house every day from carefully sourced ingredients." },
      { title: "Seasonal menu", description: "The menu changes with what is best right now, so there is always something new to try." },
      { title: "Warm welcome", description: "A relaxed room and a team who remember your name and your favourite table." },
      { title: "Every diet welcome", description: "Vegetarian, vegan and allergy-friendly options. Just let us know when you book." },
    ],
    processTitle: "Planning a visit",
    process: [
      { title: "Choose your occasion", description: "Dinner, brunch, private dining or catering. Let us know what you are planning." },
      { title: "Send a request", description: "Share your date, time and party size and any dietary needs." },
      { title: "We confirm", description: "Our team confirms your booking and prepares everything for your arrival." },
    ],
    faq: (b) => [
      { question: "Do you take walk-ins?", answer: "We keep a few tables for walk-ins each evening, but booking ahead is the best way to guarantee a seat." },
      { question: "Can you cater for allergies?", answer: "Yes. Tell us about any allergies when you book and our kitchen will guide you through the menu." },
      { question: "Do you host private events?", answer: "We host birthdays, rehearsal dinners and team celebrations. Send us your date and party size to plan the details." },
      { question: "How do I reserve?", answer: `Use the reservation form on this page, or ${contactLine(b)}.` },
    ],
    ctaHeadline: () => "Save your seat at the table",
    ctaBody: "Send us your preferred date and party size and we will confirm your booking.",
    ctaButton: "Request a reservation",
  },
  other: {
    serviceCopy: {},
    defaultStyle: "midnight",
    defaultServices: ["Consultation", "Core service", "Ongoing support"],
    sampleTagline: "Thoughtful service, delivered with care.",
    eyebrow: (b) => (b.city ? `Proudly serving ${b.city}` : "Welcome"),
    headline: (b) => `${b.name}: expert help, without the hassle`,
    sub: (b) => `${b.tagline} We keep things simple: clear communication, fair pricing and work we are proud to stand behind.`,
    primaryCta: "Get in touch",
    secondaryCta: "Our services",
    servicesTitle: "What we do",
    servicesIntro: () => "Every project gets a clear plan, a single point of contact and a team that cares about doing it right.",
    serviceBlurb: (s) => `${s} tailored to your needs, with a clear scope and honest pricing agreed up front.`,
    whyTitle: "Why work with us",
    why: [
      { title: "Clear communication", description: "You always know what is happening, what comes next and who to call." },
      { title: "Fair, upfront pricing", description: "A written quote before work begins, with no surprise extras." },
      { title: "Quality you can see", description: "We take care over the details and stand behind every job." },
    ],
    processTitle: "How it works",
    process: [
      { title: "Reach out", description: "Tell us what you need using the form or chat on this page." },
      { title: "Get a plan", description: "We reply with clear options, timing and pricing." },
      { title: "We deliver", description: "We get to work and keep you updated until the job is done." },
    ],
    faq: (b) => [
      { question: "How quickly do you respond?", answer: "We aim to reply to every enquiry within one business day." },
      { question: "Do you offer free quotes?", answer: "Yes. Tell us what you need and we will send a clear, no-obligation quote." },
      { question: "Where are you based?", answer: b.city ? `We are based in ${b.city} and work with clients nearby and remotely.` : "We work with clients locally and remotely." },
      { question: "How can I contact you?", answer: `Use the form on this page, or ${contactLine(b)}.` },
    ],
    ctaHeadline: () => "Let us make it easy",
    ctaBody: "Send a quick message and we will get back to you with clear next steps.",
    ctaButton: "Send a message",
  },
};

export function buildTemplateSections(industry: Industry, b: Business): Sections {
  const pack = INDUSTRY_PACKS[industry] ?? INDUSTRY_PACKS.other;
  const services = b.services.length >= 3 ? b.services : [...b.services, ...pack.defaultServices].slice(0, 3);
  return {
    hero: {
      eyebrow: pack.eyebrow(b),
      headline: pack.headline(b),
      subheadline: pack.sub(b),
      primaryCta: pack.primaryCta,
      secondaryCta: pack.secondaryCta,
    },
    services: {
      title: pack.servicesTitle,
      intro: pack.servicesIntro(b),
      items: services.slice(0, 6).map((s) => ({ title: s, description: pack.serviceCopy[s] ?? pack.serviceBlurb(s, b) })),
    },
    whyUs: { title: pack.whyTitle, points: pack.why.slice(0, 4) },
    process: { title: pack.processTitle, steps: pack.process },
    faq: { title: "Frequently asked questions", items: pack.faq(b) },
    cta: { headline: pack.ctaHeadline(b), body: pack.ctaBody, button: pack.ctaButton },
    seo: {
      title: `${b.name}${b.city ? ` | ${b.city}` : ""}`.slice(0, 70),
      description: `${b.tagline}`.slice(0, 160),
    },
  };
}
