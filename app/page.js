"use client";
import React, { useState, useEffect, useRef } from 'react';

export default function CloudDashboard() {
  const [services, setServices] = useState([
    { id: 'aws', name: 'AWS', status: 'Healthy', lastChange: null, details: 'Global Status' },
    { id: 'azure', name: 'Azure', status: 'Healthy', lastChange: null, details: 'Core Services' },
    { id: 'gcp', name: 'GCP', status: 'Healthy', lastChange: null, details: 'Cloud Health' }
  ]);
  const [logs, setLogs] = useState([]);
  const [lastSync, setLastSync] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    setLastSync(new Date().toLocaleTimeString());
  }, []);

  const enableAudio = () => {
    if (!audioEnabled) {
      setAudioEnabled(true);
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const osc = context.createOscillator();
      osc.connect(context.destination);
      osc.start(0);
      osc.stop(0.1);
    }
  };

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
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(context.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, context.currentTime);
      gain.gain.setValueAtTime(0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1);
      osc.start();
      osc.stop(context.currentTime + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRealStatus = async () => {
    setLastSync(new Date().toLocaleTimeString());
    try {
      const proxy = "https://api.allorigins.win/get?url=";
      const target = encodeURIComponent('https://status.aws.amazon.com/lib/status.json');
      const response = await fetch(`${proxy}${target}`);
      const data = await response.json();
      const awsData = JSON.parse(data.contents);
      
      const hasAwsIssue = (awsData.current && awsData.current.length > 0) || testMode;

      setServices(prev => prev.map(s => {
        let isDown = (s.id === 'aws') ? hasAwsIssue : false;
        let detailMsg = isDown ? (testMode ? "SIMULATED_FAILURE" : "Incident Reported") : "Operational";
        
        const now = Date.now();
        let newStatus = s.status;
        let lastChange = s.lastChange;

        if (isDown) {
          if (!lastChange) {
            lastChange = now;
            newStatus = 'Warning';
            addLog(s.name, 'ISSUE DETECTED', 'Pending 60s verification...');
          } else if (now - lastChange > 60000 && s.status !== 'CRITICAL') {
            newStatus = 'CRITICAL';
            playAlert();
            addLog(s.name, 'CRITICAL ALERT', 'Failure verified.');
          }
        } else if (s.status !== 'Healthy') {
          newStatus = 'Healthy';
          lastChange = null;
          addLog(s.name, 'RECOVERED', 'Status normal.');
        }

        return { ...s, status: newStatus, lastChange, details: detailMsg };
      }));
    } catch (err) {
      console.log("Fetch skipped or failed");
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchRealStatus, 15000);
    return () => clearInterval(interval);
  }, [testMode, audioEnabled]);

  return (
    <div onClick={enableAudio} className="min-h-screen bg-slate-950 text-slate-200 font-mono p-4 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-lg shadow-xl">
          <div>
            <h1 className="text-blue-400 font-bold text-xl">CLOUD_WATCH_v1</h1>
            <p className={`text-[10px] font-bold ${audioEnabled ? 'text-green-500' : 'text-red-500 animate-pulse'}`}>
              {audioEnabled ? "SYSTEM_ARMED" : "CLICK_TO_ARM_AUDIO"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500">LAST_SYNC</p>
            <p className="text-sm font-bold">{lastSync}</p>
          </div>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); setTestMode(!testMode); }}
          className={`w-full py-4 rounded font-bold tracking-widest border transition-all ${testMode ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
        >
          {testMode ? "STOPPING SIMULATION..." : "RUN SYSTEM DIAGNOSTIC (TEST)"}
        </button>

        <div className="grid gap-4 md:grid-cols-3">
          {services.map(s => (
            <div key={s.id} className={`p-5 border-t-4 bg-slate-900/60 rounded-lg ${s.status === 'CRITICAL' ? 'border-red-500 animate-pulse' : s.status === 'Warning' ? 'border-yellow-500' : 'border-green-500'}`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold uppercase">{s.name}</span>
                <div className={`w-2 h-2 rounded-full ${s.status === 'CRITICAL' ? 'bg-red-500' : s.status === 'Warning' ? 'bg-yellow-500' : 'bg-green-500'}`} />
              </div>
              <p className={`text-2xl font-black ${s.status === 'CRITICAL' ? 'text-red-500' : 'text-slate-100'}`}>{s.status}</p>
              <p className="text-[10px] mt-2 text-slate-500 italic uppercase">Log: {s.details}</p>
              {s.lastChange && (
                <p className="text-[9px] text-slate-600 mt-2">ALARM_START: {new Date(s.lastChange).toLocaleTimeString()}</p>
              )}
            </div>
          ))}
        </div>

        <div className="bg-black/40 border border-slate-800 p-6 rounded-lg">
          <h2 className="text-[10px] text-slate-500 font-bold mb-4 uppercase tracking-[0.3em] border-b border-slate-800 pb-2">Diagnostic_Journal</h2>
          <div className="space-y-2">
            {logs.length === 0 && <p className="text-[10px] text-slate-700 italic">Scanning for incidents...</p>}
            {logs.map(log => (
              <div key={log.id} className="text-[10px] flex justify-between border-b border-slate-900/50 pb-1">
                <span className="text-slate-400">[{log.time}] <span className="text-blue-500 font-bold">{log.service}</span>: {log.status}</span>
                <span className="text-slate-600">{log.msg}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
