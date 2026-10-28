import { handleStatus, type Env } from "../../server/api";

export const onRequestGet = ({ request, env }: { request: Request; env: Env }) => handleStatus(request, env);
