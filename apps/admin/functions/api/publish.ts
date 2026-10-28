import { handlePublish, type Env } from "../../server/api";

export const onRequestGet = ({ request, env }: { request: Request; env: Env }) => handlePublish(request, env);
export const onRequestPost = ({ request, env }: { request: Request; env: Env }) => handlePublish(request, env);
