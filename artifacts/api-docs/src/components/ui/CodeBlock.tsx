export function CodeBlock({ code }: { code: any }) {
  const jsonStr = typeof code === 'string' ? code : JSON.stringify(code, null, 2);
  
  const highlightJson = (str: string) => {
    return str.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'text-amber-400'; // string
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-slate-200'; // key
          }
        } else if (/true|false|null/.test(match)) {
          cls = 'text-violet-400'; // boolean/null
        } else {
          cls = 'text-cyan-400'; // number
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  };

  const html = highlightJson(jsonStr);

  return (
    <div className="rounded-lg bg-[#111113] border border-border overflow-hidden my-4">
      <div className="flex items-center px-4 py-2 border-b border-border/50 bg-[#161618]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
        </div>
        <div className="ml-4 text-xs font-mono text-muted-foreground">JSON</div>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
