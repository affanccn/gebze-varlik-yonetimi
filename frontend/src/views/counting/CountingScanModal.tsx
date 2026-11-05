import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { enterpriseService } from '../../services/enterpriseService';
import { AuditScanResult } from '../../types/audit';
import {
  QrCode,
  ScanLine,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  Clock,
} from 'lucide-react';

interface CountingScanModalProps {
  auditId: number | null;
  auditCode?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Barkod / Web Audio Bip Çalıcı
function playAudioFeedback(type: 'SUCCESS' | 'WARNING' | 'ERROR') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'SUCCESS') {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 nota, net ve pozitif
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'WARNING') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start(ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1); // A4 çift ton
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.frequency.setValueAtTime(330, ctx.currentTime); // E4 pes hata
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Ses desteği yoksa sessizce geç
  }
}

export const CountingScanModal: React.FC<CountingScanModalProps> = ({
  auditId,
  auditCode,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [assetCode, setAssetCode] = useState('');
  const [scannedLocation, setScannedLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gelişmiş Saha Modları
  const [activeTab, setActiveTab] = useState<'MANUAL' | 'CAMERA'>('MANUAL');
  const [continuousMode, setContinuousMode] = useState(true); // Hızlı / Seri Okutma
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lockLocation, setLockLocation] = useState(true); // Odayı Sabitle

  // Kamera ve Tarama Durumu
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Canlı Okutulanlar Geçmişi (Bu oturumda okutulanlar)
  const [sessionScans, setSessionScans] = useState<AuditScanResult[]>([]);

  // Kamera Başlatma
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Tarayıcınız kamera akışını desteklemiyor.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kameraya erişilemedi.';
      setCameraError(msg);
      setIsCameraActive(false);
    }
  }, []);

  // Kamera Durdurma
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Sekme değiştiğinde kamerayı yönet
  useEffect(() => {
    if (isOpen && activeTab === 'CAMERA') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  // Modal kapandığında sıfırla
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setAssetCode('');
      setSessionScans([]);
    }
  }, [isOpen, stopCamera]);

  // Sayım Kaydı Gönderme Fonksiyonu
  const executeScan = async (codeToScan: string, locationToScan: string) => {
    if (!auditId || !codeToScan.trim()) return;
    const cleanCode = codeToScan.trim().toUpperCase();

    setIsSubmitting(true);
    try {
      const result = await enterpriseService.recordAuditScan(auditId, {
        assetCode: cleanCode,
        scannedLocation: locationToScan.trim(),
      });

      // Sesli geri bildirim
      if (soundEnabled) {
        if (result.matchStatus === 'DOGRU_KONUM') playAudioFeedback('SUCCESS');
        else if (result.matchStatus === 'FARKLI_KONUMDA') playAudioFeedback('WARNING');
        else playAudioFeedback('ERROR');
      }

      // Canlı geçmişe ekle
      setSessionScans((prev) => [result, ...prev]);

      showToast(result.message, result.matchStatus === 'DOGRU_KONUM' ? 'success' : 'warning');
      onSuccess();

      if (!continuousMode) {
        setAssetCode('');
        onClose();
      } else {
        setAssetCode('');
        if (!lockLocation) {
          setScannedLocation('');
        }
      }
    } catch (err: unknown) {
      if (soundEnabled) playAudioFeedback('ERROR');
      const msg = err instanceof Error ? err.message : 'Sayım kaydı yapılamadı.';
      showToast(msg, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCode.trim()) {
      showToast('Lütfen varlık kodunu veya barkodunu girin.', 'warning');
      return;
    }
    executeScan(assetCode, scannedLocation);
  };

  if (!isOpen || !auditId) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Barkod / QR Sayım Okutma (${auditCode || 'Seans'})`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Kontrol Şeridi: Modlar ve Ses */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('MANUAL')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'MANUAL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ScanLine className="w-3.5 h-3.5" />
              Lazer / Manuel Giriş
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CAMERA')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'CAMERA'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Kamera ile Say
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={(e) => setContinuousMode(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold">Hızlı Sayım Modu</span>
            </label>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded transition-colors ${
                soundEnabled ? 'text-blue-600 hover:bg-blue-100' : 'text-slate-400 hover:bg-slate-200'
              }`}
              title={soundEnabled ? 'Bip Sesi Açık' : 'Bip Sesi Kapalı'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* KAMERA VİZÖR ALANI */}
        {activeTab === 'CAMERA' && (
          <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center border-2 border-slate-700">
            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Lazer Tarayıcı Hedef Vizörü */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 border-2 border-dashed border-emerald-400 rounded-2xl relative shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    {/* Köşe Vurguları */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-lg" />
                    {/* Kırmızı Lazer Tarama Çizgisi */}
                    <div className="absolute left-2 right-2 h-0.5 bg-red-500 animate-pulse top-1/2 shadow-[0_0_10px_red]" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Kamera Hazır (Vizöre QR/Barkodu Yaklaştırın)
                  </span>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="text-slate-300 hover:text-white flex items-center gap-1"
                  >
                    <CameraOff className="w-3.5 h-3.5" /> Kapat
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center p-6 text-slate-400 space-y-3">
                <Camera className="w-12 h-12 mx-auto text-slate-500" />
                <p className="text-sm font-medium text-slate-300">
                  {cameraError || 'Kamera akışı başlatılamadı veya izin verilmedi.'}
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                >
                  Kamerayı Yeniden Başlat
                </button>
              </div>
            )}
          </div>
        )}

        {/* FORM GİRİŞ ALANI */}
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Varlık Kodu / Barkod Girişi */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Okutulan Demirbaş Barkod / Varlık Kodu *
              </label>
              <div className="relative">
                <ScanLine className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  id="audit-scan-code-input"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold uppercase tracking-wider"
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                  placeholder="Örn: GBZ-AST-001 veya 8690001001"
                  required
                  autoFocus
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Barkod tabancası veya kamera okuduğunda kod otomatik işlenir.
              </span>
            </div>

            {/* Bulunulan Mekan / Oda */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Taranan Fiziki Mahalli / Oda *
                </label>
                <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lockLocation}
                    onChange={(e) => setLockLocation(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                  />
                  <span>Odayı Sabitle</span>
                </label>
              </div>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  id="audit-scan-location-input"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={scannedLocation}
                  onChange={(e) => setScannedLocation(e.target.value)}
                  required
                  placeholder="Örn: Ana Bina 1. Kat No: 105"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Sabitlendiğinde ardışık sayımlarda oda bilgisi korunur.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              Bu oturumda okutulan: <strong>{sessionScans.length} adet</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <QrCode className="w-3.5 h-3.5" />
                {isSubmitting ? 'Kaydediliyor...' : 'Sayıma İşle'}
              </button>
            </div>
          </div>
        </form>

        {/* CANLI OKUTMA GEÇMİŞİ AKIŞI (Bu Seans) */}
        {sessionScans.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Son Okutulan Varlıklar
            </h5>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {sessionScans.map((s, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-all ${
                    s.matchStatus === 'DOGRU_KONUM'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : s.matchStatus === 'FARKLI_KONUMDA'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                      : 'bg-rose-50/70 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {s.matchStatus === 'DOGRU_KONUM' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : s.matchStatus === 'FARKLI_KONUMDA' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-mono font-bold">{s.assetCode}</span>
                      <span className="mx-1.5 text-slate-400">•</span>
                      <span className="font-medium">{s.assetName}</span>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-600">
                    <span>{s.scannedLocation}</span>
                    {s.matchStatus === 'FARKLI_KONUMDA' && (
                      <span className="block text-[10px] text-amber-700 font-semibold">
                        (Beklenen: {s.expectedLocation})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
