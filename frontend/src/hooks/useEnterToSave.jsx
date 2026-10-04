import { useEffect, useRef } from "react";

/**
 * Reusable hook for Enter key to save functionality
 * @param {Function} saveFunction - The function to call when Enter is pressed
 * @param {boolean} isLoading - Whether the form is currently saving/loading
 * @param {Object} options - Additional options
 * @param {boolean} options.disabled - Disable the hook
 * @param {Array} options.excludeTags - HTML tags to exclude (default: ['TEXTAREA', 'SELECT'])
 * @param {Array} options.excludeClasses - CSS classes to exclude (inputs with these classes won't trigger save)
 */
export const useEnterToSave = (saveFunction, isLoading = false, options = {}) => {
  const {
    disabled = false,
    excludeTags = ['TEXTAREA', 'SELECT'],
    excludeClasses = []
  } = options;

  const saveRef = useRef(null);

  // Update ref with latest save function on every render
  saveRef.current = saveFunction;

  useEffect(() => {
    if (disabled || !saveFunction) return;

    const handleKeyDown = (e) => {
      // Only trigger if Enter is pressed (without Shift, Ctrl, or Cmd)
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !isLoading) {
        const target = e.target;
        
        // Don't trigger if in excluded form fields
        if (excludeTags.includes(target.tagName)) {
          return;
        }
        
        // Don't trigger if in contentEditable div (user might be editing)
        if (target.isContentEditable) {
          return;
        }
        
        // Check if target has excluded classes
        if (excludeClasses.length > 0 && target.classList) {
          for (const excludeClass of excludeClasses) {
            if (target.classList.contains(excludeClass)) {
              return;
            }
          }
        }
        
        // Don't trigger if in any form field (let form handle it naturally)
        const isFormField = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.tagName === 'SELECT';
        
        if (isFormField) {
          // For input fields: if form has onSubmit, let form handle it
          // Otherwise, trigger save
          if (target.tagName === 'INPUT') {
            const form = target.closest('form');
            if (form && form.onsubmit) {
              // Form will handle it naturally
              return;
            }
            // Check if input has a data attribute indicating it handles its own Enter key
            if (target.getAttribute('data-handle-enter') === 'true') {
              return;
            }
            // If no form onSubmit handler, trigger save
            e.preventDefault();
            e.stopPropagation();
            if (saveRef.current) {
              saveRef.current();
            }
          }
          return;
        }
        
        // If Enter is pressed outside form fields (on the page), trigger save
        if (!target.tagName || 
            target.tagName === 'BODY' || 
            target.tagName === 'DIV' || 
            target.tagName === 'MAIN' ||
            target.tagName === 'SECTION' ||
            target.tagName === 'ARTICLE') {
          e.preventDefault();
          e.stopPropagation();
          if (saveRef.current) {
            saveRef.current();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, disabled, excludeClasses]); // Remove saveFunction from dependencies to avoid re-renders
};
