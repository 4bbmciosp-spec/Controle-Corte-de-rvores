/**
 * Serviço dedicado para armazenamento e manipulação de fotos das ocorrências.
 * Utiliza IndexedDB com fallback para LocalStorage e Object URLs,
 * garantindo persistência sem inchar o banco relacional principal.
 */

const DB_NAME = 'CBMRS_Photo_Storage_v1';
const STORE_NAME = 'photos';

function openPhotoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storePhotoBlob(photoId: string, base64OrBlob: string): Promise<string> {
  try {
    const db = await openPhotoDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ id: photoId, data: base64OrBlob, createdAt: new Date().toISOString() });
      tx.oncomplete = () => resolve(photoId);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('IndexedDB unavailable, using LocalStorage fallback', e);
    try {
      localStorage.setItem(`cbmrs_photo_${photoId}`, base64OrBlob);
    } catch (storageError) {
      console.error('LocalStorage storage error:', storageError);
    }
    return photoId;
  }
}

export async function getPhotoData(photoId: string): Promise<string | null> {
  try {
    const db = await openPhotoDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(photoId);
      req.onsuccess = () => {
        if (req.result?.data) {
          resolve(req.result.data);
        } else {
          // Fallback to localStorage
          const local = localStorage.getItem(`cbmrs_photo_${photoId}`);
          resolve(local || null);
        }
      };
      req.onerror = () => {
        const local = localStorage.getItem(`cbmrs_photo_${photoId}`);
        resolve(local || null);
      };
    });
  } catch {
    return localStorage.getItem(`cbmrs_photo_${photoId}`) || null;
  }
}

/**
 * Redimensiona e converte arquivo de imagem para Base64 otimizado
 */
export function processUploadedImage(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Carimbo de data/hora operacional no rodapé da imagem
        const now = new Date();
        const dateStr = `CBMRS | ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(10, height - 34, 300, 24);
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(dateStr, 18, height - 18);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
