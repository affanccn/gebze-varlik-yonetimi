import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tag, Search } from 'lucide-react';
import { hierarchyService } from '../../services/hierarchyService';
import { assetService } from '../../services/assetService';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/Badge';
import { AssetCategory } from '../../types/hierarchy';

export const CategoriesView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<AssetCategory | null>(null);

  // 1. Kategoriler query
  const { data: categories = [], isLoading } = useQuery<AssetCategory[]>({
    queryKey: ['categories'],
    queryFn: hierarchyService.getCategories,
  });

  // 2. Seçili kategorinin varlıkları query
  const { data: categoryAssetsData } = useQuery({
    queryKey: ['category-assets', selectedCat?.id],
    queryFn: () => assetService.getAll({ categoryId: selectedCat!.id, size: 200 }),
    enabled: selectedCat != null,
  });
  const categoryAssets = categoryAssetsData?.items || [];

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            16 Ana Varlık Kategorisi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Taşınır Mal Yönetmeliği ve belediye standartlarına göre gruplandırılmış ana varlık kategorileri
          </p>
        </div>

        <div className="w-full sm:w-72">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kategori veya kod ara..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gebze-navy/20"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <Tag className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <h3 className="font-semibold text-slate-700">Kategori Bulunamadı</h3>
          <p className="text-xs text-slate-400 mt-1">Arama kriterlerinize uygun varlık kategorisi bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setSelectedCat(cat)}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-bold text-gebze-navy bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {cat.code}
                  </span>
                  <span className="text-xl">
                    {cat.icon || '📦'}
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 group-hover:text-gebze-navy transition-colors">
                  {cat.name}
                </h3>

                <p className="text-xs text-slate-500 mt-2 line-clamp-2 min-h-8">
                  {cat.description || 'Taşınır mal envanteri standart kategori kaydı.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-gebze-navy bg-blue-50 px-2 py-0.5 rounded">
                  {cat.assetCount} Demirbaş
                </span>
                <span className="text-gebze-navy font-semibold text-[11px] group-hover:underline">
                  Varlıkları Gör &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kategori Demirbaşları Modalı */}
      <Modal
        isOpen={selectedCat != null}
        onClose={() => setSelectedCat(null)}
        title={selectedCat ? `${selectedCat.name} (${selectedCat.code})` : 'Kategori Varlıkları'}
        subtitle={selectedCat ? `${selectedCat.assetCount} Kayıtlı Demirbaş` : ''}
        maxWidth="2xl"
      >
        {selectedCat && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Kod</th>
                    <th className="py-2.5 px-3">Demirbaş Adı</th>
                    <th className="py-2.5 px-3">Müdürlük</th>
                    <th className="py-2.5 px-3">Konum</th>
                    <th className="py-2.5 px-3">Zimmetli</th>
                    <th className="py-2.5 px-3 text-right">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {categoryAssets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Bu kategoriye kayıtlı aktif demirbaş bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    categoryAssets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-semibold text-gebze-navy">{asset.code}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{asset.name}</td>
                        <td className="py-2 px-3 text-slate-600">{asset.departmentName || '-'}</td>
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
