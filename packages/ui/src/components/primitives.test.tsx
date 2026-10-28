import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import { Button } from './button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './card';
import { Progress } from './progress';

it('renders independently of Electron and preserves native button semantics', () => {
  const html = renderToString(<Button disabled>Convert</Button>);
  expect(html).toContain('disabled');
  expect(html).toContain('Convert');
});

it('renders cards on the server with stable slots for styling', () => {
  const html = renderToString(
    <Card>
      <CardHeader>
        <CardTitle>Honeymelon</CardTitle>
        <CardDescription>Local conversion</CardDescription>
      </CardHeader>
      <CardContent>Body</CardContent>
    </Card>,
  );
  for (const slot of ['card', 'card-header', 'card-title', 'card-content']) {
    expect(html).toContain(`data-slot="${slot}"`);
  }
});

it('exposes actual progress to assistive technology', () => {
  render(<Progress aria-label="Conversion" value={42} />);
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
    '42',
  );
});
