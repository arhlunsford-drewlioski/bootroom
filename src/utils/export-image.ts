import { toPng } from 'html-to-image';

interface ExportOptions {
  fieldSvg: SVGSVGElement;
  opponent: string;
  matchDate: string;
  formation: string | null;
}

export async function exportLineupPng({
  fieldSvg,
  opponent,
  matchDate,
  formation,
}: ExportOptions): Promise<void> {
  // Format date for header
  const dateLabel = matchDate
    ? new Date(matchDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  // Build offscreen composite container
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    left: '-9999px',
    top: '0',
    width: '600px',
    background: '#0c1421',
    fontFamily: '"Bebas Neue", system-ui, sans-serif',
  });

  // Header bar
  const header = document.createElement('div');
  Object.assign(header.style, {
    background: '#141e30',
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #3b4f78',
  });

  const opponentEl = document.createElement('div');
  Object.assign(opponentEl.style, {
    color: '#FF2E63',
    fontSize: '22px',
    fontWeight: 'bold',
    fontFamily: '"Bebas Neue", system-ui, sans-serif',
    letterSpacing: '0.05em',
  });
  opponentEl.textContent = `vs ${opponent}`;

  const metaEl = document.createElement('div');
  Object.assign(metaEl.style, {
    color: '#8899b0',
    fontSize: '13px',
    fontFamily: '"Inter", system-ui, sans-serif',
    textAlign: 'right',
    lineHeight: '1.4',
  });
  metaEl.innerHTML = dateLabel + (formation ? `<br/><span style="color:#e2e8f0;font-weight:600">${formation}</span>` : '');

  header.appendChild(opponentEl);
  header.appendChild(metaEl);
  container.appendChild(header);

  // Clone SVG and set explicit dimensions
  const svgClone = fieldSvg.cloneNode(true) as SVGSVGElement;
  svgClone.removeAttribute('class');
  svgClone.style.width = '600px';
  svgClone.style.height = '600px';
  svgClone.style.display = 'block';
  svgClone.style.borderRadius = '0';

  container.appendChild(svgClone);

  // Watermark footer
  const footer = document.createElement('div');
  Object.assign(footer.style, {
    background: '#141e30',
    padding: '8px 20px',
    textAlign: 'center',
    color: '#506580',
    fontSize: '11px',
    fontFamily: '"Inter", system-ui, sans-serif',
    letterSpacing: '0.03em',
    borderTop: '1px solid #3b4f78',
  });
  footer.textContent = 'BOOTROOM';
  container.appendChild(footer);

  document.body.appendChild(container);

  try {
    await document.fonts.ready;
    const dataUrl = await toPng(container, { pixelRatio: 2, quality: 1.0 });

    const link = document.createElement('a');
    const safeName = opponent.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    link.download = `lineup-vs-${safeName}-${matchDate}.png`;
    link.href = dataUrl;
    link.click();
  } finally {
    document.body.removeChild(container);
  }
}
