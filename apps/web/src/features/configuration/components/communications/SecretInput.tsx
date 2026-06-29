import React, { useState } from 'react';
import { Input, Button } from "@heroui/react";
import { Eye, EyeOff, KeyRound } from "lucide-react";

interface SecretInputProps {
  label: string;
  name: string;
  value: string | undefined;
  maskedValue?: string | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export const SecretInput: React.FC<SecretInputProps> = ({ label, name, value, maskedValue, onChange, placeholder }) => {
  const [isReplacing, setIsReplacing] = useState(!maskedValue);
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => setIsVisible(!isVisible);

  if (!isReplacing && maskedValue) {
    return (
      <div className="flex gap-2 items-end">
        <Input 
          label={label}
          value="••••••••••••••••"
          isDisabled
          startContent={<KeyRound className="w-4 h-4 text-default-400" />}
          className="flex-1"
        />
        <Button variant="flat" color="primary" onPress={() => setIsReplacing(true)}>
          Reemplazar
        </Button>
      </div>
    );
  }

  return (
    <Input
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder || `Ingresa ${label}`}
      endContent={
        <button className="focus:outline-none" type="button" onClick={toggleVisibility} aria-label="Toggle password visibility">
          {isVisible ? (
            <EyeOff className="text-2xl text-default-400 pointer-events-none" />
          ) : (
            <Eye className="text-2xl text-default-400 pointer-events-none" />
          )}
        </button>
      }
      type={isVisible ? "text" : "password"}
    />
  );
};
