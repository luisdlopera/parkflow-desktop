import React from "react";
import { Button } from "@/components/bridge/Button";
import { Tooltip } from "@/components/bridge/Tooltip";
import { Eye, Pencil, Trash } from "lucide-react";
import { CellRendererProps } from "../types";

/**
 * ActionsCell — Muestra un grupo de acciones (Ver, Editar, Eliminar).
 * Este es un placeholder genérico. En la práctica, las acciones de una tabla
 * se manejan mejor con un renderer "custom" o con el prop `actions` del DataTable.
 * 
 * @deprecated Usa el prop `actions` del DataTable o type="custom" en su lugar.
 */
const ActionsCell: React.FC<CellRendererProps> = () => {
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Acciones de la fila">
      <Tooltip content="Ver detalle">
        <Button isIconOnly size="sm" variant="light" aria-label="Ver">
          <Eye className="size-4" />
        </Button>
      </Tooltip>
      <Tooltip content="Editar">
        <Button isIconOnly size="sm" variant="light" aria-label="Editar">
          <Pencil className="size-4" />
        </Button>
      </Tooltip>
      <Tooltip content="Eliminar">
        <Button isIconOnly size="sm" variant="light" color="danger" aria-label="Eliminar">
          <Trash className="size-4" />
        </Button>
      </Tooltip>
    </div>
  );
};

export default ActionsCell;
