import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Rectangle,
} from 'recharts';
import type { HourlyData, NavigableSlot, NavigabilityConfig } from '../types/forecast';

interface WindChartProps {
  hourly: HourlyData[];
  slots: NavigableSlot[];
  navigability: NavigabilityConfig;
  yAxisMax: number;
  currentHour?: number | null;
}

interface ChartEntry {
  label: string;
  hour: number;
  wind: number;
  gustExtra: number;
  dir: number;
  dirText: string;
  navigable: boolean;
}

function TooltipContent({ data }: { data: ChartEntry }) {
  const totalGust = Math.round((data.wind + data.gustExtra) * 10) / 10;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 shadow-lg text-xs">
      <p className="font-medium text-slate-700 dark:text-slate-200">{data.hour}h</p>
      <p className="text-teal-600 dark:text-teal-400">Vent: {data.wind} km/h</p>
      <p className="text-orange-600 dark:text-orange-400">Rafales: {totalGust} km/h</p>
      <p className="text-slate-500 dark:text-slate-400">Direction: {data.dirText}</p>
    </div>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartEntry }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return <TooltipContent data={data} />;
}


function GustBarWithArrow(props: any) {
  const { payload } = props;
  const showArrow = payload && (payload.wind > 0 || payload.gustExtra > 0);

  return (
    <g>
      <Rectangle {...props} />
      {showArrow && (
        <g transform={`translate(${props.x + props.width / 2},${props.y - 8}) rotate(${payload.dir + 180})`}>
          <path
            d="M0,-4.5 L2.5,3 L0,1.5 L-2.5,3 Z"
            fill={payload.navigable ? '#64748b' : '#94a3b8'}
          />
        </g>
      )}
    </g>
  );
}

export function WindChart({ hourly, slots, navigability, yAxisMax, currentHour }: WindChartProps) {
  const chartData = useMemo<ChartEntry[]>(() => hourly.map((h) => {
    const navigable = slots.some((s) => h.hour >= s.start && h.hour < s.end);
    return {
      label: `${h.hour}`,
      hour: h.hour,
      wind: Math.round(h.speed * 10) / 10,
      gustExtra: Math.max(0, Math.round((h.gust - h.speed) * 10) / 10),
      dir: h.dir,
      dirText: h.dirText,
      navigable,
    };
  }), [hourly, slots]);

  // --- Touch tooltip ---
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [touchTooltip, setTouchTooltip] = useState<{ index: number; left: number } | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchDirectionRef = useRef<'horizontal' | 'vertical' | null>(null);
  const barPositionsRef = useRef<{ centerX: number; top: number }[]>([]);
  const rafRef = useRef(0);

  // Cache bar positions from rendered DOM rects
  const cacheBarPositions = useCallback(() => {
    const container = chartContainerRef.current;
    if (!container) return;
    const groups = Array.from(container.querySelectorAll('.recharts-bar-rectangle'));
    const xMap = new Map<number, { centerX: number; top: number }>();
    groups.forEach((g) => {
      const rect = g.querySelector('rect');
      if (!rect) return;
      const bbox = rect.getBoundingClientRect();
      if (bbox.width === 0) return;
      const key = Math.round(bbox.left);
      const existing = xMap.get(key);
      if (!existing || bbox.top < existing.top) {
        xMap.set(key, { centerX: bbox.left + bbox.width / 2, top: bbox.top });
      }
    });
    barPositionsRef.current = Array.from(xMap.values()).sort((a, b) => a.centerX - b.centerX);
  }, []);

  // Find the closest bar index from a viewport X coordinate
  const getBarIndexFromX = useCallback((clientX: number): number | null => {
    const positions = barPositionsRef.current;
    if (positions.length === 0) return null;
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < positions.length; i++) {
      const dist = Math.abs(clientX - positions[i].centerX);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    return closest;
  }, []);

  // Compute tooltip position (clamped to container) and update state
  const updateTooltip = useCallback((index: number) => {
    const bar = barPositionsRef.current[index];
    const container = chartContainerRef.current?.getBoundingClientRect();
    if (!bar || !container) return;
    let left = bar.centerX - container.left;
    const tooltipHalfWidth = 70;
    left = Math.max(tooltipHalfWidth, Math.min(left, container.width - tooltipHalfWidth));
    setTouchTooltip({ index, left });
  }, []);

  // Touch start: cache positions, show tooltip immediately
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    touchDirectionRef.current = null;
    cacheBarPositions();
    const index = getBarIndexFromX(touch.clientX);
    if (index !== null) updateTooltip(index);
  }, [cacheBarPositions, getBarIndexFromX, updateTooltip]);

  // Touch move: non-passive listener for preventDefault (scroll prevention)
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const start = touchStartPosRef.current;
      if (!start) return;

      // Determine direction on first significant movement
      if (!touchDirectionRef.current) {
        const dx = Math.abs(touch.clientX - start.x);
        const dy = Math.abs(touch.clientY - start.y);
        if (dx + dy < 8) return; // Not enough movement yet
        // 30° threshold: tan(30°) ≈ 0.577 → horizontal when dx >= dy * 1.73
        touchDirectionRef.current = dx >= dy * 1.73 ? 'horizontal' : 'vertical';
        if (touchDirectionRef.current === 'vertical') {
          setTouchTooltip(null);
          return;
        }
      }

      if (touchDirectionRef.current === 'horizontal') {
        e.preventDefault();
        const index = getBarIndexFromX(touch.clientX);
        if (index !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(() => updateTooltip(index));
        }
      }
    };

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [getBarIndexFromX, updateTooltip]);

  // Touch end: tooltip stays visible (don't clear)
  const handleTouchEnd = useCallback(() => {
    touchStartPosRef.current = null;
    touchDirectionRef.current = null;
  }, []);

  // Dismiss tooltip on touch outside the chart
  useEffect(() => {
    const handler = (e: TouchEvent) => {
      if (chartContainerRef.current && !chartContainerRef.current.contains(e.target as Node)) {
        setTouchTooltip(null);
      }
    };
    document.addEventListener('touchstart', handler);
    return () => document.removeEventListener('touchstart', handler);
  }, []);

  // Clear tooltip when chart data changes
  useEffect(() => {
    setTouchTooltip(null);
  }, [chartData]);

  return (
    <div
      ref={chartContainerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={chartData} margin={{ top: 18, right: 20, bottom: 6, left: -25 }}>
          <XAxis
            dataKey="label"
            tick={({ x, y, payload }: any) => {
              const hour = Number(payload.value);
              const isNavigable = slots.some((s) => hour >= s.start && hour < s.end);
              const halfBand = payload.offset ?? 15;
              const showLabel = (payload.index ?? 0) % 2 === 0;
              return (
                <g>
                  {isNavigable && (
                    <rect
                      x={x - halfBand}
                      y={y + 1}
                      width={halfBand * 2}
                      height={3}
                      fill="#10b981"
                    />
                  )}
                  {showLabel && (
                    <text
                      x={x}
                      y={y + 15}
                      textAnchor="middle"
                      fill={isNavigable ? '#10b981' : '#9ca3af'}
                      fontWeight={isNavigable ? 700 : 400}
                      fontSize={11}
                    >
                      {payload.value}
                    </text>
                  )}
                </g>
              );
            }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            domain={[0, yAxisMax]}
          />

          {/* Navigable zone background — full height, subtle */}
          {slots.map((slot, i) => (
            <ReferenceArea
              key={`bg-${i}`}
              x1={String(slot.start)}
              x2={String(slot.end - 1)}
              fill="#10b981"
              fillOpacity={0.10}
              stroke="none"
            />
          ))}

          {/* Threshold lines */}
          <ReferenceLine
            y={navigability.windSpeedMin}
            stroke="#10b981"
            strokeDasharray="4 4"
            label={{ value: String(navigability.windSpeedMin), position: 'right', fontSize: 10, fill: '#10b981' }}
          />
          <ReferenceLine
            y={navigability.gustMin}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: String(navigability.gustMin), position: 'right', fontSize: 10, fill: '#f59e0b' }}
          />

          {/* Stacked bars: wind + extra gust (top bar renders arrows) */}
          <Bar dataKey="wind" stackId="wind" fill="#14b8a6" radius={[0, 0, 0, 0]} isAnimationActive={false} />
          <Bar
            dataKey="gustExtra"
            stackId="wind"
            fill="#fb923c"
            fillOpacity={0.5}
            radius={[2, 2, 0, 0]}
            shape={<GustBarWithArrow />}
            isAnimationActive={false}
          />

          {/* Current time marker — isFront renders above bars */}
          {currentHour != null && chartData.some((d) => d.hour === currentHour) && (
            <ReferenceLine
              x={String(currentHour)}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="4 2"
              ifOverflow="extendDomain"
            />
          )}

          <Tooltip
            content={<CustomTooltip />}
            cursor={false}
            wrapperStyle={touchTooltip ? { visibility: 'hidden' } : undefined}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Touch tooltip overlay */}
      {touchTooltip && chartData[touchTooltip.index] && (
        <div
          className="absolute top-0 pointer-events-none z-10"
          style={{ left: `${touchTooltip.left}px`, transform: 'translateX(-50%)' }}
        >
          <TooltipContent data={chartData[touchTooltip.index]} />
        </div>
      )}
    </div>
  );
}
