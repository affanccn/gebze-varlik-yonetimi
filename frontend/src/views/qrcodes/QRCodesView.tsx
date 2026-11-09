import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  QrCode,
  Search,
  Printer,
  Clock,
} from 'lucide-react';
import { assetService } from '../../services/assetService';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/Badge';
import { QRCodeSvg } from '../../components/common/QRCodeSvg';
import { formatCurrency } from '../../components/common/formatters';
import { AssetDetailResponse } from '../../types/asset';

export const QRCodesView: React.FC = () => {
  const [lookupCode, setLookupCode] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  // 1. Etiket için varlıklar listesi (ilk 18 varlık)
  const { data: assetsData, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['assets-qr'],
    queryFn: () => assetService.getAll({ size: 18 }),
  });
  const assets = assetsData?.items || [];

  // 2. Anlık sorgulanan varlık
  const { data: lookupData, isFetching: isSearching } = useQuery({
    queryKey: ['asset-lookup', submittedQuery],
    queryFn: () => assetService.getAll({ query: submittedQuery, size: 10 }),
    enabled: !!submittedQuery,
  });
  const lookupResults = lookupData?.items || [];

  // 3. Bulunan ilk varlığın detayını çek
  const firstFoundAsset = lookupResults.length > 0 ? lookupResults[0] : null;
  const { data: assetDetail } = useQuery<AssetDetailResponse>({
    queryKey: ['asset-detail', firstFoundAsset?.id],
    queryFn: () => assetService.getById(firstFoundAsset!.id),
    enabled: firstFoundAsset != null,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupCode.trim()) {
      setSubmittedQuery(lookupCode.trim());
    }
  };

  const handlePrintAll = () => {
    window.print();
  };

  const activeAsset = assetDetail?.asset || firstFoundAsset;
  const recentMovements = assetDetail?.movements || [];

  return (
    <div className="space-y-6">
      {/* Başlık ve Toplu Yazdır */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            QR Kod ve Etiket Yönetimi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Demirbaş barkod/QR kod sorgulama ve basıma hazır kurumsal taşınır etiketi şablonları
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintAll}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-gebze-navy hover:bg-blue-900 text-white shadow-xs transition-colors"
        >
          <Printer className="w-4 h-4" />
          Etiketleri Yazdır
        </button>
      </div>

      {/* 1. Hızlı QR / Barkod Sorgulama Alanı */}
      <Card
        title="Anlık Barkod / QR Kod Sorgulama"
        subtitle="Optik okuyucu veya klavye ile varlık kodu girerek tüm hiyerarşi ve zimmet bilgilerini getirin"
      >
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              placeholder="Örn: GBZ-AST-001 veya barkod numarası..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gebze-navy/20 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !lookupCode.trim()}
            className="px-4 py-2 text-xs font-semibold bg-gebze-navy hover:bg-blue-900 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            {isSearching ? 'Sorgulanıyor...' : 'Sorgula'}
          </button>
        </form>

        {/* Sorgu Sonucu Kartı */}
        {submittedQuery && (
          <div className="mt-4">
            {isSearching ? (
              <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-500 animate-pulse">
                Varlık bilgileri ve hareket geçmişi getiriliyor...
              </div>
            ) : !activeAsset ? (
              <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center text-xs text-rose-700">
                <p className="font-bold text-sm">Varlık Bulunamadı</p>
                <p className="mt-1">
                  "{submittedQuery}" koduna sahip kayıt Gebze Belediyesi envanterinde yer almıyor.
                </p>
              </div>
            ) : (
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
                  <div className="flex items-start gap-3">
                    <QRCodeSvg value={activeAsset.code} size={56} className="border border-slate-200 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={activeAsset.status} />
                        <span className="font-mono text-xs font-bold text-gebze-navy">
                          {activeAsset.code}
                        </span>
                        {activeAsset.barcode && (
                          <span className="text-slate-400 font-mono text-xs">
                            Barkod: {activeAsset.barcode}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{activeAsset.name}</h3>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 text-xs block">Tahmini Değer</span>
                    <span className="text-lg font-bold text-emerald-700">
                      {formatCurrency(activeAsset.estimatedValue)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 mt-4">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Kurumsal Hiyerarşi</span>
                    <span className="font-semibold text-slate-800">
                      {activeAsset.departmentName || activeAsset.unit || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Fiziki Konum</span>
                    <span className="font-semibold text-slate-800">
                      {activeAsset.buildingName ? `${activeAsset.buildingName} - ${activeAsset.floorName || ''}` : '-'} &bull; {activeAsset.roomNumber ? `Oda ${activeAsset.roomNumber}` : activeAsset.location || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Zimmetli Personel</span>
                    <span className="font-semibold text-slate-800">
                      {activeAsset.assignee || 'Atanmamış (Depoda)'}
                    </span>
                  </div>
                </div>

                {recentMovements.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Son Hareket: <strong>{recentMovements[0].typeLabel}</strong> &mdash; {recentMovements[0].toLocation} ({recentMovements[0].timestamp})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 2. Basıma Hazır Kurumsal Etiketler Önizleme Grid'i */}
      <Card
        title="Basıma Hazır Kurumsal Etiketler"
        subtitle="T.C. Gebze Belediyesi standart taşınır demirbaş etiket şablonu (Termal / Lazer Barkod Uyumlu)"
      >
        {isLoadingAssets ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="max-h-[calc(100vh-330px)] min-h-[360px] overflow-y-auto scrollbar-thin p-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2">
              {assets.slice(0, 18).map((asset) => {
              const roomStr = asset.roomNumber ? `Oda ${asset.roomNumber}` : asset.location || '-';

              return (
                <div
                  key={asset.id}
                  className="bg-white border-2 border-slate-300 rounded-lg p-3 shadow-2xs flex items-center gap-3.5 print:break-inside-avoid print:border-black"
                >
                  {/* Sol QR Görseli */}
                  <div className="shrink-0 flex flex-col items-center">
                    <QRCodeSvg value={asset.code} size={54} />
                    <span className="text-[9px] font-mono text-slate-500 font-bold mt-1">
                      {asset.code}
                    </span>
                  </div>

                  {/* Sağ Kurumsal Etiket Bilgileri */}
                  <div className="min-w-0 flex-1 text-[11px] leading-tight">
                    <div className="text-[9px] font-bold text-gebze-navy uppercase tracking-wider border-b border-slate-200 pb-0.5 mb-1">
                      T.C. GEBZE BELEDİYESİ
                    </div>
                    <div className="font-bold text-slate-900 truncate text-xs" title={asset.name}>
                      {asset.name}
                    </div>
                    <div className="text-slate-600 mt-1 space-y-0.5 text-[10px]">
                      <div>
                        <strong>Kod:</strong> <span className="font-mono">{asset.code}</span>
                      </div>
                      <div>
                        <strong>TİF:</strong> {asset.tifCode || '255.02.01'} &bull; <strong>Konum:</strong> {roomStr}
                      </div>
                      <div className="truncate">
                        <strong>Birim:</strong> {asset.departmentName || asset.unit || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
