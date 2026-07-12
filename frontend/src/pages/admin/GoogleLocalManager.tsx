import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, MapPinned, Search, Users } from "lucide-react";
import { apiFetch } from "../../lib/api";

export default function GoogleLocalManager() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/google-local/admin/access");
      const data = await response.json();
      if (response.ok) setOrganizations(data.organizations || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return organizations.filter((org) =>
      org.name.toLowerCase().includes(term) ||
      org.users.some((user: any) => `${user.name || ""} ${user.email}`.toLowerCase().includes(term)),
    );
  }, [organizations, search]);

  const grantFor = (org: any, userId: string | null) =>
    org.googleLocalAccesses.find((grant: any) => grant.userId === userId);

  const toggle = async (organizationId: string, userId: string | null, current: any, monthlyLimit = 200) => {
    const key = `${organizationId}:${userId || "org"}`;
    setSaving(key);
    try {
      await apiFetch("/api/google-local/admin/access", {
        method: "POST",
        body: JSON.stringify({
          organizationId,
          userId,
          enabled: !current?.enabled,
          monthlyLimit: current?.monthlyLimit || monthlyLimit,
        }),
      });
      await load();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-black text-gray-900"><MapPinned className="text-indigo-600" /> Google Local — Acessos</h1>
        <p className="mt-1 text-sm text-gray-500">Libere o módulo para uma organização inteira ou individualmente por usuário.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar organização ou usuário..." className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-indigo-400" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" /></div>
      ) : (
        <div className="flex flex-col gap-5">
          {filtered.map((org) => {
            const orgGrant = grantFor(org, null);
            return (
              <section key={org.id} className="overflow-hidden rounded-[26px] border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><Building2 size={21} /></div>
                    <div><h2 className="font-black text-gray-900">{org.name}</h2><p className="text-xs text-gray-400">{org.slug || org.id}</p></div>
                  </div>
                  <button
                    disabled={saving === `${org.id}:org`}
                    onClick={() => toggle(org.id, null, orgGrant, 500)}
                    className={`rounded-xl px-4 py-2 text-xs font-black ${orgGrant?.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {saving === `${org.id}:org` ? "Salvando..." : orgGrant?.enabled ? `ORGANIZAÇÃO LIBERADA · ${orgGrant.monthlyLimit} pts` : "LIBERAR ORGANIZAÇÃO"}
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {org.users.map((user: any) => {
                    const grant = grantFor(org, user.id);
                    const key = `${org.id}:${user.id}`;
                    return (
                      <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 p-4 pl-7">
                        <div className="flex items-center gap-3">
                          <Users size={17} className="text-gray-400" />
                          <div><p className="text-sm font-bold text-gray-800">{user.name || user.email}</p><p className="text-[11px] text-gray-400">{user.email} · {user.role}</p></div>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            defaultValue={grant?.monthlyLimit || 200}
                            onBlur={async (event) => {
                              if (!grant) return;
                              setSaving(key);
                              await apiFetch("/api/google-local/admin/access", {
                                method: "POST",
                                body: JSON.stringify({ organizationId: org.id, userId: user.id, enabled: grant.enabled, monthlyLimit: Number(event.target.value) }),
                              });
                              await load();
                              setSaving(null);
                            }}
                            className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-xs"
                            title="Limite mensal de pontos"
                          />
                          <button
                            disabled={saving === key}
                            onClick={() => toggle(org.id, user.id, grant)}
                            className={`rounded-xl px-4 py-2 text-xs font-black ${grant?.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                          >
                            {saving === key ? "..." : grant?.enabled ? "LIBERADO" : "BLOQUEADO"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
