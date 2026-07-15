const firstNonEmpty = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim()) || '';

const SITE_PREFIXES = [
  'site',
  'plant',
  'usine',
  'factory',
  'headquarters',
  'hq',
  'siege',
  'siège'
];

const normalizeValue = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const looksLikeSite = (value = '') => {
  const normalized = normalizeValue(value);
  return SITE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}-`) || normalized.startsWith(`${prefix} `)
  );
};

export const isSiteValue = (value = '') => looksLikeSite(value);

// Outside Tunisia (schema 'public'), site_dep always holds a real plant name --
// e.g. "Tianjin", "Kunshan" -- with no "Site-" prefix, so the prefix heuristic
// below only applies to the Tunisia/public schema, where site_dep holds
// department names and a handful of legitimate "Site ..." plant values.
const isKnownNonTunisiaSchema = (employee = {}) =>
  Boolean(employee.tenant_schema) && employee.tenant_schema !== 'public';

export const getEmployeeSite = (employee = {}) => {
  const explicitSite = firstNonEmpty(
    employee.site,
    employee.plant,
    employee.plant_name,
    employee.site_name,
    employee.location_site
  );

  if (explicitSite) return explicitSite;

  const sharedValue = firstNonEmpty(employee.site_dep);
  if (!sharedValue) return '';
  if (isKnownNonTunisiaSchema(employee)) return sharedValue;
  return looksLikeSite(sharedValue) ? sharedValue : '';
};

export const getEmployeeDepartment = (employee = {}) => {
  const explicitDepartment = firstNonEmpty(
    employee.department,
    employee.departement,
    employee.department_name
  );

  if (explicitDepartment) return explicitDepartment;

  const sharedValue = firstNonEmpty(employee.site_dep);
  if (!sharedValue) return '';
  if (isKnownNonTunisiaSchema(employee)) return '';
  return looksLikeSite(sharedValue) ? '' : sharedValue;
};

export const getEmployeeRole = (employee = {}) =>
  employee.role || employee.poste || employee.job_title || employee.position || '';

export const getEmployeeGrade = (employee = {}) =>
  employee.grade || employee.niveau || employee.level || employee.rank || '';

export const getEmployeeDisplayName = (employee = {}) =>
  `${employee.prenom || ''} ${employee.nom || ''}`.trim() || employee.name || 'Employee';
