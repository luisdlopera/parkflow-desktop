"use client";

import React, { useState } from "react";
import { ListBox } from "@heroui/react";
import { Chip } from "@/components/bridge/Chip";
import { Avatar } from "@/components/bridge/Avatar";
import { Switch } from "@/components/bridge/Switch";
import { Input } from "@/components/bridge/Input";
import { Select } from "@/components/bridge/Select";
import { Alert } from "@/components/bridge/Alert";
import { Card } from "@/components/bridge/Card";
import { Users, Check, Shield } from "lucide-react";
import { EntityManagementPage } from "@/features/admin/EntityManagementPage";
import type { DataTableColumn } from "@/components/ui/DataTable";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "SUPPORT" | "AUDITOR";
  active: boolean;
  lastAccessAt?: string;
  createdAt: string;
  permissions: string[];
}

const ROLES = [
  { value: "SUPER_ADMIN", label: "Super Admin", color: "danger" as const },
  { value: "ADMIN", label: "Administrador", color: "primary" as const },
  { value: "SUPPORT", label: "Soporte", color: "warning" as const },
  { value: "AUDITOR", label: "Auditor", color: "default" as const },
];


function UserForm({ initialData, onSave }: { initialData?: AdminUser | null, onSave: (data: Partial<AdminUser>) => void }) {
  const [formName, setFormName] = useState(initialData?.name || "");
  const [formEmail, setFormEmail] = useState(initialData?.email || "");
  const [formRole, setFormRole] = useState<AdminUser["role"]>(initialData?.role || "ADMIN");
  const [formActive, setFormActive] = useState(initialData?.active ?? true);
  const [formPermissions, setFormPermissions] = useState<string[]>(initialData?.permissions || []);

  const togglePermission = (permission: string) => {
    setFormPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  // Expose save function to parent or let parent handle the actual submit button?
  // The EntityManagementPage wraps the form but provides the Footer.
  // We need to auto-save or render our own save button inside FormComponent, OR the FormComponent itself manages its state and calls onSave when submitted.
  // Wait, EntityManagementPage right now doesn't pass a submit button from footer to form. Let's fix EntityManagementPage to accept a render prop or let the form have the submit button.
  // To be safe, I'll put a save button inside the form.

  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      onSave({
        name: formName,
        email: formEmail,
        role: formRole,
        active: formActive,
        permissions: formPermissions
      });
    }}>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nombre" value={formName} onChange={(e) => setFormName(e.target.value)} required />
        <Input label="Email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} type="email" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Rol"
          value={[formRole]}
          onChange={(keys: Set<string | number | boolean | null | undefined>) => {
            if (keys instanceof Set) {
              const val = Array.from(keys)[0] as AdminUser["role"] | undefined;
              if (val) setFormRole(val);
            }
          }}
          className="w-full"
        >
          <Select.Trigger aria-label="Rol">
            <Select.Value aria-label="Rol" />
            <Select.Indicator aria-label="Rol" />
          </Select.Trigger>
          <Select.Popover aria-label="Rol">
            <ListBox>
              {ROLES.map(r => <ListBox.Item key={r.value} textValue={r.label}>{r.label}</ListBox.Item>)}
            </ListBox>
          </Select.Popover>
        </Select>
        <div className="flex items-center gap-2 pt-2">
          <Switch isSelected={formActive} onChange={setFormActive} aria-label="Alternar opción" />
          <span>Activo</span>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
         <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg">Guardar</button>
      </div>
    </form>
  );
}

export function AdminUsersPageClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);

  const handleSave = async (data: Partial<AdminUser>, id?: string) => {
    if (id) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } as AdminUser : u));
    } else {
      setUsers(prev => [...prev, { ...data, id: String(Date.now()), createdAt: new Date().toISOString() } as AdminUser]);
    }
  };

  const handleDelete = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: "name",
      header: "Usuario",
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar name={user.name.charAt(0)} className="bg-primary text-white" />
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-default-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol",
      render: (user) => (
        <Chip variant="soft" size="sm">
          {ROLES.find(r => r.value === user.role)?.label || user.role}
        </Chip>
      ),
    },
    {
      key: "active",
      header: "Estado",
      render: (user) => (
        <Switch isSelected={user.active} size="sm" color="success" aria-label="Alternar opción" />
      ),
    }
  ];

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <Card><Card.Content className="flex items-center gap-3"><Users className="w-5 h-5 text-primary" /><div><p>Total</p><p className="font-bold">{users.length}</p></div></Card.Content></Card>
      <Card><Card.Content className="flex items-center gap-3"><Check className="w-5 h-5 text-success" /><div><p>Activos</p><p className="font-bold">{users.filter(u => u.active).length}</p></div></Card.Content></Card>
    </div>
  );

  return (
    <>
      <Alert color="warning" title="Disponible próximamente" className="mb-4">
        La gestión de usuarios administrativos se encuentra en desarrollo y utiliza datos de prueba.
      </Alert>
      <EntityManagementPage
        title="Usuarios Administrativos"
        description="Gestione los usuarios con acceso al panel de super administración"
        icon={Users}
        data={users}
        columns={columns}
        getRowKey={(u) => u.id}
        FormComponent={UserForm}
        onSave={handleSave}
        onDelete={handleDelete}
        renderStats={renderStats}
      />
    </>
  );
}
