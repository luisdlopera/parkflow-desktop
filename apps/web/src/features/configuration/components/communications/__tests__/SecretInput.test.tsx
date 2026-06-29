import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecretInput } from '../SecretInput';
import { describe, it, expect, vi } from 'vitest';

describe('SecretInput', () => {
  it('should display the masked value by default if provided', () => {
    render(<SecretInput name="apiKey" label="API Key" maskedValue="***abcd" />);
    
    // It should render an input with the masked value
    const input = screen.getByDisplayValue('***abcd');
    expect(input).toBeDefined();
    expect(input.getAttribute('disabled')).not.toBeNull();
  });

  it('should allow replacing the masked value when Replace button is clicked', () => {
    render(<SecretInput name="apiKey" label="API Key" maskedValue="***abcd" />);
    
    const replaceButton = screen.getByText('Reemplazar');
    fireEvent.click(replaceButton);

    // The input should now be empty and enabled
    const input = screen.getByLabelText('API Key') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(input.disabled).toBe(false);
  });

  it('should toggle password visibility when eye icon is clicked', () => {
    render(<SecretInput name="apiKey" label="API Key" value="my-secret" />);
    
    const input = screen.getByLabelText('API Key') as HTMLInputElement;
    expect(input.type).toBe('password');

    // Click the toggle button (it's the button inside the input, usually aria-label="Toggle password visibility")
    const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i });
    fireEvent.click(toggleButton);

    expect(input.type).toBe('text');
  });
});
