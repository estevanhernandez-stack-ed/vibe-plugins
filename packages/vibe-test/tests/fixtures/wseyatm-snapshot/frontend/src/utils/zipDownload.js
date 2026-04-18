// Deliberately uncovered utility — wraps badge list into a zip for download.

/**
 * @param {Array<{id:string; imageUrl:string}>} badges
 * @returns {Promise<Blob>}
 */
export async function downloadAsZip(badges) {
  // Real impl uses jszip + saveAs; fixture just simulates the contract.
  const blob = new Blob([JSON.stringify(badges, null, 2)], { type: 'application/zip' });
  if (typeof window !== 'undefined' && window.URL?.createObjectURL) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'badges.zip';
    a.click();
    window.URL.revokeObjectURL(url);
  }
  return blob;
}
