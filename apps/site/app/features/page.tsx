import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@honeymelon/ui/components/card';
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import {
  ChevronRight,
  FileMusic,
  FileImage,
  FileVideoCamera,
  FolderOutput,
  Languages,
  ListChecks,
  ShieldCheck,
  SlidersHorizontal,
  SunMoon,
} from 'lucide-react';
import { DownloadCta } from '../../src/components/download-cta';
import { pageMetadata } from '../../src/lib/metadata';

/**
 * Metadata describes the shipped desktop experience, not the planned web app.
 */
export const metadata: Metadata = pageMetadata(
  '/features/',
  'Features and platforms',
  'Explore image, audio and video conversion, desktop screenshots and platform limitations.',
);

const media = [
  {
    id: 'image',
    icon: FileImage,
    title: 'Images',
    lead: 'Common formats, done right.',
    text: 'Work with common image formats, including PNG, JPEG and WebP where supported. Format conversion can affect transparency, metadata and visual quality.',
    image: 'desktop-light',
    alt: 'Honeymelon desktop conversion queue with three completed video files and an MP4 output selector',
    caption: 'A local queue, with progress for each file.',
  },
  {
    id: 'audio',
    icon: FileMusic,
    title: 'Audio',
    lead: 'Convert, or pull the soundtrack out.',
    text: 'Convert audio files or extract an audio track from supported video sources. Codec support and output quality settings are not universal.',
    image: 'output-settings',
    alt: 'Honeymelon desktop output settings for format, codec, quality and destination',
    caption: 'Output controls depend on the installed build.',
  },
  {
    id: 'video',
    icon: FileVideoCamera,
    title: 'Video',
    lead: 'The native engine does the heavy lifting.',
    text: 'Change supported video containers and encoding settings with the native desktop engine. Larger workloads can take time and disk space.',
    image: 'desktop-dark',
    alt: 'Honeymelon desktop conversion queue in dark mode',
    caption: 'Light, dark or system appearance.',
  },
] as const;

const capabilities = [
  [ListChecks, 'Batch queue', 'Add many files and convert them in order.'],
  [
    SlidersHorizontal,
    'Quality controls',
    'Only the settings that apply to your format.',
  ],
  [FolderOutput, 'Your folder', 'Results land where you choose.'],
  [ShieldCheck, 'Originals preserved', 'Existing files are never overwritten.'],
  [SunMoon, 'Light and dark', 'Or follow your system appearance.'],
  [Languages, 'Five languages', 'English, Spanish, French, German, Russian.'],
] as const;

/**
 * A static tour rather than an interactive capability selector: codec
 * availability depends on the actual installed desktop build.
 */
export default function FeaturesPage(): ReactElement {
  return (
    <main id="main-content" className="features-page" tabIndex={-1}>
      <section className="page-hero" aria-labelledby="features-heading">
        <p className="eyebrow">Features</p>
        <h1 id="features-heading">One workflow. Many kinds of media.</h1>
        <p className="page-hero__lead">
          Honeymelon desktop converts files on your own computer. Available
          encoders, formats and advanced settings depend on your platform and
          installed release. Check the output before deleting your original.
        </p>
      </section>

      {media.map((item, index) => (
        <section
          key={item.id}
          className={`media-feature${index % 2 ? ' media-feature--reverse' : ''}`}
          aria-labelledby={`${item.id}-heading`}
        >
          <div className="media-feature__copy reveal">
            <item.icon aria-hidden="true" className="tile-icon" />
            <h2 id={`${item.id}-heading`}>{item.title}</h2>
            <p className="media-feature__lead">{item.lead}</p>
            <p>{item.text}</p>
          </div>
          <figure className="media-feature__shot reveal">
            <img
              src={`/screenshots/${item.image}.webp`}
              width="1000"
              height="1071"
              loading={index === 0 ? undefined : 'lazy'}
              decoding="async"
              alt={item.alt}
            />
            <figcaption>{item.caption}</figcaption>
          </figure>
        </section>
      ))}

      <section className="band band--tint" aria-labelledby="details-heading">
        <div className="section-intro reveal">
          <h2 id="details-heading">The details that matter.</h2>
        </div>
        <div className="capability-grid">
          {capabilities.map(([Icon, title, text]) => (
            <Card key={title} className="bento-tile reveal">
              <CardHeader>
                <Icon aria-hidden="true" className="tile-icon" />
                <CardTitle>
                  <h3>{title}</h3>
                </CardTitle>
                <CardDescription>{text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="band" aria-labelledby="platform-heading">
        <div className="section-intro reveal">
          <h2 id="platform-heading">Desktop or browser?</h2>
          <p>
            Desktop is the available product for local conversion today.
            Honeymelon Web is planned, but there is no live browser converter
            yet. Browser codec coverage and performance may differ from native
            builds.
          </p>
          <div className="cta-row">
            <DownloadCta />
            <a className="chevron-link" href="/docs/">
              Read the getting-started guide <ChevronRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
