/** Maps subject IDs to decorative SVG icons. Falls back to a generic icon. */

const SubjectSVGs = {
  engmath: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="6" fill={color + "22"} />
      <text x="20" y="26" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color} fontFamily="serif">∑</text>
      <line x1="8" y1="32" x2="32" y2="32" stroke={color} strokeWidth="1.5" opacity="0.4" />
    </svg>
  ),
  dsa: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="10" r="4" fill={color} />
      <circle cx="10" cy="25" r="4" fill={color} opacity="0.8" />
      <circle cx="30" cy="25" r="4" fill={color} opacity="0.8" />
      <circle cx="5"  cy="36" r="3" fill={color} opacity="0.5" />
      <circle cx="16" cy="36" r="3" fill={color} opacity="0.5" />
      <circle cx="24" cy="36" r="3" fill={color} opacity="0.5" />
      <circle cx="35" cy="36" r="3" fill={color} opacity="0.5" />
      <line x1="20" y1="14" x2="10" y2="21" stroke={color} strokeWidth="1.5" />
      <line x1="20" y1="14" x2="30" y2="21" stroke={color} strokeWidth="1.5" />
      <line x1="10" y1="29" x2="5"  y2="33" stroke={color} strokeWidth="1.2" />
      <line x1="10" y1="29" x2="16" y2="33" stroke={color} strokeWidth="1.2" />
      <line x1="30" y1="29" x2="24" y2="33" stroke={color} strokeWidth="1.2" />
      <line x1="30" y1="29" x2="35" y2="33" stroke={color} strokeWidth="1.2" />
    </svg>
  ),
  os: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="6" width="32" height="22" rx="3" stroke={color} strokeWidth="2" fill={color + "15"} />
      <rect x="8" y="10" width="24" height="14" rx="1" fill={color + "30"} />
      <rect x="15" y="28" width="10" height="3" fill={color} opacity="0.5" />
      <rect x="10" y="31" width="20" height="2" rx="1" fill={color} opacity="0.4" />
      <circle cx="13" cy="13" r="1.5" fill={color} opacity="0.7" />
      <rect x="17" y="12" width="12" height="1.5" rx="0.75" fill={color} opacity="0.5" />
      <rect x="17" y="15" width="8"  height="1.5" rx="0.75" fill={color} opacity="0.4" />
      <rect x="17" y="18" width="10" height="1.5" rx="0.75" fill={color} opacity="0.3" />
    </svg>
  ),
  dbms: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <ellipse cx="20" cy="11" rx="13" ry="5" fill={color + "30"} stroke={color} strokeWidth="1.5" />
      <path d="M7 11 Q7 19 20 19 Q33 19 33 11" stroke={color} strokeWidth="1.5" fill={color + "20"} />
      <path d="M7 19 Q7 27 20 27 Q33 27 33 19" stroke={color} strokeWidth="1.5" fill={color + "15"} />
      <ellipse cx="20" cy="27" rx="13" ry="5" fill={color + "20"} stroke={color} strokeWidth="1.5" />
    </svg>
  ),
  networks: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="10" stroke={color} strokeWidth="1.5" fill="none" />
      <circle cx="20" cy="20" r="16" stroke={color} strokeWidth="1" fill="none" opacity="0.3" />
      <ellipse cx="20" cy="20" rx="5" ry="10" stroke={color} strokeWidth="1" fill="none" opacity="0.6" />
      <line x1="4" y1="20" x2="36" y2="20" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="4" x2="20" y2="36" stroke={color} strokeWidth="1" opacity="0.5" />
      <circle cx="20" cy="20" r="2" fill={color} />
    </svg>
  ),
  ml: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="5" fill={color} opacity="0.9" />
      <circle cx="8"  cy="12" r="3" fill={color} opacity="0.6" />
      <circle cx="32" cy="12" r="3" fill={color} opacity="0.6" />
      <circle cx="8"  cy="28" r="3" fill={color} opacity="0.6" />
      <circle cx="32" cy="28" r="3" fill={color} opacity="0.6" />
      <circle cx="20" cy="5"  r="2.5" fill={color} opacity="0.4" />
      <circle cx="20" cy="35" r="2.5" fill={color} opacity="0.4" />
      <line x1="20" y1="15" x2="8"  y2="15" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="15" x2="32" y2="15" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="25" x2="8"  y2="25" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="25" x2="32" y2="25" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="15" x2="20" y2="7.5"  stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="25" x2="20" y2="32.5" stroke={color} strokeWidth="1" opacity="0.5" />
    </svg>
  ),
};

const DEFAULT_SVG = ({ color, size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect x="6" y="6" width="28" height="28" rx="5" stroke={color} strokeWidth="1.5" fill={color + "18"} />
    <text x="20" y="26" textAnchor="middle" fontSize="16" fill={color} fontFamily="sans-serif">?</text>
  </svg>
);

export default function SubjectIcon({ sectionId, color, size = 40 }) {
  const Comp = SubjectSVGs[sectionId] || DEFAULT_SVG;
  return <Comp color={color} size={size} />;
}
