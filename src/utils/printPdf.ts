import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { buildSafePrintFilename, calculatePdfPageLayout } from '../logic/rules.ts';

export interface ExportPdfOptions {
  titleBn: string;
  suffix?: string;
  orientation?: 'portrait' | 'landscape';
  fitSinglePage?: boolean;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  pages?: number;
  error?: string;
}

/**
 * Renders a target DOM element into a high-resolution canvas, handling Tailwind v4 oklch colors
 * and Bengali fonts cleanly without CORS errors.
 */
async function renderElementToHighResCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (_e) {
      // Ignore font ready warnings
    }
  }

  const filterNode = (node: Node): boolean => {
    if (node instanceof HTMLElement) {
      if (node.classList.contains('no-print') || node.dataset.noPrint === 'true') {
        return false;
      }
    }
    return true;
  };

  try {
    return await toCanvas(element, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: false,
      filter: filterNode
    });
  } catch (_firstErr) {
    // Fallback with skipFonts: true in case cross-origin font CSS rules throw SecurityError
    return await toCanvas(element, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      skipFonts: true,
      cacheBust: false,
      filter: filterNode
    });
  }
}

/**
 * Generates and downloads a real A4 PDF (.pdf) directly in the browser.
 * Works 100% reliably inside sandboxed iframes where window.print() may be blocked.
 */
export async function exportElementToPdf(
  element: HTMLElement | null,
  options: ExportPdfOptions
): Promise<ExportResult> {
  const filename = buildSafePrintFilename(
    options.titleBn,
    options.suffix ?? 'ভবন_চার্ট',
    'pdf'
  );

  if (!element) {
    return {
      success: false,
      filename,
      error: 'প্রিন্ট করার জন্য নির্ধারিত অংশটি খুঁজে পাওয়া যায়নি।'
    };
  }

  try {
    const canvas = await renderElementToHighResCanvas(element);
    const orientation = options.orientation ?? 'portrait';
    const fitSinglePage = options.fitSinglePage ?? true;

    const layout = calculatePdfPageLayout(
      canvas.width,
      canvas.height,
      orientation,
      fitSinglePage
    );

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    if (layout.totalPages === 1) {
      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(
        imgData,
        'PNG',
        layout.offsetXMm,
        layout.offsetYMm,
        layout.renderWidthMm,
        layout.renderHeightMm,
        undefined,
        'FAST'
      );
    } else {
      // Multi-page slicing for long reports
      const contentHeightMm = layout.pageHeightMm - layout.marginMm * 2;
      const pxPerMm = canvas.height / layout.renderHeightMm;
      const pageSliceHeightPx = Math.floor(contentHeightMm * pxPerMm);

      for (let pageIndex = 0; pageIndex < layout.totalPages; pageIndex++) {
        if (pageIndex > 0) {
          pdf.addPage('a4', orientation);
        }

        const sourceY = pageIndex * pageSliceHeightPx;
        const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - sourceY);
        if (sliceHeightPx <= 0) break;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            sliceHeightPx,
            0,
            0,
            canvas.width,
            sliceHeightPx
          );
        }

        const sliceImgData = sliceCanvas.toDataURL('image/png', 1.0);
        const sliceHeightMm = sliceHeightPx / pxPerMm;

        pdf.addImage(
          sliceImgData,
          'PNG',
          layout.offsetXMm,
          layout.offsetYMm,
          layout.renderWidthMm,
          sliceHeightMm,
          undefined,
          'FAST'
        );
      }
    }

    pdf.save(filename);

    return {
      success: true,
      filename,
      pages: layout.totalPages
    };
  } catch (err: any) {
    return {
      success: false,
      filename,
      error: err?.message || 'পিডিএফ তৈরিতে ত্রুটি হয়েছে।'
    };
  }
}

/**
 * Generates and downloads a high-resolution PNG sheet (.png) of the target element.
 */
export async function exportElementToPng(
  element: HTMLElement | null,
  titleBn: string,
  suffix: string = 'স্যাম্পল_শিট'
): Promise<ExportResult> {
  const filename = buildSafePrintFilename(titleBn, suffix, 'png');
  if (!element) {
    return {
      success: false,
      filename,
      error: 'ইমেজ তৈরির জন্য নির্ধারিত অংশটি খুঁজে পাওয়া যায়নি।'
    };
  }

  try {
    const canvas = await renderElementToHighResCanvas(element);
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return {
      success: true,
      filename,
      pages: 1
    };
  } catch (err: any) {
    return {
      success: false,
      filename,
      error: err?.message || 'ইমেজ সংরক্ষণে ত্রুটি হয়েছে।'
    };
  }
}

/**
 * Prints the target element using an isolated hidden same-origin iframe so layout containers
 * (overflow-hidden, modals, sidebars) never clip the document, and also triggers PDF download
 * if native print is restricted by an iframe sandbox.
 */
export async function triggerElementPrint(
  element: HTMLElement | null,
  options: ExportPdfOptions
): Promise<ExportResult> {
  if (!element) {
    return {
      success: false,
      filename: buildSafePrintFilename(options.titleBn, options.suffix, 'pdf'),
      error: 'প্রিন্ট করার জন্য নির্ধারিত অংশটি খুঁজে পাওয়া যায়নি।'
    };
  }

  try {
    // Remove any previous print iframe
    const existingFrame = document.getElementById('ssnimch-isolated-print-frame');
    if (existingFrame && existingFrame.parentNode) {
      existingFrame.parentNode.removeChild(existingFrame);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'ssnimch-isolated-print-frame';
    iframe.setAttribute('title', 'Print Document Frame');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    const frameWin = iframe.contentWindow;

    if (!frameDoc || !frameWin) {
      return await exportElementToPdf(element, options);
    }

    // Collect all stylesheets from current document
    const headNodes = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((node) => node.outerHTML)
      .join('\n');

    const pageOrientation = options.orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait';

    frameDoc.open();
    frameDoc.write(`<!doctype html>
<html lang="bn">
  <head>
    <meta charset="UTF-8" />
    <title>${options.titleBn}</title>
    ${headNodes}
    <style>
      @page {
        size: ${pageOrientation};
        margin: 10mm;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        font-family: 'Noto Sans Bengali', 'Nirmala UI', 'Plus Jakarta Sans', sans-serif !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        height: auto !important;
        overflow: visible !important;
      }
      .font-num-clear, .tabular-nums {
        font-family: 'Anek Bangla', 'Plus Jakarta Sans', 'Nirmala UI', sans-serif !important;
        font-weight: 600 !important;
        letter-spacing: 0.03em !important;
      }
      .no-print, [data-no-print="true"] {
        display: none !important;
      }
    </style>
  </head>
  <body>
    <div style="padding: 4px; background: #ffffff;">
      ${element.outerHTML}
    </div>
  </body>
</html>`);
    frameDoc.close();

    // Wait briefly for styles/fonts inside iframe
    await new Promise((resolve) => setTimeout(resolve, 250));

    frameWin.focus();
    frameWin.print();

    return {
      success: true,
      filename: buildSafePrintFilename(options.titleBn, options.suffix, 'pdf'),
      pages: 1
    };
  } catch (_err) {
    // Fallback to direct PDF download if print dialog is blocked
    return await exportElementToPdf(element, options);
  }
}
