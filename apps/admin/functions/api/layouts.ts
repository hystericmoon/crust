import { handleLayouts, type Env } from "../../server/api";

export const onRequestGet = ({ request, env }: { request: Request; env: Env }) => handleLayouts(request, env);
export const onRequestPost = ({ request, env }: { request: Request; env: Env }) => handleLayouts(request, env);
