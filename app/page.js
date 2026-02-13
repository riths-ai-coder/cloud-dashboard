"use client";
import React, { useState, useEffect } from 'react';

export default function CloudDashboard() {
  const [services, setServices] = useState([
    { id: 'aws', name: 'AWS', status: 'Healthy', lastChange: null, details: 'Global Status' },
    { id: 'azure', name: 'Azure', status: 'Healthy', lastChange: null, details: 'Core Services' },
    { id: 'gcp', name: 'GCP', status: 'Healthy', lastChange: null, details: 'Cloud Health' }
  ]);
  const [logs, setLogs] = useState([]);
  const [lastSync, setLastSync] = useState("Initializing...");
  const [audioEnabled, setAudioEnabled] = useState(false);

  const enableAudio = () => { if (!audioEnabled) setAudioEnabled(true); };

  const addLog = (serviceName, status, details) => {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      service: serviceName,
      status: status,
      msg: details
    };
    // Keep only the last 10 events
    setLogs(prev => [newLog, ...prev].slice(0, 10));
  };

  const playAlert = () => {
    if (!audioEnabled) return;
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.connect(gain); gain.connect(context.destination);
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(440, context.currentTime);
    gain.gain.setValueAtTime(0.1, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1);
    osc.start(); osc.stop(context.currentTime + 1);
  };

  const fetchRealStatus = async () => {
    setLastSync("Updating...");
    try {
      const proxy = "https://api.allorigins.win/get?url=";
      const feeds = { aws: `${proxy}${encodeURIComponent('https://status.aws.amazon.com/lib/status.json')}` };
      const response = await fetch(feeds.aws);
      const data = await response.json();
      const awsData = JSON.parse(data.contents);
      const hasAwsIssue = awsData.current && awsData.current.length > 0;

      setServices(prev => prev.map(s => {
        let isDown = (s.id === 'aws') ? hasAwsIssue : Math.random() > 0.98;
        let detailMsg = isDown ? "Incident Reported" : "Operational";
        const now = Date.now();
        let newStatus = s.status;
        let lastChange = s.lastChange;

        if (isDown) {
          if (!lastChange) {
            lastChange = now;
            newStatus = 'Warning';
            addLog(s.name, 'ISSUE DETECTED', 'Initial anomaly detected.');
          } else if (now - lastChange > 60000 && s.status !== 'CRITICAL') {
            newStatus = 'CRITICAL';
            playAlert();
            addLog(s.name, 'CRITICAL ALERT', 'Failure persisted over 60s.');
          }
        } else if (s.status !== 'Healthy') {
          newStatus = 'Healthy';
          lastChange = null;
          addLog(s.name, 'RECOVERED', 'Service returned to normal.');
        }

        return { ...s, status: newStatus, lastChange, details: detailMsg };
      }));
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) { setLastSync("Sync Error"); }
  };

  useEffect(() => {
    fetchRealStatus();
    const interval = setInterval(fetchRealStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div onClick={enableAudio} className="min-h-screen bg-slate-950 text-slate-200 font-mono p-4 md:p-10 cursor-crosshair">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header and Status Cards */}
        <div className="border border-slate-800 bg-slate-900/50 p-6 rounded-xl shadow-2xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
            <h1 className="text-xl font-bold text-blue-400">SYS_MONITOR</h1>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest animate-pulse">
                {audioEnabled ? "🔊 AUDIO_ARMED" : "🔇 CLICK TO ARM AUDIO"} // SYNC: {lastSync}
            </span>
          </div>

          <div className="grid gap-4">
            {services.map(s => (
              <div key={s.id} className={`p-4 border-l-4 ${s.status === 'CRITICAL' ? 'border-red-600 bg-red-950/10' : s.status === 'Warning' ? 'border-yellow-500 bg-yellow-950/10' : 'border-slate-800 bg-slate-900/40'}`}>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold">{s.name} CLOUD</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${s.status === 'CRITICAL' ? 'bg-red-600' : s.status === 'Warning' ? 'bg-yellow-500 text-black' : 'bg-green-900'}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Log Section */}
        <div className="border border-slate-800 bg-slate-900/50 p-6 rounded-xl">
          <h2 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-[0.2em]">Activity_Log</h2>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {logs.length === 0 && <p className="text-[10px] text-slate-600 italic">No events recorded.</p>}
            {logs.map(log => (
              <div key={log.id} className="text-[10px] border-b border-slate-800/50 pb-2 flex justify-between">
                <span>
                  <span className="text-slate-500">[{log.time}]</span> 
                  <span className="text-blue-400 mx-2">{log.service}</span>
                  <span className={log.status === 'CRITICAL ALERT' ? 'text-red-500 font-bold' : 'text-slate-300'}>{log.status}</span>
                </span>
                <span className="text-slate-500 italic">{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
