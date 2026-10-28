import { Badge } from '@honeymelon/ui/components/badge';
import { Button } from '@honeymelon/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@honeymelon/ui/components/card';
import {
  AppWindow,
  ChevronDown,
  ChevronRight,
  Command,
  Gauge,
  Languages,
  Layers,
  ListChecks,
  SlidersHorizontal,
  SquareTerminal,
  SunMoon,
} from 'lucide-react';
import type { ReactElement } from 'react';
import type { Metadata } from 'next';
import { DownloadCta } from '../src/components/download-cta';
import { pageMetadata } from '../src/lib/metadata';

/** Describe today's desktop product, independently of the visual reference. */
export const metadata: Metadata = pageMetadata(
  '/',
  'Local media converter',
  'Convert video, audio and images locally with Honeymelon desktop for macOS, Windows and Linux. Explore downloads, guides and source code.',
);

const tiles = [
  {
    icon: ListChecks,
    title: 'Batch it.',
    text: 'Add many files at once and let the queue work through them, one by one.',
  },
  {
    icon: Gauge,
    title: 'Follow every file.',
    text: 'Per-file progress, with cancel, clear and retry when you need them.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Your settings.',
    text: 'Pick a format, tune the quality controls that apply, and choose the folder.',
  },
  {
    icon: Languages,
    title: 'Five languages.',
    text: 'English, Spanish, French, German and Russian.',
  },
] as const;

const steps = [
  ['Drop your files.', 'Add video, audio or images. Your originals stay safe.'],
  [
    'Choose your output.',
    'Pick a supported format, adjust the settings, choose a folder.',
  ],
  [
    'Convert locally.',
    'Follow the progress, then find the results in your folder.',
  ],
] as const;

const platforms = [
  {
    icon: Command,
    name: 'Mac',
    detail: 'Apple silicon and Intel',
    href: '/download/#mac',
  },
  {
    icon: AppWindow,
    name: 'Windows',
    detail: 'x64 and ARM64',
    href: '/download/#windows',
  },
  {
    icon: SquareTerminal,
    name: 'Linux',
    detail: '.deb, .rpm and .tar.gz',
    href: '/download/#linux',
  },
] as const;

const faqs = [
  [
    'Is Honeymelon really free?',
    'Yes. Honeymelon is free and open source under the MIT license. There are no subscription fees, license keys or conversion accounts. Bundled media tools have their own license notices.',
  ],
  [
    'Which operating systems are supported?',
    'Published desktop packages are available for macOS, Windows and Linux. Availability varies by release and processor. The download page picks the right package for your computer and lists every other one.',
  ],
  [
    'Does Honeymelon work offline?',
    'Media conversion happens on your computer using bundled tools. An internet connection is needed to download Honeymelon, but your media does not need to be uploaded for conversion.',
  ],
  [
    'What file formats are supported?',
    'Honeymelon works with video, audio and images, including common formats such as MP4, MP3, JPEG and PNG. Available outputs and codecs depend on the platform and release. Not every input can become every output.',
  ],
  [
    'Do you upload my files?',
    'No media upload is required by the desktop conversion workflow. The website hosting provider may process ordinary access logs; read our privacy page for details.',
  ],
  [
    'What should I know about the 3.0 beta?',
    'The 3.0 beta is explicitly unsigned and may trigger operating-system trust warnings. The screenshots on this page show that beta. Stable downloads remain separate; read the release notes and verify published checksums.',
  ],
  [
    'How can I contribute?',
    'Report a reproducible bug, improve documentation, contribute a translation or propose a code change on GitHub. Private media should not be attached to public issue reports.',
  ],
] as const;

/**
 * An Apple-style product page: a big statement, the product, then one idea per
 * section. Fully static HTML; only the download button's label is enhanced.
 */
export default function HomePage(): ReactElement {
  return (
    <main id="main-content" className="home" tabIndex={-1}>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <p className="eyebrow">Honeymelon</p>
          <h1 id="hero-heading">
            Media conversion.
            <br />
            Made simple.
          </h1>
          <p className="hero-lead">
            Convert video, audio and images on your own computer. Free, open
            source and private by design.
          </p>
          <div className="cta-row">
            <DownloadCta />
            <a className="chevron-link" href="#how-it-works">
              See how it works <ChevronRight aria-hidden="true" />
            </a>
          </div>
          <p className="hero-fineprint">
            Free · MIT licensed · macOS, Windows and Linux
          </p>
        </div>
        <figure className="hero-stage">
          <img
            src="/screenshots/desktop-light.webp"
            alt="Honeymelon 3.0 beta desktop media conversion interface"
            width="1000"
            height="1071"
            fetchPriority="high"
          />
          <figcaption>
            Honeymelon 3.0 beta. Stable releases may look different.
          </figcaption>
        </figure>
      </section>

      <section
        className="band band--dark dark"
        aria-labelledby="privacy-heading"
      >
        <div className="band-inner reveal">
          <p className="eyebrow">Private by design</p>
          <h2 id="privacy-heading">
            Your files never leave
            <br />
            your computer.
          </h2>
          <p className="band-lead">
            Conversion runs on your device with bundled media tools. Nothing is
            uploaded, and no account stands between you and your files.
          </p>
          <ul className="statements">
            <li>
              <strong>No uploads.</strong>
              <span>Media is processed locally.</span>
            </li>
            <li>
              <strong>No account.</strong>
              <span>Open it and start converting.</span>
            </li>
            <li>
              <strong>No price.</strong>
              <span>Free and MIT licensed.</span>
            </li>
          </ul>
        </div>
      </section>

      <section
        id="features"
        className="band band--tint"
        aria-labelledby="features-heading"
      >
        <div className="section-intro reveal">
          <h2 id="features-heading">One app. Every kind of media.</h2>
          <p>Video, audio and images share one clear, focused workflow.</p>
        </div>
        <div className="bento">
          <Card className="bento-tile bento-tile--wide reveal">
            <CardHeader>
              <Layers aria-hidden="true" className="tile-icon" />
              <CardTitle>
                <h3>Video, audio and images. One queue.</h3>
              </CardTitle>
              <CardDescription>
                Convert between common formats such as MP4, MP3, JPEG and PNG,
                extract audio from video, or save a frame as an image.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <img
                src="/screenshots/output-settings.webp"
                alt="Honeymelon 3.0 beta format, quality and destination settings"
                width="1000"
                height="1071"
                loading="lazy"
                decoding="async"
              />
            </CardContent>
          </Card>
          {tiles.map(({ icon: Icon, title, text }) => (
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
          <Card className="bento-tile bento-tile--wide bento-tile--dark dark reveal">
            <CardHeader>
              <SunMoon aria-hidden="true" className="tile-icon" />
              <CardTitle>
                <h3>Beautiful in any light.</h3>
              </CardTitle>
              <CardDescription>
                Light, dark or follow your system. A compact utility that feels
                at home all day.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <img
                src="/screenshots/desktop-dark.webp"
                alt="Honeymelon 3.0 beta desktop conversion queue in dark mode"
                width="1000"
                height="1071"
                loading="lazy"
                decoding="async"
              />
            </CardContent>
          </Card>
        </div>
        <p className="section-more">
          <a className="chevron-link" href="/features/">
            Explore all features <ChevronRight aria-hidden="true" />
          </a>
        </p>
      </section>

      <section
        id="how-it-works"
        className="band"
        aria-labelledby="steps-heading"
      >
        <div className="section-intro reveal">
          <h2 id="steps-heading">Three steps. That&apos;s it.</h2>
        </div>
        <ol className="steps">
          {steps.map(([title, text], index) => (
            <li key={title} className="reveal">
              <span className="step-number" aria-hidden="true">
                {index + 1}
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="band band--tint" aria-labelledby="platforms-heading">
        <div className="section-intro reveal">
          <h2 id="platforms-heading">Made for your desktop.</h2>
          <p>
            One download for the computer you use. The right package starts
            automatically.
          </p>
        </div>
        <ul className="platform-links">
          {platforms.map(({ icon: Icon, name, detail, href }) => (
            <li key={name} className="reveal">
              <a href={href}>
                <Icon aria-hidden="true" />
                <strong>{name}</strong>
                <span>{detail}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="section-more">
          <DownloadCta />
        </div>
      </section>

      <section
        id="comparison"
        className="band"
        aria-labelledby="comparison-heading"
      >
        <div className="section-intro reveal">
          <h2 id="comparison-heading">Desktop today. More to come.</h2>
          <p>The same local-first idea, wherever you work.</p>
        </div>
        <div className="compare reveal">
          <div>
            <Badge className="hm-badge">Available</Badge>
            <h3>Honeymelon Desktop</h3>
            <p>
              Video, audio and images, converted locally on macOS, Windows and
              Linux.
            </p>
            <a className="chevron-link" href="/download/">
              Download <ChevronRight aria-hidden="true" />
            </a>
          </div>
          <div>
            <Badge variant="outline" className="hm-badge">
              Planned
            </Badge>
            <h3>Honeymelon Web</h3>
            <p>
              Honeymelon Web is on the roadmap; it is not available yet. Browser
              format support may differ from desktop.
            </p>
          </div>
        </div>
      </section>

      <section
        id="open-source"
        className="band band--tint"
        aria-labelledby="open-source-heading"
      >
        <div className="section-intro reveal">
          <p className="price" aria-hidden="true">
            $0
          </p>
          <h2 id="open-source-heading">Free. Forever.</h2>
          <p>
            No subscriptions, license keys or activation. Read the code, report
            an issue, or make it your own.
          </p>
          <div className="cta-row">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="hm-pill hm-pill--outline"
            >
              <a href="https://github.com/Thavarshan/honeymelon">
                View on GitHub
              </a>
            </Button>
            <a className="chevron-link" href="/license/">
              About the license <ChevronRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section id="faq" className="band" aria-labelledby="faq-heading">
        <div className="section-intro reveal">
          <h2 id="faq-heading">Questions? Answers.</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question} name="honeymelon-faq">
              <summary>
                {question}
                <ChevronDown aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section
        className="band band--dark dark closing"
        aria-labelledby="closing-heading"
      >
        <div className="band-inner reveal">
          <img src="/logo.svg" alt="" width="80" height="80" />
          <h2 id="closing-heading">Get Honeymelon.</h2>
          <p className="band-lead">
            Free for Mac, Windows and Linux. Your files, your computer, your
            control.
          </p>
          <div className="cta-row">
            <DownloadCta className="hm-pill--light" />
            <a className="chevron-link" href="/releases/">
              What&apos;s new <ChevronRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
