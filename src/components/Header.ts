import { createElement } from '../utils';

/**
 * Renders the application header.
 * 
 * @returns The header HTMLElement containing the title and subtitle.
 */
export default function Header(): HTMLElement {
  const header = createElement('header', ['border-b', 'border-gray-200', 'pb-6', 'mb-8']);

  const title = createElement('h1', ['text-3xl', 'font-bold', 'text-gray-900']);
  title.textContent = 'My Todos';

  const subtitle = createElement('p', ['text-gray-500', 'mt-1']);
  subtitle.textContent = 'Stay organized, stay productive.';

  header.appendChild(title);
  header.appendChild(subtitle);

  return header;
}
