import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { useLoad } from '../hooks/useLoad';
import { Field, Notice, PageHeader } from '../components/ui';
import { prettyDate, prettyTime } from '../utils/dates';

export function Scanner() {
  const [reference, setReference] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('entry');
  const [scanning, setScanning] = useState(false);
  const [scannerMsg, setScannerMsg] = useState('');
  const [refresh, setRefresh] = useState(0);
  async function validate(ref = reference) {
    if (!ref.trim()) {
      setError('Enter a QR reference or scan a pass.');
      return;
    }
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const out = await api('/qr/validate', { method: 'POST', body: { reference: ref.trim() } });
      setReference(ref.trim());
      setResult(out);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function record() {
    setBusy(true);
    try {
      const out = await api(mode === 'entry' ? '/entry' : '/exit', {
        method: 'POST',
        body: { reference },
      });
      setResult({ ...result, recorded: true, recordMessage: out.message });
      setRefresh(refresh + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!scanning) return;
    let scanner;
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        scanner = new Html5Qrcode('qr-reader');
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded) => {
            scanner.stop().catch(() => {});
            setScanning(false);
            setReference(decoded);
            validate(decoded);
          },
          () => {},
        );
      } catch (e) {
        setScannerMsg(e.message || 'Camera could not start. Check browser permissions.');
        setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
      scanner?.stop().catch(() => {});
    };
  }, [scanning]);
  return (
    <>
      <PageHeader
        eyebrow="GATE DESK"
        title="Scan & verify"
        sub="Scan a visitor pass, verify it, then record the visit."
      />
      <div className="scanner-layout">
        <section className="panel scanner-panel">
          <div className="scanner-title">
            <span className="scanner-icon">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2>Pass verification</h2>
              <p>Only approved passes for today can be admitted.</p>
            </div>
          </div>
          <div className="scan-mode">
            <button
              className={mode === 'entry' ? 'selected' : ''}
              onClick={() => {
                setMode('entry');
                setResult(null);
                setError('');
              }}
            >
              <ArrowDownToLine size={15} /> Record entry
            </button>
            <button
              className={mode === 'exit' ? 'selected' : ''}
              onClick={() => {
                setMode('exit');
                setResult(null);
                setError('');
              }}
            >
              <ArrowUpRight size={15} /> Record exit
            </button>
          </div>
          <Field label="QR pass reference">
            <div className="reference-input">
              <input
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value);
                  setResult(null);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && validate()}
                placeholder="Paste the pass reference…"
              />
              <button className="btn btn-primary" onClick={() => validate()} disabled={busy}>
                {busy ? 'Checking…' : 'Verify pass'} <ArrowRight size={15} />
              </button>
            </div>
          </Field>
          {error && <Notice type="error">{error}</Notice>}
          {result && (
            <div className={`verification ${result.valid ? 'verified' : 'blocked'}`}>
              <div className="verification-head">
                <span className="verification-mark">
                  {result.valid ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                </span>
                <div>
                  <b>{result.recorded ? result.recordMessage : result.message}</b>
                  <span>
                    {result.recorded
                      ? 'This action was recorded in the visit history.'
                      : result.valid
                        ? 'Pass is ready to be recorded at the gate.'
                        : 'Please ask the visitor to contact their host.'}
                  </span>
                </div>
                <span className="verification-code">
                  {result.recorded ? 'RECORDED' : result.code}
                </span>
              </div>
              {result.valid && (
                <div className="verification-details">
                  <div>
                    <small>VISITOR</small>
                    <b>{result.pass.visitor_name}</b>
                  </div>
                  <div>
                    <small>ORGANIZATION</small>
                    <b>{result.pass.organization || '—'}</b>
                  </div>
                  <div>
                    <small>PURPOSE</small>
                    <b>{result.pass.purpose}</b>
                  </div>
                  <div>
                    <small>VISIT DATE</small>
                    <b>{prettyDate(result.pass.visit_date)}</b>
                  </div>
                </div>
              )}
              {result.valid && !result.recorded && (
                <button className="btn btn-green btn-record" onClick={record} disabled={busy}>
                  {busy
                    ? 'Recording…'
                    : mode === 'entry'
                      ? 'Confirm & record entry'
                      : 'Confirm & record exit'}{' '}
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          )}
          <div className="scanner-divider">
            <span>OR USE A CAMERA</span>
          </div>
          <button
            className={`camera-launch ${scanning ? 'camera-active' : ''}`}
            onClick={() => {
              setScannerMsg('');
              setScanning(!scanning);
            }}
          >
            {scanning ? (
              <>
                <X size={16} /> Stop camera scan
              </>
            ) : (
              <>
                <ShieldCheck size={16} /> Open QR scanner camera
              </>
            )}{' '}
            <ArrowRight size={15} />
          </button>
          {scannerMsg && <Notice type="error">{scannerMsg}</Notice>}
          <div id="qr-reader" className={scanning ? 'qr-reader visible' : 'qr-reader'}></div>
        </section>
        <aside className="side-note scan-side">
          <div className="side-note-icon">
            <Activity size={18} />
          </div>
          <b>Today at the gate</b>
          <p>Entry is recorded against the pass and the person who scanned it.</p>
          <ScanActivity key={refresh} />
          <div className="scan-tip">
            <ShieldCheck size={15} />
            <span>QR codes contain a reference only. Visitor details stay on the server.</span>
          </div>
        </aside>
      </div>
    </>
  );
}
function ScanActivity() {
  const { data, busy } = useLoad(() => api('/entry-exit'));
  return (
    <div className="scan-activity">
      <div className="scan-activity-head">
        <span>RECENT SCANS</span>
        <span>{data?.filter((r) => !r.exit_time).length || 0} active</span>
      </div>
      {busy ? (
        <span className="muted">Loading…</span>
      ) : data?.length ? (
        data.slice(0, 3).map((r) => (
          <div className="scan-row" key={r.id}>
            <span className={`scan-led ${r.exit_time ? 'out' : 'in'}`} />
            <span>
              <b>{r.visitor_name}</b>
              <small>
                {r.exit_time ? 'Exited' : 'Inside'} · {prettyTime(r.exit_time || r.entry_time)}
              </small>
            </span>
          </div>
        ))
      ) : (
        <span className="muted">No scans recorded today.</span>
      )}
    </div>
  );
}
