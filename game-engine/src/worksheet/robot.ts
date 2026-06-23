// Faint onion-skin robot guides for the character animation spread. They share
// the placeholder's look (rounded body, antenna, visor eyes) so a kid keeps the
// proportions; the limbs change per pose. Drawn very light — trace or ignore.

export type Pose = 'idle' | 'run' | 'jump' | 'fall' | 'hurt';
export const POSES: Pose[] = ['idle', 'run', 'jump', 'fall', 'hurt'];

const STROKE = '#c4c7cd';

function bodyShape(): string {
  return `
    <line x1="50" y1="20" x2="50" y2="11" />
    <circle cx="50" cy="8" r="3.2" />
    <rect x="29" y="20" width="42" height="44" rx="11" />
    <rect x="36" y="34" width="28" height="13" rx="4" />
    <circle cx="43" cy="40.5" r="2.6" />
    <circle cx="57" cy="40.5" r="2.6" />`;
}

// arms + legs per pose
const LIMBS: Record<Pose, string> = {
  idle: `
    <line x1="29" y1="42" x2="20" y2="52" />
    <line x1="71" y1="42" x2="80" y2="52" />
    <line x1="42" y1="64" x2="42" y2="86" />
    <line x1="58" y1="64" x2="58" y2="86" />`,
  run: `
    <line x1="29" y1="43" x2="17" y2="37" />
    <line x1="71" y1="43" x2="83" y2="51" />
    <line x1="44" y1="64" x2="33" y2="84" />
    <line x1="56" y1="64" x2="69" y2="82" />`,
  jump: `
    <line x1="30" y1="37" x2="21" y2="22" />
    <line x1="70" y1="37" x2="79" y2="22" />
    <line x1="43" y1="64" x2="39" y2="80" />
    <line x1="57" y1="64" x2="61" y2="80" />`,
  fall: `
    <line x1="29" y1="40" x2="15" y2="33" />
    <line x1="71" y1="40" x2="85" y2="33" />
    <line x1="42" y1="64" x2="32" y2="83" />
    <line x1="58" y1="64" x2="68" y2="83" />`,
  hurt: `
    <line x1="29" y1="40" x2="19" y2="34" />
    <line x1="71" y1="40" x2="81" y2="34" />
    <line x1="42" y1="64" x2="37" y2="86" />
    <line x1="58" y1="64" x2="63" y2="86" />`,
};

export function robotGuide(pose: Pose): string {
  return `<svg viewBox="0 0 100 96" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <g fill="none" stroke="${STROKE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      ${bodyShape()}
      ${LIMBS[pose]}
    </g>
  </svg>`;
}
