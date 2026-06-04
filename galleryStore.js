// Utility to store and retrieve photos per user in localStorage

export const galleryStore = {
  getPhotos: (uid) => {
    if (!uid) return [];
    try {
      const key = `vintage_gallery_${uid}`;
      const photosStr = localStorage.getItem(key);
      return photosStr ? JSON.parse(photosStr) : [];
    } catch (e) {
      console.error('Error reading gallery from localStorage', e);
      return [];
    }
  },

  savePhoto: (uid, dataUrl, caption, filter, format) => {
    if (!uid) return null;
    try {
      const key = `vintage_gallery_${uid}`;
      const currentPhotos = galleryStore.getPhotos(uid);
      
      const newPhoto = {
        id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        url: dataUrl, // Compressed JPEG data URL
        caption: caption || '',
        filter: filter || 'Normal',
        format: format || 'polaroid',
        timestamp: new Date().toISOString()
      };

      const updatedPhotos = [newPhoto, ...currentPhotos];
      localStorage.setItem(key, JSON.stringify(updatedPhotos));
      return newPhoto;
    } catch (e) {
      console.error('Error saving photo to localStorage', e);
      alert('Storage is full! Please delete some photos from your gallery to make space.');
      return null;
    }
  },

  deletePhoto: (uid, photoId) => {
    if (!uid || !photoId) return false;
    try {
      const key = `vintage_gallery_${uid}`;
      const currentPhotos = galleryStore.getPhotos(uid);
      const updatedPhotos = currentPhotos.filter(photo => photo.id !== photoId);
      localStorage.setItem(key, JSON.stringify(updatedPhotos));
      return true;
    } catch (e) {
      console.error('Error deleting photo from localStorage', e);
      return false;
    }
  }
};
