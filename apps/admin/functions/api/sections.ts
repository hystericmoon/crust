import type { Env } from "../../server/api";
import { handleSections } from "../../server/sections";

export const onRequestGet = ({ request, env }: { request: Request; env: Env }) => handleSections(request, env);
export const onRequestPost = ({ request, env }: { request: Request; env: Env }) => handleSections(request, env);
