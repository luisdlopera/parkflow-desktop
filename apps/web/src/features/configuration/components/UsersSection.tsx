"use client";
import { ListBox } from "@heroui/react";
import { Select } from "@/components/bridge/Select";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import { useDialog } from "@/providers/DialogProvider";
import DataTable from "@/components/ui/DataTable";
import { useCallback, useEffect, useState } from "react";
import {
  fetchUsers,
  fetchUserById,
  createUser,
  patchUser,
  patchUserStatus,
  resetUserPassword,
  type UserAdminRow
} from "@/lib/api/users-api";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import type { UserRole } from "@/lib/types/settings.types";
import { ROLES } from "@/features/configuration/constants";

function UserCreatePanel({
  auditReason,
  onClose,
  onCreated,
  onError
}: {
  auditReason: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("CAJERO");
  const [password, setPassword] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [site, setSite] = useState("");
  const [terminal, setTerminal] = useState("");

  return (
    <div className="surface rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-foreground">Nuevo usuario</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input aria-label="Nombre" size="sm" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <Input aria-label="Correo" size="sm" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select
          label="Rol"
          value={[role]}
          onChange={(keys: Set<string | number | boolean | null | undefined>) => setRole(Array.from(keys)[0] as UserRole)}
        >
          <Select.Trigger aria-label="Seleccionar opción">
            <Select.Value aria-label="Seleccionar opción" />
            <Select.Indicator aria-label="Seleccionar opción" />
          </Select.Trigger>
          <Select.Popover aria-label="Seleccionar opción">
            <ListBox>
              {ROLES.map((r) => (
                <ListBox.Item key={r} textValue={r}>
                  {r}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Input aria-label="Contraseña inicial" size="sm" placeholder="Contrasena inicial (min 8)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input aria-label="Documento" size="sm" placeholder="Documento (opcional)" value={document} onChange={(e) => setDocument(e.target.value)} />
        <Input aria-label="Teléfono" size="sm" placeholder="Telefono" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input aria-label="Sede" size="sm" placeholder="Sede" value={site} onChange={(e) => setSite(e.target.value)} />
        <Input aria-label="Terminal o caja" size="sm" placeholder="Terminal / caja" value={terminal} onChange={(e) => setTerminal(e.target.value)} />
      </div>
      <div className="mt-4 flex gap-3">
        <div className="min-w-[120px]">
          <Button
            color="primary"
            className="font-bold w-full"
            onPress={() =>
              void (async () => {
                try {
                  if (!name.trim()) { onError("Nombre obligatorio"); return; }
                  if (!email.trim()) { onError("Correo obligatorio"); return; }
                  if (password.length < 8) { onError("Contrasena muy corta"); return; }
                  await createUser(
                    { name: name.trim(), email: email.trim(), role, initialPassword: password, document: document.trim() || undefined, phone: phone.trim() || undefined, site: site.trim() || undefined, terminal: terminal.trim() || undefined },
                    auditReason
                  );
                  await onCreated();
                } catch (e) {
                  onError(getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA));
                }
              })()
            }
          >
            Crear
          </Button>
        </div>
        <div className="min-w-[120px]">
          <Button variant="ghost" color="primary" className="font-semibold w-full" onPress={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

function UserEditPanel({
  auditReason,
  user,
  onClose,
  onSaved,
  onError
}: {
  auditReason: string;
  user: UserAdminRow;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [document, setDocument] = useState(user.document ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [site, setSite] = useState(user.site ?? "");
  const [terminal, setTerminal] = useState(user.terminal ?? "");

  return (
    <div className="surface rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-foreground">Editar usuario</h2>
      <p className="text-xs text-default-500">{user.email}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input aria-label="Nombre" size="sm" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <Input aria-label="Correo" size="sm" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select
          label="Rol"
          value={[role]}
          onChange={(keys: Set<string | number | boolean | null | undefined>) => setRole(Array.from(keys)[0] as UserRole)}
        >
          <Select.Trigger aria-label="Seleccionar opción">
            <Select.Value aria-label="Seleccionar opción" />
            <Select.Indicator aria-label="Seleccionar opción" />
          </Select.Trigger>
          <Select.Popover aria-label="Seleccionar opción">
            <ListBox>
              {ROLES.map((r) => (
                <ListBox.Item key={r} textValue={r}>
                  {r}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Input size="sm" aria-label="Documento" placeholder="Documento" value={document} onChange={(e) => setDocument(e.target.value)} />
        <Input size="sm" aria-label="Telefono" placeholder="Telefono" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input size="sm" aria-label="Sede" placeholder="Sede" value={site} onChange={(e) => setSite(e.target.value)} />
        <Input size="sm" aria-label="Terminal" placeholder="Terminal" value={terminal} onChange={(e) => setTerminal(e.target.value)} />
      </div>
      <div className="mt-4 flex gap-3">
        <div className="min-w-[120px]">
          <Button
            color="primary"
            className="font-bold w-full"
            onPress={() =>
              void (async () => {
                try {
                  if (!name.trim() || !email.trim()) { onError("Nombre y correo son obligatorios"); return; }
                  await patchUser(
                    user.id,
                    { name: name.trim(), email: email.trim(), role, document: document.trim() || null, phone: phone.trim() || null, site: site.trim() || null, terminal: terminal.trim() || null },
                    auditReason
                  );
                  await onSaved();
                } catch (e) {
                  onError(getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA));
                }
              })()
            }
          >
            Guardar
          </Button>
        </div>
        <div className="min-w-[120px]">
          <Button variant="ghost" color="primary" className="font-semibold w-full" onPress={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function UsersSection({
  canEdit,
  onNotify,
  auditReason
}: {
  canEdit: boolean;
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
  auditReason: string;
}) {
  const [rows, setRows] = useState<UserAdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [editing, setEditing] = useState<UserAdminRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [userDetail, setUserDetail] = useState<UserAdminRow | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const { prompt } = useDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchUsers({ q: q || undefined, active: activeFilter, page, size: 15 });
      setRows(res.content);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, activeFilter, page]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <Input
          label="Buscar"
          placeholder="Nombre o correo..."
          size="sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select
          label="Estado"
          className="max-w-[120px]"
          value={activeFilter === null ? [""] : [String(activeFilter)]}
          onChange={(keys: Set<string | number | boolean | null | undefined>) => {
            const v = Array.from(keys)[0] as string;
            setActiveFilter(v === "" ? null : v === "true");
          }}
        >
          <Select.Trigger aria-label="Seleccionar opción">
            <Select.Value aria-label="Seleccionar opción" />
            <Select.Indicator aria-label="Seleccionar opción" />
          </Select.Trigger>
          <Select.Popover aria-label="Seleccionar opción">
            <ListBox>
              <ListBox.Item key="" textValue="Todos">Todos</ListBox.Item>
              <ListBox.Item key="true" textValue="Activos">Activos</ListBox.Item>
              <ListBox.Item key="false" textValue="Inactivos">Inactivos</ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
        <Button variant="outline" color="primary" size="md" className="font-semibold" onPress={() => { load().catch(() => {}); }} isLoading={loading}>
          Actualizar
        </Button>
        {canEdit ? (
          <Button color="primary" size="md" className="font-semibold" onPress={() => setShowCreate(true)}>
            Nuevo usuario
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {loading ? <p className="text-sm text-default-500">Cargando...</p> : null}

      {userDetailLoading ? <p className="text-sm text-default-500">Cargando detalle...</p> : null}
      {userDetail ? (
        <div className="surface rounded-2xl p-4 text-sm text-foreground space-y-1">
          <div className="flex justify-between gap-2">
            <h3 className="font-semibold text-foreground">Detalle usuario</h3>
            <Button size="sm" variant="ghost" color="primary" className="font-semibold" onPress={() => setUserDetail(null)}>
              Cerrar
            </Button>
          </div>
          <p><span className="text-default-500">Nombre:</span> {userDetail.name}</p>
          <p><span className="text-default-500">Correo:</span> {userDetail.email}</p>
          <p>
            <span className="text-default-500">Rol:</span> {userDetail.role} ·{" "}
            <span className="text-default-500">Estado:</span> {userDetail.active ? "Activo" : "Inactivo"}
          </p>
          <p>
            <span className="text-default-500">Documento:</span> {userDetail.document ?? "—"} ·{" "}
            <span className="text-default-500">Telefono:</span> {userDetail.phone ?? "—"}
          </p>
          <p>
            <span className="text-default-500">Sede / terminal:</span> {userDetail.site ?? "—"} /{" "}
            {userDetail.terminal ?? "—"}
          </p>
          <p><span className="text-default-500">Ultimo acceso:</span> {userDetail.lastAccessAt ?? "—"}</p>
          <p className="text-xs text-default-500">Creado {userDetail.createdAt} · Actualizado {userDetail.updatedAt}</p>
        </div>
      ) : null}

      <DataTable<UserAdminRow>
        columns={[
          { key: "name", label: "Nombre" },
          { key: "email", label: "Correo" },
          { key: "role", label: "Rol" },
          { key: "active", label: "Activo", render: (r) => (r.active ? "Si" : "No") },
          {
            key: "id",
            label: "",
            render: (r) => (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  color="primary"
                  className="font-semibold"
                  onPress={() =>
                    void (async () => {
                      setUserDetailLoading(true);
                      setUserDetail(null);
                      try {
                        setUserDetail(await fetchUserById(r.id));
                      } catch (e) {
                        onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA) });
                      } finally {
                        setUserDetailLoading(false);
                      }
                    })()
                  }
                >
                  Detalle
                </Button>
                {canEdit ? (
                  <>
                    <Button size="sm" variant="tertiary" color="primary" className="font-semibold" onPress={() => setEditing(r)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="tertiary"
                      color="primary"
                      className="font-semibold"
                      onPress={() =>
                        void (async () => {
                          try {
                            await patchUserStatus(r.id, !r.active, auditReason);
                            onNotify({ kind: "ok", text: "Estado actualizado." });
                            await load();
                          } catch (e) {
                            onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA) });
                          }
                        })()
                      }
                    >
                      {r.active ? "Inactivar" : "Activar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="tertiary"
                      color="primary"
                      className="font-semibold"
                      onPress={async () => {
                        const p = await prompt("Nueva contrasena (min 8 caracteres)");
                        if (!p || p.length < 8) return;
                        try {
                          await resetUserPassword(r.id, p, auditReason);
                          onNotify({ kind: "ok", text: "Contrasena restablecida." });
                        } catch (e) {
                          onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA) });
                        }
                      }}
                    >
                      Reset clave
                    </Button>
                  </>
                ) : null}
              </div>
            )
          }
        ]}
        rows={rows}
      />

      <div className="flex items-center gap-4 text-xs text-default-600">
        <Button size="sm" variant="tertiary" color="primary" isDisabled={page <= 0} className="font-semibold" onPress={() => setPage((p) => Math.max(0, p - 1))}>
          Anterior
        </Button>
        <span className="font-medium">Página {page + 1} / {Math.max(1, totalPages)}</span>
        <Button size="sm" variant="tertiary" color="primary" isDisabled={page + 1 >= totalPages} className="font-semibold" onPress={() => setPage((p) => p + 1)}>
          Siguiente
        </Button>
      </div>

      {showCreate && canEdit ? (
        <UserCreatePanel
          auditReason={auditReason}
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); onNotify({ kind: "ok", text: "Usuario creado." }); await load(); }}
          onError={(m) => onNotify({ kind: "err", text: m })}
        />
      ) : null}

      {editing && canEdit ? (
        <UserEditPanel
          auditReason={auditReason}
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); onNotify({ kind: "ok", text: "Usuario actualizado." }); await load(); }}
          onError={(m) => onNotify({ kind: "err", text: m })}
        />
      ) : null}
    </div>
  );
}
