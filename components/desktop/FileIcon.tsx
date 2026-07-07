export const FILE_ICONS: Record<string, { label: string; className: string }> = {
  ts:   { label: "TS",  className: "text-blue-400" },
  tsx:  { label: "TS",  className: "text-blue-400" },
  js:   { label: "JS",  className: "text-yellow-400" },
  jsx:  { label: "JS",  className: "text-yellow-400" },
  mjs:  { label: "JS",  className: "text-yellow-400" },
  cjs:  { label: "JS",  className: "text-yellow-400" },
  py:   { label: "PY",  className: "text-green-400" },
  json: { label: "{}",  className: "text-orange-400" },
  css:  { label: "CS",  className: "text-purple-400" },
  scss: { label: "SC",  className: "text-pink-400" },
  html: { label: "<>",  className: "text-orange-300" },
  md:   { label: "MD",  className: "text-gray-400" },
  sh:   { label: "SH",  className: "text-gray-400" },
  env:  { label: "EN",  className: "text-yellow-600" },
  svg:  { label: "SV",  className: "text-green-300" },
  toml: { label: "TM",  className: "text-amber-500" },
  yaml: { label: "YA",  className: "text-amber-500" },
  yml:  { label: "YA",  className: "text-amber-500" },
  rs:   { label: "RS",  className: "text-orange-500" },
  go:   { label: "GO",  className: "text-cyan-400" },
  rb:   { label: "RB",  className: "text-red-400" },
  php:  { label: "PH",  className: "text-purple-300" },
  java: { label: "JV",  className: "text-orange-400" },
  c:    { label: "C",   className: "text-blue-300" },
  cpp:  { label: "C+",  className: "text-blue-300" },
  h:    { label: "H",   className: "text-blue-300" },
};

export default function FileIcon({ filename, className: extraClass }: { filename: string; className?: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const icon = FILE_ICONS[ext];
  if (!icon) return <span className={`w-[18px] shrink-0 ${extraClass ?? ""}`} />;
  return (
    <span
      className={`text-[9px] font-bold leading-none w-[18px] shrink-0 text-right ${icon.className} ${extraClass ?? ""}`}
      aria-hidden
    >
      {icon.label}
    </span>
  );
}
