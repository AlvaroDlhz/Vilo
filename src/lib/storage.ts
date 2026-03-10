import { supabase } from './supabase';

const SUPABASE_URL = 'https://bkfxjmnwhiexvbkwidyi.supabase.co';

export function uploadWithProgress(
  bucket: string,
  path: string,
  file: File | Blob,
  onProgress?: (percent: number) => void
): Promise<{ url: string }> {
  return new Promise(async (resolve, reject) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      reject(new Error('No active session'));
      return;
    }

    const xhr = new XMLHttpRequest();
    const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const publicUrl = getPublicUrl(bucket, path);
        resolve({ url: publicUrl });
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('x-upsert', 'true');

    const contentType = file instanceof File ? file.type : 'application/octet-stream';
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.send(file);
  });
}

export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
