I’ll create a DOCX document for the third-party system that is structured in two stages: first questions to understand their current integration state, then a conditional action plan based on their answers.

The document will include:

1. Purpose and context
   - Explain that the goal is to identify why branches are missing from `/api-branches`.
   - Clarify that they should answer the questions first before applying fixes.

2. Current-state questionnaire
   - Credential/authentication questions:
     - Are they using `x-api-key` and `x-api-secret`?
     - Are credentials sent in headers, body, or query string?
     - Are they also sending `Authorization: Bearer ...`?
     - If yes, what scopes does the token have?
   - Endpoint questions:
     - Which URL are they calling?
     - Are they calling `/api-branches` or `/api-branches/test`?
     - What HTTP status code do they receive?
   - Parser questions:
     - Which response field does their parser read: `branches`, `data`, `response.data.branches`, or something else?
     - Does their parser support empty arrays?
   - Branch mapping questions:
     - Do they expect merchant-level access or one specific branch only?
     - What branch IDs are they expecting?
     - Are they filtering inactive branches on their side?
   - Evidence request:
     - Ask them to provide sanitized request/response logs with secrets redacted.

3. Commands they should execute
   - cURL command for `/api-branches`.
   - cURL command for `/api-branches/test`.
   - Optional cURL command with Bearer token.
   - A small JavaScript parser example showing how to read `branches`, fallback to `data`, and verify `count`.

4. Response interpretation guide
   - If `401`: check API key/secret placement and values.
   - If `403`: check Bearer token branch scopes.
   - If `429`: wait and retry due to rate limit.
   - If `count = 0`: inspect `/api-branches/test` debug fields.
   - If `/test` shows inactive branches: request branch activation.
   - If `/test` shows `configured_branch_id`: verify the app is intentionally branch-restricted.
   - If parser sees no data but response has `branches`: update parser path.

5. Visible resolution workflow
   - Step 1: Answer questionnaire.
   - Step 2: Execute test commands.
   - Step 3: Paste sanitized outputs.
   - Step 4: Match result to action table.
   - Step 5: Apply parser/auth/branch configuration fix.
   - Step 6: Re-test and confirm expected count.

6. Deliverable
   - Generate a polished `.docx` file in `/mnt/documents/`.
   - Validate the DOCX.
   - Convert it to PDF/images for QA and inspect all pages for layout issues before delivering the file.