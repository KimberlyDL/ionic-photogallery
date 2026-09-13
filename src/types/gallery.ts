export interface GalleryPhoto {
  id: string;
  url: string;
  name: string;
  size: number;
  createdAt: number;
  albumId?: string;
}
