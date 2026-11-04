import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Download,
} from 'lucide-react';
import { documentService } from '../../services/documentService';
import { useToast } from '../../hooks/useToast';
import { Card } from '../../components/common/Card';
import { formatDate } from '../../components/common/formatters';
import { AssetDocument } from '../../types/document';

export const DocumentsView: React.FC = () => {
  const { showToast } = useToast();
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: documents = [], isLoading } = useQuery<AssetDocument[]>({
    queryKey: ['documents', docTypeFilter],
    queryFn: () => documentService.getAll({ documentType: docTypeFilter || undefined }),
  });

  const filteredDocuments = documents.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      d.docCode.toLowerCase().includes(q) ||
      d.title.toLowerCase().includes(q) ||
      d.documentType.toLowerCase().includes(q) ||
      (d.assetName && d.assetName.toLowerCase().includes(q)) ||
      (d.documentNo && d.documentNo.toLowerCase().includes(q)) ||
      (d.issuedBy && d.issuedBy.toLowerCase().includes(q))
    );
  });

  const handleDownload = (doc: AssetDocument) => {
    showToast(`"${doc.title}" belgesi indiriliyor (${doc.fileName})`, 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Belge ve Evrak Arşivi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Fatura, garanti belgesi, zimmet tutanakları ve teknik şartnamelerin dijital arşiv yönetimi
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-gebze-navy/20"
          >
            <option value="">Tüm Belge Türleri</option>
            <option value="Fatura">Fatura</option>
            <option value="Garanti Belgesi">Garanti Belgesi</option>
            <option value="Zimmet Tutanağı">Zimmet Tutanağı</option>
            <option value="Bakım & Onarım Raporu">Bakım & Onarım Raporu</option>
            <option value="Teknik Şartname">Teknik Şartname</option>
            <option value="TİF Belgesi">TİF Belgesi</option>
          </select>

          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Evrak no, başlık veya varlık ara..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gebze-navy/20"
              />
            </div>
          </div>
        </div>
      </div>

      <Card
        title={`Kayıtlı Dijital Evraklar (${filteredDocuments.length})`}
        subtitle="Belediye varlıkları ile ilişkilendirilmiş resmi belgeler"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Evrak Kodu</th>
                <th className="py-3 px-4">Belge Türü</th>
                <th className="py-3 px-4">Belge Başlığı</th>
                <th className="py-3 px-4">İlişkili Varlık</th>
                <th className="py-3 px-4">Evrak / Fatura No</th>
                <th className="py-3 px-4">Düzenleyen</th>
                <th className="py-3 px-4">Geçerlilik</th>
                <th className="py-3 px-4">Dosya (Boyut)</th>
                <th className="py-3 px-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="py-3 px-4">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    Arama kriterlerinize uygun belge kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gebze-navy">
                      <span className="bg-slate-100 px-2 py-0.5 rounded">{doc.docCode}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 font-semibold px-2 py-0.5 rounded text-[11px]">
                        {doc.documentType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {doc.title}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {doc.assetName || <span className="text-slate-400 italic">Genel Evrak</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {doc.documentNo || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {doc.issuedBy || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDate(doc.validUntil) || 'Süresiz'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <span>{doc.fileName}</span>
                      <span className="text-slate-400 ml-1">({doc.fileSizeKb} KB)</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gebze-navy hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        İndir
                      </button>
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
