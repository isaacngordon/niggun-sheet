import { render, screen, fireEvent } from '@testing-library/react';
import SearchBox from '../SearchBox';

describe('SearchBox Component', () => {
  it('renders with placeholder text', () => {
    render(<SearchBox placeholder="Search songs..." />);
    const input = screen.getByPlaceholderText('Search songs...');
    expect(input).toBeInTheDocument();
  });

  it('renders without clear button when showClearButton is false', () => {
    render(<SearchBox showClearButton={false} />);
    const clearButton = screen.queryByText('Clear');
    expect(clearButton).not.toBeInTheDocument();
  });

  it('renders with clear button by default', () => {
    render(<SearchBox />);
    const clearButton = screen.getByText('Clear');
    expect(clearButton).toBeInTheDocument();
  });

  it('calls onSearch when input changes', () => {
    const mockOnSearch = jest.fn();
    render(<SearchBox onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test query' } });
    
    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('calls onSearch when Enter key is pressed', () => {
    const mockOnSearch = jest.fn();
    render(<SearchBox onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    // Called once on change, once on Enter
    expect(mockOnSearch).toHaveBeenCalledTimes(2);
    expect(mockOnSearch).toHaveBeenCalledWith('test');
  });

  it('clears input and calls onClear when clear button is clicked', () => {
    const mockOnClear = jest.fn();
    render(<SearchBox onClear={mockOnClear} />);
    
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });
    
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    
    expect(input.value).toBe('');
    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  it('updates internal state correctly', () => {
    render(<SearchBox />);
    
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test query' } });
    
    expect(input.value).toBe('test query');
  });

  it('handles empty search query', () => {
    const mockOnSearch = jest.fn();
    render(<SearchBox onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText('Search...');
    // First change to something
    fireEvent.change(input, { target: { value: 'test' } });
    
    // Then clear it
    fireEvent.change(input, { target: { value: '' } });
    
    // Should have been called twice - once with 'test', once with ''
    expect(mockOnSearch).toHaveBeenCalledWith('');
    expect(mockOnSearch).toHaveBeenCalledTimes(2);
  });
});
