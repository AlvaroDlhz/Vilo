import './RichTextEditor.css';

export interface RichTextEditorInstance {
  getElement(): HTMLElement;
  getHTML(): string;
  getPlainText(): string;
  setContent(html: string): void;
  setDisabled(disabled: boolean): void;
}

export function RichTextEditor(placeholder = 'Describe tu video...'): RichTextEditorInstance {
  const wrapper = document.createElement('div');
  wrapper.className = 'rich-text-wrapper';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'rich-text-toolbar';

  const boldBtn = createToolbarBtn('<b>B</b>', 'Negrita');
  const italicBtn = createToolbarBtn('<i>I</i>', 'Cursiva');
  const listBtn = createToolbarBtn('&#8226;', 'Lista');
  const linkBtn = createToolbarBtn('&#128279;', 'Enlace');

  const sep1 = document.createElement('div');
  sep1.className = 'separator';

  toolbar.append(boldBtn, italicBtn, sep1, listBtn, linkBtn);

  // Editor area
  const editor = document.createElement('div');
  editor.className = 'rich-text-editor';
  editor.contentEditable = 'true';
  editor.setAttribute('data-placeholder', placeholder);

  wrapper.append(toolbar, editor);

  // Toolbar actions
  boldBtn.addEventListener('click', (e) => {
    e.preventDefault();
    document.execCommand('bold');
    editor.focus();
    updateToolbarState();
  });

  italicBtn.addEventListener('click', (e) => {
    e.preventDefault();
    document.execCommand('italic');
    editor.focus();
    updateToolbarState();
  });

  listBtn.addEventListener('click', (e) => {
    e.preventDefault();
    document.execCommand('insertUnorderedList');
    editor.focus();
    updateToolbarState();
  });

  linkBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';

    const url = prompt('URL del enlace:', 'https://');
    if (url) {
      if (selectedText) {
        document.execCommand('createLink', false, url);
      } else {
        const linkHtml = `<a href="${url}" target="_blank">${url}</a>`;
        document.execCommand('insertHTML', false, linkHtml);
      }
    }
    editor.focus();
  });

  // Update toolbar active states
  function updateToolbarState() {
    boldBtn.classList.toggle('active', document.queryCommandState('bold'));
    italicBtn.classList.toggle('active', document.queryCommandState('italic'));
    listBtn.classList.toggle('active', document.queryCommandState('insertUnorderedList'));
  }

  editor.addEventListener('keyup', updateToolbarState);
  editor.addEventListener('mouseup', updateToolbarState);

  // Auto-detection of patterns on input
  let highlightTimeout: ReturnType<typeof setTimeout>;
  editor.addEventListener('input', () => {
    clearTimeout(highlightTimeout);
    highlightTimeout = setTimeout(() => highlightPatterns(), 300);
  });

  function highlightPatterns() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    // Save cursor position
    const range = sel.getRangeAt(0);
    const cursorOffset = getCursorInfo(editor, range);

    // Work on text nodes only — look for patterns not already wrapped
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      // Skip if parent is already a highlight span or a link
      const parent = node.parentElement;
      if (parent && (parent.classList.contains('rt-timestamp') ||
          parent.classList.contains('rt-hashtag') ||
          parent.classList.contains('rt-mention') ||
          parent.tagName === 'A')) {
        continue;
      }
      textNodes.push(node);
    }

    let changed = false;
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      // Match timestamps like 0:00, 1:23, 1:23:45
      // Match hashtags like #word
      // Match mentions like @word
      const pattern = /(\d{1,2}:\d{2}(?::\d{2})?)|(\#[\w\u00C0-\u024F]+)|(\@[\w\u00C0-\u024F]+)/g;
      let match;
      const matches: { start: number; end: number; type: string; text: string }[] = [];

      while ((match = pattern.exec(text)) !== null) {
        let type = 'timestamp';
        if (match[2]) type = 'hashtag';
        else if (match[3]) type = 'mention';
        matches.push({ start: match.index, end: match.index + match[0].length, type, text: match[0] });
      }

      if (matches.length === 0) continue;

      // Build replacement
      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      for (const m of matches) {
        if (m.start > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, m.start)));
        }
        const span = document.createElement('span');
        span.className = `rt-${m.type}`;
        span.textContent = m.text;
        frag.appendChild(span);
        lastIdx = m.end;
      }
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }

      textNode.parentNode?.replaceChild(frag, textNode);
      changed = true;
    }

    // Restore cursor position
    if (changed && cursorOffset !== null) {
      restoreCursor(editor, cursorOffset);
    }
  }

  function getCursorInfo(container: HTMLElement, range: Range): number | null {
    try {
      const preRange = document.createRange();
      preRange.selectNodeContents(container);
      preRange.setEnd(range.endContainer, range.endOffset);
      return preRange.toString().length;
    } catch {
      return null;
    }
  }

  function restoreCursor(container: HTMLElement, offset: number) {
    const sel = window.getSelection();
    if (!sel) return;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let charCount = 0;
    let textNode: Text | null;

    while ((textNode = walker.nextNode() as Text | null)) {
      const nodeLen = textNode.textContent?.length || 0;
      if (charCount + nodeLen >= offset) {
        const range = document.createRange();
        range.setStart(textNode, offset - charCount);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      charCount += nodeLen;
    }
  }

  function createToolbarBtn(html: string, title: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = html;
    btn.title = title;
    return btn;
  }

  return {
    getElement() {
      return wrapper;
    },
    getHTML() {
      return editor.innerHTML;
    },
    getPlainText() {
      return editor.textContent || '';
    },
    setContent(html: string) {
      editor.innerHTML = html;
    },
    setDisabled(disabled: boolean) {
      editor.contentEditable = disabled ? 'false' : 'true';
      toolbar.querySelectorAll('button').forEach(btn => btn.disabled = disabled);
    },
  };
}
