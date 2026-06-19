"use client";

import React, { useState, useMemo } from "react";
import { useOverlayState } from "@heroui/react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Dropdown, DropdownMenu, DropdownItem } from "@/components/ui/Dropdown";
import { useDialog } from "@/components/ui/DialogProvider";
import { Button as HeroButton } from "@heroui/react";
import { Plus, MoreVertical, Pencil, Trash2, LucideIcon } from "lucide-react";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";

export interface EntityManagementPageProps<T> {
  title: string;
  description: string;
  icon?: LucideIcon;
  data: T[];
  columns: DataTableColumn<T>[];
  isLoading?: boolean;
  error?: Error | string | null;
  getRowKey: (item: T) => string;
  
  // Create / Edit
  FormComponent?: React.ComponentType<{ 
    initialData?: T | null; 
    onSave: (data: Partial<T>) => void;
  }>;
  onSave?: (data: Partial<T>, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  
  // Data Table props
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  filters?: any[];
  
  // Custom Actions
  customActions?: (item: T) => React.ReactNode[];
  
  // Stats
  renderStats?: () => React.ReactNode;
}

export function EntityManagementPage<T>({
  title,
  description,
  icon: Icon,
  data,
  columns,
  isLoading,
  error,
  getRowKey,
  FormComponent,
  onSave,
  onDelete,
  searchable,
  searchPlaceholder,
  onSearchChange,
  filters,
  customActions,
  renderStats,
}: EntityManagementPageProps<T>) {
  const [selectedEntity, setSelectedEntity] = useState<T | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { confirm } = useDialog();

  const { isOpen: isModalOpen, open: onModalOpen, close: onModalClose } = useOverlayState();

  const handleCreate = () => {
    setSelectedEntity(null);
    setIsEditing(false);
    onModalOpen();
  };

  const handleEdit = (entity: T) => {
    setSelectedEntity(entity);
    setIsEditing(true);
    onModalOpen();
  };

  const handleDelete = async (entity: T) => {
    if (!onDelete) return;
    const id = getRowKey(entity);
    if (await confirm("¿Está seguro de eliminar este registro?")) {
      await onDelete(id);
    }
  };

  const handleModalSave = async (formData: Partial<T>) => {
    if (!onSave) return;
    const id = selectedEntity ? getRowKey(selectedEntity) : undefined;
    await onSave(formData, id);
    onModalClose();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-default-500">{description}</p>
        </div>
        {FormComponent && onSave && (
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={handleCreate}
          >
            Nuevo Registro
          </Button>
        )}
      </div>

      {renderStats && renderStats()}

      <DataTable
        title={title}
        description={description}
        columns={columns}
        data={data}
        getRowKey={getRowKey}
        isLoading={isLoading}
        error={typeof error === "string" ? error : error?.message}
        emptyMessage="No se encontraron registros"
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        onSearchChange={onSearchChange}
        filters={filters}
        actions={(entity) => (
          <Dropdown>
            <HeroButton isIconOnly variant="ghost" size="sm" aria-label="Más acciones">
              <MoreVertical className="w-4 h-4" />
            </HeroButton>
            <DropdownMenu aria-label="Acciones">
              {FormComponent && onSave && (
                <DropdownItem
                  key="edit"
                  textValue="Editar"
                  startContent={<Pencil className="w-4 h-4" />}
                  onPress={() => handleEdit(entity)}
                >
                  Editar
                </DropdownItem>
              )}
              {customActions && customActions(entity)}
              {onDelete && (
                <DropdownItem
                  key="delete"
                  textValue="Eliminar"
                  className="text-danger"
                  color="danger"
                  startContent={<Trash2 className="w-4 h-4" />}
                  onPress={() => handleDelete(entity)}
                >
                  Eliminar
                </DropdownItem>
              )}
            </DropdownMenu>
          </Dropdown>
        )}
      />

      {FormComponent && onSave && (
        <Modal state={ { isOpen: isModalOpen, setOpen: (v: boolean) => { if(!v) onModalClose(); }, open: () => {}, close: onModalClose, toggle: () => {} } }>
          <Modal.Content>
            <Modal.Header>
              <div className="flex items-center gap-3">
                {Icon && <Icon className="w-6 h-6 text-primary" />}
                <div>
                  <h2 className="text-xl font-bold">
                    {isEditing ? "Editar Registro" : "Nuevo Registro"}
                  </h2>
                </div>
              </div>
            </Modal.Header>
            <Modal.Body>
              <FormComponent 
                initialData={selectedEntity} 
                onSave={handleModalSave} 
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onModalClose}>
                Cancelar
              </Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal>
      )}
    </div>
  );
}
