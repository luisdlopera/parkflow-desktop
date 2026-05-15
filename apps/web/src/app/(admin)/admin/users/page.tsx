"use client";

import { useState, useCallback } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Alert,
  Select,
  SelectItem,
  Switch,
  Avatar,
} from "@heroui/react";
import {
  Users,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Mail,
  Shield,
  Check,
  X,
} from "lucide-react";
import { authHeaders } from "@/lib/auth";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";

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

const AVAILABLE_PERMISSIONS = [
  { value: "companies:read", label: "Ver empresas" },
  { value: "companies:write", label: "Editar empresas" },
  { value: "licenses:read", label: "Ver licencias" },
  { value: "licenses:write", label: "Gestionar licencias" },
  { value: "devices:read", label: "Ver dispositivos" },
  { value: "devices:write", label: "Controlar dispositivos" },
  { value: "monitoring:read", label: "Ver monitoreo" },
  { value: "monitoring:write", label: "Resolver incidentes" },
  { value: "audit:read", label: "Ver auditoría" },
  { value: "users:read", label: "Ver usuarios" },
  { value: "users:write", label: "Gestionar usuarios" },
  { value: "settings:read", label: "Ver configuración" },
  { value: "settings:write", label: "Editar configuración" },
];

const MOCK_USERS: AdminUser[] = [
  {
    id: "1",
    name: "Super Administrador",
    email: "admin@parkflow.local",
    role: "SUPER_ADMIN",
    active: true,
    lastAccessAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    permissions: AVAILABLE_PERMISSIONS.map((p) => p.value),
  },
  {
    id: "2",
    name: "Juan Pérez",
    email: "juan@parkflow.local",
    role: "ADMIN",
    active: true,
    lastAccessAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    permissions: ["companies:read", "licenses:read", "devices:read", "monitoring:read", "audit:read"],
  },
  {
    id: "3",
    name: "María García",
    email: "maria@parkflow.local",
    role: "SUPPORT",
    active: true,
    lastAccessAt: new Date(Date.now() - 7200000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    permissions: ["monitoring:read", "monitoring:write", "devices:read", "audit:read"],
  },
  {
    id: "4",
    name: "Carlos López",
    email: "carlos@parkflow.local",
    role: "AUDITOR",
    active: false,
    lastAccessAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    permissions: ["audit:read", "companies:read", "licenses:read"],
  },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>(MOCK_USERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<AdminUser["role"]>("ADMIN");
  const [formActive, setFormActive] = useState(true);
  const [formPermissions, setFormPermissions] = useState<string[]>([]);

  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  const handleCreate = () => {
    setSelectedUser(null);
    setIsEditing(false);
    setFormName("");
    setFormEmail("");
    setFormRole("ADMIN");
    setFormActive(true);
    setFormPermissions([]);
    onModalOpen();
  };

  const handleEdit = (user: AdminUser) => {
    setSelectedUser(user);
    setIsEditing(true);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormActive(user.active);
    setFormPermissions(user.permissions);
    onModalOpen();
  };

  const handleSave = () => {
    if (isEditing && selectedUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                name: formName,
                email: formEmail,
                role: formRole,
                active: formActive,
                permissions: formPermissions,
              }
            : u
        )
      );
    } else {
      const newUser: AdminUser = {
        id: String(Date.now()),
        name: formName,
        email: formEmail,
        role: formRole,
        active: formActive,
        permissions: formPermissions,
        createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, newUser]);
    }
    onModalClose();
  };

  const handleDelete = (userId: string) => {
    if (confirm("¿Está seguro de eliminar este usuario?")) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  };

  const handleToggleActive = (user: AdminUser) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u))
    );
  };

  const togglePermission = (permission: string) => {
    setFormPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const getRoleLabel = (role: string) => {
    return ROLES.find((r) => r.value === role)?.label || role;
  };

  const getRoleColor = (role: string) => {
    return ROLES.find((r) => r.value === role)?.color || "default";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.active).length,
    superAdmins: users.filter((u) => u.role === "SUPER_ADMIN").length,
    online: users.filter((u) => u.lastAccessAt && new Date(u.lastAccessAt).getTime() > Date.now() - 300000).length,
  };

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: "name",
      header: "Usuario",
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar name={getInitials(user.name)} className="bg-primary text-white" />
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
      sortable: true,
      render: (user) => (
        <Chip color={getRoleColor(user.role)} variant="flat" size="sm">
          {getRoleLabel(user.role)}
        </Chip>
      ),
    },
    {
      key: "active",
      header: "Estado",
      align: "center",
      render: (user) => (
        <Switch
          isSelected={user.active}
          onValueChange={() => handleToggleActive(user)}
          size="sm"
          color="success"
        />
      ),
    },
    {
      key: "permissions",
      header: "Permisos",
      render: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.permissions.slice(0, 3).map((perm) => (
            <Chip key={perm} variant="flat" size="sm" className="text-xs">
              {perm.split(":")[0]}
            </Chip>
          ))}
          {user.permissions.length > 3 && (
            <Chip variant="flat" size="sm" className="text-xs">
              +{user.permissions.length - 3}
            </Chip>
          )}
        </div>
      ),
    },
    {
      key: "lastAccessAt",
      header: "Ultimo acceso",
      sortable: true,
      render: (user) =>
        user.lastAccessAt ? (
          <span className="text-sm">
            {new Date(user.lastAccessAt).toLocaleString("es-CO", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </span>
        ) : (
          <span className="text-default-400 text-sm">Nunca</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Usuarios Administrativos</h1>
          <p className="text-default-500">
            Gestione los usuarios con acceso al panel de super administración
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={handleCreate}
        >
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-default-500">Total Usuarios</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Check className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-default-500">Activos</p>
              <p className="text-xl font-bold">{stats.active}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="p-2 bg-danger/10 rounded-lg">
              <Shield className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-sm text-default-500">Super Admins</p>
              <p className="text-xl font-bold">{stats.superAdmins}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <div className="relative">
                <Users className="w-5 h-5 text-success" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-success rounded-full animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-sm text-default-500">En Línea</p>
              <p className="text-xl font-bold">{stats.online}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <DataTable
        title="Usuarios administrativos"
        description="Gestiona roles, estado y permisos del panel."
        columns={columns}
        data={filteredUsers}
        getRowKey={(user) => user.id}
        isLoading={isLoading}
        error={error}
        emptyMessage="No se encontraron usuarios"
        searchable
        searchPlaceholder="Buscar por nombre, email o rol..."
        onSearchChange={setSearchQuery}
        filters={[
          {
            key: "role",
            label: "Rol",
            type: "select",
            options: ROLES.map((role) => ({ label: role.label, value: role.value })),
          },
          { key: "active", label: "Activo", type: "boolean" },
          { key: "lastAccessAt", label: "Ultimo acceso", type: "dateRange" },
        ]}
        actions={(user) => (
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm" aria-label="Más acciones">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Acciones">
              <DropdownItem
                key="edit"
                textValue="Editar"
                startContent={<Pencil className="w-4 h-4" />}
                onPress={() => handleEdit(user)}
              >
                Editar
              </DropdownItem>
              <DropdownItem
                key="delete"
                textValue="Eliminar"
                className="text-danger"
                color="danger"
                startContent={<Trash2 className="w-4 h-4" />}
                onPress={() => handleDelete(user.id)}
              >
                Eliminar
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )}
      />

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="2xl">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-bold">
                  {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
                </h2>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nombre completo"
                />
                <Input
                  label="Email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="correo@parkflow.local"
                  type="email"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Rol"
                  selectedKeys={[formRole]}
                  onChange={(e) => setFormRole(e.target.value as AdminUser["role"])}
                >
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} textValue={role.label}>
                      {role.label}
                    </SelectItem>
                  ))}
                </Select>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    isSelected={formActive}
                    onValueChange={setFormActive}
                    color="success"
                  />
                  <span className="text-sm">Usuario activo</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">Permisos</h3>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <div key={perm.value} className="flex items-center gap-2">
                      <Switch
                        isSelected={formPermissions.includes(perm.value)}
                        onValueChange={() => togglePermission(perm.value)}
                        size="sm"
                      />
                      <span className="text-sm">{perm.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {formRole === "SUPER_ADMIN" && (
                <Alert color="warning">
                  <p className="text-sm">
                    <strong>Advertencia:</strong> Los Super Administradores tienen acceso completo a
                    todas las funciones del sistema. Asigne este rol con precaución.
                  </p>
                </Alert>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onModalClose}>
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={handleSave}
              isDisabled={!formName || !formEmail}
            >
              {isEditing ? "Guardar Cambios" : "Crear Usuario"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
