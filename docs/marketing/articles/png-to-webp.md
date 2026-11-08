# PNG to WebP: size, transparency and image quality

**Draft for review. Not published.**

**Reader:** someone preparing images for sharing or a website.

PNG is a useful image format, especially for lossless screenshots and
graphics with transparency. WebP may produce a smaller file, but there is
no guaranteed size saving for every image.

The right choice depends on the picture, output settings and intended
destination.

## Decide what matters

- **Transparency:** verify that your alpha channel still looks right.
- **Text and sharp lines:** compare edges and small lettering at 100% zoom.
- **Photos:** inspect gradients, fine detail and compression artifacts.
- **Animation:** check whether your converter handles frames as expected.
- **Size:** compare file sizes, not just the extensions.

Lossy WebP may reduce size with visible changes. Lossless WebP may retain
more image detail but is not automatically smaller than a well-optimized PNG.

## Convert and verify

Keep the source PNG. Use Honeymelon Desktop's image conversion capabilities
to select an output that your installed build supports.

The desktop README lists image quality and transparency controls for the
current React-based beta. Those controls are not necessarily present in
the older stable v2.2.3 user interface.

Try a representative synthetic image, then inspect the resulting WebP in
the software where it will actually be used. Compare dimensions, alpha,
legibility and file size. Repeat with another setting only if it helps.

A browser edition of Honeymelon is being developed, but browser format
support varies with the client engine and must not be assumed equal to
desktop output.

## When not to convert

Keep PNG if it is required by the receiving workflow, if you need exact
pixel preservation, or if WebP gives no meaningful benefit.

For archival originals, preserve the source and make WebP a derived copy.

**Next step:** explore the
[desktop source and releases](https://github.com/Thavarshan/honeymelon).

**Review gate:** test a transparent synthetic PNG and a photo-like PNG
against the selected build and document the observed results.
