import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TierAnchorSelector } from './TierAnchorSelector';

describe('TierAnchorSelector', () => {
  it('renders all three tier anchors with default intermediate selected', () => {
    const handleSelect = vi.fn();
    render(
      <TierAnchorSelector
        selectedTier="INTERMEDIATE"
        onSelectTier={handleSelect}
      />
    );

    const beginnerBtn = screen.getByRole('radio', { name: /Beginner/i });
    const intermediateBtn = screen.getByRole('radio', { name: /Intermediate/i });
    const advancedBtn = screen.getByRole('radio', { name: /Advanced/i });

    expect(beginnerBtn).toBeInTheDocument();
    expect(intermediateBtn).toBeInTheDocument();
    expect(advancedBtn).toBeInTheDocument();

    expect(beginnerBtn).toHaveAttribute('aria-checked', 'false');
    expect(intermediateBtn).toHaveAttribute('aria-checked', 'true');
    expect(advancedBtn).toHaveAttribute('aria-checked', 'false');

    // Values displayed
    expect(screen.getByText('2.500')).toBeInTheDocument();
    expect(screen.getByText('3.500')).toBeInTheDocument();
    expect(screen.getByText('4.500')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('triggers onSelectTier on 1-tap pill click', () => {
    const handleSelect = vi.fn();
    render(
      <TierAnchorSelector
        selectedTier="INTERMEDIATE"
        onSelectTier={handleSelect}
      />
    );

    const beginnerBtn = screen.getByRole('radio', { name: /Beginner/i });
    fireEvent.click(beginnerBtn);

    expect(handleSelect).toHaveBeenCalledWith('BEGINNER');

    const advancedBtn = screen.getByRole('radio', { name: /Advanced/i });
    fireEvent.click(advancedBtn);

    expect(handleSelect).toHaveBeenCalledWith('ADVANCED');
  });
});
