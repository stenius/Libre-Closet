export interface GalleryPhoto {
  id: number | null;
  fileName: string;
  label: string | null;
  isCover: boolean;
}

/** The cover first, then additional photos in the order they were added. */
export function buildOutfitGallery(
  cover: { fileName: string } | null | undefined,
  coverLabel: string | null | undefined,
  extras: { id: number; fileName: string; label?: string | null }[],
): GalleryPhoto[] {
  return [
    ...(cover
      ? [
          {
            id: null,
            fileName: cover.fileName,
            label: coverLabel ?? null,
            isCover: true,
          },
        ]
      : []),
    ...extras.map((photo) => ({
      id: photo.id,
      fileName: photo.fileName,
      label: photo.label ?? null,
      isCover: false,
    })),
  ];
}
