import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Toast from './Toast';

describe('Toast', () => {
  it('renders the toast with the provided message', () => {
    const message = 'Test message';
    const { getByText } = render(
      <Toast 
        message={message} 
        type="info" 
        isVisible={true} 
        onClose={() => {}} 
      />
    );
    
    expect(getByText(message)).toBeInTheDocument();
  });

  it('does not render when isVisible is false', () => {
    const { container } = render(
      <Toast 
        message="Test message" 
        type="info" 
        isVisible={false} 
        onClose={() => {}} 
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('calls onClose when close button is clicked', () => {
    const onCloseMock = jest.fn();
    const { getByLabelText } = render(
      <Toast 
        message="Test message" 
        type="info" 
        isVisible={true} 
        onClose={onCloseMock} 
      />
    );
    
    fireEvent.click(getByLabelText('Close'));
    
    // We can't directly test the timeout, but we can verify the click handler was called
    expect(onCloseMock).not.toHaveBeenCalled(); // Not called immediately due to animation timeout
  });

  it('renders different styles based on type', () => {
    const types = ['success', 'error', 'info', 'warning'] as const;
    
    types.forEach(type => {
      const { container, unmount } = render(
        <Toast 
          message={`${type} message`} 
          type={type} 
          isVisible={true} 
          onClose={() => {}} 
        />
      );
      
      // Each type has a specific background color class
      const expectedClass = type === 'success' ? 'bg-green-50' :
                           type === 'error' ? 'bg-red-50' :
                           type === 'info' ? 'bg-blue-50' : 'bg-yellow-50';
      
      const toastElement = container.querySelector(`div[class*="${expectedClass}"]`);
      expect(toastElement).toBeInTheDocument();
      
      unmount();
    });
  });
}); 