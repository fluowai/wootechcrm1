import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  X,
  Video,
  Phone,
  Mail,
  Pencil,
  Trash2,
  Copy,
  Check,
  Link2,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../../lib/api";
import { NexusMeetScheduler } from "../../components/crm/NexusMeetScheduler";

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const TYPE_COLORS: Record<string, string> = {
  reunion: "bg-blue-100 text-blue-700 border-blue-300",
  task: "bg-purple-100 text-purple-700 border-purple-300",
  deadline: "bg-red-100 text-red-700 border-red-300",
  birthday: "bg-pink-100 text-pink-700 border-pink-300",
  holiday: "bg-green-100 text-green-700 border-green-300"
};

const TYPE_LABELS: Record<string, string> = {
  reunion: "Reunião",
  task: "Tarefa",
  deadline: "Deadline",
  birthday: "Aniversário",
  holiday: "Feriado"
};

const TYPE_ICONS: Record<string, any> = {
  reunion: Video,
  task: CalendarIcon,
  deadline: CalendarIcon,
  birthday: CalendarIcon,
  holiday: CalendarIcon
};

export default function Calendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [showMeetScheduler, setShowMeetScheduler] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState('GERAL');
  const [members, setMembers] = useState<any[]>([]);

  const fetchMembers = async () => {
    try {
      const res = await apiFetch('/api/org/team');
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setMembers([]);
    }
  };

  const DEPARTMENTS = [
    { id: 'GERAL', label: 'Visão Geral', icon: Users },
    { id: 'BDR', label: 'Agendas BDR', icon: CalendarIcon },
    { id: 'SDR', label: 'Agendas SDR', icon: Phone },
    { id: 'CLOSER', label: 'Agendas Closers', icon: CheckCircle2 }
  ];

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const url = activeDepartment === 'GERAL' ? '/api/calendar' : `/api/calendar?department=${activeDepartment}`;
      const res = await apiFetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchMembers();
  }, [activeDepartment]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(e => {
      const eventDate = new Date(e.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;
    try {
      await apiFetch(`/api/calendar/${eventId}`, { method: 'DELETE' });
      fetchEvents();
    } catch (err) {
      console.error("Error deleting event:", err);
    }
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setModalOpen(true);
  };

  const handleCopyLink = (link: string) => {
    const fullLink = `${window.location.origin}${link}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(currentDate);
  const selectedEvents = getEventsForDate(selectedDate);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Calendário</h1>
          <p className="text-gray-500">Agende reuniões, deadlines e eventos.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
          {DEPARTMENTS.map(dept => (
            <button
              key={dept.id}
              onClick={() => setActiveDepartment(dept.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeDepartment === dept.id ? 'bg-primary text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <dept.icon size={14} />
              {dept.label}
            </button>
          ))}
        </div>
        <button 
          onClick={() => { setEditingEvent(null); setModalOpen(true); }}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-blue-600 transition-all font-bold shadow-lg shadow-blue-200"
        >
          <Plus size={18} />
          <span>Novo Evento</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <div className="lg:col-span-2 glass-card p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-gray-900">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(day => (
              <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const dayEvents = day ? getEventsForDate(day) : [];
              const isToday = day?.toDateString() === new Date().toDateString();
              const isSelected = day?.toDateString() === selectedDate.toDateString();
              
              return (
                <div 
                  key={i}
                  onClick={() => day && setSelectedDate(day)}
                  className={`
                    min-h-[80px] p-2 rounded-lg border cursor-pointer transition-all
                    ${!day ? 'border-transparent' : isSelected ? 'border-primary bg-blue-50' : isToday ? 'border-gray-300 bg-gray-50' : 'border-gray-100 hover:border-gray-200'}
                  `}
                >
                  {day && (
                    <>
                      <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </span>
                      <div className="flex flex-col gap-1 mt-1">
                        {dayEvents.slice(0, 2).map((e, i) => (
                          <div key={i} className={`text-[10px] px-1 py-0.5 rounded truncate ${TYPE_COLORS[e.type] || 'bg-gray-100'}`}>
                            {e.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] text-gray-400">+{dayEvents.length - 2}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Eventos do dia */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-gray-900 mb-4">
            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <div className="flex flex-col gap-3">
            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
                <CalendarIcon size={32} className="opacity-30" />
                <p className="text-sm">Nenhum evento neste dia</p>
                <button 
                  onClick={() => { setEditingEvent(null); setModalOpen(true); }}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  + Adicionar evento
                </button>
              </div>
            ) : (
              selectedEvents.map(event => {
                const Icon = TYPE_ICONS[event.type] || CalendarIcon;
                return (
                  <div key={event.id} className={`p-4 rounded-xl border ${TYPE_COLORS[event.type] || 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {TYPE_LABELS[event.type] || event.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEditEvent(event)}
                          className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-500"
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm">{event.title}</h4>
                    {event.description && (
                      <p className="text-xs text-gray-500 mt-1">{event.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                      <Clock size={12} />
                      <span>{new Date(event.startDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    
                    {/* Link de reunião Nexus Meet */}
                    {event.meetingLink && (
                      <div className="mt-3 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                          <Link2 size={10} />
                          <span className="truncate">{window.location.origin}{event.meetingLink}</span>
                          <button
                            onClick={() => handleCopyLink(event.meetingLink)}
                            className="ml-auto p-1 hover:bg-white/50 rounded transition-colors"
                            title="Copiar link"
                          >
                            {copiedLink === event.meetingLink ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <a 
                          href={event.meetingLink}
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md"
                        >
                          <Video size={14} />
                          Entrar na Reunião
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <EventModal 
            onClose={() => { setModalOpen(false); setEditingEvent(null); }} 
            onSuccess={() => { setModalOpen(false); setEditingEvent(null); fetchEvents(); }}
            initialDate={selectedDate}
            editingEvent={editingEvent}
            members={members}
          />
        )}
        {showMeetScheduler && (
          <NexusMeetScheduler 
            onClose={() => setShowMeetScheduler(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EventModal({ onClose, onSuccess, initialDate, editingEvent, members }: { 
  onClose: () => void, 
  onSuccess: () => void, 
  initialDate: Date,
  editingEvent?: any,
  members: any[]
}) {
  const isEditing = !!editingEvent;
  
  const getDateStr = (d: Date | string) => {
    const date = new Date(d);
    return date.toISOString().split('T')[0];
  };

  const getTimeStr = (d: Date | string) => {
    const date = new Date(d);
    return date.toTimeString().slice(0, 5);
  };

  const [formData, setFormData] = useState({
    title: editingEvent?.title || '',
    description: editingEvent?.description || '',
    startDate: editingEvent ? getDateStr(editingEvent.startDate) : initialDate.toISOString().split('T')[0],
    startTime: editingEvent ? getTimeStr(editingEvent.startDate) : '09:00',
    endDate: editingEvent?.endDate ? getDateStr(editingEvent.endDate) : initialDate.toISOString().split('T')[0],
    endTime: editingEvent?.endDate ? getTimeStr(editingEvent.endDate) : '10:00',
    type: editingEvent?.type || 'reunion',
    allDay: editingEvent?.allDay || false,
    reminder: editingEvent?.reminder || 15,
    userId: editingEvent?.userId || ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const startDateTime = `${formData.startDate}T${formData.startTime}:00`;
      const endDateTime = `${formData.endDate}T${formData.endTime}:00`;
      
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/calendar/${editingEvent.id}` : '/api/calendar';

      await apiFetch(url, {
        method,
        body: JSON.stringify({
          ...formData,
          startDate: startDateTime,
          endDate: formData.allDay ? null : endDateTime
        })
      });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Editar Evento' : 'Novo Evento'}</h2>
            <p className="text-xs text-gray-500 mt-1">
              {isEditing ? 'Atualize os detalhes do evento' : 'Agende uma reunião ou atividade'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Título</label>
            <input 
              className="modal-input"
              placeholder="Nome do evento"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Tipo</label>
            <select 
              className="modal-input"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
            >
              <option value="reunion">🎥 Reunião (gera link Nexus Meet)</option>
              <option value="task">📋 Tarefa</option>
              <option value="deadline">🔴 Deadline</option>
              <option value="birthday">🎂 Aniversário</option>
              <option value="holiday">🌴 Feriado</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Profissional Responsável</label>
            <select 
              className="modal-input"
              value={formData.userId}
              onChange={e => setFormData({...formData, userId: e.target.value})}
            >
              <option value="">Selecione o profissional...</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.department || 'Geral'})</option>
              ))}
            </select>
          </div>

          {formData.type === 'reunion' && !isEditing && (
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex flex-col gap-3">
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Configuração Elite</p>
                <div className="flex flex-col gap-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">E-mail do Convidado</label>
                   <input 
                     className="modal-input" 
                     placeholder="seu@email.com" 
                     value={(formData as any).guestEmail || ''} 
                     onChange={e => setFormData({...formData, guestEmail: e.target.value} as any)} 
                   />
                </div>
                <div className="flex flex-col gap-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">WhatsApp do Convidado</label>
                   <input 
                     className="modal-input" 
                     placeholder="(00) 00000-0000" 
                     value={(formData as any).guestPhone || ''} 
                     onChange={e => setFormData({...formData, guestPhone: e.target.value} as any)} 
                   />
                </div>
                <p className="text-[10px] text-blue-500 font-medium italic">
                  ✨ O código de acesso de 6 dígitos será gerado ao salvar.
                </p>
              </div>
            )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Data Início</label>
              <input 
                type="date"
                className="modal-input"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Hora</label>
              <input 
                type="time"
                className="modal-input"
                value={formData.startTime}
                onChange={e => setFormData({...formData, startTime: e.target.value})}
              />
            </div>
          </div>

          {!formData.allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Data Fim</label>
                <input 
                  type="date"
                  className="modal-input"
                  value={formData.endDate}
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Hora Fim</label>
                <input 
                  type="time"
                  className="modal-input"
                  value={formData.endTime}
                  onChange={e => setFormData({...formData, endTime: e.target.value})}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input 
              type="checkbox"
              id="allDay"
              checked={formData.allDay}
              onChange={e => setFormData({...formData, allDay: e.target.checked})}
              className="w-4 h-4 rounded border-gray-300"
            />
            <label htmlFor="allDay" className="text-sm text-gray-600">Evento dia todo</label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Descrição</label>
            <textarea 
              className="modal-input min-h-[80px] resize-none"
              placeholder="Detalhes do evento..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              disabled={submitting}
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
            >
              {submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Evento'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}