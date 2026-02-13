"use client";
import React, { useState, useEffect } from 'react';

export default function CloudDashboard() {
  const [services, setServices] = useState([
    { id: 'aws', name: 'AWS', status: 'Healthy', lastChange: null, details: 'Global Status' },
    { id: 'azure', name: 'Azure', status: 'Healthy', lastChange: null, details: 'Core Services' },
    { id: 'gcp', name: 'GCP', status: 'Healthy', lastChange: null, details: 'Cloud Health' }
  ]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastSync, setLastSync] = useState("Initializing...");

  const playAlert = () => {
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
    try {
      // Using a public proxy to avoid CORS errors
      const proxy = "https://api.allorigins.win/get?url=";
      const feeds = {
        aws: `${proxy}${encodeURIComponent('https://status.aws.amazon.com/lib/status.json')}`,
        google: `${proxy}${encodeURIComponent('https://status.cloud.google.com/incidents.json')}`
      };

      // Fetching AWS as an example
      const response = await fetch(feeds.aws);
      const data = await response.json();
      const awsData = JSON.parse(data.contents);
      
      // AWS logic: check if any current incidents exist
      const hasAwsIssue = awsData.current && awsData.current.length > 0;

      setServices(prev => prev.map(s => {
        let isDown = false;
        let detailMsg = "All systems operational";

        if (s.id === 'aws') {
            isDown = hasAwsIssue;
            detailMsg = hasAwsIssue ? awsData.current[0].summary : "Systems Normal";
        }

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

        return { ...s, status: newStatus, lastChange, details: detailMsg };
      }));

      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Fetch error:", err);
      setLastSync("Sync Error - Retrying...");
    }
  };

  useEffect(() => {
    if (!isMonitoring) return;
    fetchRealStatus(); // Run immediately
    const interval = setInterval(fetchRealStatus, 30000);
    return () => clearInterval(interval);
  }, [isMonitoring]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono p-4 md:p-10">
      <div className="max-w-4xl mx-auto border border-slate-800 bg-slate-900/50 p-6 rounded-xl shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-8">
          <div>
            <h1 className="text-xl font-bold text-blue-400 tracking-widest underline decoration-blue-900">CLOUD_LIVE_FEED</h1>
            <p className="text-xs text-slate-500 mt-1 uppercase">Updates every 30s • Last: {lastSync}</p>
          </div>
          {!isMonitoring ? (
            <button onClick={() => setIsMonitoring(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full text-xs font-bold transition-all shadow-lg shadow-blue-900/20">
              START REAL-TIME MONITOR
            </button>
          ) : (
            <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-green-500 text-xs font-bold">LIVE_FEED_ON</span>
            </div>
          )}
        </div>

        <div className="grid gap-6">
          {services.map(s => (
            <div key={s.id} className={`p-5 border-l-4 rounded-r-lg transition-all duration-500 ${
              s.status === 'CRITICAL' ? 'border-red-600 bg-red-950/10' : 
              s.status === 'Warning' ? 'border-yellow-500 bg-yellow-950/10' : 'border-green-600 bg-slate-900'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-bold tracking-tight uppercase">{s.name} Cloud</span>
                <span className={`px-2 py-1 text-[10px] font-black rounded ${
                  s.status === 'CRITICAL' ? 'bg-red-600 text-white' : 
                  s.status === 'Warning' ? 'bg-yellow-500 text-black' : 'bg-green-800 text-green-100'
                }`}>
                  {s.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-light italic">"{s.details}"</p>
              {s.status === 'CRITICAL' && (
                <div className="mt-4 text-[10px] bg-red-600/20 p-2 rounded border border-red-600/30 text-red-400 animate-pulse">
                   ALERT: Persistent failure detected for &gt; 60 seconds.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
