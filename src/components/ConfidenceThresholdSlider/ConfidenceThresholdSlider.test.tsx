import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfidenceThresholdSlider } from './ConfidenceThresholdSlider';
import type { ConfidenceThresholdSliderProps } from '../../types';

describe('ConfidenceThresholdSlider', () => {
  const mockOnChange = vi.fn<(value: number) => void>();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with default expanded state', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('confidence-threshold-slider')).toBeInTheDocument();
      expect(screen.getByTestId('threshold-slider')).toBeInTheDocument();
      expect(screen.getByTestId('threshold-value')).toHaveTextContent('50%');
    });

    it('renders with correct default value', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByTestId('threshold-slider');
      expect(slider).toHaveAttribute('min', '0.1');
      expect(slider).toHaveAttribute('max', '0.9');
      expect(slider).toHaveAttribute('step', '0.05');
      expect(slider).toHaveValue('0.5');
    });

    it('displays value as percentage', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.75}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('threshold-value')).toHaveTextContent('75%');
    });

    it('shows threshold label', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Confidence Threshold')).toBeInTheDocument();
    });

    it('shows helper text about filtering', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/Lower = more detections/i)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onChange when slider value changes', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByTestId('threshold-slider');
      fireEvent.change(slider, { target: { value: '0.7' } });

      expect(mockOnChange).toHaveBeenCalledWith(0.7);
    });

    it('calls onChange with correct value at minimum', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByTestId('threshold-slider');
      fireEvent.change(slider, { target: { value: '0.1' } });

      expect(mockOnChange).toHaveBeenCalledWith(0.1);
    });

    it('calls onChange with correct value at maximum', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByTestId('threshold-slider');
      fireEvent.change(slider, { target: { value: '0.9' } });

      expect(mockOnChange).toHaveBeenCalledWith(0.9);
    });

    it('calls onChange with intermediate values', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByTestId('threshold-slider');
      fireEvent.change(slider, { target: { value: '0.35' } });

      expect(mockOnChange).toHaveBeenCalledWith(0.35);
    });
  });

  describe('collapsible behavior', () => {
    it('renders minimize button when expanded', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('minimize-button')).toBeInTheDocument();
    });

    it('collapses when minimize button is clicked', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
        />
      );

      const minimizeButton = screen.getByTestId('minimize-button');
      fireEvent.click(minimizeButton);

      expect(screen.queryByTestId('threshold-slider')).not.toBeInTheDocument();
      expect(screen.getByTestId('expand-button')).toBeInTheDocument();
      expect(screen.getByTestId('threshold-badge')).toHaveTextContent('50%');
    });

    it('expands when expand button is clicked', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
        />
      );

      // First collapse
      fireEvent.click(screen.getByTestId('minimize-button'));

      // Then expand
      fireEvent.click(screen.getByTestId('expand-button'));

      expect(screen.getByTestId('threshold-slider')).toBeInTheDocument();
      expect(screen.queryByTestId('expand-button')).not.toBeInTheDocument();
    });

    it('can be initialized in collapsed state', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
          defaultCollapsed={true}
        />
      );

      expect(screen.queryByTestId('threshold-slider')).not.toBeInTheDocument();
      expect(screen.getByTestId('expand-button')).toBeInTheDocument();
    });
  });

  describe('different values', () => {
    it.each([
      [0.1, '10%'],
      [0.25, '25%'],
      [0.5, '50%'],
      [0.75, '75%'],
      [0.9, '90%']
    ])('renders correct percentage for value %s', (value, expectedText) => {
      const { unmount } = render(
        <ConfidenceThresholdSlider
          value={value}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('threshold-value')).toHaveTextContent(expectedText);
      unmount();
    });

    it.each([
      [0.1, '10%'],
      [0.25, '25%'],
      [0.5, '50%'],
      [0.75, '75%'],
      [0.9, '90%']
    ])('shows correct badge when collapsed for value %s', (value, expectedText) => {
      render(
        <ConfidenceThresholdSlider
          value={value}
          onChange={mockOnChange}
          defaultCollapsed={true}
        />
      );

      expect(screen.getByTestId('threshold-badge')).toHaveTextContent(expectedText);
    });
  });

  describe('styling', () => {
    it('applies custom className when provided', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
          className="custom-class"
        />
      );

      expect(screen.getByTestId('confidence-threshold-slider')).toHaveClass('custom-class');
    });

    it('has proper accessibility attributes', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByTestId('threshold-slider');
      expect(slider).toHaveAttribute('type', 'range');
      expect(slider).toHaveAttribute('aria-label', 'Confidence threshold');

      const minimizeButton = screen.getByTestId('minimize-button');
      expect(minimizeButton).toHaveAttribute('aria-label', 'Minimize threshold slider');
    });

    it('has proper accessibility when collapsed', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.5}
          onChange={mockOnChange}
          defaultCollapsed={true}
        />
      );

      const expandButton = screen.getByTestId('expand-button');
      expect(expandButton).toHaveAttribute('aria-label', 'Expand threshold slider');
    });
  });

  describe('edge cases', () => {
    it('handles value at lower boundary', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.1}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('threshold-slider')).toHaveValue('0.1');
      expect(screen.getByTestId('threshold-value')).toHaveTextContent('10%');
    });

    it('handles value at upper boundary', () => {
      render(
        <ConfidenceThresholdSlider
          value={0.9}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('threshold-slider')).toHaveValue('0.9');
      expect(screen.getByTestId('threshold-value')).toHaveTextContent('90%');
    });
  });
});
