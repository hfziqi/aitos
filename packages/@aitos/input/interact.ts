import { Atom, Context, Result } from 'aitos';

export const showFilePickerAtom: Atom = {
  name: 'showFilePicker',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'accept', type: 'string', description: 'File types to accept (e.g. ".jpg,.png")' },
      { name: 'multiple', type: 'boolean', description: 'Allow multiple file selection' }
    ],
    output: { type: 'object', description: 'Selected file(s) or FileList' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { accept?: string; multiple?: boolean }, context: Context): Promise<Result> => {
    return new Promise((resolve) => {
      if (typeof document === 'undefined') {
        resolve({ success: false, error: 'File picker not available' });
        return;
      }

      const inputEl = document.createElement('input');
      inputEl.type = 'file';
      if (input.accept) inputEl.accept = input.accept;
      if (input.multiple) inputEl.multiple = true;

      inputEl.onchange = () => {
        if (inputEl.files && inputEl.files.length > 0) {
          if (input.multiple) {
            resolve({ success: true, data: Array.from(inputEl.files) });
          } else {
            resolve({ success: true, data: inputEl.files[0] });
          }
        } else {
          resolve({ success: false, error: 'No file selected' });
        }
      };

      inputEl.click();
    });
  },
};

export const readFileAtom: Atom = {
  name: 'readFile',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'file', type: 'object', description: 'File object to read' },
      { name: 'encoding', type: 'string', description: 'Encoding type: text, dataURL, arrayBuffer' }
    ],
    output: { type: 'string', description: 'File content' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { file: File; encoding?: string }, context: Context): Promise<Result> => {
    return new Promise((resolve) => {
      if (!input.file) {
        resolve({ success: false, error: 'No file provided' });
        return;
      }

      const reader = new FileReader();
      const encoding = input.encoding || 'text';

      reader.onload = () => {
        resolve({ success: true, data: reader.result });
      };

      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read file' });
      };

      switch (encoding) {
        case 'dataURL':
          reader.readAsDataURL(input.file);
          break;
        case 'arrayBuffer':
          reader.readAsArrayBuffer(input.file);
          break;
        default:
          reader.readAsText(input.file);
      }
    });
  },
};
