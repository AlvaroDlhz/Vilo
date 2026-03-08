import { EventCallback } from '../../types';
import { SearchSuggestions } from '../SearchSuggestions/SearchSuggestions';

export interface SearchBarOptions {
  placeholder?: string;
  onInput?: EventCallback;
  onFocus?: EventCallback;
  onBlur?: EventCallback;
}

export function SearchBar(options: SearchBarOptions = {}): HTMLDivElement {
  const { placeholder = 'Buscar...', onInput, onFocus, onBlur } = options;

  const container = document.createElement('div');
  container.className = 'navbar-search';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;

  const suggestions = SearchSuggestions({
    onSelect: (text) => {
      input.value = text;
      suggestions.hide();
      if (onInput) {
        input.dispatchEvent(new Event('input'));
      }
    },
  });

  input.addEventListener('input', () => {
    suggestions.update(input.value);
  });

  input.addEventListener('focus', () => {
    if (input.value) {
      suggestions.update(input.value);
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => suggestions.hide(), 150);
  });

  if (onInput) {
    input.addEventListener('input', onInput);
  }
  if (onFocus) {
    input.addEventListener('focus', onFocus);
  }
  if (onBlur) {
    input.addEventListener('blur', onBlur);
  }

  container.appendChild(input);
  container.appendChild(suggestions.getElement());

  return container;
}
