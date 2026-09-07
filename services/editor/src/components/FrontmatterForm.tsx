import type { FrontmatterFields } from '../frontmatter/yamlDoc.js';

export function FrontmatterForm({ fields, typesInUse, onChange, disabled }: { fields: FrontmatterFields; typesInUse: string[]; onChange(next: FrontmatterFields): void; disabled?: boolean }) {
  const set = <K extends keyof FrontmatterFields>(k: K, v: FrontmatterFields[K]) => onChange({ ...fields, [k]: v });
  const types = fields.type && !typesInUse.includes(fields.type) ? [...typesInUse, fields.type] : typesInUse;
  return (
    <section>
      <h3>Frontmatter</h3>
      <label className="row"><span>title</span><input value={fields.title} disabled={disabled} onChange={(e) => set('title', e.target.value)} /></label>
      <label className="row"><span>description</span><input value={fields.description} disabled={disabled} placeholder="One sentence: when should someone open this page?" onChange={(e) => set('description', e.target.value)} /></label>
      <label className="row"><span>type</span>
        <span style={{ display: 'flex', gap: '0.5rem' }}>
          <select value={types.includes(fields.type) ? fields.type : ''} disabled={disabled} onChange={(e) => set('type', e.target.value)}>
            <option value="">(choose)</option>{types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="new type" disabled={disabled} value={types.includes(fields.type) ? '' : fields.type} onChange={(e) => set('type', e.target.value)} />
        </span>
      </label>
      <label className="row"><span>tags</span><input value={fields.tags.join(', ')} disabled={disabled} placeholder="comma, separated" onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))} /></label>
      <label className="row"><span>resource</span><input value={fields.resource} disabled={disabled} placeholder="https://github.com/<owner>/<repo>/blob/<ref>/<path>" onChange={(e) => set('resource', e.target.value)} /></label>
      <label className="row"><span>sidebar_position</span><input type="number" disabled={disabled} value={fields.sidebar_position ?? ''} onChange={(e) => set('sidebar_position', e.target.value === '' ? null : Number(e.target.value))} /></label>
    </section>
  );
}
