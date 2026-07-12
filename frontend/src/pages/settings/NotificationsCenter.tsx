import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Info,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Mail,
  MailOpen,
  Filter,
  BellOff,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

const TYPE_ICONS: Record<string, any> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  error: AlertCircle,
};

const TYPE_COLORS: Record<string, string> = {
  info: "bg-blue-50 text-blue-600 border-blue-100",
  warning: "bg-amber-50 text-amber-600 border-amber-100",
  success: "bg-green-50 text-green-600 border-green-100",
  error: "bg-red-50 text-red-600 border-red-100",
};

export default function NotificationsCenter() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const fetchNotifications = async () => {
    try {
      const qs = unreadOnly ? "?unreadOnly=true" : "";
      const res = await apiFetch(`/api/notifications${qs}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const handleMarkRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta notificação?")) return;
    try {
      await apiFetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
        Carregando notificações...
      </div>
    );

  return (
    <div className="flex flex-col gap-8 p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">
              Central de Notificações
            </h1>
            <p className="text-gray-500">Acompanhe todos os alertas do sistema.</p>
          </div>
          {unreadCount > 0 && (
            <span className="px-3 py-1 bg-red-500 text-white text-xs font-black rounded-full animate-pulse">
              {unreadCount} não lida{unreadCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              unreadOnly
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            <Filter size={14} />
            {unreadOnly ? "Não lidas" : "Todas"}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-xs font-bold"
            >
              <CheckCheck size={14} />
              Marcar todas lidas
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {notifications.map((notif) => {
          const Icon = TYPE_ICONS[notif.type] || Info;
          const colorClass = TYPE_COLORS[notif.type] || TYPE_COLORS.info;
          const isUnread = !notif.readAt;

          return (
            <motion.div
              key={notif.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card flex items-start gap-4 ${
                isUnread ? "border-l-4 border-l-primary" : "opacity-70"
              }`}
              onClick={() => isUnread && handleMarkRead(notif.id)}
            >
              <div className={`p-3 rounded-xl ${colorClass}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900">{notif.title}</h3>
                  {isUnread && (
                    <span className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                <span className="text-[10px] text-gray-400 font-bold mt-1 inline-block">
                  {new Date(notif.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {isUnread && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkRead(notif.id);
                    }}
                    className="p-1.5 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Marcar como lida"
                  >
                    <MailOpen size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notif.id);
                  }}
                  className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
        {notifications.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <BellOff size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold">Nenhuma notificação</p>
            <p className="text-sm mt-1">
              {unreadOnly
                ? "Todas as notificações foram lidas."
                : "Nenhuma notificação disponível."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
