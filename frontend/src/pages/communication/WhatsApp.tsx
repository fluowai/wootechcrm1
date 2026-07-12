import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bot,
  CheckCircle2,
  FileText,
  Headphones,
  Image,
  KeyRound,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  PlugZap,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Smile,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

type IconComponent = React.ComponentType<{ size: number; className?: string }>;
type MainTab = "instances" | "llms" | "messages";
type MessageTab = "direct" | "groups";

type Connection = {
  id: string;
  identifier: string;
  isActive: boolean;
  config?: Record<string, any>;
  inbox?: { id?: string; name: string };
};

type Conversation = {
  id: string;
  subject: string;
  contactId?: string;
  status: string;
  lastMessageAt: string;
  metadata?: Record<string, any>;
  messages?: Message[];
  _count?: { messages: number };
};

type Message = {
  id: string;
  senderType: string;
  content?: string;
  type: string;
  fileUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
};

type LlmSettings = {
  aiProvider: string;
  groqKey: string;
  geminiKey: string;
  openaiKey: string;
  chatgptKey: string;
};

const providerCards = [
  { id: "groq", name: "Groq", hint: "Llama rapido para agentes e qualificacao." },
  { id: "gemini", name: "Gemini", hint: "Google AI para respostas longas e analise." },
  { id: "chatgpt", name: "ChatGPT", hint: "Configuracao separada para fluxos ChatGPT." },
  { id: "openai", name: "OpenAI", hint: "API OpenAI para automacoes e modelos GPT." },
];

const blankLlms: LlmSettings = {
  aiProvider: "gemini",
  groqKey: "",
  geminiKey: "",
  openaiKey: "",
  chatgptKey: "",
};

const formatWhatsAppPhone = (value?: string) => {
  const raw = String(value || "").trim();
  const digits = raw.includes("@") ? raw.slice(0, raw.indexOf("@")).split(":")[0].replace(/\D/g, "") : raw.replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (!normalized.startsWith("55") || normalized.length < 12) return `+${normalized}`;
  const ddd = normalized.slice(2, 4);
  const subscriber = normalized.slice(4);
  if (subscriber.length === 9) return `+55 ${ddd} ${subscriber.slice(0, 5)}-${subscriber.slice(5)}`;
  if (subscriber.length === 8) return `+55 ${ddd} ${subscriber.slice(0, 4)}-${subscriber.slice(4)}`;
  return `+${normalized}`;
};

const isRawWhatsAppId = (value?: string) => /@/.test(String(value || "")) || /^\+?\d{10,16}(:\d+)?$/.test(String(value || "").replace(/\s/g, ""));

const cleanDisplayText = (...values: Array<string | undefined | null>) => {
  const found = values.map((value) => String(value || "").trim()).find((value) => value && !isRawWhatsAppId(value));
  return found || "";
};

const connectionName = (connection: Connection) =>
  connection.config?.label || connection.config?.pushName || connection.inbox?.name || connection.identifier;

const connectionStatus = (connection: Connection) =>
  connection.isActive ? connection.config?.status || "created" : "inactive";

const connectionStatusLabel = (connection: Connection) => {
  const s = connectionStatus(connection);
  if (s === "connected") return "Conectado";
  if (s === "connecting") return "Gerando QR";
  if (s === "qr") return "Aguardando QR";
  if (s === "inactive") return "Inativo";
  return s;
};

const connectionStatusClass = (connection: Connection) => {
  const s = connectionStatus(connection);
  if (s === "connected") return "bg-emerald-100 text-emerald-800 border border-emerald-200";
  if (s === "connecting") return "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse";
  if (s === "qr") return "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse";
  return "bg-gray-100 text-gray-500 border border-gray-200";
};

const conversationTitle = (conversation: Conversation) =>
  cleanDisplayText(conversation.metadata?.displayName, conversation.subject, conversation.metadata?.group?.name) ||
  formatWhatsAppPhone(conversation.metadata?.phone || conversation.contactId) ||
  "Contato WhatsApp";

const conversationSubline = (conversation: Conversation) => {
  if (conversation.metadata?.isGroup) {
    const count = Array.isArray(conversation.metadata?.participants) ? conversation.metadata.participants.length : 0;
    return count ? `${count} participantes` : "Grupo WhatsApp";
  }
  return cleanDisplayText(conversation.metadata?.pushName) || conversation.metadata?.displayPhone || formatWhatsAppPhone(conversation.metadata?.phone || conversation.contactId);
};

const messageSender = (message: Message, selectedConversation?: Conversation | null) => {
  if (message.senderType === "USER" || message.metadata?.fromMe) return "Voce";
  return cleanDisplayText(message.metadata?.displayName, message.metadata?.pushName, message.metadata?.senderName)
    || message.metadata?.displayPhone
    || selectedConversation?.metadata?.senderDisplayPhone
    || selectedConversation?.metadata?.displayPhone
    || "Contato";
};

function MediaPreview({ message }: { message: Message }) {
  if (!message.fileUrl) return null;
  if (message.type === "image" || message.type === "sticker") {
    return <img src={message.fileUrl} alt={message.metadata?.fileName || "Imagem"} className="mt-2 max-h-60 rounded-xl border border-gray-100 object-cover" />;
  }
  if (message.type === "audio") {
    return <audio src={message.fileUrl} controls className="mt-2 w-full" />;
  }
  if (message.type === "video") {
    return <video src={message.fileUrl} controls className="mt-2 max-h-72 w-full rounded-xl" />;
  }

  return (
    <a href={message.fileUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:border-emerald-200">
      <FileText size={15} />
      {message.metadata?.fileName || message.metadata?.mimeType || "Abrir documento"}
    </a>
  );
}

function parseMessageJson(message: Message) {
  try {
    return message.content ? JSON.parse(message.content) : null;
  } catch {
    return null;
  }
}

function firstPayloadText(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = key.split(".").reduce((acc, part) => acc?.[part], payload);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function StructuredMessageCard({ icon: Icon, title, detail }: { icon: IconComponent; title: string; detail?: string }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-xl bg-white/70 p-3 text-sm font-bold text-gray-700">
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>
        {title}
        {detail && <span className="block text-xs font-medium opacity-70">{detail}</span>}
      </span>
    </div>
  );
}

function MessageBody({ message }: { message: Message }) {
  const payload = parseMessageJson(message);

  if ((message.type === "location" || message.type === "live_location") && payload) {
    const mapsUrl = payload.url || (payload.latitude && payload.longitude ? `https://www.google.com/maps?q=${payload.latitude},${payload.longitude}` : "");
    return (
      <a href={mapsUrl || undefined} target="_blank" rel="noreferrer" className="mt-2 flex items-start gap-2 rounded-xl bg-white/70 p-3 text-sm font-bold text-gray-700">
        <MapPin size={16} className="mt-0.5 shrink-0" />
        <span>
          {payload.name || (message.type === "live_location" ? "Localizacao ao vivo" : "Localizacao compartilhada")}
          {payload.address && <span className="block text-xs font-medium opacity-70">{payload.address}</span>}
        </span>
      </a>
    );
  }

  if (message.type === "contact" && payload) {
    const contacts = Array.isArray(payload.contacts) ? payload.contacts : [payload];
    return (
      <div className="mt-2 space-y-2">
        {(contacts as Array<Record<string, any>>).map((contact, index: number) => (
          <div key={index} className="rounded-lg border border-gray-100 bg-white p-3">
            <div className="flex items-center gap-3">
              <UserRound size={32} className="text-gray-400" />
              <div className="min-w-0 flex-1">
                <span className="truncate">{contact.displayName || "Contato compartilhado"}</span>
                {contact.phone && <span className="block text-xs text-gray-400">{contact.phone}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (message.type === "reaction") {
    return (
      <p className="inline-flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-bold">
        <Smile size={15} />
        Reagiu {payload?.text ? `com ${payload.text}` : "a uma mensagem"}
      </p>
    );
  }

  if (message.type === "deleted") {
    return <p className="text-sm font-medium italic opacity-70">Mensagem apagada.</p>;
  }

  if (message.type === "edited") {
    return <p className="text-sm font-medium italic opacity-70">Mensagem editada.</p>;
  }

  if (message.type === "poll" && payload) {
    const optionCount = Array.isArray(payload.options) ? payload.options.length : 0;
    return <StructuredMessageCard icon={MessageCircle} title={payload.name || "Enquete recebida"} detail={optionCount ? `${optionCount} opcoes` : undefined} />;
  }

  if (message.type === "poll_update") {
    return <StructuredMessageCard icon={CheckCircle2} title="Atualizacao de enquete recebida" />;
  }

  if (message.type === "interactive" && payload) {
    const title = firstPayloadText(payload, [
      "selectedDisplayText",
      "selectedRowId",
      "buttonText.displayText",
      "hydratedTemplate.hydratedContentText",
      "body.text",
      "footer.text",
      "title",
    ]);
    return <StructuredMessageCard icon={MessageCircle} title={title || "Mensagem interativa recebida"} detail={message.metadata?.rawType || undefined} />;
  }

  if (message.type === "call") {
    return <StructuredMessageCard icon={Phone} title="Registro de chamada recebido" />;
  }

  if (message.type === "event" && payload) {
    const title = firstPayloadText(payload, ["name", "title", "description"]) || "Evento recebido";
    const detail = firstPayloadText(payload, ["location.name", "location.address", "description"]);
    return <StructuredMessageCard icon={MapPin} title={title} detail={detail || undefined} />;
  }

  if (message.type === "commerce" && payload) {
    const title = firstPayloadText(payload, ["title", "product.name", "orderTitle", "sellerJid"]) || "Mensagem comercial recebida";
    return <StructuredMessageCard icon={FileText} title={title} detail={message.metadata?.rawType || undefined} />;
  }

  if (message.content) {
    return <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">{message.content}</p>;
  }

  return null;
}

export default function WhatsApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<MainTab>("instances");
  const [messageTab, setMessageTab] = useState<MessageTab>("direct");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [instanceName, setInstanceName] = useState("");
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [reply, setReply] = useState("");
  const [llms, setLlms] = useState<LlmSettings>(blankLlms);
  const [loading, setLoading] = useState(false);
  const [savingLlms, setSavingLlms] = useState(false);
  const [sending, setSending] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [qrModalConnectionId, setQrModalConnectionId] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [autoOpenConversationId, setAutoOpenConversationId] = useState<string | null>(null);

  const activeConnection = useMemo(
    () => connections.find((conn) => conn.config?.status === "connected" && conn.isActive) || connections.find((conn) => conn.isActive),
    [connections]
  );
  const qrModalConnection = useMemo(
    () => connections.find((conn) => conn.id === qrModalConnectionId) || null,
    [connections, qrModalConnectionId]
  );

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const q = searchTerm.toLowerCase();
    return conversations.filter((c) =>
      conversationTitle(c).toLowerCase().includes(q) ||
      conversationSubline(c).toLowerCase().includes(q)
    );
  }, [conversations, searchTerm]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "instances" || tab === "llms" || tab === "messages") {
      setActiveTab(tab);
    }
    const cid = searchParams.get("conversationId");
    if (cid && tab === "messages") {
      // Auto-open conversation after conversations load
      setAutoOpenConversationId(cid);
    }
  }, [searchParams]);

  const loadConnections = async () => {
    const res = await apiFetch("/api/whatsapp/connections");
    const data = await res.json();
    setConnections(Array.isArray(data) ? data : []);
  };

  const loadConversations = async (kind = messageTab) => {
    const res = await apiFetch(`/api/whatsapp/conversations?kind=${kind}`);
    const data = await res.json();
    setConversations(Array.isArray(data) ? data : []);
  };

  const loadLlms = async () => {
    const res = await apiFetch("/api/org/settings");
    if (!res.ok) return;
    const data = await res.json();
    setLlms({
      aiProvider: data.aiProvider === "local" ? "gemini" : data.aiProvider || "gemini",
      groqKey: data.groqKey || "",
      geminiKey: data.geminiKey || "",
      openaiKey: data.openaiKey || "",
      chatgptKey: data.chatgptKey || "",
    });
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadConnections(), loadConversations(messageTab), loadLlms()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // Refresh geral a cada 15s
    const timer = window.setInterval(() => {
      loadConnections();
      if (activeTab === "messages") loadConversations(messageTab);
    }, 15000);
    // Polling rápido do QR Code a cada 4s quando há instância aguardando QR
    const qrTimer = window.setInterval(() => {
      if (qrModalConnectionId) loadConnections();
    }, 4000);
    return () => { window.clearInterval(timer); window.clearInterval(qrTimer); };
  }, [messageTab, activeTab, qrModalConnectionId]);

  // Auto-abre conversa quando redirecionado da abordagem SDR
  useEffect(() => {
    if (!autoOpenConversationId || conversations.length === 0) return;
    const target = conversations.find(c => c.id === autoOpenConversationId);
    if (target) {
      openConversation(target);
      setAutoOpenConversationId(null);
    }
  }, [autoOpenConversationId, conversations]);

  const createConnection = async () => {
    const name = instanceName.trim();
    if (!name) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/whatsapp/connections", {
        method: "POST",
        body: JSON.stringify({ label: name, inboxName: name }),
      });
      const data = await res.json();
      
      if (data && data.id) {
        setQrModalConnectionId(data.id);
        await apiFetch(`/api/whatsapp/connections/${data.id}/connect`, {
          method: "POST"
        });
      }

      setInstanceName("");
      await loadConnections();
    } finally {
      setLoading(false);
    }
  };

  const saveInstance = async (connection: Connection) => {
    setLoading(true);
    try {
      await apiFetch(`/api/whatsapp/connections/${connection.id}`, {
        method: "PATCH",
        body: JSON.stringify({ label: editingLabel, inboxName: editingLabel, isActive: connection.isActive }),
      });
      setEditingInstanceId(null);
      setEditingLabel("");
      await loadConnections();
    } finally {
      setLoading(false);
    }
  };

  const toggleInstance = async (connection: Connection) => {
    setLoading(true);
    try {
      await apiFetch(`/api/whatsapp/connections/${connection.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !connection.isActive }),
      });
      await loadConnections();
    } finally {
      setLoading(false);
    }
  };

  const connectInstance = async (connection: Connection) => {
    setQrModalConnectionId(connection.id);
    setLoading(true);
    try {
      await apiFetch(`/api/whatsapp/connections/${connection.id}/connect`, {
        method: "POST"
      });
      await loadConnections();
    } finally {
      setLoading(false);
    }
  };

  const deleteInstance = async (id: string) => {
    setLoading(true);
    try {
      await apiFetch(`/api/whatsapp/connections/${id}`, { method: "DELETE" });
      await loadConnections();
    } finally {
      setLoading(false);
    }
  };

  const saveLlms = async () => {
    setSavingLlms(true);
    try {
      await apiFetch("/api/org/settings", {
        method: "PATCH",
        body: JSON.stringify(llms),
      });
      await loadLlms();
    } finally {
      setSavingLlms(false);
    }
  };

  const openConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    const res = await apiFetch(`/api/whatsapp/conversations/${conversation.id}/messages`);
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
  };

  const initiateCall = async () => {
    if (!selectedConversation || !activeConnection) return;
    setCalling(true);
    setCallError(null);
    try {
      const phone = selectedConversation.metadata?.phone || selectedConversation.contactId;
      if (!phone) {
        setCallError("Telefone nao disponivel para esta conversa");
        return;
      }
      const res = await apiFetch("/api/whatsapp/calls/initiate", {
        method: "POST",
        body: JSON.stringify({
          channelId: activeConnection.id,
          to: phone,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao iniciar chamada" }));
        setCallError(err.error || "Erro ao iniciar chamada");
        return;
      }
      const data = await res.json();
      console.log("Chamada iniciada:", data);
    } catch (err: unknown) {
      setCallError(err instanceof Error ? err.message : "Erro ao conectar com o servidor");
    } finally {
      setCalling(false);
    }
  };

  const sendReply = async () => {
    if (!selectedConversation || !reply.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/api/whatsapp/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: reply.trim() }),
      });
      setReply("");
      await openConversation(selectedConversation);
      await loadConversations(messageTab);
    } finally {
      setSending(false);
    }
  };

  const dispatchProspecting = async () => {
    setDispatching(true);
    try {
      await apiFetch("/api/whatsapp/prospecting/dispatch", {
        method: "POST",
        body: JSON.stringify({ limit: 25 }),
      });
      await loadConversations(messageTab);
    } finally {
      setDispatching(false);
    }
  };

  const renderAvatar = (item: Conversation | Connection) => {
    const metadata: Record<string, any> = (item as any).metadata || (item as any).config || {};
    const src = metadata.profilePictureUrl || metadata.group?.pictureUrl;
    if (src) return <img src={src} alt="" className="h-11 w-11 rounded-xl object-cover" />;
    const isGroup = metadata?.isGroup || String(("contactId" in item && item.contactId) || "").includes("@g.us");
    const Icon = isGroup ? Users : MessageCircle;
    return <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Icon size={20} /></div>;
  };

  const renderTabButton = (id: MainTab, label: string, Icon: IconComponent) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setSearchParams({ tab: id });
      }}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black ${activeTab === id ? "bg-emerald-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
    >
      <Icon size={15} />
      {label}
    </button>
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <MessageCircle size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-950">WhatsApp</h1>
            <p className="text-sm font-medium text-gray-500">Conexoes Whatsmeow, LLMs e mensagens normais ou de grupos.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={refreshAll} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-600 hover:bg-gray-50 disabled:opacity-60">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Atualizar
          </button>
          <button onClick={dispatchProspecting} disabled={dispatching || !activeConnection} className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-xs font-black text-white hover:bg-black disabled:opacity-50">
            {dispatching ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}
            Disparar fila IA
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
        {renderTabButton("instances", "Conexoes", PlugZap)}
        {renderTabButton("llms", "LLMs", KeyRound)}
        {renderTabButton("messages", "Mensagens", MessageCircle)}
      </div>

      {activeTab === "instances" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_1fr]">
          {/* Painel de criação */}
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Nova Instância</h2>
            <p className="mt-1 text-xs text-gray-400">Cada instância corresponde a um número de WhatsApp conectado.</p>
            <div className="mt-4 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nome da instância</label>
              <input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createConnection()}
                placeholder="Ex: SDR Paulo, Suporte, Vendas"
                className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                onClick={createConnection}
                disabled={loading || !instanceName.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <PlugZap size={16} />}
                Criar e gerar QR
              </button>
            </div>
            {connections.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Resumo</p>
                <div className="mt-2 flex gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-black text-gray-950">{connections.length}</p>
                    <p className="text-[10px] text-gray-400">Instâncias</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-emerald-600">{connections.filter(c => c.config?.status === "connected").length}</p>
                    <p className="text-[10px] text-gray-400">Conectadas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-amber-500">{connections.filter(c => c.config?.status === "qr").length}</p>
                    <p className="text-[10px] text-gray-400">Aguard. QR</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Cards das instâncias */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {connections.length === 0 && (
              <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center text-gray-400">
                <PlugZap size={36} className="mb-3 opacity-30" />
                <p className="font-black">Nenhuma instância criada</p>
                <p className="mt-1 text-xs">Crie sua primeira instância ao lado</p>
              </div>
            )}
            {connections.map((conn) => (
              <div key={conn.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition-all ${
                conn.config?.status === "connected" ? "border-emerald-200" :
                conn.config?.status === "qr" ? "border-amber-200" : "border-gray-100"
              }`}>
                {/* Header do card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {renderAvatar(conn)}
                    <div className="min-w-0">
                      {editingInstanceId === conn.id ? (
                        <input value={editingLabel} onChange={(e) => setEditingLabel(e.target.value)} className="w-full rounded-lg border border-emerald-200 px-2 py-1 text-sm font-black outline-none focus:ring-2 focus:ring-emerald-100" />
                      ) : (
                        <p className="truncate font-black text-gray-950">{connectionName(conn)}</p>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black ${connectionStatusClass(conn)}`}>
                    {connectionStatusLabel(conn)}
                  </span>
                </div>

                {/* QR Code — exibido de forma GRANDE e centralizada */}
                {conn.config?.status === "qr" && conn.config?.qrPng && (
                  <div className="mt-4 flex flex-col items-center rounded-xl bg-amber-50 p-4 border border-amber-100">
                    <p className="mb-3 text-xs font-black text-amber-700">📱 Escaneie com o WhatsApp do celular</p>
                    <img
                      src={conn.config.qrPng}
                      alt="QR Code WhatsApp"
                      className="h-48 w-48 rounded-xl border-4 border-white shadow-lg"
                    />
                    <p className="mt-3 text-[10px] text-amber-600 animate-pulse">Atualizando automaticamente...</p>
                  </div>
                )}

                {/* Info do número conectado */}
                {conn.config?.status === "connected" && (
                  <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2">
                    <p className="text-xs font-bold text-emerald-700">
                      {conn.config?.pushName ? `👤 ${conn.config.pushName}` : "WhatsApp Conectado"}
                    </p>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {editingInstanceId === conn.id ? (
                    <button onClick={() => saveInstance(conn)} disabled={loading} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-xs font-black text-white">
                      <Save size={14} /> Salvar Nome
                    </button>
                  ) : (
                    <button onClick={() => { setEditingInstanceId(conn.id); setEditingLabel(connectionName(conn)); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2 text-xs font-black text-gray-600 hover:bg-gray-50">
                      <Settings2 size={14} /> Editar
                    </button>
                  )}
                  {editingInstanceId !== conn.id && (
                    <button
                      onClick={() => connectInstance(conn)}
                      disabled={loading || conn.config?.status === "connected"}
                      className="rounded-xl border border-emerald-500 bg-emerald-50 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                    >
                      {conn.config?.status === "qr" ? "Novo QR" : "Gerar QR"}
                    </button>
                  )}
                  <button onClick={() => toggleInstance(conn)} disabled={loading} className="rounded-xl border border-gray-200 py-2 text-xs font-black text-gray-600 hover:bg-gray-50">
                    {conn.isActive ? "Desativar" : "Ativar"}
                  </button>
                  <button onClick={() => deleteInstance(conn.id)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 py-2 text-xs font-black text-red-600 hover:bg-red-50">
                    <Trash2 size={14} /> Remover
                  </button>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {activeTab === "llms" && (
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-950">LLMs dos agentes</h2>
              <p className="text-sm font-medium text-gray-500">Configure Groq, Gemini, ChatGPT e OpenAI para os fluxos de WhatsApp e IA.</p>
            </div>
            <button onClick={saveLlms} disabled={savingLlms} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-xs font-black text-white disabled:opacity-50">
              {savingLlms ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Salvar LLMs
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
            {providerCards.map((provider) => (
              <button key={provider.id} onClick={() => setLlms((current) => ({ ...current, aiProvider: provider.id }))} className={`rounded-2xl border p-4 text-left transition-all ${llms.aiProvider === provider.id ? "border-emerald-300 bg-emerald-50" : "border-gray-100 bg-gray-50 hover:bg-white"}`}>
                <div className="mb-3 flex items-center justify-between">
                  <KeyRound size={20} className={llms.aiProvider === provider.id ? "text-emerald-700" : "text-gray-400"} />
                  {llms.aiProvider === provider.id && <CheckCircle2 size={18} className="text-emerald-700" />}
                </div>
                <p className="font-black text-gray-950">{provider.name}</p>
                <p className="mt-1 text-xs font-medium text-gray-500">{provider.hint}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <LlmInput label="Groq API Key" value={llms.groqKey} onChange={(value) => setLlms((current) => ({ ...current, groqKey: value }))} />
            <LlmInput label="Gemini API Key" value={llms.geminiKey} onChange={(value) => setLlms((current) => ({ ...current, geminiKey: value }))} />
            <LlmInput label="ChatGPT API Key" value={llms.chatgptKey} onChange={(value) => setLlms((current) => ({ ...current, chatgptKey: value }))} />
            <LlmInput label="OpenAI API Key" value={llms.openaiKey} onChange={(value) => setLlms((current) => ({ ...current, openaiKey: value }))} />
          </div>
        </section>
      )}

      {activeTab === "messages" && (
        <div className="grid min-h-[620px] grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col">
            <div className="border-b border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Conversas</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-500">{conversations.length}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => { setMessageTab("direct"); setSelectedConversation(null); loadConversations("direct"); }} className={`flex-1 rounded-xl py-2 text-xs font-black ${messageTab === "direct" ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
                  💬 Diretas
                </button>
                <button onClick={() => { setMessageTab("groups"); setSelectedConversation(null); loadConversations("groups"); }} className={`flex-1 rounded-xl py-2 text-xs font-black ${messageTab === "groups" ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
                  👥 Grupos
                </button>
              </div>
              {/* Busca */}
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar conversa..."
                className="mt-2 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium outline-none focus:border-emerald-200"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conversation) => {
                const lastMsg = conversation.messages?.[0];
                const lastText = lastMsg?.content || lastMsg?.metadata?.fileName || lastMsg?.type || "Sem mensagem";
                const isSelected = selectedConversation?.id === conversation.id;
                const hasSDR = Boolean(conversation.metadata?.prospectingRunId);
                return (
                  <button
                    key={conversation.id}
                    onClick={() => openConversation(conversation)}
                    className={`flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-emerald-50/50 ${
                      isSelected ? "bg-emerald-50 border-l-4 border-l-emerald-500" : ""
                    }`}
                  >
                    {renderAvatar(conversation)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-sm font-black text-gray-900">{conversationTitle(conversation)}</p>
                        <div className="flex shrink-0 items-center gap-1">
                          {hasSDR && <span className="rounded bg-purple-100 px-1 text-[9px] font-black text-purple-600">IA</span>}
                          {(conversation._count?.messages ?? 0) > 0 && (
                            <span className="rounded-full bg-emerald-500 px-1.5 text-[9px] font-black text-white">
                              {conversation._count?.messages}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-400">{lastText.slice(0, 60)}</p>
                      <p className="mt-0.5 text-[10px] text-gray-300">
                        {lastMsg ? new Date(lastMsg.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
              {filteredConversations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-300">
                  <MessageCircle size={36} className="mb-3 opacity-40" />
                  <p className="text-sm font-bold">{searchTerm ? "Nenhum resultado" : "Sem conversas ainda"}</p>
                  <p className="mt-1 text-xs">{searchTerm ? "Tente outro termo" : "Conecte uma instância para receber mensagens"}</p>
                </div>
              )}
            </div>
          </section>

          <section className="flex overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {selectedConversation ? (
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {renderAvatar(selectedConversation)}
                    <div className="min-w-0">
                      <p className="truncate font-black text-gray-950">{conversationTitle(selectedConversation)}</p>
                      <p className="truncate text-xs font-bold text-gray-400">{conversationSubline(selectedConversation)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selectedConversation.metadata?.isGroup && (
                      <button
                        onClick={initiateCall}
                        disabled={calling || !activeConnection}
                        title="Iniciar chamada de voz"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                      >
                        {calling ? <Loader2 size={12} className="animate-spin" /> : <Phone size={12} />}
                        Ligar
                      </button>
                    )}
                    {selectedConversation.metadata?.isGroup && <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700"><Users size={12} /> Grupo</span>}
                    {selectedConversation.metadata?.prospectingRunId && <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-[10px] font-black text-purple-700"><Bot size={12} /> SDR IA</span>}
                  </div>
                </div>

                {callError && (
                  <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-700">
                    <Phone size={12} />
                    {callError}
                    <button onClick={() => setCallError(null)} className="ml-auto rounded px-1 text-red-400 hover:text-red-600">✕</button>
                  </div>
                )}

                {selectedConversation.metadata?.participants?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-3">
                    {(selectedConversation.metadata.participants as Array<Record<string, unknown>>).slice(0, 12).map((participant, index: number) => (
                      <div key={(participant.jid || participant.id) as string} className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                        {participant.pictureUrl ? <img src={participant.pictureUrl as string} alt="" className="h-7 w-7 rounded-lg object-cover" /> : <Users size={15} className="text-gray-400" />}
                        <span className="max-w-[150px] truncate text-[11px] font-bold text-gray-600">
                          {cleanDisplayText(participant.displayName as string, participant.name as string, participant.pushName as string) || (participant.displayPhone as string) || formatWhatsAppPhone(participant.jid as string || participant.phoneNumber as string) || `Participante ${index + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50/60 p-5">
                  {messages.map((message) => {
                    const fromMe = message.senderType === "USER" || message.metadata?.fromMe;
                    const Icon = message.type === "image" || message.type === "sticker" ? Image : message.type === "audio" ? Headphones : message.type === "document" ? FileText : message.type === "location" || message.type === "live_location" ? MapPin : message.type === "contact" ? UserRound : message.type === "reaction" ? Smile : MessageCircle;
                    return (
                      <div key={message.id} className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${fromMe ? "bg-emerald-600 text-white" : "bg-white text-gray-800"}`}>
                          <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-70">
                            <Icon size={12} />
                            {messageSender(message, selectedConversation)}
                          </div>
                          <MessageBody message={message} />
                          <MediaPreview message={message} />
                          <p className="mt-2 text-[10px] font-bold opacity-60">{new Date(message.createdAt).toLocaleString("pt-BR")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 border-t border-gray-100 p-4">
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Responder pelo WhatsApp conectado..." className="min-h-[48px] flex-1 resize-none rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-200 focus:ring-2 focus:ring-emerald-100" />
                  <button onClick={sendReply} disabled={sending || !reply.trim()} className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white disabled:opacity-50">
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-gray-400">
                <CheckCircle2 size={42} />
                <p className="text-sm font-black">Selecione uma conversa</p>
              </div>
            )}
          </section>
        </div>
      )}

      {qrModalConnectionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-gray-950">QR Code WhatsApp</h2>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  {qrModalConnection ? connectionName(qrModalConnection) : "Preparando instancia"}
                </p>
              </div>
              <button
                onClick={() => setQrModalConnectionId(null)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-500 hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 p-5 text-center">
              {qrModalConnection?.config?.status === "error" ? (
                <>
                  <p className="text-sm font-black text-red-600">Nao foi possivel gerar o QR Code.</p>
                  <p className="mt-2 text-xs font-medium text-gray-500">
                    {qrModalConnection.config?.lastConnectError || "Verifique se o Whatsmeow bridge esta ativo."}
                  </p>
                </>
              ) : qrModalConnection?.config?.status === "connected" ? (
                <>
                  <CheckCircle2 size={44} className="text-emerald-600" />
                  <p className="mt-3 text-sm font-black text-gray-950">WhatsApp conectado</p>
                </>
              ) : qrModalConnection?.config?.qrPng ? (
                <>
                  <img
                    src={qrModalConnection.config.qrPng}
                    alt="QR Code WhatsApp"
                    className="h-64 w-64 rounded-xl border-4 border-white bg-white shadow-lg"
                  />
                  <p className="mt-4 text-xs font-bold text-gray-500">Escaneie pelo WhatsApp do celular.</p>
                </>
              ) : (
                <>
                  <Loader2 size={38} className="animate-spin text-emerald-600" />
                  <p className="mt-4 text-sm font-black text-gray-950">Gerando QR Code...</p>
                  <p className="mt-1 text-xs font-medium text-gray-500">Isso pode levar alguns segundos.</p>
                </>
              )}
            </div>

            <button
              onClick={loadConnections}
              className="mt-4 w-full rounded-xl border border-gray-200 py-3 text-xs font-black text-gray-600 hover:bg-gray-50"
            >
              Atualizar QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LlmInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Cole a chave aqui"
        className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 font-mono text-sm outline-none focus:border-emerald-200 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}
