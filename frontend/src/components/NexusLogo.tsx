type NexusLogoProps = {
  className?: string;
  compact?: boolean;
  light?: boolean;
};

export default function NexusLogo({ className = "", compact = false, light = false }: NexusLogoProps) {
  const textColor = light ? "#FFFFFF" : "#12372A";
  const mutedColor = light ? "#D8F3E6" : "#6A7E74";

  return (
    <div className={`inline-flex items-center gap-3 ${className}`} aria-label="Nexus360">
      <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="nexus-logo-gradient" x1="5" y1="4" x2="43" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34D399" />
            <stop offset="0.55" stopColor="#10B981" />
            <stop offset="1" stopColor="#047857" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="#0B6B4A" />
        <path
          d="M12.5 31.5V16.8c0-2.3 2.8-3.4 4.4-1.8l14.2 14.2c1.6 1.6.5 4.3-1.8 4.3h-2.1c-.7 0-1.3-.3-1.8-.7L18.8 26v5.5a3.15 3.15 0 0 1-6.3 0Z"
          fill="url(#nexus-logo-gradient)"
        />
        <circle cx="34.5" cy="14" r="4.5" fill="#D1FAE5" />
        <path d="M29.5 14h-5.8" stroke="#6EE7B7" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {!compact && (
        <div className="leading-none">
          <div className="text-[21px] font-black tracking-[-0.04em]" style={{ color: textColor }}>
            nexus<span className={light ? "text-[#A7F3D0]" : "text-[#0F9F6E]"}>360</span>
          </div>
          <div className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.27em]" style={{ color: mutedColor }}>
            Gestão inteligente
          </div>
        </div>
      )}
    </div>
  );
}
