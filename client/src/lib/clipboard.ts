/**
 * Copies text to the clipboard. Uses the Clipboard API where the page may (a secure context
 * with permission), and falls back to a hidden textarea with execCommand('copy') for older
 * browsers and in-app web views. Resolves to whether it worked.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyWithSelection(text);
  }
}

function copyWithSelection(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  // Off screen, and 16px so iOS doesn't zoom while it is briefly focused.
  area.style.cssText = 'position:fixed;top:0;left:-9999px;font-size:16px;opacity:0';
  const focused = document.activeElement;
  document.body.append(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let copied = false;
  try {
    // Deprecated, but still the only fallback where the Clipboard API is missing or blocked.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  area.remove();
  if (focused instanceof HTMLElement) focused.focus();
  return copied;
}
