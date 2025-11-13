import React from 'react';
import './EmployeeCard.css';

const EmployeeCard = ({ employee, onClick }) => {
  return (
    <div className="employee-card" onClick={() => onClick(employee)}>
      <div className="card-header">
        <img 
          src={employee.photo || '/default-avatar.png'} 
          alt={`${employee.prenom} ${employee.nom}`}
          className="employee-photo"
        />
        <div className="employee-info">
          <h3 className="employee-name">{employee.prenom} {employee.nom}</h3>
          <p className="employee-cin">{employee.cin}</p>
        </div>
      </div>
      <div className="card-body">
        <p className="employee-poste">{employee.poste}</p>
        <p className="employee-site">{employee.site_dep}</p>
      </div>
    </div>
  );
};

export default EmployeeCard;