import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
} from 'lucide-react';
import { movementService } from '../../services/movementService';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/Badge';
import { formatDateTime } from '../../components/common/formatters';
import { AssetMovement } from '../../types/movement';

export const MovementsView: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: movements = [], isLoading } = useQuery<AssetMovement[]>({
    queryKey: ['movements', typeFilter],
    queryFn: () => movementService.getAll({ type: typeFilter || undefined }),
  });

  const filteredMovements = movements.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.assetCode.toLowerCase().includes(q) ||
      m.assetName.toLowerCase().includes(q) ||
      (m.typeLabel && m.typeLabel.toLowerCase().includes(q)) ||
      (m.toLocation && m.toLocation.toLowerCase().includes(q)) ||
      (m.fromLocation && m.fromLocation.toLowerCase().includes(q)) ||
      (m.performedBy && m.performedBy.toLowerCase().includes(q)) ||
      (m.note && m.note.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Hareketler ve Konum Transferleri
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Demirbaşların zimmet, bakım, transfer, depo ve sonlandırma hareketlerinin denetim günlüğü
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-gebze-navy/20"
          >
            <option value="">Tüm Hareket Türleri</option>
            <option value="ZIMMET_VERME">Zimmet Verme</option>
            <option value="ZIMMET_IADE">Zimmet İade</option>
            <option value="TRANSFER">Lokasyon Transferi</option>
            <option value="BAKIMA_GONDERIM">Bakıma Gönderim</option>
            <option value="BAKIMDAN_DONUS">Bakımdan Dönüş</option>
            <option value="DEPOYA_CEKME">Depoya Çekme</option>
            <option value="HURDAYA_AYIRMA">Hurdaya Ayırma</option>
          </select>

          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Varlık kodu, isim, konum ara..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gebze-navy/20"
              />
            </div>
          </div>
        </div>
      </div>

      <Card
        title={`Varlık Hareket Kayıtları (${filteredMovements.length})`}
        subtitle="Gerçekleşen tüm fiziksel ve zimmet devir hareketleri"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tarih / Saat</th>
                <th className="py-3 px-4">Demirbaş</th>
                <th className="py-3 px-4">Hareket Türü</th>
                <th className="py-3 px-4">Çıkış Konumu</th>
                <th className="py-3 px-4">Varış Konumu</th>
                <th className="py-3 px-4">İşlemi Yapan</th>
                <th className="py-3 px-4">Açıklama / Not</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-3 px-4">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Arama kriterlerinize uygun hareket kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDateTime(m.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-gebze-navy">{m.assetCode}</span>
                      <p className="font-medium text-slate-900 mt-0.5">{m.assetName}</p>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={m.typeLabel || m.type} />
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {m.fromLocation || <span className="text-slate-400 italic">Depo / Başlangıç</span>}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {m.toLocation}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {m.performedBy}
                    </td>
                    <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate">
                      {m.note || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
