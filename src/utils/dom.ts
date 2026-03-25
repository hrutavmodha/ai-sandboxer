/**
 * Creates an HTML element with the specified tag, classes, and attributes.
 * 
 * @param tag - The HTML tag name (e.g., 'div', 'button', 'span').
 * @param classes - An optional array of CSS classes to apply to the element.
 * @param attributes - An optional object containing attribute key-value pairs.
 * @returns The created HTMLElement of the specified type.
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classes?: string[],
  attributes?: Record<string, string>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  if (classes && classes.length > 0) {
    el.className = classes.join(' ');
  }

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
  }

  return el;
}
