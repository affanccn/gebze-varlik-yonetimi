import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Phone,
  Mail,
  Search,
} from 'lucide-react';
import { hierarchyService } from '../../services/hierarchyService';
import { assetService } from '../../services/assetService';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/Badge';
import { Department, SubUnit } from '../../types/hierarchy';

export const DepartmentsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  // 1. Müdürlükler query
  const { data: departments = [], isLoading: isLoadingDepts } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: hierarchyService.getDepartments,
  });

  // 2. Alt birimler query
  const { data: subUnits = [] } = useQuery<SubUnit[]>({
    queryKey: ['sub-units'],
    queryFn: () => hierarchyService.getSubUnits(),
  });

  // 3. Seçili müdürlüğün varlıkları
  const { data: deptAssetsData } = useQuery({
    queryKey: ['dept-assets', selectedDept?.id],
    queryFn: () => assetService.getAll({ departmentId: selectedDept!.id, size: 200 }),
    enabled: selectedDept != null,
  });
  const deptAssets = deptAssetsData?.items || [];

  const filteredDepartments = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.managerName && d.managerName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Kurumsal Müdürlükler
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gebze Belediyesi kurumsal organizasyon şeması, müdürlükler ve alt şeflikler
          </p>
        </div>

        <div className="w-full sm:w-72">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Müdürlük, kod veya yönetici ara..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gebze-navy/20"
            />
          </div>
        </div>
      </div>

      {isLoadingDepts ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <h3 className="font-semibold text-slate-700">Müdürlük Bulunamadı</h3>
          <p className="text-xs text-slate-400 mt-1">Arama kriterinize uygun müdürlük kaydı bulunamadı.</p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-210px)] min-h-[400px] overflow-y-auto p-1 pr-2 rounded-xl scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDepartments.map((dept) => {
            const deptSubs = subUnits.filter((s) => s.departmentId === dept.id);

            return (
              <div
                key={dept.id}
                onClick={() => setSelectedDept(dept)}
                className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-teal-600 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold text-gebze-navy bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {dept.code}
                    </span>
                    <span className="text-xs font-bold text-gebze-navy bg-blue-50 px-2 py-0.5 rounded">
                      {dept.assetCount} Demirbaş
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 group-hover:text-gebze-navy transition-colors">
                    {dept.name}
                  </h3>

                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dept.managerName || <span className="text-slate-400 italic">Müdür Atanmamış</span>}</span>
                  </p>

                  <div className="mt-4">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Alt Birimler & Şeflikler ({deptSubs.length})
                    </span>
                    {deptSubs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {deptSubs.map((sub) => (
                          <span
                            key={sub.id}
                            className="bg-slate-50 text-slate-600 border border-slate-200 text-[11px] px-2 py-0.5 rounded"
                          >
                            {sub.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Tanımlı alt birim bulunmuyor.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    {dept.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {dept.phone}
                      </span>
                    )}
                    {dept.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {dept.email}
                      </span>
                    )}
                  </div>
                  <span className="text-gebze-navy font-semibold text-[11px] group-hover:underline">
                    Varlıkları İncele &rarr;
                  </span>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Müdürlük Varlıkları Modalı */}
      <Modal
        isOpen={selectedDept != null}
        onClose={() => setSelectedDept(null)}
        title={selectedDept ? `${selectedDept.name} (${selectedDept.code})` : 'Müdürlük Detayları'}
        subtitle={selectedDept ? `Birim Müdürü: ${selectedDept.managerName || 'Atanmamış'} &bull; ${selectedDept.assetCount} Varlık` : ''}
        maxWidth="2xl"
      >
        {selectedDept && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Kod</th>
                    <th className="py-2.5 px-3">Demirbaş Adı</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Konum / Oda</th>
                    <th className="py-2.5 px-3">Zimmetli</th>
                    <th className="py-2.5 px-3 text-right">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {deptAssets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Bu müdürlüğe kayıtlı aktif demirbaş bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    deptAssets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-semibold text-gebze-navy">{asset.code}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{asset.name}</td>
                        <td className="py-2 px-3 text-slate-500">{asset.category || '-'}</td>
                        <td className="py-2 px-3 text-slate-600">{asset.roomNumber ? `Oda ${asset.roomNumber}` : asset.location || '-'}</td>
                        <td className="py-2 px-3 text-slate-600">{asset.assignee || 'Depoda'}</td>
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
        )}
      </Modal>
    </div>
  );
};
