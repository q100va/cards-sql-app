import { environment } from '../../src/environments/environment';

declare global {
  interface Window {
    __approveE2EFrontend?: (identity: { production: boolean; apiUrl: string; frontendUrl: string }) => void;
  }
}

// This entry is used only by the E2E Angular configuration. Approve the actual
// compiled environment before importing code that can initialize HTTP services.
if (!window.__approveE2EFrontend) throw new Error('The E2E frontend requires the Cypress safety handshake.');
window.__approveE2EFrontend({ ...environment, frontendUrl: window.location.origin });
void import('../../src/main');
