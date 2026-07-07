const AVATAR_THEMES = [
  { start: '#4f46e5', end: '#2563eb', glow: '#ffffff2a', glowSoft: '#ffffff18' },
  { start: '#0f766e', end: '#14b8a6', glow: '#ffffff26', glowSoft: '#ffffff14' },
  { start: '#ea580c', end: '#f59e0b', glow: '#ffffff26', glowSoft: '#ffffff14' },
  { start: '#9333ea', end: '#ec4899', glow: '#ffffff26', glowSoft: '#ffffff14' },
  { start: '#1d4ed8', end: '#0ea5e9', glow: '#ffffff22', glowSoft: '#ffffff12' },
  { start: '#be123c', end: '#f43f5e', glow: '#ffffff24', glowSoft: '#ffffff14' }
];

const TUNISIA_HINTS = ['tunisia', 'schema_tn', 'public', 'sts', 'sceet', 'same service', 'same-service'];

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;');

const hashString = (value = '') =>
  Array.from(String(value)).reduce((accumulator, character) => {
    const next = (accumulator << 5) - accumulator + character.charCodeAt(0);
    return next | 0;
  }, 0);

const toTitleCase = (value) =>
  String(value || '')
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part) => (part && !/^[\s-]+$/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join('');

export const formatEmployeeNom = (nom) => String(nom || '').trim().toUpperCase();
export const formatEmployeePrenom = (prenom) => toTitleCase(String(prenom || '').trim());

export const getEmployeeDisplayName = (employee = {}) => {
  const prenom = formatEmployeePrenom(employee.prenom || '');
  const nom = formatEmployeeNom(employee.nom || '');
  return (
    `${prenom} ${nom}`.trim() ||
    employee.name ||
    employee.adresse_mail ||
    'Employee'
  );
};

export const getEmployeeInitials = (employee = {}) => {
  const parts = getEmployeeDisplayName(employee)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return 'HR';
  }

  return parts.map((part) => part.charAt(0)).join('').toUpperCase();
};

export const isTunisiaEmployeeRecord = (employee = {}) => {
  const tenantText = [
    employee.country,
    employee.plant,
    employee.tenant_schema,
    employee.tenant_id
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return TUNISIA_HINTS.some((hint) => tenantText.includes(hint));
};

export const createGeneratedEmployeeAvatar = (employee = {}) => {
  const seed = [
    employee.tenant_schema,
    employee.matricule,
    employee.adresse_mail,
    getEmployeeDisplayName(employee)
  ]
    .filter(Boolean)
    .join('|');

  const theme = AVATAR_THEMES[Math.abs(hashString(seed)) % AVATAR_THEMES.length];
  const initials = escapeXml(getEmployeeInitials(employee));

  const svg = `
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="avatarGradient" x1="16" y1="12" x2="144" y2="148" gradientUnits="userSpaceOnUse">
          <stop stop-color="${theme.start}" />
          <stop offset="1" stop-color="${theme.end}" />
        </linearGradient>
        <clipPath id="avatarClip">
          <rect width="160" height="160" rx="32" fill="white" />
        </clipPath>
      </defs>
      <g clip-path="url(#avatarClip)">
        <rect width="160" height="160" fill="url(#avatarGradient)" />
        <circle cx="128" cy="28" r="30" fill="${theme.glow}" />
        <circle cx="18" cy="136" r="44" fill="${theme.glowSoft}" />
        <path d="M24 22C24 13.1634 31.1634 6 40 6H120C128.837 6 136 13.1634 136 22V138C136 146.837 128.837 154 120 154H40C31.1634 154 24 146.837 24 138V22Z" fill="white" fill-opacity="0.08" />
        <circle cx="80" cy="58" r="20" fill="white" fill-opacity="0.18" />
        <path d="M40 142C46 115.333 59.333 102 80 102C100.667 102 114 115.333 120 142" fill="white" fill-opacity="0.16" />
        <text x="80" y="98" text-anchor="middle" fill="white" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="800" letter-spacing="1.5">
          ${initials}
        </text>
      </g>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const getEmployeeAvatarFallback = (employee = {}) =>
  isTunisiaEmployeeRecord(employee) ? '/default-avatar.png' : createGeneratedEmployeeAvatar(employee);

export const getEmployeeAvatarSrc = (employee = {}) => employee.photo || getEmployeeAvatarFallback(employee);
