import { handlePage, type Env } from "../../server/api";

export const onRequestGet = ({ request, env }: { request: Request; env: Env }) => handlePage(request, env);
