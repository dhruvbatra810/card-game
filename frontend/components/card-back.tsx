type CardBackProps = {
  label?: string
}

export default function CardBack({ label }: CardBackProps) {
  return (
    <div className="relative w-48 h-64 rounded-card border-2 border-line bg-bg-3 overflow-hidden flex flex-col items-center justify-center">
      {/* Diagonal stripe pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, #2a2832 0px, #2a2832 8px, #1c1b23 8px, #1c1b23 20px)',
        }}
      />

      {/* Center diamond icon */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <svg width="32" height="22" viewBox="0 0 32 22" fill="none" className="text-lime">
          <path
            d="M16 1L31 11L16 21L1 11L16 1Z"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
        {label && (
          <span className="font-mono text-chip text-text-mute uppercase tracking-widest">{label}</span>
        )}
      </div>
    </div>
  )
}
