/* MyChart (Epic SMART on FHIR) connection settings for Lift Log.
 * Paste the two client IDs from fhir.epic.com > Build Apps > (your app) once it is registered.
 * These are PUBLIC identifiers (no secret). Tokens never live here; they stay in this phone's localStorage. */
window.MYCHART_CONFIG = {
  clientIds: {
    sandbox: 'PASTE_NON_PRODUCTION_CLIENT_ID',   // "Non-Production Client ID" on the app page
    production: 'PASTE_PRODUCTION_CLIENT_ID'     // "Client ID" (production) on the app page
  },
  // SMART v1 scopes. Epic grants only the APIs ticked on the app registration.
  scopes: 'launch/patient patient/Patient.read patient/Observation.read patient/DiagnosticReport.read',
  // relative to the app; must exactly match a Redirect URI on the registration
  redirectPath: 'callback.html',
  // Endpoints (from https://open.epic.com/Endpoints/R4). Authorize/token URLs are discovered from
  // <fhirBase>/.well-known/smart-configuration at connect time.
  endpoints: [
    {id: 'orlando-health', name: 'Orlando Health', env: 'production',
     fhirBase: 'https://epicproxy.et1131.epichosted.com/FHIRProxy/api/FHIR/R4'},
    {id: 'epic-sandbox', name: 'Epic sandbox (test patients)', env: 'sandbox',
     fhirBase: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4'}
  ],
  defaultEndpoint: 'orlando-health',
  autoSyncHours: 6   // auto-import on open if the session is still valid and the last import is older than this
};
