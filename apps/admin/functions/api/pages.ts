import { handlePages, type Env } from "../../server/api";

export const onRequestGet = ({ request, env }: { request: Request; env: Env }) => handlePages(request, env);
