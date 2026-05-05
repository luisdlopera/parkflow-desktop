"use client";

import React from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ErrorStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onRetry?: () => void;
  errorCode?: string;
  correlationId?: string;
  technicalDetails?: string;
  showTechnical?: boolean;
}

export function ErrorState({
  title,
  description,
  actionLabel = "Reintentar",
  onRetry,
  errorCode,
  correlationId,
  technicalDetails,
  showTechnical = process.env.NODE_ENV === "development",
}: ErrorStateProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
      <div className="mb-6 rounded-full bg-danger-50 p-4 text-danger">
        <AlertCircle size={48} />
      </div>

      <h3 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h3>
      
      <p className="mb-8 max-w-md text-medium text-default-500">
        {description}
      </p>

      <div className="flex flex-col gap-4">
        {onRetry && (
          <Button
            color="primary"
            variant="shadow"
            size="lg"
            startContent={<RefreshCw size={18} />}
            onClick={onRetry}
            className="font-semibold"
          >
            {actionLabel}
          </Button>
        )}

        {showTechnical && (
          <div className="mt-4 flex flex-col items-center">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs font-medium text-default-400 hover:text-default-600 transition-colors"
            >
              Información técnica {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <Card className="mt-4 max-w-lg border-none bg-default-50 shadow-none">
                    <CardBody className="p-4 text-left font-mono text-[10px] text-default-500 leading-relaxed">
                      {errorCode && (
                        <div className="mb-1">
                          <span className="font-bold text-default-700">CODE:</span> {errorCode}
                        </div>
                      )}
                      {correlationId && (
                        <div className="mb-1">
                          <span className="font-bold text-default-700">CORRELATION_ID:</span> {correlationId}
                        </div>
                      )}
                      {technicalDetails && (
                        <div className="mt-2 border-t border-default-200 pt-2 italic">
                          {technicalDetails}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
