import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Phone,
  Mail,
  Package,
} from 'lucide-react';
import { personnelService } from '../../services/personnelService';
import { hierarchyService } from '../../services/hierarchyService';
import { assetService } from '../../services/assetService';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/Badge';
import { Personnel } from '../../types/personnel';
import { Department } from '../../types/hierarchy';
import { Asset } from '../../types/asset';

export const PersonnelView: React.FC = () => {
  const [deptFilter, setDeptFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);

  // 1. Müdürlükler listesi (filtre select için)
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: hierarchyService.getDepartments,
  });

  // 2. Personel listesi query
  const { data: personnelList = [], isLoading } = useQuery<Personnel[]>({
    queryKey: ['personnel', deptFilter],
    queryFn: () => personnelService.getAll({ departmentId: deptFilter ? Number(deptFilter) : undefined }),
  });

  // 3. Seçili personelin zimmetli varlıkları
  const { data: assignedAssets = [] } = useQuery<Asset[]>({
    queryKey: ['personnel-assets', selectedPersonnel?.id],
    queryFn: () => assetService.getAll({ assignedPersonnelId: selectedPersonnel!.id }),
    enabled: selectedPersonnel != null,
  });

  const filteredPersonnel = personnelList.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.registrationNumber.toLowerCase().includes(q) ||
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.departmentName && p.departmentName.toLowerCase().includes(q)) ||
      (p.phone && p.phone.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Personel Yönetimi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gebze Belediyesi çalışanları, birim dağılımları ve zimmet takip listesi
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-gebze-navy/20"
          >
            <option value="">Tüm Müdürlükler ({departments.length})</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ad, unvan, sicil no ara..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gebze-navy/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Personel Tablosu */}
      <Card
        title={`Belediye Personeli (${filteredPersonnel.length})`}
        subtitle="Zimmetli demirbaşları listelemek veya incelemek için personeli seçin"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Sicil No</th>
                <th className="py-3 px-4">Ad Soyad / Görevi</th>
                <th className="py-3 px-4">Müdürlük & Birim</th>
                <th className="py-3 px-4">Oda / Lokasyon</th>
                <th className="py-3 px-4">İletişim</th>
                <th className="py-3 px-3 text-center">Durum</th>
                <th className="py-3 px-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-3 px-4">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredPersonnel.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Arama kriterlerinize uygun personel bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredPersonnel.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gebze-navy">
                      <span className="bg-slate-100 px-2 py-0.5 rounded">{p.registrationNumber}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 text-sm">{p.fullName}</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">{p.title || 'Personel'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800">{p.departmentName || '-'}</span>
                      {p.subUnitName && (
                        <p className="text-slate-500 text-[11px]">{p.subUnitName}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.roomNumber ? (
                        <span>Oda {p.roomNumber} {p.roomName ? `(${p.roomName})` : ''}</span>
                      ) : (
                        <span className="text-slate-400 italic">Oda Tanımsız</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        {p.phone && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {p.phone}
                          </div>
                        )}
                        {p.email && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {p.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {p.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedPersonnel(p)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gebze-navy hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors"
                      >
                        <Package className="w-3 h-3" />
                        Zimmetleri Gör
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Personele Zimmetli Varlıklar Modalı */}
      <Modal
        isOpen={selectedPersonnel != null}
        onClose={() => setSelectedPersonnel(null)}
        title={selectedPersonnel ? `${selectedPersonnel.fullName}` : 'Personel Zimmetleri'}
        subtitle={selectedPersonnel ? `Sicil: ${selectedPersonnel.registrationNumber} &bull; ${selectedPersonnel.departmentName || ''}` : ''}
        maxWidth="2xl"
      >
        {selectedPersonnel && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px]">Unvan / Görev</span>
                <span className="font-semibold text-slate-800">{selectedPersonnel.title || 'Personel'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Oda</span>
                <span className="font-semibold text-slate-800">{selectedPersonnel.roomNumber ? `Oda ${selectedPersonnel.roomNumber}` : 'Oda Atanmamış'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">İletişim Telefon</span>
                <span className="font-semibold text-slate-800">{selectedPersonnel.phone || '-'}</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">
                Personele Zimmetli Varlıklar ({assignedAssets.length})
              </h4>
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Kod</th>
                      <th className="py-2.5 px-3">Demirbaş Adı</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Konum</th>
                      <th className="py-2.5 px-3 text-right">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {assignedAssets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          Bu personele tahsis edilmiş zimmetli demirbaş bulunmuyor.
                        </td>
                      </tr>
                    ) : (
                      assignedAssets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-semibold text-gebze-navy">{asset.code}</td>
                          <td className="py-2 px-3 font-medium text-slate-900">{asset.name}</td>
                          <td className="py-2 px-3 text-slate-500">{asset.category || '-'}</td>
                          <td className="py-2 px-3 text-slate-600">{asset.roomNumber ? `Oda ${asset.roomNumber}` : asset.location || '-'}</td>
                          <td className="py-2 px-3 text-right">
                            <StatusBadge status={asset.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
