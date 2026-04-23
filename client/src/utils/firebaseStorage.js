import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

function safeName(name = '') {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadFileToStorage(file, folder, onProgress = null) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${folder}/${stamp}-${safeName(file.name || 'upload')}`;
  const storageRef = ref(storage, path);
  
  const uploadTask = uploadBytesResumable(storageRef, file);
  
  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

export async function uploadManyToStorage(files, folder, onProgress = null) {
  const totalFiles = files.length;
  let completedFiles = 0;
  
  return Promise.all(
    files.map(async (file, index) => {
      const url = await uploadFileToStorage(
        file,
        `${folder}/${index + 1}`,
        (fileProgress) => {
          // Calculate overall progress
          const overallProgress = ((completedFiles + fileProgress / 100) / totalFiles) * 100;
          if (onProgress) onProgress(Math.round(overallProgress));
        }
      );
      completedFiles++;
      return { url, pageNumber: index + 1 };
    })
  );
}