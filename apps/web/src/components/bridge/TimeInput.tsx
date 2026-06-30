import React, { forwardRef } from 'react';
import { TimeField as HeroTimeField, Label, Description, FieldError } from '@heroui/react';
import type { TimeValue } from '@heroui/react';

export interface TimeInputProps {
  id?: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  value?: TimeValue | null;
  defaultValue?: TimeValue | null;
  onChange?: (value: TimeValue | null) => void;
  name?: string;
  className?: string;
  "aria-label"?: string;
  hourCycle?: 12 | 24;
}

export const TimeInput = forwardRef<HTMLDivElement, TimeInputProps>(function TimeInput(
  {
    label,
    description,
    errorMessage,
    isInvalid,
    isRequired,
    isDisabled,
    isReadOnly,
    value,
    defaultValue,
    onChange,
    name,
    className,
    id,
    "aria-label": ariaLabel,
    hourCycle = 24,
    ...props
  },
  ref
) {
  return (
    <HeroTimeField
      ref={ref}
      className={`w-full ${className || ''}`}
      isInvalid={isInvalid}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      name={name}
      hourCycle={hourCycle}
      id={id}
      aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
      {...props as any}
    >
      {label && <Label>{label}</Label>}
      <HeroTimeField.Group>
        <HeroTimeField.Input>
          {(segment: any) => <HeroTimeField.Segment segment={segment} />}
        </HeroTimeField.Input>
      </HeroTimeField.Group>
      {description && <Description>{description}</Description>}
      {errorMessage && <FieldError>{errorMessage}</FieldError>}
    </HeroTimeField>
  );
});
