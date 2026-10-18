/** Invalid percent escapes can reach the 404 page; display the original path in that case. */
export function readablePath(path: string) {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}
