'use client';

type Person = Record<string, unknown>;

type Props = {
  people: Person[];
  roleOptions: string[];
  allowedViewRoles: string[];
  allowedUseRoles: string[];
  allowedViewActorIds: string[];
  deniedViewActorIds: string[];
  allowedUseActorIds: string[];
  deniedUseActorIds: string[];
  onAllowedViewRolesChange: (value: string[]) => void;
  onAllowedUseRolesChange: (value: string[]) => void;
  onAllowedViewActorIdsChange: (value: string[]) => void;
  onDeniedViewActorIdsChange: (value: string[]) => void;
  onAllowedUseActorIdsChange: (value: string[]) => void;
  onDeniedUseActorIdsChange: (value: string[]) => void;
};

const roleLabels: Record<string, string> = {
  super_admin: 'Total Admin Options / 总管理选项',
  content_admin: 'Management Options / 管理选项',
  engineer: 'Inspection & Repair Options / 检修选项',
  operations_admin: 'Operations Options / 运营选项',
  finance: 'Finance Options / 财务选项',
  support: 'Management Support Options / 管理协助选项'
};
const roleOrder = ['super_admin', 'content_admin', 'engineer', 'operations_admin', 'finance', 'support'];
const labelClass = 'mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
function unique(values: string[]) { return Array.from(new Set(values.filter(Boolean))); }
function toggle(values: string[], value: string) { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }
function orderedRoles(roles: string[]) { return unique([...roleOrder.filter((role) => roles.includes(role)), ...roles]); }
function idOf(person: Person) { return String(person.actor_id || person.auth_user_id || ''); }
function labelOf(person: Person) { return String(person.label || person.display_name || person.email || person.full_name || idOf(person) || 'Unnamed'); }
function grouped(people: Person[], roles: string[]) { return orderedRoles(roles).map((role) => ({ role, people: people.filter((person) => person.role === role) })).filter((group) => group.people.length); }
function RoleBox({ title, roles, selected, onChange }: { title: string; roles: string[]; selected: string[]; onChange: (value: string[]) => void }) { return <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><span className={labelClass}>{title}</span><div className="grid gap-2 md:grid-cols-2">{orderedRoles(roles).map((role) => <label key={role} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-100"><input type="checkbox" checked={selected.includes(role)} onChange={() => onChange(toggle(selected, role))} />{roleLabels[role] || role}</label>)}</div></div>; }
function PeopleBox({ title, people, roles, selected, onChange, tone }: { title: string; people: Person[]; roles: string[]; selected: string[]; onChange: (value: string[]) => void; tone: 'green' | 'blue' | 'red' | 'amber' }) {
  const toneClass = tone === 'green' ? 'bg-emerald-50 ring-emerald-100' : tone === 'blue' ? 'bg-blue-50 ring-blue-100' : tone === 'red' ? 'bg-red-50 ring-red-100' : 'bg-amber-50 ring-amber-100';
  const groups = grouped(people, roles);
  return <div className={`rounded-2xl p-3 ring-1 ${toneClass}`}><span className={labelClass}>{title}</span><div className="space-y-3">{groups.map((group) => { const ids = group.people.map(idOf).filter(Boolean); const all = ids.length > 0 && ids.every((id) => selected.includes(id)); return <div key={group.role} className="rounded-2xl bg-white p-3 ring-1 ring-slate-100"><div className="mb-2 flex items-center justify-between gap-2"><div className="text-xs font-black text-slate-900">{roleLabels[group.role] || group.role}</div><button type="button" onClick={() => onChange(all ? selected.filter((id) => !ids.includes(id)) : unique([...selected, ...ids]))} className="rounded-xl bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">{all ? 'Clear / 清空' : 'Select / 全选'}</button></div><div className="grid gap-2 md:grid-cols-2">{group.people.map((person) => { const id = idOf(person); return <label key={id} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-100"><input type="checkbox" checked={selected.includes(id)} onChange={() => onChange(toggle(selected, id))} /><span><span className="block font-black text-slate-900">{labelOf(person)}</span><span className="block text-[11px] text-slate-500">{String(person.email || '—')} · {id.slice(0, 8)}...</span></span></label>; })}</div></div>; })}{!groups.length ? <div className="rounded-xl bg-white p-3 text-xs font-bold text-slate-500 ring-1 ring-slate-100">No approved active staff found. / 暂无已审核启用人员。</div> : null}</div></div>;
}
export function FieldMediaAccessControlPanel(props: Props) { return <div className="space-y-4 rounded-3xl bg-white p-4 ring-1 ring-slate-200"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Access Control / 素材权限控制</div><p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Staff options are synchronised from approved active backend users. Tick exact people and groups who can view or use this media. Search only returns media authorised for the logged-in admin. / 人员选项从已审核启用的后台用户同步；可按分组或逐人勾选查看/使用权限。搜索只返回当前登录管理员已授权的素材。</p></div><div className="grid gap-3 md:grid-cols-2"><RoleBox title="Role View Permission / 分组查看权限" roles={props.roleOptions} selected={props.allowedViewRoles} onChange={props.onAllowedViewRolesChange} /><RoleBox title="Role Use Permission / 分组使用权限" roles={props.roleOptions} selected={props.allowedUseRoles} onChange={props.onAllowedUseRolesChange} /></div><div className="grid gap-3 xl:grid-cols-2"><PeopleBox title="Allowed View People / 允许查看人员" people={props.people} roles={props.roleOptions} selected={props.allowedViewActorIds} onChange={props.onAllowedViewActorIdsChange} tone="green" /><PeopleBox title="Denied View People / 禁止查看人员" people={props.people} roles={props.roleOptions} selected={props.deniedViewActorIds} onChange={props.onDeniedViewActorIdsChange} tone="red" /><PeopleBox title="Allowed Use People / 允许使用人员" people={props.people} roles={props.roleOptions} selected={props.allowedUseActorIds} onChange={props.onAllowedUseActorIdsChange} tone="blue" /><PeopleBox title="Denied Use People / 禁止使用人员" people={props.people} roles={props.roleOptions} selected={props.deniedUseActorIds} onChange={props.onDeniedUseActorIdsChange} tone="amber" /></div></div>; }
