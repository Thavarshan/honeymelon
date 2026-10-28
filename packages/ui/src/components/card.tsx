import * as React from 'react';
import { cn } from 'cn';

/**
 * Render the shared card surface: a bordered, rounded container for a group
 * of related content and actions.
 */
function Card({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="card"
      className={cn(
        'flex flex-col gap-4 rounded-xl border bg-card py-4 text-xs/relaxed text-card-foreground',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Lay out a card's title, description and optional action.
 */
function CardHeader({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'grid auto-rows-min items-start gap-1 px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto]',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Name the card. Wrap a heading element inside when the title is a heading.
 */
function CardTitle({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="card-title"
      className={cn('text-sm font-medium', className)}
      {...props}
    />
  );
}

/**
 * Supporting text beneath a card title.
 */
function CardDescription({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * A control aligned to the end of the card header.
 */
function CardAction({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  );
}

/**
 * The card's main content area.
 */
function CardContent({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="card-content"
      className={cn('px-4', className)}
      {...props}
    />
  );
}

/**
 * Actions or notes at the end of a card.
 */
function CardFooter({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-4', className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
