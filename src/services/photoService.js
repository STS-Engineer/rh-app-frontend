// services/photoService.js
import api from './api';

export const photoService = {
  // Uploader une photo d'employé
  uploadEmployeePhoto: async (file) => {
    const formData = new FormData();
    formData.append('photo', file);

    try {
      console.log('📤 Upload photo employé en cours...');
      
      const response = await api.post('/employees/upload-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Photo uploadée:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Erreur upload photo:', error);
      throw error;
    }
  },

  // Générer avatar par défaut
  generateDefaultAvatar: (nom, prenom) => {
    const initiales = (prenom?.charAt(0) + nom?.charAt(0)).toUpperCase();
    const colors = [
      'FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7',
      'DDA0DD', '98D8C8', 'F7DC6F', 'BB8FCE', '85C1E9'
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return `https://ui-avatars.com/api/?name=${initiales}&background=${color}&color=fff&size=150`;
  }
};
