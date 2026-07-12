import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Calendar,
  Clock,
  AlertTriangle,
  MoreVertical,
  Filter,
  Users,
  X,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Search,
  Building2,
  User,
  Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const PRIORITY_COLORS = {
  baixa: "bg-gray-100 text-gray-600",
  media: "bg-blue-100 text-blue-600",
  alta: "bg-orange-100 text-orange-600",
  urgente: "bg-red-100 text-red-600"
};

const COLUMNS = [
  { id: 'pendente', title: 'Pendente', color: 'bg-amber-400' },
  { id: 'em_andamento', title: 'Em Andamento', color: 'bg-blue-500' },
  { id: 'concluida', title: 'Concluída', color: 'bg-emerald-500' },
];

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      const res = await apiFetch(`/api/tasks`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDragStart = (id: string) => {
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessário para permitir o drop
  };

  const handleDrop = async (status: string) => {
    if (!draggedTaskId) return;

    // Otimismo no UI
    const updatedTasks = tasks.map(t => t.id === draggedTaskId ? { ...t, status } : t);
    setTasks(updatedTasks);

    try {
      await apiFetch(`/api/tasks/${draggedTaskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    } catch (err) {
      console.error(err);
      fetchTasks(); // Rollback se falhar
    }
    setDraggedTaskId(null);
  };

  if (loading) return <div className="flex items-center justify-center h-screen animate-pulse text-gray-400">Carregando ecossistema de tarefas...</div>;

  return (
    <div className="flex flex-col gap-8 p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">Visão 360° Operacional</h1>
          <p className="text-gray-500 font-medium">Controle total de humanos e agentes de IA em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
             <input className="pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl w-[250px] focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm shadow-sm" placeholder="Pesquisar em tudo..." />
          </div>
          <button 
            onClick={() => { setEditingTask(null); setModalOpen(true); }}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-slate-800 transition-all font-bold shadow-xl shadow-slate-200"
          >
            <Plus size={20} />
            <span>Nova Demanda</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar">
        {COLUMNS.map((col) => (
          <div 
            key={col.id} 
            className="flex-shrink-0 w-[350px] flex flex-col gap-4"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(col.id)}
          >
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${col.color} shadow-sm shadow-current/20`} />
                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">{col.title}</h3>
                <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-black">
                  {tasks.filter(t => t.status === col.id).length}
                </span>
              </div>
              <button className="text-gray-300 hover:text-gray-600 transition-colors">
                <MoreVertical size={16} />
              </button>
            </div>

            <div className={`flex flex-col gap-4 min-h-[500px] p-2 rounded-[32px] transition-colors ${draggedTaskId ? 'bg-gray-50/50 border-2 border-dashed border-gray-200' : ''}`}>
              {tasks
                .filter(t => t.status === col.id)
                .map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onDragStart={() => handleDragStart(task.id)}
                    onUpdate={fetchTasks} 
                    onEdit={(t) => { setEditingTask(t); setModalOpen(true); }} 
                  />
                ))}
              {tasks.filter(t => t.status === col.id).length === 0 && !draggedTaskId && (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[32px] p-10 opacity-50">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-200 mb-2">
                    <CheckSquare size={24} />
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">Tudo em dia</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <TaskModal 
            onClose={() => setModalOpen(false)} 
            onSuccess={() => { setModalOpen(false); fetchTasks(); }}
            initialData={editingTask}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskCard({ task, onUpdate, onEdit, onDragStart }: { task: any, onUpdate: () => void, onEdit: (task: any) => void, onDragStart: () => void }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'concluida';
  const isAi = task.assignedToId?.startsWith('ai-');

  return (
    <motion.div 
      layoutId={task.id}
      draggable
      onDragStart={onDragStart}
      onClick={() => onEdit(task)}
      className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden"
    >
      {/* Indicador de Executor */}
      <div className={`absolute top-0 right-0 w-12 h-12 flex items-center justify-center rounded-bl-[20px] ${isAi ? 'bg-blue-50 text-blue-500' : 'bg-gray-50 text-gray-400'}`}>
         {isAi ? <Cpu size={16} /> : <User size={16} />}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start pr-8">
          <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}`}>
            {task.priority}
          </span>
        </div>
        
        <div>
          <h4 className={`font-bold text-gray-900 leading-snug mb-1 group-hover:text-primary transition-colors ${task.status === 'concluida' ? 'line-through opacity-40' : ''}`}>
            {task.title}
          </h4>
          {task.client && (
            <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
               <Building2 size={12} />
               {task.client.corporateName}
            </div>
          )}
        </div>
        
        {task.description && (
          <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{task.description}</p>
        )}
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
          <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
            <Calendar size={12} />
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'Sem prazo'}
          </div>
          
          <div className="flex items-center -space-x-2">
             <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-500 overflow-hidden" title={task.assignedTo?.name || 'IA'}>
                {task.assignedTo?.name?.substring(0, 1) || <Cpu size={10} />}
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TaskModal({ onClose, onSuccess, initialData }: { onClose: () => void, onSuccess: () => void, initialData?: any }) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    priority: initialData?.priority || 'media',
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
    status: initialData?.status || 'pendente',
    assignedToId: initialData?.assignedToId || '',
    clientId: initialData?.clientId || '',
  });
  const [team, setTeam] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [teamRes, clientsRes] = await Promise.all([
        apiFetch('/api/org/team'),
        apiFetch('/api/clients')
      ]);
      setTeam(await teamRes.json());
      setClients(await clientsRes.json());
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = initialData ? `/api/tasks/${initialData.id}` : '/api/tasks';
      const method = initialData ? 'PATCH' : 'POST';
      await apiFetch(url, { method, body: JSON.stringify(formData) });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{initialData ? 'Atualizar Demanda' : 'Configurar Nova Demanda'}</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Orquestração Operacional Nexus360</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full shadow-sm transition-all border border-transparent hover:border-gray-100">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Título da Atividade</label>
            <input className="modal-input text-lg font-bold" placeholder="Ex: Protocolar petição inicial" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                 Responsável <Sparkles size={10} className="text-blue-500" />
              </label>
              <select className="modal-input font-bold" value={formData.assignedToId} onChange={e => setFormData({...formData, assignedToId: e.target.value})} required>
                <option value="">Delegar para...</option>
                <optgroup label="Agentes de IA (Autônomos)">
                  <option value="ai-legal">Nexus Legal AI</option>
                  <option value="ai-creative">Nexus Creative AI</option>
                  <option value="ai-sales">Nexus Sales AI</option>
                </optgroup>
                <optgroup label="Equipe Humana">
                  {team.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
                </optgroup>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Vincular Cliente (Visão 360)</label>
              <select className="modal-input font-bold" value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                <option value="">Demanda Interna (Sem vínculo)</option>
                {clients.map(c => (<option key={c.id} value={c.id}>{c.corporateName}</option>))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Instruções e Detalhes</label>
            <textarea className="modal-input min-h-[120px] resize-none" placeholder="O que deve ser feito detalhadamente..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Prioridade</label>
              <div className="flex gap-2">
                {['baixa', 'media', 'alta', 'urgente'].map(p => (
                  <button key={p} type="button" onClick={() => setFormData({...formData, priority: p})} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-xl border-2 transition-all ${formData.priority === p ? 'bg-primary border-primary text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Data Limite</label>
              <input type="date" className="modal-input font-bold" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 px-6 rounded-2xl border border-gray-100 text-gray-400 font-bold hover:bg-gray-50 transition-all uppercase tracking-widest text-[10px]">Cancelar</button>
            <button disabled={submitting} type="submit" className="flex-[2] py-4 px-6 rounded-2xl bg-primary text-white font-black hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
              {submitting ? 'Sincronizando...' : (initialData ? 'Atualizar Operação' : 'Ativar Demanda')}
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}