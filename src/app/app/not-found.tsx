import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-10">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Nothing here</h1>
        <p className="mt-2 text-sm text-ink-300">This page does not exist, or you do not have access to it.</p>
        <LinkButton href="/app" className="mt-6">
          Back to agency home
        </LinkButton>
      </div>
    </div>
  );
}
