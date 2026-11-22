export const VOLUNTEERS_API_PATH = '/api/volunteers';
export const CONTACT_SEARCH_ROUTE = '/search-contacts/:q';
const contactNamespace = VOLUNTEERS_API_PATH + '/search-contacts';
const contactPath = /\/api\/volunteers\/search-contacts(?=\/|\?|$)/i;

function originalPath(req) {
  return (req.originalUrl ?? req.url ?? req.path ?? '').split('?')[0];
}

export function isContactSearchRequest(req) {
  const path = originalPath(req).replace(/^https?:\/\/[^/]+/i, '');
  return req.route?.path === CONTACT_SEARCH_ROUTE || path.search(contactPath) === 0;
}

export function requestLogPath(req) {
  if (!isContactSearchRequest(req)) return originalPath(req);
  // Pino serializes request bindings before Express selects the route.
  return req.route?.path === CONTACT_SEARCH_ROUTE
    ? VOLUNTEERS_API_PATH + req.route.path
    : contactNamespace;
}

export function redactContactSearchPath(value) {
  if (typeof value !== 'string') return value;
  const index = value.search(contactPath);
  if (index < 0) return value;
  // A client diagnostic may embed the path in a message or nested context value.
  return value.slice(0, index) + VOLUNTEERS_API_PATH + CONTACT_SEARCH_ROUTE;
}
