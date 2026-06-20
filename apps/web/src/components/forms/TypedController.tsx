/**
 * TypedController: wrap react-hook-form Controller with proper generics.
 * Eliminates `control as any` pattern by using generics.
 *
 * Usage:
 *   <TypedController<MyFormSchema>
 *     name="fieldName"
 *     control={control}
 *     render={({ field }) => <Input {...field} />}
 *   />
 */
import { Controller, FieldValues, Path, Control, ControllerRenderProps, ControllerFieldState, UseFormStateReturn } from 'react-hook-form';
import React from 'react';

export function TypedController<T extends FieldValues>({
  name,
  control,
  render,
  rules,
}: {
  name: Path<T>;
  control: Control<T>;
  render: (props: { field: ControllerRenderProps<T, Path<T>>; fieldState: ControllerFieldState; formState: UseFormStateReturn<T> }) => React.ReactElement;
  rules?: import('react-hook-form').UseControllerProps<T, Path<T>>['rules'];
}) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={render}
    />
  );
}
