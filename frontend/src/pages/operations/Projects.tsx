import { useState, useEffect } from "react";
import { Briefcase, Calendar, CheckSquare, Plus, MoreHorizontal, Loader2, X, Check } from "lucide-react";
import { apiFetch } from "../../lib/api";

interface Project {
  id: string;
  title: string;
  deadline: string;
  status: string;
  tasks: any[];
  client?: { name: string };
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', deadline: '', status: 'planejamento', clientId: '' });
  const [clients, setClients] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [projRes, cliRes] = await Promise.all([
        apiFetch('/api/projects'),
        apiFetch('/api/clients')
      ]);
      setProjects(await projRes.json());
      setClients(await cliRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(newProject)
      });
      setIsModalOpen(false);
      setNewProject({ title: '', deadline: '', status: 'planejamento', clientId: '' });
      fetchData();
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const statusMap = {
    planejamento: { label: 'Planejamento', color: 'bg-blue-100 text-blue-700' },
    execucao: { label: 'Em Execução', color: 'bg-orange-100 text-orange-700' },
    revisao: { label: 'Revisão', color: 'bg-purple-100 text-purple-700' },
    concluido: { label: 'Concluído', color: 'bg-green-100 text-green-700' },
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Projetos Ativos</h1>
          <p className="text-gray-500">Gestão de entregas e cronogramas da agência.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all font-medium shadow-md shadow-blue-200"
        >
          <Plus size={18} />
          <span>Criar Projeto</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.length === 0 ? (
          <div className="lg:col-span-2 text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Briefcase className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-medium">Nenhum projeto ativo no momento.</p>
          </div>
        ) : projects.map((p) => {
          const completedTasks = p.tasks?.filter(t => t.completed).length || 0;
          const totalTasks = p.tasks?.length || 0;
          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          const status = statusMap[p.status as keyof typeof statusMap] || statusMap.planejamento;

          return (
            <div key={p.id} className="glass-card flex flex-col gap-6 group hover:border-primary/50 transition-all">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded w-fit ${status.color}`}>
                    {status.label}
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 mt-2">{p.title}</h3>
                  {p.client && <p className="text-xs text-gray-500 font-medium">Cliente: {p.client.name}</p>}
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreHorizontal size={20} />
                </button>
              </div>

              <div className="flex items-center gap-6 py-4 border-y border-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar size={16} />
                  <span>Prazo: {new Date(p.deadline).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckSquare size={16} />
                  <span>{completedTasks}/{totalTasks} Tarefas</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-600">Progresso</span>
                  <span className="text-primary">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${progress}%` }}
                    className="h-full bg-primary transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CRIAR PROJETO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Novo Projeto</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Título do Projeto</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={newProject.title}
                  onChange={e => setNewProject({...newProject, title: e.target.value})}
                  placeholder="Ex: Lançamento Produto X"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Cliente</label>
                <select 
                  required
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={newProject.clientId}
                  onChange={e => setNewProject({...newProject, clientId: e.target.value})}
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Prazo Final</label>
                  <input 
                    required
                    type="date" 
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                    value={newProject.deadline}
                    onChange={e => setNewProject({...newProject, deadline: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Status</label>
                  <select 
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                    value={newProject.status}
                    onChange={e => setNewProject({...newProject, status: e.target.value})}
                  >
                    <option value="planejamento">Planejamento</option>
                    <option value="execucao">Execução</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Plus size={20}/>}
                Criar Projeto
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
