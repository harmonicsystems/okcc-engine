import { css } from '../config/theme';

// The frame does triple duty (CLAUDE.md): the box a kid colors inside, the
// exact sprite crop when scanned (the corner registration ticks mark it), and
// the manifest path it belongs to. Box dimensions preserve the role's sprite
// aspect within a square envelope, so the printed crop == the in-game bounds.

export interface FrameSpec {
  title: string;
  prompt?: string;
  /** behavior color swatch (0xRRGGBB); omit for no swatch */
  color?: number;
  aspectW: number;
  aspectH: number;
  /** where a scan of this box is saved; omit to hide the path line */
  manifestPath?: string;
  /** the box fits within this square (mm), preserving aspect */
  boxMaxMm?: number;
  /** faint onion-skin guide SVG drawn inside the box */
  guideSvg?: string;
}

export function makeTile(spec: FrameSpec): HTMLElement {
  const max = spec.boxMaxMm ?? 58;
  let bw: number;
  let bh: number;
  if (spec.aspectW >= spec.aspectH) {
    bw = max;
    bh = (max * spec.aspectH) / spec.aspectW;
  } else {
    bh = max;
    bw = (max * spec.aspectW) / spec.aspectH;
  }

  const swatch =
    spec.color !== undefined ? `<span class="swatch" style="background:${css(spec.color)}"></span>` : '';
  const prompt = spec.prompt ? `<p class="tile-prompt">${spec.prompt}</p>` : '';
  const guide = spec.guideSvg ? `<div class="guide">${spec.guideSvg}</div>` : '';
  const path = spec.manifestPath ? `<div class="tile-path">${spec.manifestPath}</div>` : '';

  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.innerHTML = `
    <div class="tile-head">${swatch}<span class="tile-title">${spec.title}</span></div>
    ${prompt}
    <div class="frame" style="width:${bw.toFixed(1)}mm;height:${bh.toFixed(1)}mm;">
      <span class="tick tl"></span><span class="tick tr"></span>
      <span class="tick bl"></span><span class="tick br"></span>
      ${guide}
    </div>
    ${path}
  `;
  return tile;
}
