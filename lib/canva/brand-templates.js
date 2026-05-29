/**
 * lib/canva/brand-templates.js
 * --------------------------------------------------------------------------
 * Brand Templates are the parameterised Canva designs the pin generator
 * autofills against. Every template you build inside Canva exposes a set of
 * named "data fields" (text + image). We list them, then map our product
 * data onto them in lib/pin-pipeline/.
 *
 * NOTE: brand templates + autofill are part of the Canva Connect "Enterprise"
 * surface area. If you're not on Enterprise yet, see lib/pin-pipeline/csv-export.js
 * for the free-tier Canva Bulk Create CSV fallback.
 *
 * Endpoints used:
 *   GET /brand-templates
 *   GET /brand-templates/{id}/dataset   (returns the schema of editable fields)
 *
 * Reference: https://www.canva.dev/docs/connect/api-reference/brand-templates/
 * --------------------------------------------------------------------------
 */

import { canva } from "./client.js";

export async function listBrandTemplates({ query, continuation } = {}) {
    return canva.get(`/brand-templates`, {
        query: { query, continuation },
    });
}

export async function getBrandTemplateDataset(templateId) {
    return canva.get(`/brand-templates/${templateId}/dataset`);
}

/**
 * Convenience: walk pagination and return every brand template the user has.
 * Use sparingly — Canva caps page size at 100. Fine for < 1000 templates.
 */
export async function listAllBrandTemplates({ query } = {}) {
    const out = [];
    let continuation;
    do {
        const page = await listBrandTemplates({ query, continuation });
        out.push(...(page.items || []));
        continuation = page.continuation;
    } while (continuation);
    return out;
}
