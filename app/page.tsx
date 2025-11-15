"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

type Row = {
  id: string;
  name: string;
  unit: string;
  baseQuantity: number;
  morningDelta: number;
  nightDelta: number;
  quantity: number;
};

type Snapshot = {
  phase: 'pre-morning' | 'morning' | 'night';
  asOfIso: string;
  nextUpdateIso: string;
  lastUpdateIso: string | null;
  items: Row[];
  totals: { totalUnits: number; itemCount: number };
};

type StreamMessage =
  | { type: 'snapshot' | 'tick'; snapshot: Snapshot; secondsUntilNext: number };

function formatCountdown(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function Page() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [secondsUntilNext, setSecondsUntilNext] = useState<number>(0);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/stream');
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as StreamMessage;
        setSnapshot(data.snapshot);
        setSecondsUntilNext(data.secondsUntilNext);
      } catch {}
    };
    return () => { es.close(); esRef.current = null; };
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    const t = setInterval(() => setSecondsUntilNext((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [snapshot?.nextUpdateIso]);

  const phaseBadge = useMemo(() => {
    const phase = snapshot?.phase ?? 'pre-morning';
    const cls = phase === 'night' ? 'badge warn' : phase === 'morning' ? 'badge good' : 'badge';
    const label = phase === 'night' ? 'Night (post 20:00 UTC)'
      : phase === 'morning' ? 'Morning (08:00?19:59 UTC)' : 'Before morning (pre 08:00 UTC)';
    return <span className={cls}>{label}</span>;
  }, [snapshot?.phase]);

  async function trigger(path: '/api/cron/morning' | '/api/cron/night') {
    await fetch(path).catch(() => {});
  }

  return (
    <div className="container">
      <div className="header">
        <h1 className="h1">Warehouse Inventory</h1>
        <div className="controls">
          <span className="badge">{connected ? 'Live' : 'Connecting?'}</span>
          {phaseBadge}
          <button className="button secondary" onClick={() => trigger('/api/cron/morning')}>Trigger Morning</button>
          <button className="button secondary" onClick={() => trigger('/api/cron/night')}>Trigger Night</button>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="kpi">
            <div className="item">
              <div className="small">Total Units</div>
              <div className="mono" style={{ fontSize: 22 }}>
                {snapshot ? snapshot.totals.totalUnits.toLocaleString() : '?'}
              </div>
            </div>
            <div className="item">
              <div className="small">Items Tracked</div>
              <div className="mono" style={{ fontSize: 22 }}>
                {snapshot ? snapshot.totals.itemCount : '?'}
              </div>
            </div>
            <div className="item">
              <div className="small">Next Update (UTC)</div>
              <div className="mono" style={{ fontSize: 22 }}>
                {snapshot ? new Date(snapshot.nextUpdateIso).toLocaleString('en-GB', { timeZone: 'UTC' }) : '?'}
              </div>
              <div className="small">T-minus {formatCountdown(secondsUntilNext)}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="small">Last Update (UTC)
            <div className="mono" style={{ fontSize: 14 }}>
              {snapshot?.lastUpdateIso ? new Date(snapshot.lastUpdateIso).toLocaleString('en-GB', { timeZone: 'UTC' }) : '?'}
            </div>
          </div>
          <div className="small" style={{ marginTop: 8 }}>As of
            <div className="mono" style={{ fontSize: 14 }}>
              {snapshot ? new Date(snapshot.asOfIso).toLocaleString('en-GB', { timeZone: 'UTC' }) : '?'}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="mono">Base</th>
              <th className="mono">Morning ?</th>
              <th className="mono">Night ?</th>
              <th className="mono">Current</th>
            </tr>
          </thead>
          <tbody>
            {snapshot?.items.map((it) => (
              <tr key={it.id}>
                <td>{it.name}</td>
                <td className="mono">{it.baseQuantity.toLocaleString()} {it.unit}</td>
                <td className="mono" style={{ color: '#86efac' }}>+{it.morningDelta}</td>
                <td className="mono" style={{ color: '#fca5a5' }}>{it.nightDelta}</td>
                <td className="mono">{it.quantity.toLocaleString()} {it.unit}</td>
              </tr>
            ))}
            {!snapshot && (
              <tr>
                <td colSpan={5} className="mono small">Waiting for live data?</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="small" style={{ marginTop: 12 }}>
        Schedule: updates apply at 08:00 and 20:00 UTC daily. This dashboard is realtime via Server-Sent Events.
      </p>
    </div>
  );
}
