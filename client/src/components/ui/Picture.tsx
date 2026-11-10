import type { ResponsiveImage } from '../../assets/images';
import { cn } from '../../lib/cn';

interface PictureProps {
  image: ResponsiveImage;
  /** Required. Use "" only for purely decorative images. */
  alt: string;
  /** The `sizes` attribute: how wide the image renders at each breakpoint. */
  sizes: string;
  /** Above-the-fold LCP image: eager + high fetch priority. Otherwise lazy. */
  priority?: boolean;
  className?: string;
  imgClassName?: string;
}

/** AVIF → WebP → JPEG with responsive widths and intrinsic size (no layout shift). */
export function Picture({ image, alt, sizes, priority, className, imgClassName }: PictureProps) {
  const srcSet = (format: 'avif' | 'webp' | 'jpg') =>
    image.sources.map((s) => `${s[format]} ${s.width}w`).join(', ');
  const fallback = image.sources.at(-1);

  return (
    <picture className={cn('block', className)}>
      <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet('webp')} sizes={sizes} />
      <img
        src={fallback?.jpg}
        srcSet={srcSet('jpg')}
        sizes={sizes}
        alt={alt}
        width={image.width}
        height={image.height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={cn('block h-auto w-full', imgClassName)}
      />
    </picture>
  );
}
