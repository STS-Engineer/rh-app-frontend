import React from 'react';
import './EmployeeCard.css';
import {
  getEmployeeAvatarFallback,
  getEmployeeAvatarSrc,
  getEmployeeDisplayName
} from '../utils/employeeAvatar';
import {
  getEmployeeDepartment,
  getEmployeeGrade,
  getEmployeeRole
} from '../utils/employeeProfile';

const EmployeeCard = ({ employee, onClick }) => {
  const employeeName = getEmployeeDisplayName(employee);
  const avatarFallback = getEmployeeAvatarFallback(employee);
  const employeeRole = getEmployeeRole(employee);
  const employeeGrade = getEmployeeGrade(employee);
  const employeeDepartment = getEmployeeDepartment(employee);

  return (
    <div className="employee-card" onClick={() => onClick(employee)}>
      <div className="team-card-header">
        <img 
          src={getEmployeeAvatarSrc(employee)}
          alt={employeeName}
          className="employee-photo"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = avatarFallback;
          }}
        />
        <div className="team-employee-info">
          <h3
            className="team-employee-name"
          >
            {employeeName}
          </h3>
          
        </div>
      </div>
      <div className="card-body">
        {employeeRole && <p className="employee-role">{employeeRole}</p>}
        {employeeGrade && <p className="employee-grade">{employeeGrade}</p>}
        {employeeDepartment && <p className="employee-site">{employeeDepartment}</p>}
      </div>
    </div>
  );
};

export default EmployeeCard;
