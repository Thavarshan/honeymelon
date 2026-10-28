'use client';

import { Button } from '@honeymelon/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@honeymelon/ui/components/dialog';
import { Github, Menu } from 'lucide-react';
import { useState, type ReactElement } from 'react';

const navigation = [
  { href: '/features/', label: 'Features' },
  { href: '/docs/', label: 'Docs' },
  { href: '/releases/', label: 'Releases' },
  { href: 'https://github.com/Thavarshan/honeymelon/issues', label: 'Support' },
] as const;

/**
 * A slim, translucent global bar in the style of Apple's product pages: brand
 * on the left, a few centred links, one small Download pill. Narrow screens
 * get an accessible sheet with the same links.
 */
export function SiteHeader({
  webAppUrl,
}: {
  /** Present only when Honeymelon Web is deployed. */
  readonly webAppUrl?: string | undefined;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const links = webAppUrl
    ? [...navigation.slice(0, 3), { href: webAppUrl, label: 'Web app (beta)' }]
    : navigation;

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="brand" href="/" aria-label="Honeymelon home">
          <img src="/logo.svg" alt="" width="24" height="24" />
          <span>Honeymelon</span>
        </a>
        <nav className="site-navigation" aria-label="Main navigation">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="site-header__actions">
          <a
            className="icon-link"
            href="https://github.com/Thavarshan/honeymelon"
            aria-label="Honeymelon on GitHub"
          >
            <Github aria-hidden="true" />
          </a>
          <Button asChild size="sm" className="hm-pill hm-pill--small">
            <a href="/download/">Download</a>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="menu-button"
                aria-label="Open menu"
              >
                <Menu aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent className="site-menu" closeLabel="Close menu">
              <DialogTitle className="brand">Honeymelon</DialogTitle>
              <DialogDescription className="sr-only">
                Explore Honeymelon, get help, or download it.
              </DialogDescription>
              <nav aria-label="Mobile navigation">
                {links.map((link) => (
                  <DialogClose key={link.href} asChild>
                    <a href={link.href}>{link.label}</a>
                  </DialogClose>
                ))}
                <DialogClose asChild>
                  <a href="https://github.com/Thavarshan/honeymelon">GitHub</a>
                </DialogClose>
              </nav>
              <Button asChild size="lg" className="hm-pill">
                <a href="/download/">Download</a>
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
