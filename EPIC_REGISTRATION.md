# Registering Lift Log on Epic on FHIR (fhir.epic.com)

You do this once, signed in to **your own** fhir.epic.com account (free developer signup). Lift Log can't create the account or the app for you. When you're done, paste the two client IDs into `mychart.config.js` (see "After registering" below).

Lift Log is a **public client** (a static PWA with no server and no secret), uses a **SMART standalone patient launch with PKCE**, and is **read-only**. With only USCDI APIs and no refresh tokens, it qualifies for **automatic client ID distribution**. Orlando Health then gets the client record without any manual approval.

## Build Apps → Create: fields and values

| Field on the form | Value |
|---|---|
| **Application Name** | `Lift Log` |
| **Application Audience** (Primary user type) | **Patients** |
| **Incoming APIs** (tick exactly these, all R4, all on Epic's USCDI v1/v3 auto-distribution list) | `Patient.Read (R4)` (shown as *Patient.Read (Demographics) (R4)* on some versions)<br>`Observation.Search (Labs) (R4)`<br>`Observation.Read (Labs) (R4)`<br>`DiagnosticReport.Search (Results) (R4)`<br>`DiagnosticReport.Read (Results) (R4)` |
| Anything else (any *Create/Update* API, or any API not on the USCDI list) | **Leave unticked.** A single extra non-USCDI API disqualifies auto-distribution. |
| **Auto-download / distribution** | Tick **Enable Auto-download**, then choose **USCDI v3** (Orlando Health runs Epic May 2026). USCDI v1 also works because every API above is on the v1 list. |
| **Redirect URIs** (Endpoint URI) | `https://jbozarth206.github.io/lift-log/callback.html`<br>Optional, for testing on a computer: `http://localhost:8765/callback.html`<br>These must match exactly and are case-sensitive. |
| **SMART on FHIR Version** | **R4** |
| **SMART Scope Version** | **SMART v1** (the app requests `launch/patient patient/Patient.read patient/Observation.read patient/DiagnosticReport.read`) |
| **Is Confidential Client** | **No / unchecked** (public client, no secret) |
| **Requires Persistent Access** (refresh tokens) | **No / unchecked.** Epic only offers this to confidential clients. A refresh token would also need a client secret uploaded per organization, which a static web app can't keep secret, and it would stop the app syncing automatically. |
| **Can Register Dynamic Clients** (if shown) | **No / unchecked** (possible later upgrade, see "Persistent access" below) |
| **JWK Set URL / public key / client secret** | **Leave empty** |
| **Public Documentation URL** | `https://jbozarth206.github.io/lift-log/about.html` |
| **Privacy Policy URL** (if asked) | `https://jbozarth206.github.io/lift-log/about.html#privacy` |
| **Terms of Use URL** (if asked) | `https://jbozarth206.github.io/lift-log/about.html#terms` |
| **Summary / Description** | "Personal workout and health log. Lets a patient import their own lab results (read-only) from MyChart to view them with reference ranges and trend charts next to their training data. Data stays on the patient's device." |
| **Intended users / purposes** (if asked) | Individual patient, personal health record / self-tracking. Not for clinical decision-making. |
| **Data use / disclosure questions** | Data is stored on the user's device only. The user can optionally copy it to their **own** private GitHub repository for personal coaching. No sale, no advertising, no analytics, no sharing with the developer or third parties. Users revoke access by disconnecting in the app or in MyChart. |
| Thumbnail / logo (optional) | `https://jbozarth206.github.io/lift-log/icons/icon-512.png` |

Save. The app page then shows a **Non-Production Client ID** (works against the sandbox) and a **Client ID** (production).

## Test in the sandbox first (before Ready for Production)
1. Wait about 30 minutes after saving (sandbox sync).
2. Paste the Non-Production Client ID into `mychart.config.js` → `clientIds.sandbox`. Commit and push.
3. Open the app → Track › 🩸 Labs. Choose **Epic sandbox (test patients)** → **Connect MyChart**. Sign in with one of Epic's published sandbox **test patient MyChart logins** (fhir.epic.com → Documentation → *Test Patients*). You should come back to Lift Log with lab results imported.

## Go live
1. On the app page, finish any remaining details, accept the terms, and click **Save and Ready for Production**. **This can't be undone.** After that, only redirect URIs and JWK Set URLs can be edited. Any other technical change means building a new app.
2. Epic distributes the client record to organizations with auto-download (Orlando Health included) on a **rolling ~12-hour cycle**. Allow 12–48 hours. No request to Orlando Health is needed.
3. Paste the production **Client ID** into `mychart.config.js` → `clientIds.production`. Commit and push.
4. In the app: Track › Labs → **Connect MyChart** (Orlando Health) → sign in with your normal MyChart login → allow access.

## After registering: what to edit
`mychart.config.js`:
```js
clientIds: {
  sandbox: '<Non-Production Client ID>',
  production: '<Client ID>'
}
```
Client IDs are public identifiers, not secrets, so committing them is fine.

## Reference facts (checked 2026-11-17)
- Orlando Health production FHIR R4 base, from Epic's endpoint directory (`https://open.epic.com/Endpoints/R4`, Endpoint id `88b765c7-0c38-ec11-9155-001dd8b71f19`): `https://epicproxy.et1131.epichosted.com/FHIRProxy/api/FHIR/R4/`. Its metadata reports *Orlando Health FHIR Server*, Epic **May 2026**, FHIR 4.0.1.
- SMART discovery (`/.well-known/smart-configuration`) works on both Orlando Health and the sandbox:
  - Orlando: authorize `…/FHIRProxy/oauth2/authorize`, token `…/FHIRProxy/oauth2/token`.
  - Capabilities include `launch-standalone`, `client-public`, `context-standalone-patient`, `permission-offline`.
  - PKCE is `S256`.
- CORS: Orlando Health and the sandbox both answer the token endpoint, the FHIR endpoints, and preflights (`OPTIONS`) with `Access-Control-Allow-Origin: *`. A browser-only app can exchange the code and call FHIR directly, with no proxy needed.
- Access tokens last about 1 hour (`expires_in` 3240–3600). Public clients don't get refresh tokens, so a new import after the hour needs a fresh MyChart sign-in. The app shows "Reconnect & sync" for this.

## Persistent access (optional, later)
Epic supports **dynamic client registration** for browser apps. After the first sign-in, the app generates a device key with WebCrypto, registers a per-device client, and then gets new access tokens with a signed JWT (no secret is shipped). That would allow background imports without signing in again. It needs the app registered with dynamic-client support. Check that auto-distribution still applies before switching, because it isn't needed for v7.
