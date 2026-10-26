export function Logo({ size = 28, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="relative grid place-items-center rounded-[10px] bg-gradient-to-br from-[#ff8a4c] to-[#ff4d1a] shadow-[0_8px_24px_-6px_rgba(255,107,44,0.6)]"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} aria-hidden="true">
          <path d="M4.5 19 11 4h2l6.5 15h-3.3l-1.4-3.6H9.2L7.8 19H4.5Zm5.8-6.3h3.4L12 8.2l-1.7 4.5Z" fill="white" />
        </svg>
      </span>
      {withText ? <span className="text-[15px] font-semibold tracking-tight text-white">AgencyKit</span> : null}
    </span>
  );
}
