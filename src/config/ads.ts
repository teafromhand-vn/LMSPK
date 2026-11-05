export type AdPlacement = 'home-top' | 'side-left' | 'side-right';
export interface BannerAd {
  enabled: boolean;
  /** Relative to public/, for example ads/banner.webp. */
  image: string;
  alt: string;
  /** Full HTTPS destination URL. Leave empty for an image without a link. */
  href: string;
}

/** Show available placements while setting up banners. Set false before publishing. */
export const showAdPlaceholders = true;

export const ads: Record<AdPlacement, BannerAd> = {
  'home-top': { enabled: true, image: '', alt: '', href: '' },
  'side-left': { enabled: true, image: '', alt: '', href: '' },
  'side-right': { enabled: true, image: '', alt: '', href: '' },
};
