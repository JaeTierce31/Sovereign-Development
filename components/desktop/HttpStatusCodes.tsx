"use client";
import { useMemo, useState } from "react";

interface HttpStatusCodesProps {
  onClose: () => void;
}

interface StatusCode {
  code: number;
  phrase: string;
  desc: string;
  rfcs?: string;
}

const STATUS_CODES: StatusCode[] = [
  // 1xx
  { code: 100, phrase: "Continue",                        desc: "The server received the request headers; the client should proceed to send the body." },
  { code: 101, phrase: "Switching Protocols",             desc: "The server is switching protocols as requested (e.g. HTTP → WebSocket)." },
  { code: 102, phrase: "Processing",                      desc: "The server has received the request and is processing it (WebDAV).", rfcs: "RFC 2518" },
  { code: 103, phrase: "Early Hints",                     desc: "Allows preloading resources while the server prepares the final response.", rfcs: "RFC 8297" },
  // 2xx
  { code: 200, phrase: "OK",                              desc: "Standard success response for GET, POST, PUT, DELETE, etc." },
  { code: 201, phrase: "Created",                         desc: "A new resource was created. Response body typically contains the new resource." },
  { code: 202, phrase: "Accepted",                        desc: "Request accepted for processing but processing is not complete (async ops)." },
  { code: 203, phrase: "Non-Authoritative Information",   desc: "The returned metadata is from a copy, not the origin server." },
  { code: 204, phrase: "No Content",                      desc: "Success but no body to return. Common for DELETE or PATCH operations." },
  { code: 205, phrase: "Reset Content",                   desc: "Request succeeded; client should reset the document view." },
  { code: 206, phrase: "Partial Content",                 desc: "Partial resource returned due to a Range header in the request." },
  { code: 207, phrase: "Multi-Status",                    desc: "Multiple status codes for multiple resources (WebDAV).", rfcs: "RFC 4918" },
  { code: 208, phrase: "Already Reported",                desc: "Members of a WebDAV binding already enumerated.", rfcs: "RFC 5842" },
  { code: 226, phrase: "IM Used",                         desc: "Response is a result of instance-manipulations applied to the resource.", rfcs: "RFC 3229" },
  // 3xx
  { code: 300, phrase: "Multiple Choices",                desc: "Multiple options for the resource; the client may select one." },
  { code: 301, phrase: "Moved Permanently",               desc: "The resource has been permanently moved to the Location URL." },
  { code: 302, phrase: "Found",                           desc: "Temporary redirect; client should use the Location URL for this request only." },
  { code: 303, phrase: "See Other",                       desc: "Response to the request can be found at a different URL using GET." },
  { code: 304, phrase: "Not Modified",                    desc: "Resource has not changed since the If-Modified-Since or If-None-Match date." },
  { code: 305, phrase: "Use Proxy",                       desc: "Deprecated. Requested resource must be accessed through a proxy.", rfcs: "RFC 7231 §6.4.5" },
  { code: 307, phrase: "Temporary Redirect",              desc: "Temporary redirect; method and body must not change (unlike 302)." },
  { code: 308, phrase: "Permanent Redirect",              desc: "Permanent redirect; method and body must not change (unlike 301).", rfcs: "RFC 7538" },
  // 4xx
  { code: 400, phrase: "Bad Request",                     desc: "The server cannot process the request due to malformed syntax or invalid parameters." },
  { code: 401, phrase: "Unauthorized",                    desc: "Authentication is required. Response must include a WWW-Authenticate header." },
  { code: 402, phrase: "Payment Required",                desc: "Reserved for future use. Sometimes used for rate-limiting or paywalls." },
  { code: 403, phrase: "Forbidden",                       desc: "The server understood the request but refuses to authorize it." },
  { code: 404, phrase: "Not Found",                       desc: "The requested resource could not be found on the server." },
  { code: 405, phrase: "Method Not Allowed",              desc: "The HTTP method is not supported for this resource. Must include Allow header." },
  { code: 406, phrase: "Not Acceptable",                  desc: "No content matching the Accept headers in the request can be produced." },
  { code: 407, phrase: "Proxy Authentication Required",   desc: "Client must authenticate with the proxy first." },
  { code: 408, phrase: "Request Timeout",                 desc: "The server timed out waiting for the request." },
  { code: 409, phrase: "Conflict",                        desc: "The request conflicts with the current state of the resource (e.g. duplicate)." },
  { code: 410, phrase: "Gone",                            desc: "The resource has been permanently deleted and will not be available again." },
  { code: 411, phrase: "Length Required",                 desc: "The server requires a Content-Length header." },
  { code: 412, phrase: "Precondition Failed",             desc: "A precondition in the request headers evaluated to false." },
  { code: 413, phrase: "Content Too Large",               desc: "Request payload exceeds the server's size limit." },
  { code: 414, phrase: "URI Too Long",                    desc: "The URI provided was too long for the server to process." },
  { code: 415, phrase: "Unsupported Media Type",          desc: "The payload media type is not supported by the server." },
  { code: 416, phrase: "Range Not Satisfiable",           desc: "The Range header cannot be fulfilled (e.g. beyond end of file)." },
  { code: 417, phrase: "Expectation Failed",              desc: "The server cannot meet the requirements of the Expect request-header field." },
  { code: 418, phrase: "I'm a teapot",                   desc: "The server refuses to brew coffee because it is a teapot.", rfcs: "RFC 2324" },
  { code: 421, phrase: "Misdirected Request",             desc: "Request was directed at a server unable to produce a response." },
  { code: 422, phrase: "Unprocessable Content",           desc: "Request is well-formed but has semantic errors (e.g. validation failure).", rfcs: "RFC 4918" },
  { code: 423, phrase: "Locked",                          desc: "The resource is locked (WebDAV).", rfcs: "RFC 4918" },
  { code: 424, phrase: "Failed Dependency",               desc: "The request failed because it depended on another failed request (WebDAV).", rfcs: "RFC 4918" },
  { code: 425, phrase: "Too Early",                       desc: "The server is unwilling to risk processing a request that might be replayed.", rfcs: "RFC 8470" },
  { code: 426, phrase: "Upgrade Required",                desc: "The client should switch to the protocol given in the Upgrade header." },
  { code: 428, phrase: "Precondition Required",           desc: "The origin server requires the request to be conditional.", rfcs: "RFC 6585" },
  { code: 429, phrase: "Too Many Requests",               desc: "The client has sent too many requests in a given time (rate limiting).", rfcs: "RFC 6585" },
  { code: 431, phrase: "Request Header Fields Too Large", desc: "Header fields are too large for the server to process.", rfcs: "RFC 6585" },
  { code: 451, phrase: "Unavailable For Legal Reasons",   desc: "Access denied for legal reasons (e.g. government censorship).", rfcs: "RFC 7725" },
  // 5xx
  { code: 500, phrase: "Internal Server Error",           desc: "A generic server-side error. Something unexpected happened." },
  { code: 501, phrase: "Not Implemented",                 desc: "The server does not support the functionality required to fulfill the request." },
  { code: 502, phrase: "Bad Gateway",                     desc: "The server acting as a gateway received an invalid response from an upstream server." },
  { code: 503, phrase: "Service Unavailable",             desc: "The server is temporarily unavailable (overloaded or down for maintenance)." },
  { code: 504, phrase: "Gateway Timeout",                 desc: "The gateway did not receive a timely response from an upstream server." },
  { code: 505, phrase: "HTTP Version Not Supported",      desc: "The server does not support the HTTP protocol version used in the request." },
  { code: 506, phrase: "Variant Also Negotiates",         desc: "The server has a configuration error in content negotiation.", rfcs: "RFC 2295" },
  { code: 507, phrase: "Insufficient Storage",            desc: "The server cannot store the representation needed to complete the request (WebDAV).", rfcs: "RFC 4918" },
  { code: 508, phrase: "Loop Detected",                   desc: "The server detected an infinite loop while processing the request (WebDAV).", rfcs: "RFC 5842" },
  { code: 510, phrase: "Not Extended",                    desc: "Further extensions to the request are required for the server to fulfill it.", rfcs: "RFC 2774" },
  { code: 511, phrase: "Network Authentication Required", desc: "The client needs to authenticate to gain network access.", rfcs: "RFC 6585" },
];

const CATEGORIES = [
  { label: "1xx", title: "Informational", color: "text-gray-400",  bg: "bg-gray-700/40",  border: "border-gray-600/30"  },
  { label: "2xx", title: "Success",       color: "text-green-400", bg: "bg-green-900/20", border: "border-green-700/30" },
  { label: "3xx", title: "Redirection",   color: "text-blue-400",  bg: "bg-blue-900/20",  border: "border-blue-700/30"  },
  { label: "4xx", title: "Client Error",  color: "text-yellow-400",bg: "bg-yellow-900/20",border: "border-yellow-700/30"},
  { label: "5xx", title: "Server Error",  color: "text-red-400",   bg: "bg-red-900/20",   border: "border-red-700/30"   },
];

function category(code: number) {
  return CATEGORIES.find((c) => code >= +c.label[0] * 100 && code < (+c.label[0] + 1) * 100) ?? CATEGORIES[0];
}

export default function HttpStatusCodes({ onClose }: HttpStatusCodesProps) {
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState<string | null>(null);
  const [selected, setSelected] = useState<StatusCode | null>(null);
  const [copied, setCopied]     = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return STATUS_CODES.filter((s) => {
      if (filter && !s.code.toString().startsWith(filter[0])) return false;
      if (!q) return true;
      return (
        s.code.toString().includes(q) ||
        s.phrase.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q)
      );
    });
  }, [search, filter]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">HTTP Status Codes</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        {/* Controls */}
        <div className="px-4 py-2.5 border-b border-gray-700 shrink-0 flex flex-wrap items-center gap-2">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, phrase, or description…"
            className="flex-1 min-w-40 bg-gray-800 border border-gray-600 rounded px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-600"
            spellCheck={false}
          />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter(null)}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${filter === null ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-500 hover:bg-gray-700"}`}
            >All</button>
            {CATEGORIES.map((c) => (
              <button
                key={c.label}
                onClick={() => setFilter(filter === c.label ? null : c.label)}
                className={`text-[10px] px-2 py-1 rounded transition-colors font-mono ${filter === c.label ? `${c.bg} ${c.color} border ${c.border}` : "bg-gray-800 text-gray-500 hover:bg-gray-700"}`}
              >{c.label}</button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* List */}
          <div className="flex-1 overflow-auto">
            {filtered.length === 0 ? (
              <div className="text-[11px] text-gray-600 text-center py-10">No status codes match</div>
            ) : (
              <div className="divide-y divide-gray-800/60">
                {filtered.map((s) => {
                  const cat = category(s.code);
                  const isSelected = selected?.code === s.code;
                  return (
                    <button
                      key={s.code}
                      onClick={() => setSelected(isSelected ? null : s)}
                      className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${isSelected ? "bg-gray-800/70" : "hover:bg-gray-800/40"}`}
                    >
                      <span className={`text-sm font-bold font-mono shrink-0 w-10 ${cat.color}`}>{s.code}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-300 font-medium truncate">{s.phrase}</div>
                        {isSelected && (
                          <div className="text-[11px] text-gray-500 mt-1 leading-relaxed">{s.desc}</div>
                        )}
                        {isSelected && s.rfcs && (
                          <div className="text-[10px] text-blue-500 mt-1">{s.rfcs}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => copy(String(s.code), `code-${s.code}`)}
                          className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${copied === `code-${s.code}` ? "bg-green-700 text-white" : "bg-gray-700/60 text-gray-500 hover:bg-gray-700"}`}
                        >
                          {copied === `code-${s.code}` ? "✓" : s.code}
                        </button>
                        <button
                          onClick={() => copy(`${s.code} ${s.phrase}`, `phrase-${s.code}`)}
                          className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${copied === `phrase-${s.code}` ? "bg-green-700 text-white" : "bg-gray-700/60 text-gray-500 hover:bg-gray-700"}`}
                        >
                          {copied === `phrase-${s.code}` ? "✓" : "copy"}
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-700 shrink-0 flex items-center gap-3">
          {CATEGORIES.map((c) => (
            <span key={c.label} className={`text-[10px] font-mono ${c.color}`}>
              {c.label} <span className="text-gray-600">{c.title}</span>
            </span>
          ))}
          <span className="ml-auto text-[10px] text-gray-600">{filtered.length} codes</span>
        </div>
      </div>
    </div>
  );
}
