import type { Problem } from '@platform/okf-core';
export function ProblemList({ problems, title }: { problems: Problem[]; title: string }) {
  if (!problems.length) return null;
  return <div className="problems" role="alert"><strong>{title}</strong><ul>{problems.map((p, i) => <li key={i}><code>{p.file}</code> [{p.rule}] {p.message}</li>)}</ul></div>;
}
