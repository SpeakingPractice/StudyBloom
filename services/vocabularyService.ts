import { CustomFolder } from '../types';

const STORAGE_KEY = 'mario_vocab_folders';

export const VocabularyService = {
  getFolders: (): CustomFolder[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveFolders: (folders: CustomFolder[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  },

  addFolder: (folder: CustomFolder) => {
    const folders = VocabularyService.getFolders();
    folders.push(folder);
    VocabularyService.saveFolders(folders);
  },

  updateFolder: (updatedFolder: CustomFolder) => {
    const folders = VocabularyService.getFolders();
    const index = folders.findIndex(f => f.id === updatedFolder.id);
    if (index !== -1) {
      folders[index] = updatedFolder;
      VocabularyService.saveFolders(folders);
    }
  },

  deleteFolder: (folderId: string) => {
    const folders = VocabularyService.getFolders().filter(f => f.id !== folderId);
    VocabularyService.saveFolders(folders);
  }
};
