import React from 'react';
import { X, Bluetooth, AlertTriangle, ExternalLink, RefreshCw, KeyRound, Radio } from 'lucide-react';

interface BleTroubleshootModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetryConnect: () => void;
  isConnecting?: boolean;
}

export const BleTroubleshootModal: React.FC<BleTroubleshootModalProps> = ({
  isOpen,
  onClose,
  onRetryConnect,
  isConnecting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Windows Bluetooth Conflict Detected</h3>
              <p className="text-[11px] text-amber-700 font-medium">
                Device connected in Windows Settings blocks Web Bluetooth
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-600">
          {/* Explanation Box */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 space-y-2">
            <div className="font-semibold text-amber-900 flex items-center gap-1.5">
              <span>Why is this happening?</span>
            </div>
            <p className="leading-relaxed text-amber-800">
              Your Windows Bluetooth Settings show <strong>&quot;HydroGen: Connected&quot;</strong>. 
              The ESP32 allows only <strong>one active Bluetooth connection</strong> at a time. 
              Because Windows OS holds an exclusive lock on the connection, Google Chrome / Edge cannot access 
              the GATT services and fails with <code className="font-mono text-[10px] bg-amber-100/80 px-1 py-0.5 rounded">GATT Server is disconnected</code>.
            </p>
            <p className="leading-relaxed text-amber-800">
              Also, if you recently reflashed the firmware via USB, Windows retains obsolete encryption 
              bonding keys that cause an immediate disconnect when services are requested.
            </p>
          </div>

          {/* Step by step fix */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              How to fix in 3 quick steps:
            </h4>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">
                    Remove HydroGen from Windows Settings
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Open <strong>Windows Settings</strong> (<kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Win</kbd> + <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">I</kbd>) &rarr; <strong>Bluetooth &amp; devices</strong>.
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Under <em>&quot;Your devices&quot;</em>, click the three dots (<strong className="font-mono">...</strong>) next to <strong>HydroGen</strong> and click <strong>&quot;Remove device&quot;</strong> (or Disconnect).
                  </p>
                  <div className="text-[11px] font-medium text-amber-700 bg-amber-100/60 px-2 py-1 rounded inline-block">
                    &times; Do NOT click &quot;Connect&quot; inside Windows Settings!
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">
                    Reboot the ESP32 Board
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Press the <strong>EN / RST</strong> button on your ESP32-S3 board (or briefly unplug and reconnect the USB cable) so it begins fresh Bluetooth advertising.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">
                    Connect Directly in the Web Browser
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Click the <strong>&quot;Connect via Bluetooth&quot;</strong> button below. Select <strong>HydroGen</strong> in Chrome&apos;s browser dialog. The website will handle pairing directly!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onRetryConnect();
            }}
            disabled={isConnecting}
            className="h-9 inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap shadow-xs"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Bluetooth className="w-3.5 h-3.5" />
                <span>Connect via Bluetooth Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
