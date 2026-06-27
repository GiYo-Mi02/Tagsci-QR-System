import React from "react";

interface StudentAvatarProps {
  fullName: string;
  lrn: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  fullName,
  lrn,
  imageUrl,
  size = "md"
}) => {
  // Determine dimensions
  const sizeClasses = {
    sm: "w-12 h-12 text-sm",
    md: "w-20 h-20 text-lg",
    lg: "w-32 h-48 text-2xl",
    xl: "w-48 h-72 text-3xl" // Front ID badge ratio is portrait
  };

  if (imageUrl && imageUrl.trim() !== "") {
    return (
      <div className={`relative overflow-hidden rounded-lg border-2 border-[#0A1F44]/20 shadow-md ${sizeClasses[size]} bg-white flex items-center justify-center`}>
        <img
          src={imageUrl}
          alt={fullName}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain bg-slate-50"
          onError={(e) => {
            // fallback if image fails to load
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    );
  }

  // Fallback: Generate a highly polished, stylized vector school ID photo
  // Seed various features based on the LRN or name to give students unique appearances
  const seed = parseInt(lrn.slice(-4)) || fullName.length;
  
  // Custom academic studio backgrounds
  const backgrounds = [
    "from-[#0B3C26]/10 to-[#EAB308]/10", // TSHS school colors light green/gold
    "from-slate-100 to-slate-200",       // Classic grey studio
    "from-[#0B3C26]/5 to-emerald-100",   // Scholastic green-white
    "from-emerald-50 to-teal-50"         // Soft green academy
  ];
  const bgGradient = backgrounds[seed % backgrounds.length];

  // Skin tones
  const skinTones = ["#FAD0C4", "#FCD3A1", "#E0A96D", "#C68B59", "#A67B5B", "#E3A857"];
  const skinColor = skinTones[seed % skinTones.length];

  // Hair colors
  const hairColors = ["#1A1A1A", "#2E1A47", "#3B2F2F", "#1F2937"];
  const hairColor = hairColors[(seed + 2) % hairColors.length];

  // Gender indicator (just for varying uniform and style)
  const isAltStyle = seed % 2 === 0;

  // Initials
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={`relative overflow-hidden rounded-xl border-2 border-[#0A1F44] shadow-lg ${sizeClasses[size]} bg-gradient-to-br ${bgGradient} flex flex-col items-center justify-center`}>
      {/* Dynamic SVG Portrait Illustration */}
      <svg
        viewBox="0 0 100 120"
        className="w-full h-full select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Crest Silhouette (Subtle TSHS Logo Grid) */}
        <circle cx="50" cy="55" r="38" fill="url(#crest-glow)" opacity="0.12" />
        
        {/* Shadow under head */}
        <ellipse cx="50" cy="74" rx="14" ry="5" fill="#000000" opacity="0.1" />

        {/* Neck */}
        <rect x="44" y="65" width="12" height="15" fill={skinColor} rx="3" />
        {/* Neck shadow */}
        <path d="M 44 70 Q 50 78 56 70 L 56 65 L 44 65 Z" fill="#000000" opacity="0.12" />

        {/* Head/Face */}
        <ellipse cx="50" cy="50" rx="17" ry="19" fill={skinColor} />

        {/* Ears */}
        <circle cx="31" cy="50" r="4.5" fill={skinColor} />
        <circle cx="69" cy="50" r="4.5" fill={skinColor} />

        {/* Hair Back (if long) */}
        {!isAltStyle && (
          <path
            d="M 28 50 C 25 70 35 90 50 90 C 65 90 75 70 72 50 C 70 30 30 30 28 50 Z"
            fill={hairColor}
          />
        )}

        {/* Hair Top/Front */}
        {isAltStyle ? (
          // Short academic trim
          <path
            d="M 31 46 C 29 25 71 25 69 46 C 65 42 35 42 31 46 Z"
            fill={hairColor}
          />
        ) : (
          // Side bangs/part
          <path
            d="M 31 46 C 30 30 70 28 69 46 C 65 38 45 35 31 46 Z"
            fill={hairColor}
          />
        )}

        {/* Eyes (Neat clean dots + brow) */}
        <ellipse cx="44" cy="48" rx="1.8" ry="2.2" fill="#1A1A1A" />
        <ellipse cx="56" cy="48" rx="1.8" ry="2.2" fill="#1A1A1A" />
        {/* Eyebrows */}
        <path d="M 39 43 Q 44 41 48 44" stroke="#1A1A1A" strokeWidth="1" strokeLinecap="round" fill="none" />
        <path d="M 52 44 Q 56 41 61 43" stroke="#1A1A1A" strokeWidth="1" strokeLinecap="round" fill="none" />

        {/* Glasses (Occasional) */}
        {seed % 3 === 0 && (
          <g stroke="#F5A623" strokeWidth="1.2" fill="none">
            <circle cx="43" cy="48" r="5.5" />
            <circle cx="57" cy="48" r="5.5" />
            <line x1="48.5" y1="48" x2="51.5" y2="48" />
            <path d="M 37.5 48 Q 33 46 32 49" />
            <path d="M 62.5 48 Q 67 46 68 49" />
          </g>
        )}

        {/* Nose */}
        <path d="M 50 47 L 48.5 53.5 Q 50 55 51.5 53.5 Z" fill="#000000" opacity="0.08" />

        {/* Smile */}
        <path d="M 45 58.5 Q 50 63 55 58.5" stroke="#E53E3E" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* Official School Uniform */}
        <g id="uniform">
          {/* Base Shirt (White Polo) */}
          <path d="M 22 105 C 22 85 32 78 50 78 C 68 78 78 85 78 105 Z" fill="#FFFFFF" />
          {/* Left Collar */}
          <path d="M 32 78 L 50 94 L 43 103 L 26 88 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.5" />
          {/* Right Collar */}
          <path d="M 68 78 L 50 94 L 57 103 L 74 88 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.5" />
          
          {/* Green Uniform Necktie with Golden Diagonal Stripes (TSHS Signature Color) */}
          <g>
            <path d="M 47 94 L 53 94 L 54 116 L 50 120 L 46 116 Z" fill="#0B3C26" />
            {/* Gold Stripes */}
            <line x1="47" y1="99" x2="53" y2="103" stroke="#EAB308" strokeWidth="1.5" />
            <line x1="47" y1="106" x2="53" y2="110" stroke="#EAB308" strokeWidth="1.5" />
            <line x1="47" y1="113" x2="52" y2="117" stroke="#EAB308" strokeWidth="1.5" />
            {/* Tie Knot */}
            <path d="M 46 94 L 54 94 L 52 89 L 48 89 Z" fill="#0B3C26" />
            <polygon points="48,89 52,89 50,91" fill="#EAB308" />
          </g>

          {/* Golden School Crest Emblem Badge on Chest (Left Pocket) */}
          <g transform="translate(28, 90) scale(0.6)">
            {/* Pocket line */}
            <path d="M 0 0 L 12 0 L 10 10 L 6 12 L 2 10 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="0.5" />
            {/* TSHS Seal Mock (Gold Circle with Green Core) */}
            <circle cx="6" cy="5" r="3.5" fill="#EAB308" />
            <circle cx="6" cy="5" r="2.2" fill="#0B3C26" />
            <polygon points="6,3.8 7.3,6.5 4.7,6.5" fill="#EAB308" />
          </g>
        </g>

        {/* Definitional Filters */}
        <defs>
          <radialGradient id="crest-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F5A623" />
            <stop offset="100%" stopColor="#0A1F44" />
          </radialGradient>
        </defs>
      </svg>

      {/* Decorative Badge Overlay (e.g., Initials at the corner or bottom for identification) */}
      <div className="absolute top-1 left-1 bg-[#0A1F44] text-[#F5A623] font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#F5A623] shadow-xs select-none">
        TSHS
      </div>
    </div>
  );
};
