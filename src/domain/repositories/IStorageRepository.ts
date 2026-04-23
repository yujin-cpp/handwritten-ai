export interface IStorageRepository {
  uploadFileFromUri(path: string, uri: string): Promise<string>;
  getDownloadUrl(path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
}
