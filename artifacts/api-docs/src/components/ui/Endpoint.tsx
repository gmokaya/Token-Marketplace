import { ReactNode } from 'react';
import { CodeBlock } from './CodeBlock';

export const MethodBadge = ({ method }: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE' }) => {
  const colors = {
    GET: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    POST: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    PATCH: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    DELETE: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
  };
  return (
    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${colors[method]}`}>
      {method}
    </span>
  );
};

export const EndpointTitle = ({ id, method, path, summary }: { id: string; method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string; summary: string }) => (
  <div className="mb-6 mt-16 first:mt-0" id={id}>
    <h3 className="text-xl font-semibold mb-2">{summary}</h3>
    <div className="flex items-center gap-3 font-mono text-sm bg-muted/30 px-3 py-2 rounded-md border border-border">
      <MethodBadge method={method} />
      <span className="text-foreground">{path}</span>
    </div>
  </div>
);

export const RoleRequirement = ({ role }: { role: string }) => (
  <div className="mb-6 flex items-start gap-2 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-3 rounded-md">
    <div className="font-semibold uppercase tracking-wider text-[11px] mt-0.5 shrink-0">Requires Role:</div>
    <div>{role}</div>
  </div>
);

export const DataTable = ({ columns, data }: { columns: string[], data: (string|ReactNode)[][] }) => (
  <div className="my-6 w-full overflow-x-auto border border-border rounded-lg bg-card">
    <table className="w-full text-left text-sm">
      <thead className="bg-muted/50 text-muted-foreground border-b border-border">
        <tr>
          {columns.map((col, i) => (
            <th key={i} className="px-4 py-3 font-medium">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {data.map((row, i) => (
          <tr key={i} className="hover:bg-muted/30 transition-colors">
            {row.map((cell, j) => (
              <td key={j} className="px-4 py-3 align-top">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const EndpointSection = ({ children }: { children: ReactNode }) => (
  <section className="mb-16 border-b border-border pb-16 last:border-0 last:pb-0">
    {children}
  </section>
);
