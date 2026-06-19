import React from 'react';
import { render } from '@testing-library/react';
import StepProgress from '../StepProgress';

describe('StepProgress', () => {
  it('renders steps and highlights done ones', () => {
    const steps = [
      { label: 'A', done: true },
      { label: 'B', done: false },
    ];
    const { getByText } = render(<StepProgress stepsState={steps} session={null} />);
    expect(getByText('A')).toBeTruthy();
    expect(getByText('B')).toBeTruthy();
  });
});
