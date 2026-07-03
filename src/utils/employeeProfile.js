export const getEmployeeDepartment = (employee = {}) =>
  employee.site_dep || employee.department || employee.departement || employee.department_name || '';

export const getEmployeeRole = (employee = {}) =>
  employee.role || employee.poste || employee.job_title || employee.position || '';

export const getEmployeeGrade = (employee = {}) =>
  employee.grade || employee.niveau || employee.level || employee.rank || '';

export const getEmployeeDisplayName = (employee = {}) =>
  `${employee.prenom || ''} ${employee.nom || ''}`.trim() || employee.name || 'Employee';
