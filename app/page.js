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
  const [testMode, setTestMode] = useState(false);

  const enableAudio = () => { if (!audioEnabled) setAudioEnabled(true); };

  const addLog = (serviceName, status, details) => {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      service: serviceName,
      status: status,
      msg: details
    };
    setLogs(prev => [newLog, ...prev].slice(0, 10));
  };

  const playAlert = () => {
    if (!audioEnabled) return;
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.connect(gain); gain.connect(context.destination);
    osc.type = 'sawtooth'; 
    osc.frequency.setValueAtTime(440, context.currentTime);
    gain.gain.setValueAtTime(0.1, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1);
    osc.start(); 
    osc.stop(context.currentTime + 1);
  };

  const fetchRealStatus = async () => {
    setLastSync("Updating...");
    try {
      const proxy = "https://api.allorigins.win/get?url=";
      const feeds = { aws: `${proxy}${encodeURIComponent('https://status.aws.amazon.com/lib/status.json')}` };
      const response = await fetch(feeds.aws);
      const data = await response.json();
      const awsData = JSON.parse(data.contents);
      
      // If Test Mode is ON, we force 'isDown' to be true for AWS
      const hasAwsIssue = (awsData.current && awsData.current.length > 0) || testMode;

      setServices(prev => prev.map(s => {
        let isDown = (s.id === 'aws') ? hasAwsIssue : false;
        let detailMsg = isDown ? (testMode ? "MANUAL_TEST_FAILURE" : "Incident Reported") : "Operational";
        
        const now = Date.now();
        let newStatus = s.status;
        let lastChange = s.lastChange;

        if (isDown) {
          if (!lastChange) {
            lastChange = now;
            newStatus = 'Warning';
            addLog(s.name, 'ISSUE DETECTED', 'Monitoring threshold reached.');
          } else if (now - lastChange > 60000 && s.status !== 'CRITICAL') {
            newStatus = 'CRITICAL';
            playAlert();
            addLog(s.name, 'CRITICAL ALERT', 'Outage verified (>60s).');
          }
        } else if (s.status !== 'Healthy') {
          newStatus = 'Healthy';
          lastChange = null;
          addLog(s.name, 'RECOVERED', 'All systems green.');
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
  }, [testMode]); // Restart poll immediately when test mode toggles

  return (
    <div onClick={enableAudio} className="min-h-screen bg-slate-950 text-slate-200 font-mono p-4 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Control Bar */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-lg">
          <div>
            <h1 className="text-blue-400 font-bold tracking-tighter">CLOUD_TERMINAL_v1</h1>
            <p className="text-[9px] text-slate-500 uppercase">{audioEnabled ? "🔊 Sound Armed" : "🔇 Click to Arm Sound"}</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setTestMode(!testMode); }}
            className={`px-4 py-2 rounded text-[10px] font-bold transition-all ${testMode ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {testMode ? "STOP TEST" : "TRIGGER TEST ALERT"}
          </button>
        </div>

        {/* Status Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {services.map(s => (
            <div key={s.id} className={`p-4 border-t-2 bg-slate-900/40 rounded-b-lg ${s.status === 'CRITICAL' ? 'border-red-500 shadow-lg shadow-red-900/20' : s.status === 'Warning' ? 'border-yellow-500' : 'border-green-500'}`}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold uppercase">{s.name}</span>
                <div className={`w-2 h-2 rounded-full ${s.status === 'CRITICAL' ? 'bg-red-500 animate-ping' : s.status === 'Warning' ? 'bg-yellow-500' : 'bg-green-500'}`} />
              </div>
              <p className={`text-xl font-black mb-1 ${s.status === 'CRITICAL' ? 'text-red-500' : 'text-slate-100'}`}>{s.status}</p>
              <p className="text-[10px] text-slate-500 italic">{s.details}</p>
            </div>
          ))}
        </div>

        {/* Activity Log */}
        <div className="bg-black/40 border border-slate-800 p-4 rounded-lg">
          <h2 className="text-[10px] text-slate-500 font-bold mb-3 uppercase tracking-widest border-b border-slate-800 pb-2">Diagnostic_Logs</h2>
          <div className="space-y-1">
            {logs.map(log => (
              <div key={log.id} className="text-[10px] flex justify-between font-light">
                <span className="text-slate-500">[{log.time}] <span className="text-blue-500">{log.service}</span>: {log.status}</span>
                <span className="text-slate-600 italic">{log.msg}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
