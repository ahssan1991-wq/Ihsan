/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  X, 
  Zap, 
  ZapOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Package, 
  MapPin, 
  Layers, 
  Volume2, 
  VolumeX,
  Keyboard,
  ArrowRight
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Material } from '../types';

interface LiveBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  onSelectMaterial?: (material: Material) => void;
  onScannedValue?: (code: string) => void;
}

export const LiveBarcodeScannerModal: React.FC<LiveBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  materials,
  onSelectMaterial,
  onScannedValue
}) => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [matchedMaterial, setMatchedMaterial] = useState<Material | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = 'emis-live-camera-feed';

  // Play audio beep using Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  };

  // Find matching material from scanned text
  const matchMaterial = (code: string): Material | null => {
    const clean = code.trim().toLowerCase();
    
    // Check direct partNumber
    let match = materials.find(m => m.partNumber.toLowerCase() === clean);
    if (match) return match;

    // Check serial number
    match = materials.find(m => m.serialNumber?.toLowerCase() === clean);
    if (match) return match;

    // Check id
    match = materials.find(m => m.id.toLowerCase() === clean);
    if (match) return match;

    // Check tag or model
    match = materials.find(m => 
      (m.tag && m.tag.toLowerCase() === clean) || 
      (m.model && m.model.toLowerCase() === clean)
    );
    if (match) return match;

    // Check if code is URL or Passport payload: EMIS-MAT:..., or ?passport=...
    if (code.includes('EMIS-MAT:')) {
      const parts = code.split('|');
      const pnPart = parts.find(p => p.startsWith('PN:'));
      if (pnPart) {
        const pn = pnPart.replace('PN:', '').trim().toLowerCase();
        match = materials.find(m => m.partNumber.toLowerCase() === pn);
        if (match) return match;
      }
    }

    // Partial contains match
    match = materials.find(m => clean.includes(m.partNumber.toLowerCase()));
    return match || null;
  };

  const handleScanSuccess = (decodedText: string) => {
    if (decodedText === lastScannedCode) return; // Prevent duplicate trigger

    playBeep();
    setLastScannedCode(decodedText);
    const found = matchMaterial(decodedText);
    setMatchedMaterial(found);

    if (onScannedValue) onScannedValue(decodedText);
  };

  // Start Camera
  const startCamera = async (cameraId?: string) => {
    setScannerError(null);
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      }

      const html5QrCode = new Html5Qrcode(elementId);
      scannerRef.current = html5QrCode;

      const cameraConfig = cameraId 
        ? { deviceId: { exact: cameraId } } 
        : { facingMode: 'environment' };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Frame scan error (normal when no code is in frame)
        }
      );

      setIsScanning(true);

      // Check torch support
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if ((capabilities as any)?.torch) {
          setHasTorchSupport(true);
        }
      } catch {
        setHasTorchSupport(false);
      }

    } catch (err: any) {
      console.warn('[Camera Scanner] Start failed:', err);
      setScannerError(
        err?.message || 'Unable to access video camera. Please grant camera permissions or use manual entry.'
      );
      setIsScanning(false);
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
    }
    setIsScanning(false);
    setIsTorchOn(false);
  };

  // Toggle Torch / Flash
  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: !isTorchOn }] as any
      });
      setIsTorchOn(!isTorchOn);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Initialize camera list on open
  useEffect(() => {
    if (isOpen) {
      setLastScannedCode(null);
      setMatchedMaterial(null);
      setManualCodeInput('');

      Html5Qrcode.getCameras()
        .then(devices => {
          if (devices && devices.length) {
            setCameras(devices);
            // Default to rear / environment camera if found
            const backCamera = devices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
            );
            const chosenId = backCamera ? backCamera.id : devices[0].id;
            setSelectedCameraId(chosenId);
            startCamera(chosenId);
          } else {
            startCamera();
          }
        })
        .catch(err => {
          console.warn('Could not enumerate cameras:', err);
          startCamera();
        });
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleScanSuccess(manualCodeInput.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-industrial-900 border border-industrial-750 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-industrial-800 bg-industrial-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Live Barcode & QR Scanner</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              </h2>
              <p className="text-[11px] text-industrial-400">
                وجه كاميرا الجهاز نحو الباركود أو ملصق الرف
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Disable Beep Sound' : 'Enable Beep Sound'}
              className="p-1.5 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-brand-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Video Container with overlay laser */}
          <div className="relative w-full aspect-square max-h-72 sm:max-h-80 mx-auto rounded-2xl overflow-hidden bg-black border-2 border-industrial-700 shadow-inner flex items-center justify-center">
            <div id={elementId} className="w-full h-full object-cover"></div>

            {/* Scanning Target Box & Reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 border-2 border-brand-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                {/* Corner Markers */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-brand-400 rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-brand-400 rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-brand-400 rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-brand-400 rounded-br-lg"></div>

                {/* Animated Laser Scanning Line */}
                <motion.div
                  animate={{ y: [0, 210, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#38bdf8]"
                />
              </div>
            </div>

            {/* Controls Overlay on Video */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              {hasTorchSupport && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
                    isTorchOn 
                      ? 'bg-amber-500/80 text-white border-amber-400 shadow-lg' 
                      : 'bg-black/60 text-white/80 border-white/20 hover:bg-black/80'
                  }`}
                >
                  {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                </button>
              )}

              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const nextIndex = (cameras.findIndex(c => c.id === selectedCameraId) + 1) % cameras.length;
                    const nextId = cameras[nextIndex].id;
                    setSelectedCameraId(nextId);
                    startCamera(nextId);
                  }}
                  title="Switch Camera"
                  className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white/80 hover:bg-black/80 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Error Notice */}
          {scannerError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{scannerError}</p>
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  Make sure you permit camera access in your browser settings.
                </p>
              </div>
            </div>
          )}

          {/* Scanned Result & Material Match Card */}
          <AnimatePresence>
            {lastScannedCode && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="p-3.5 rounded-xl bg-industrial-850 border border-industrial-750 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-industrial-400 font-bold">
                    Detected Code / الرمز المقروء
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {lastScannedCode}
                  </span>
                </div>

                {matchedMaterial ? (
                  <div className="pt-2 border-t border-industrial-750 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{matchedMaterial.partNumber}</span>
                        </h4>
                        <p className="text-[11px] text-industrial-300 font-sans line-clamp-1 mt-0.5">
                          {matchedMaterial.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-extrabold text-brand-400">
                          {matchedMaterial.quantity} {matchedMaterial.unit}
                        </span>
                        <span className="block text-[10px] font-mono text-industrial-400">
                          {matchedMaterial.store} • R:{matchedMaterial.rack} S:{matchedMaterial.shelf}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {onSelectMaterial && (
                        <button
                          onClick={() => {
                            onSelectMaterial(matchedMaterial);
                            stopCamera();
                            onClose();
                          }}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Inspect Material / معاينة</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setLastScannedCode(null);
                          setMatchedMaterial(null);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-industrial-300 hover:text-white text-xs font-medium transition-colors"
                      >
                        Scan Next
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-industrial-750 flex items-center justify-between text-xs text-amber-400">
                    <span>Item not in registered database / غير مسجل</span>
                    <button
                      onClick={() => {
                        setLastScannedCode(null);
                        setMatchedMaterial(null);
                      }}
                      className="text-[11px] text-industrial-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-industrial-800 flex items-center gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 text-industrial-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualCodeInput}
                onChange={e => setManualCodeInput(e.target.value)}
                placeholder="Type part number / barcode manually..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-industrial-850 border border-industrial-700 text-white text-xs font-mono focus:border-brand-500 focus:outline-none placeholder:text-industrial-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-750 border border-industrial-700 text-white text-xs font-bold transition-colors shrink-0"
            >
              Lookup
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
