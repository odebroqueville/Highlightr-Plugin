/**
 * The stored highlighter colors carry an alpha channel (the transparency is
 * meant for the highlight effect on the page). Color swatches / menu previews
 * should instead show the color at full opacity, so strip the alpha channel.
 */
export function toSolidColor(color: string): string {
  const value = color.trim();
  if (!value) {
    return "transparent";
  }
  const hex8 = value.match(/^#([0-9a-fA-F]{8})$/);
  if (hex8) {
    return `#${hex8[1].slice(0, 6)}`;
  }
  const hex4 = value.match(/^#([0-9a-fA-F]{4})$/);
  if (hex4) {
    return `#${hex4[1].slice(0, 3)}`;
  }
  const func = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*[^)]*)?\)$/i);
  if (func) {
    return `rgb(${func[1]}, ${func[2]}, ${func[3]})`;
  }
  return value;
}
