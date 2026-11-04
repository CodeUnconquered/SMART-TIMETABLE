import React, { useState } from 'react';
import { Smartphone, Download, X, Check, HelpCircle } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstalledSuccess(true);
        setTimeout(() => setInstalledSuccess(false), 4000);
      }
    } else {
      setShowGuide(true);
    }
  };

  if (isInstalled || installedSuccess) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-mono">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span>Installed on Device</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        aria-label="Install Academic Timetable PWA on Android or phone"
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-950/50 hover:shadow-cyan-900/80 transition-all cursor-pointer whitespace-nowrap"
      >
        <Smartphone className="w-4 h-4 text-cyan-200" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Install on Mobile Phone</h3>
                <p className="text-xs text-slate-400">Add to your home screen for native offline access</p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-300 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <p className="font-semibold text-cyan-300">Instructions for Apple Safari (iOS):</p>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Tap the <strong>Share</strong> icon (square with arrow) at the bottom toolbar of Safari.</li>
                  <li>Scroll down the actions list and tap <strong>Add to Home Screen</strong>.</li>
                  <li>Confirm by tapping <strong>Add</strong> in the top-right corner.</li>
                  <li>Launch directly from your phone's home screen just like a native app.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-300 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <p className="font-semibold text-cyan-300">Instructions for Android (Chrome / Edge / Firefox):</p>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Tap the browser menu icon (<strong>three dots</strong> in top-right or bottom-right).</li>
                  <li>Select <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</li>
                  <li>Follow the prompt to install the Smart Academic Timetable application.</li>
                  <li>The app icon will appear in your app drawer and home screen with offline capability.</li>
                </ol>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                PWA Certified v3.4.1
              </span>
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
