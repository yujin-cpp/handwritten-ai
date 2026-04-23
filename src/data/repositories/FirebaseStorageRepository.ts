import { getDownloadURL, ref, uploadBytes, deleteObject } from "firebase/storage";
import { storage } from "../../firebase/firebaseConfig";
import { IStorageRepository } from "../../domain/repositories/IStorageRepository";

export class FirebaseStorageRepository implements IStorageRepository {
  async uploadFileFromUri(path: string, uri: string): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, blob);
    return getDownloadURL(fileRef);
  }

  async getDownloadUrl(path: string): Promise<string> {
    const fileRef = ref(storage, path);
    return getDownloadURL(fileRef);
  }

  async deleteFile(path: string): Promise<void> {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  }
}

export const storageRepository = new FirebaseStorageRepository();
