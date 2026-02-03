export const getDirectoryHandle = async (
  options?: DirectoryPickerOptions,
): Promise<FileSystemDirectoryHandle | void> => {
  try {
    return await window.showDirectoryPicker(options);
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return;
    console.error(e);
  }
};
