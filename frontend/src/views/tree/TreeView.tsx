import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  ChevronDown,
  Building,
  DoorClosed,
  Layers,
  Users,
  GitFork,
  Landmark,
  Search,
  Package,
} from 'lucide-react';
import { hierarchyService } from '../../services/hierarchyService';
import { assetService } from '../../services/assetService';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/Badge';
import { QRCodeSvg } from '../../components/common/QRCodeSvg';
import { HierarchyTreeNode } from '../../types/hierarchy';
import { Asset } from '../../types/asset';

interface NodeMetadata {
  roomId?: number;
  deptId?: number;
  responsiblePerson?: string;
  managerName?: string;
  capacity?: number;
  qrCode?: string;
  [key: string]: unknown;
}

export const TreeView: React.FC = () => {
  const [treeMode, setTreeMode] = useState<'physical' | 'corporate'>('physical');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<HierarchyTreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ 'root-physical': true, 'root-corporate': true });

  const { data: treeRoot, isLoading, error } = useQuery({
    queryKey: ['hierarchy-tree', treeMode],
    queryFn: () => hierarchyService.getTree(treeMode),
  });

  const nodeMeta = (selectedNode?.metadata || {}) as NodeMetadata;

  // Extract room or dept id if selected
  const roomId: number | null = selectedNode?.type === 'ROOM'
    ? (nodeMeta.roomId ? Number(nodeMeta.roomId) : (typeof selectedNode.id === 'string' && selectedNode.id.startsWith('room-') ? Number(selectedNode.id.replace('room-', '')) : null))
    : null;

  const deptId: number | null = selectedNode?.type === 'DEPARTMENT'
    ? (nodeMeta.deptId ? Number(nodeMeta.deptId) : (typeof selectedNode.id === 'string' && selectedNode.id.startsWith('dept-') ? Number(selectedNode.id.replace('dept-', '')) : null))
    : null;

  // Assets in room query
  const { data: roomAssets = [] } = useQuery<Asset[]>({
    queryKey: ['room-assets', roomId],
    queryFn: () => hierarchyService.getAssetsInRoom(roomId!),
    enabled: roomId != null,
  });

  // Assets in dept query
  const { data: deptAssetsData } = useQuery({
    queryKey: ['dept-assets', deptId],
    queryFn: () => assetService.getAll({ departmentId: deptId!, size: 200 }),
    enabled: deptId != null,
  });
  const deptAssets = deptAssetsData?.items || [];

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const getNodeIcon = (type: string, _isExpanded: boolean) => {
    switch (type) {
      case 'MUNICIPALITY':
        return <Landmark className="w-4 h-4 text-gebze-navy" />;
      case 'BUILDING':
        return <Building className="w-4 h-4 text-sky-600" />;
      case 'FLOOR':
        return <Layers className="w-4 h-4 text-amber-600" />;
      case 'DEPARTMENT':
        return <Users className="w-4 h-4 text-indigo-600" />;
      case 'SUB_UNIT':
        return <GitFork className="w-4 h-4 text-teal-600" />;
      case 'ROOM':
        return <DoorClosed className="w-4 h-4 text-emerald-600" />;
      default:
        return <Package className="w-4 h-4 text-slate-500" />;
    }
  };

  const renderNode = (node: HierarchyTreeNode, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = !!expandedNodes[node.id];
    const isSelected = selectedNode?.id === node.id;

    const matchesSearch = !searchQuery ||
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (node.code && node.code.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => {
            setSelectedNode(node);
            if (hasChildren && !isExpanded) {
              toggleNode(node.id);
            }
          }}
          style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
          className={`flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer text-xs transition-colors ${
            isSelected
              ? 'bg-gebze-navy text-white font-semibold'
              : matchesSearch
              ? 'hover:bg-slate-100 text-slate-700'
              : 'opacity-40 hover:opacity-100 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
                className={`p-0.5 rounded hover:bg-slate-200/50 ${isSelected ? 'text-white' : 'text-slate-400'}`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <span className={isSelected ? 'text-white' : ''}>
              {getNodeIcon(node.type, isExpanded)}
            </span>
            <span className="truncate">{node.label}</span>
          </div>

          {node.count != null && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isSelected
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {node.count}
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-0.5">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const displayedAssets = roomId != null ? roomAssets : deptId != null ? deptAssets : [];

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Mod Seçimi */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Kurumsal ve Fiziksel Hiyerarşi Ağacı
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Yerleşke, bina, kat, oda veya kurumsal müdürlük hiyerarşisi üzerinden interaktif gezinti
          </p>
        </div>

        {/* Mod Butonları */}
        <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setTreeMode('physical');
              setSelectedNode(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              treeMode === 'physical'
                ? 'bg-white text-gebze-navy shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Fiziksel Yerleşke Ağacı
          </button>
          <button
            type="button"
            onClick={() => {
              setTreeMode('corporate');
              setSelectedNode(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              treeMode === 'corporate'
                ? 'bg-white text-gebze-navy shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Kurumsal Müdürlük Ağacı
          </button>
        </div>
      </div>

      {/* İki Panelli Düzen: Sol Ağaç, Sağ Detay & Demirbaşlar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sol Panel: Ağaç Gezgini (4 Kolon) */}
        <Card
          title={treeMode === 'physical' ? 'Fiziksel Hiyerarşi' : 'Müdürlük Hiyerarşisi'}
          subtitle={treeRoot ? `${treeRoot.count || 0} demirbaş tanımlı` : 'Yükleniyor...'}
          className="lg:col-span-5"
          action={
            <div className="w-40">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ağaçta ara..."
                  className="w-full pl-8 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gebze-navy"
                />
              </div>
            </div>
          }
        >
          {isLoading ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : error || !treeRoot ? (
            <div className="text-center py-8 text-rose-600 text-xs">
              Ağaç hiyerarşisi yüklenirken hata oluştu.
            </div>
          ) : (
            <div className="max-h-[650px] overflow-y-auto pr-1">
              {renderNode(treeRoot)}
            </div>
          )}
        </Card>

        {/* Sağ Panel: Düğüm Detayı ve Demirbaşlar (7 Kolon) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedNode ? (
            <Card
              title={selectedNode.label}
              subtitle={`${selectedNode.type} &bull; ${selectedNode.count || 0} Taşınır/Demirbaş`}
            >
              <div className="space-y-4">
                {/* Düğüm Meta Bilgileri */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl text-xs border border-slate-100">
                  <div>
                    <span className="text-slate-500">Hiyerarşik Tür:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedNode.type}</p>
                  </div>
                  {selectedNode.code && (
                    <div>
                      <span className="text-slate-500">Birim Kodu:</span>
                      <p className="font-mono font-semibold text-gebze-navy mt-0.5">{selectedNode.code}</p>
                    </div>
                  )}
                  {nodeMeta.responsiblePerson && (
                    <div>
                      <span className="text-slate-500">Sorumlu:</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{String(nodeMeta.responsiblePerson)}</p>
                    </div>
                  )}
                  {nodeMeta.managerName && (
                    <div>
                      <span className="text-slate-500">Birim Yöneticisi:</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{String(nodeMeta.managerName)}</p>
                    </div>
                  )}
                  {nodeMeta.capacity != null && (
                    <div>
                      <span className="text-slate-500">Kapasite:</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{String(nodeMeta.capacity)} Kişi</p>
                    </div>
                  )}
                  {nodeMeta.qrCode && (
                    <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                      <QRCodeSvg value={String(nodeMeta.qrCode)} size={36} />
                      <div>
                        <span className="text-slate-500 text-[10px]">QR Kodu:</span>
                        <p className="font-mono text-xs font-semibold text-slate-800">{String(nodeMeta.qrCode)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Alt Varlıklar Tablosu */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      Bu Düğümde Bulunan Demirbaşlar ({displayedAssets.length})
                    </h4>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[450px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Kod</th>
                          <th className="py-2.5 px-3">Demirbaş Adı</th>
                          <th className="py-2.5 px-3">Kategori</th>
                          <th className="py-2.5 px-3">Zimmetli</th>
                          <th className="py-2.5 px-3 text-right">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {displayedAssets.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500">
                              {roomId != null || deptId != null
                                ? 'Bu düğümde henüz kayıtlı demirbaş bulunmuyor.'
                                : 'Detaylı demirbaş listesini görmek için alt kat, oda veya müdürlük seçin.'}
                            </td>
                          </tr>
                        ) : (
                          displayedAssets.map((asset) => (
                            <tr key={asset.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-semibold text-gebze-navy">
                                {asset.code}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-900">
                                {asset.name}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {asset.category || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {asset.assignee || 'Depoda'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
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
            </Card>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-xl p-12 text-center text-slate-500 shadow-sm">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="font-semibold text-slate-700">Bir Hiyerarşi Düğümü Seçin</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Sol taraftaki ağaçtan herhangi bir Bina, Kat, Oda veya Müdürlük seçerek detaylarını ve içindeki demirbaşları görüntüleyin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
