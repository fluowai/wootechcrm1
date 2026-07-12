import React from "react";
import { useState, useEffect } from "react";
import { 
  Image, 
  Film, 
  Music, 
  FileText, 
  Upload, 
  FolderPlus,
  MoreVertical,
  Trash2,
  Download,
  Eye,
  Search,
  Filter,
  Grid,
  List,
  Folder,
  X
} from "lucide-react";
import { apiFetch } from "../../lib/api";


interface Asset {
  id: string;
  name: string;
  type: string;
  mimeType?: string;
  size?: number;
  url?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  tags?: string;
  folderId?: string;
  createdAt: string;
}

interface Folder {
  id: string;
  name: string;
  parentId?: string;
  children?: Folder[];
}

const typeIcons: Record<string, React.FC<any>> = {
  image: Image,
  video: Film,
  audio: Music,
  document: FileText
};

const typeColors: Record<string, string> = {
  image: 'bg-purple-100 text-purple-600',
  video: 'bg-red-100 text-red-600',
  audio: 'bg-yellow-100 text-yellow-600',
  document: 'bg-blue-100 text-blue-600',
  template: 'bg-green-100 text-green-600'
};

export default function AssetsLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');

  const orgId = localStorage.getItem('nexus_org_id');

  useEffect(() => {
    fetchData();
  }, [orgId, selectedFolder, filterType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assetsRes, foldersRes] = await Promise.all([
        apiFetch(`/api/extras/assets?folderId=${selectedFolder || ''}&type=${filterType}`),
        apiFetch(`/api/extras/asset-folders`)
      ]);
      const assetsData = await assetsRes.json();
      const foldersData = await foldersRes.json();
      setAssets(assetsData);
      setFolders(foldersData);
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await apiFetch('/api/extras/assets', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          type: formData.get('type'),
          mimeType: formData.get('mimeType'),
          size: formData.get('size'),
          url: formData.get('url'),
          thumbnailUrl: formData.get('thumbnailUrl'),
          width: formData.get('width'),
          height: formData.get('height'),
          tags: formData.get('tags'),
          folderId: selectedFolder
        })
      });
      setShowUpload(false);
      fetchData();
    } catch (error) {
      console.error("Error uploading asset:", error);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await apiFetch('/api/extras/asset-folders', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          parentId: selectedFolder
        })
      });
      setShowNewFolder(false);
      fetchData();
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const deleteAsset = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) return;
    try {
      await apiFetch(`/api/extras/assets/${id}`, { method: 'DELETE' });
      fetchData();
      setSelectedAsset(null);
    } catch (error) {
      console.error("Error deleting asset:", error);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredAssets = assets.filter(a => 
    search ? a.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Biblioteca de Assets</h1>
          <p className="text-gray-500 mt-1">Gerencie suas imagens, vídeos e arquivos</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <FolderPlus size={18} />
            <span className="hidden sm:inline">Nova Pasta</span>
          </button>
          <button 
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all font-medium"
          >
            <Upload size={18} />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar arquivos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Todos os tipos</option>
            <option value="image">Imagens</option>
            <option value="video">Vídeos</option>
            <option value="audio">Áudio</option>
            <option value="document">Documentos</option>
            <option value="template">Templates</option>
          </select>
          
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            <button 
              onClick={() => setView('grid')}
              className={`p-2 ${view === 'grid' ? 'bg-primary text-white' : 'hover:bg-gray-50'}`}
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={() => setView('list')}
              className={`p-2 ${view === 'list' ? 'bg-primary text-white' : 'hover:bg-gray-50'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-6">
        {/* Folders Sidebar */}
        <div className="w-64 shrink-0 hidden lg:block">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Pastas</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  selectedFolder === null ? 'bg-blue-50 text-primary' : 'hover:bg-gray-50'
                }`}
              >
                <Folder size={18} />
                <span>Todos os arquivos</span>
              </button>
              
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedFolder === folder.id ? 'bg-blue-50 text-primary' : 'hover:bg-gray-50'
                  }`}
                >
                  <Folder size={18} />
                  <span>{folder.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Assets Grid/List */}
        <div className="flex-1">
          {loading ? (
            <div className={view === 'grid' 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              : "bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100"
            }>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={view === 'grid' ? "aspect-square bg-gray-100 rounded-xl animate-pulse" : "h-16 bg-gray-100 animate-pulse"} />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12">
              <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum arquivo encontrado</h3>
              <p className="text-gray-500 mb-4">Faça upload de imagens, vídeos ou documentos</p>
              <button 
                onClick={() => setShowUpload(true)}
                className="text-primary hover:underline"
              >
                Fazer Upload
              </button>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredAssets.map(asset => {
                const IconComponent = typeIcons[asset.type] || FileText;
                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`group relative aspect-square bg-gray-50 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all ${
                      selectedAsset?.id === asset.id ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    {asset.thumbnailUrl || asset.url ? (
                      <img 
                        src={asset.thumbnailUrl || asset.url} 
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <IconComponent className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                        <Eye size={18} />
                      </button>
                      <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                        <Download size={18} />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-white text-xs truncate">{asset.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Nome</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Tamanho</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Dimensões</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Data</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAssets.map(asset => (
                    <tr 
                      key={asset.id} 
                      onClick={() => setSelectedAsset(asset)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 ${typeColors[asset.type]} rounded-lg flex items-center justify-center`}>
                            {React.createElement(typeIcons[asset.type] || FileText, { size: 16 })}
                          </div>
                          <span className="font-medium">{asset.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize">{asset.type}</td>
                      <td className="px-4 py-3">{formatSize(asset.size)}</td>
                      <td className="px-4 py-3">{asset.width && asset.height ? `${asset.width}x${asset.height}` : '-'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(asset.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal - Upload */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Upload de Arquivo</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  placeholder="Nome do arquivo"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select 
                  name="type" 
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="image">Imagem</option>
                  <option value="video">Vídeo</option>
                  <option value="audio">Áudio</option>
                  <option value="document">Documento</option>
                  <option value="template">Template</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do Arquivo</label>
                <input 
                  type="url" 
                  name="url" 
                  required
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Thumbnail (opcional)</label>
                <input 
                  type="url" 
                  name="thumbnailUrl" 
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Largura</label>
                  <input 
                    type="number" 
                    name="width" 
                    placeholder="1080"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Altura</label>
                  <input 
                    type="number" 
                    name="height" 
                    placeholder="1080"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input 
                  type="text" 
                  name="tags" 
                  placeholder="tag1, tag2, tag3"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - New Folder */}
      {showNewFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Nova Pasta</h2>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Pasta</label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  placeholder="Nome da pasta"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowNewFolder(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}