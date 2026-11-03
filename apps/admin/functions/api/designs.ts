import type { Env } from "../../server/api";
import { handleDesigns } from "../../server/designs";

export const onRequestGet = ({ request, env }: { request: Request; env: Env }) => handleDesigns(request, env);
export const onRequestPost = ({ request, env }: { request: Request; env: Env }) => handleDesigns(request, env);
