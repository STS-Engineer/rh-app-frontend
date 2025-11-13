import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export const exportToPDF = async (elementId, filename = 'statistiques-rh.pdf') => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Élément non trouvé pour l\'export PDF');
    }

    // Afficher un message de chargement
    const loadingMessage = document.createElement('div');
    loadingMessage.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 20px;
      border-radius: 10px;
      z-index: 10000;
      font-size: 16px;
    `;
    loadingMessage.textContent = '🔄 Génération du PDF en cours...';
    document.body.appendChild(loadingMessage);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Supprimer le message de chargement
    document.body.removeChild(loadingMessage);

    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'export PDF:', error);
    alert('❌ Erreur lors de la génération du PDF: ' + error.message);
    return false;
  }
};

export const exportToExcel = (data, filename = 'statistiques-rh.xlsx') => {
  try {
    // Préparer les données pour Excel
    const workbook = XLSX.utils.book_new();

    // Feuille 1: Statistiques générales
    const generalStats = [
      ['Statistique', 'Valeur'],
      ['Total Employés', data.totalEmployees],
      ['Nouveaux ce mois', data.recentHires],
      ['Masse Salariale Mensuelle', `${data.totalSalary.toLocaleString()} €`],
      ['Salaire Moyen', `${data.averageSalary.toFixed(0)} €`],
      ['Salaire Minimum', `${data.salaryStats.min.toLocaleString()} €`],
      ['Salaire Maximum', `${data.salaryStats.max.toLocaleString()} €`],
      ['Salaire Médian', `${data.salaryStats.median.toLocaleString()} €`],
      ['Contrats à renouveler', data.contractsToRenew]
    ];

    // Feuille 2: Répartition par département
    const departmentData = [
      ['Département', 'Nombre d\'employés', 'Pourcentage']
    ];
    Object.entries(data.byDepartment).forEach(([dept, count]) => {
      const percentage = ((count / data.totalEmployees) * 100).toFixed(1);
      departmentData.push([dept, count, `${percentage}%`]);
    });

    // Feuille 3: Types de contrat
    const contractData = [
      ['Type de Contrat', 'Nombre', 'Pourcentage']
    ];
    Object.entries(data.byContract).forEach(([contract, count]) => {
      const percentage = ((count / data.totalEmployees) * 100).toFixed(1);
      contractData.push([contract, count, `${percentage}%`]);
    });

    // Feuille 4: Dernières embauches
    const recentHiresData = [
      ['Nom', 'Prénom', 'Poste', 'Date d\'embauche', 'Département', 'Type de Contrat', 'Salaire Brut']
    ];
    data.recentHiresList?.forEach(emp => {
      recentHiresData.push([
        emp.nom,
        emp.prenom,
        emp.poste,
        new Date(emp.date_debut).toLocaleDateString('fr-FR'),
        emp.site_dep,
        emp.type_contrat,
        `${parseFloat(emp.salaire_brute).toLocaleString()} €`
      ]);
    });

    // Créer les feuilles
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(generalStats), 'Statistiques Générales');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(departmentData), 'Par Département');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(contractData), 'Types de Contrat');
    if (data.recentHiresList && data.recentHiresList.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(recentHiresData), 'Dernières Embauches');
    }

    // Générer le fichier Excel
    XLSX.writeFile(workbook, filename);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'export Excel:', error);
    alert('❌ Erreur lors de la génération du fichier Excel: ' + error.message);
    return false;
  }
};

export const exportEmployeesToExcel = (employees, filename = 'liste-employes.xlsx') => {
  try {
    const workbook = XLSX.utils.book_new();
    
    const employeeData = [
      ['Matricule', 'Nom', 'Prénom', 'CIN', 'Poste', 'Département', 'Type Contrat', 
       'Date Embauche', 'Salaire Brut', 'Date Naissance', 'Passeport']
    ];

    employees.forEach(emp => {
      employeeData.push([
        emp.matricule,
        emp.nom,
        emp.prenom,
        emp.cin,
        emp.poste,
        emp.site_dep,
        emp.type_contrat,
        new Date(emp.date_debut).toLocaleDateString('fr-FR'),
        `${parseFloat(emp.salaire_brute).toLocaleString()} €`,
        new Date(emp.date_naissance).toLocaleDateString('fr-FR'),
        emp.passeport || 'N/A'
      ]);
    });

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(employeeData), 'Liste Employés');
    XLSX.writeFile(workbook, filename);
    
    return true;
  } catch (error) {
    console.error('Erreur export employés Excel:', error);
    alert('❌ Erreur lors de l\'export des employés: ' + error.message);
    return false;
  }
};