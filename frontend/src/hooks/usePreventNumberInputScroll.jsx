import { useEffect } from 'react';

/**
 * Custom hook to prevent mouse wheel scrolling from changing number input values
 * This prevents accidental value changes when scrolling over number inputs
 */
const usePreventNumberInputScroll = () => {
  useEffect(() => {
    // Function to prevent wheel events on number inputs
    const preventNumberInputScroll = (e) => {
      // Check if the event target is a number input
      if (e.target && e.target.type === 'number') {
        // Prevent the default wheel behavior
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Function to handle focus events on number inputs
    const handleNumberInputFocus = (e) => {
      if (e.target && e.target.type === 'number') {
        // Add a specific wheel listener to this input
        e.target.addEventListener('wheel', preventNumberInputScroll, { 
          passive: false, 
          capture: true 
        });
      }
    };

    // Function to handle blur events on number inputs
    const handleNumberInputBlur = (e) => {
      if (e.target && e.target.type === 'number') {
        // Remove the specific wheel listener from this input
        e.target.removeEventListener('wheel', preventNumberInputScroll, { 
          capture: true 
        });
      }
    };

    // Add global event listeners
    document.addEventListener('wheel', preventNumberInputScroll, { 
      passive: false, 
      capture: true 
    });
    document.addEventListener('focusin', handleNumberInputFocus, true);
    document.addEventListener('focusout', handleNumberInputBlur, true);

    // Also prevent on existing number inputs
    const existingNumberInputs = document.querySelectorAll('input[type="number"]');
    existingNumberInputs.forEach(input => {
      input.addEventListener('wheel', preventNumberInputScroll, { 
        passive: false, 
        capture: true 
      });
    });

    // Cleanup function
    return () => {
      document.removeEventListener('wheel', preventNumberInputScroll, { 
        capture: true 
      });
      document.removeEventListener('focusin', handleNumberInputFocus, true);
      document.removeEventListener('focusout', handleNumberInputBlur, true);
      
      // Remove listeners from existing number inputs
      const numberInputs = document.querySelectorAll('input[type="number"]');
      numberInputs.forEach(input => {
        input.removeEventListener('wheel', preventNumberInputScroll, { 
          capture: true 
        });
      });
    };
  }, []);
};

export default usePreventNumberInputScroll;