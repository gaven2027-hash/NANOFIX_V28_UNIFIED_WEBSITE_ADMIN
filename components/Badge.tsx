import clsx from 'clsx';

export function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', {
      'bg-blue-50 text-blue-700 ring-1 ring-blue-100': tone === 'blue',
      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100': tone === 'green',
      'bg-amber-50 text-amber-700 ring-1 ring-amber-100': tone === 'amber',
      'bg-red-50 text-red-700 ring-1 ring-red-100': tone === 'red',
      'bg-slate-100 text-slate-700 ring-1 ring-slate-200': tone === 'gray',
      'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100': tone === 'cyan'
    })}>
      {children}
    </span>
  );
}
