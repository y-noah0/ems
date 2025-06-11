import submissionService from '../services/submissionService';

const antiCheatUtils = {
  // Initialize anti-cheat detection for an exam
  initializeAntiCheat: (submissionId, onViolationLimit) => {
    if (!submissionId) return { stopMonitoring: () => {} };
    
    // Track violations
    let violationsCount = 0;
    const MAX_VIOLATIONS = 5;
    
    // Event handlers
    const handleBlur = () => {
      logViolation('tab-switch', 'User switched away from exam tab');
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('hidden-tab', 'Exam tab was hidden');
      }
    };
    
    const handleCopyPaste = (e) => {
      e.preventDefault();
      logViolation('copy-attempt', 'User attempted to copy/paste');
    };
    
    // Log violation to server
    const logViolation = async (type, details) => {
      try {
        const response = await submissionService.logViolation(submissionId, type, details);
        violationsCount = response.violations;
        
        // Check if violation limit reached
        if (response.shouldAutoSubmit && onViolationLimit) {
          onViolationLimit();
        }
      } catch (error) {
        console.error('Error logging violation:', error);
      }
    };
    
    // Add event listeners
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('contextmenu', e => e.preventDefault());
    
    // Return function to stop monitoring
    return {
      stopMonitoring: () => {
        window.removeEventListener('blur', handleBlur);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('copy', handleCopyPaste);
        document.removeEventListener('paste', handleCopyPaste);
        document.removeEventListener('contextmenu', e => e.preventDefault());
      }
    };
  }
};

export default antiCheatUtils;
