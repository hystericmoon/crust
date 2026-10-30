import type { Env } from "../../server/api";
import { handleTemplate } from "../../server/template";

export const onRequestGet = ({ request, env }: { request: Request; env: Env }) => handleTemplate(request, env);
export const onRequestPost = ({ request, env }: { request: Request; env: Env }) => handleTemplate(request, env);
