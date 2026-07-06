// Allow importing CSS files as side-effect modules (used by xterm)
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
