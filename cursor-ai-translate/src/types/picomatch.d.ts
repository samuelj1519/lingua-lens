declare module 'picomatch' {
  function picomatch(globs: string | string[], options?: { dot?: boolean }): (path: string) => boolean;
  export default picomatch;
}
