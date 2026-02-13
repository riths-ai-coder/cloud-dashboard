"use client";
import React, { useState, useEffect } from 'react';

export default function CloudDashboard() {
  const [services, setServices] = useState([
    { id: 'aws', name: 'AWS', status: 'Healthy', lastChange: null, details: '' },
    { id: 'azure', name: 'Azure', status: 'Healthy', lastChange: null, details: '' },
    { id: 'gcp', name: 'GCP', status: 'Healthy', lastChange: null, details: '' }
  ]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastSync, setLastSync] = useState("Never");

  // Audio function to play the alert
  const playAlert = () => {
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
  };

  const updateStatus = () => {
    setServices(prev => prev.map(s => {
      // SIMULATION: Randomly fail for demo (Change this to real API fetch later)
      const isDown = Math.random() > 0.8; 
      const now = Date.now();
      let newStatus = s.status;
      let lastChange = s.lastChange;

      if (isDown) {
        if (!lastChange) {
          lastChange = now;
          newStatus = 'Warning'; 
        } else if (now - lastChange > 60000) {
          if (newStatus !== 'CRITICAL') playAlert();
          newStatus = 'CRITICAL';
        }
      } else {
        lastChange = null;
        newStatus = 'Healthy';
      }

      return { ...s, status: newStatus, lastChange, details: isDown ? "Connection Timeout" : "" };
    }));
    setLastSync(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    if (!isMonitoring) return;
    const interval = setInterval(updateStatus, 30000);
    return () => clearInterval(interval);
  }, [isMonitoring]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono p-4 md:p-10">
      <div className="max-w-4xl mx-auto border border-slate-800 bg-slate-900/50 p-6 rounded-xl shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-8">
          <div>
            <h1 className="text-xl font-bold text-blue-400 tracking-widest">CLOUD_HEARTBEAT_v1.0</h1>
            <p className="text-xs text-slate-500">SYNC: {lastSync}</p>
          </div>
          {!isMonitoring ? (
            <button 
              onClick={() => { setIsMonitoring(true); updateStatus(); }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm transition-all"
            >
              INITIALIZE MONITORING
            </button>
          ) : (
            <span className="text-green-500 text-sm animate-pulse">● MONITORING_ACTIVE</span>
          )}
        </div>

        <div className="grid gap-4">
          {services.map(s => (
            <div key={s.id} className={`p-4 border rounded-lg transition-all ${
              s.status === 'CRITICAL' ? 'border-red-500 bg-red-950/20' : 
              s.status === 'Warning' ? 'border-yellow-500 bg-yellow-950/20' : 'border-slate-800 bg-slate-900'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">{s.name} Infrastructure</span>
                <span className={`px-3 py-1 rounded text-xs font-black ${
                  s.status === 'CRITICAL' ? 'bg-red-600 text-white animate-bounce' : 
                  s.status === 'Warning' ? 'bg-yellow-500 text-black' : 'bg-green-600 text-white'
                }`}>
                  {s.status}
                </span>
              </div>
              {s.status !== 'Healthy' && (
                <div className="mt-3 text-xs text-slate-400 border-t border-slate-700 pt-2">
                  <p>ISSUE: {s.details}</p>
                  <p className="mt-1 text-[10px] text-slate-500 italic uppercase">
                    Alert Triggered: {new Date(s.lastChange).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
