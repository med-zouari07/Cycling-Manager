import { useMemo } from 'react';

export function BarChart({
  data,
  height = 200,
  color = '#2563eb',
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
          <div className="relative w-full flex-1 flex items-end">
            <div
              className="w-full rounded-t-lg transition-all duration-500 group-hover:opacity-80"
              style={{
                height: `${(d.value / max) * 100}%`,
                background: color,
                minHeight: d.value > 0 ? 4 : 0,
              }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold opacity-0 group-hover:opacity-100 transition">
                {d.value}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate w-full text-center">
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LineChart({
  data,
  height = 200,
  color = '#2563eb',
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const { path, points } = useMemo(() => {
    const vals = data.map((d) => d.value);
    const max = Math.max(1, ...vals);
    const min = Math.min(0, ...vals);
    const range = max - min || 1;
    const w = 100;
    const h = 100;
    const pts = data.map((d, i) => ({
      x: data.length === 1 ? w / 2 : (i / (data.length - 1)) * w,
      y: h - ((d.value - min) / range) * h,
    }));
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    return { path, points: pts };
  }, [data]);

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${points.map((p) => `${p.x},${p.y}`).join(' ')} 100,100`}
          fill="url(#lineGrad)"
        />
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.2" fill={color} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="flex justify-between mt-2">
        {data.map((d, i) => (
          <div key={i} className="text-[11px] text-gray-500 dark:text-slate-400">{d.label}</div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({
  data,
  size = 180,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        {data.map((d, i) => {
          const len = (d.value / total) * circ;
          const seg = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth="14"
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
            <span className="text-gray-600 dark:text-slate-300">{d.label}</span>
            <span className="font-semibold ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
