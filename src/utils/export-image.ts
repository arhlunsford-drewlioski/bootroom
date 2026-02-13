interface ExportOptions {
  fieldSvg: SVGSVGElement;
  opponent: string;
  matchDate: string;
  formation: string | null;
}

/**
 * Render the lineup to a PNG using native Canvas API.
 * Serialises the live SVG field into an <img>, composites header + field + footer
 * onto an offscreen canvas, then triggers a download.
 */
export async function exportLineupPng({
  fieldSvg,
  opponent,
  matchDate,
  formation,
}: ExportOptions): Promise<void> {
  const SCALE = 2;          // retina
  const W = 600;             // logical width
  const HEADER_H = 52;
  const FIELD_H = 600;
  const FOOTER_H = 32;
  const TOTAL_H = HEADER_H + FIELD_H + FOOTER_H;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = TOTAL_H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // ── Background ──
  ctx.fillStyle = '#0c1421';
  ctx.fillRect(0, 0, W, TOTAL_H);

  // ── Header bar ──
  ctx.fillStyle = '#141e30';
  ctx.fillRect(0, 0, W, HEADER_H);
  ctx.strokeStyle = '#3b4f78';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HEADER_H - 0.5);
  ctx.lineTo(W, HEADER_H - 0.5);
  ctx.stroke();

  // Opponent text (use team accent color)
  const accentRaw = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const accentParts = accentRaw.split(/\s+/);
  const accentHex = accentParts.length === 3
    ? `rgb(${accentParts[0]}, ${accentParts[1]}, ${accentParts[2]})`
    : '#FF2E63';
  ctx.fillStyle = accentHex;
  ctx.font = 'bold 22px "Bebas Neue", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`vs ${opponent}`, 20, HEADER_H / 2);

  // Date + formation on right
  const dateLabel = matchDate
    ? new Date(matchDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      })
    : '';

  ctx.textAlign = 'right';
  if (formation) {
    // Date above, formation below
    ctx.fillStyle = '#8899b0';
    ctx.font = '13px "Inter", system-ui, sans-serif';
    ctx.fillText(dateLabel, W - 20, HEADER_H / 2 - 8);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px "Inter", system-ui, sans-serif';
    ctx.fillText(formation, W - 20, HEADER_H / 2 + 10);
  } else {
    ctx.fillStyle = '#8899b0';
    ctx.font = '13px "Inter", system-ui, sans-serif';
    ctx.fillText(dateLabel, W - 20, HEADER_H / 2);
  }

  // ── Soccer field (SVG → Image → Canvas) ──
  const svgClone = fieldSvg.cloneNode(true) as SVGSVGElement;
  svgClone.removeAttribute('class');
  svgClone.removeAttribute('style');
  svgClone.setAttribute('width', String(W));
  svgClone.setAttribute('height', String(FIELD_H));
  // Remove any pointer-event / touch-action attributes
  svgClone.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
  // Remove cursor classes from <g> elements
  svgClone.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'));
  // Strip <animate> elements (not needed for static export)
  svgClone.querySelectorAll('animate').forEach(el => el.remove());

  const svgString = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await loadImage(svgUrl);
    ctx.drawImage(img, 0, HEADER_H, W, FIELD_H);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }

  // ── Footer ──
  ctx.fillStyle = '#141e30';
  ctx.fillRect(0, HEADER_H + FIELD_H, W, FOOTER_H);
  ctx.strokeStyle = '#3b4f78';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HEADER_H + FIELD_H + 0.5);
  ctx.lineTo(W, HEADER_H + FIELD_H + 0.5);
  ctx.stroke();

  ctx.fillStyle = '#506580';
  ctx.font = '11px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BOOTROOM', W / 2, HEADER_H + FIELD_H + FOOTER_H / 2);

  // ── Download ──
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const safeName = opponent.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  link.download = `lineup-vs-${safeName || 'match'}-${matchDate || 'draft'}.png`;
  link.href = dataUrl;
  link.click();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
