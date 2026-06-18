import React from 'react';
import { render } from '@testing-library/react';
import ManualMovementForm from '../ManualMovementForm';
import { vi } from 'vitest';
import { useForm } from 'react-hook-form';

describe('ManualMovementForm', () => {
  it('renders without crashing', () => {
    function TestHost() {
      const manualForm = useForm({
        defaultValues: {
          manualType: '',
          manualMethod: '',
          manualAmount: 0,
          manualReason: '',
        },
      });

      const p: any = {
        manualType: '',
        manualMethod: '',
        manualForm,
        perms: { canMove: true },
        busy: false,
        allMovements: [],
        onAddManual: vi.fn(),
        onPrintLastMovement: vi.fn(),
      };

      return <ManualMovementForm p={p} contains={() => true} />;
    }

    const { getByText } = render(<TestHost />);
    expect(getByText('Ingreso / egreso manual')).toBeTruthy();
  });
});
