import { handleDeleted, type Env } from "../../server/api";

export const onRequestGet = ({ request, env }: { request: Request; env: Env }) => handleDeleted(request, env);
