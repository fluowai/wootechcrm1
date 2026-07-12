type NexusLogoProps = {
  className?: string;
  compact?: boolean;
  light?: boolean;
};

export default function NexusLogo({ className = "", compact = false, light = false }: NexusLogoProps) {
  const textColor = light ? "#FFFFFF" : "#111827";
  const mutedColor = light ? "#FDE68A" : "#6B7280";

  return (
    <div className={`inline-flex items-center gap-3 ${className}`} aria-label="WooTech CRM">
      <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="wootech-logo-gradient" x1="8" y1="7" x2="40" y2="41" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FACC15" />
            <stop offset="0.55" stopColor="#EAB308" />
            <stop offset="1" stopColor="#CA8A04" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="#0B0F19" />
        <path
          d="M9.5 12.5c0-1.4 1.1-2.5 2.5-2.5h4.9c1 0 2 .7 2.3 1.6l4 11.4 4.1-11.4c.4-1 1.3-1.6 2.3-1.6h4.8c1.4 0 2.5 1.1 2.5 2.5v22.8c0 1.4-1.1 2.5-2.5 2.5H31c-1.4 0-2.5-1.1-2.5-2.5V23.5l-2.7 7.5c-.3.9-1.2 1.5-2.2 1.5h-.4c-1 0-1.9-.6-2.2-1.5l-2.7-7.5v11.8c0 1.4-1.1 2.5-2.5 2.5H12c-1.4 0-2.5-1.1-2.5-2.5V12.5Z"
          fill="url(#wootech-logo-gradient)"
        />
        <circle cx="36" cy="13.5" r="3" fill="#FFF7D6" />
      </svg>
      {!compact && (
        <div className="leading-none">
          <div className="text-[21px] font-black tracking-[-0.04em]" style={{ color: textColor }}>
            WooTech <span className={light ? "text-[#FDE68A]" : "text-[#A16207]"}>CRM</span>
          </div>
          <div className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.27em]" style={{ color: mutedColor }}>
            Gestão comercial
          </div>
        </div>
      )}
    </div>
  );
}
