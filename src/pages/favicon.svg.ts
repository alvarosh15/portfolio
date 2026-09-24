import type { APIRoute } from "astro";
import { faviconSvg } from "../scripts/favicon";

export const GET: APIRoute = () => new Response(faviconSvg(), { headers: { "Content-Type": "image/svg+xml" } });
