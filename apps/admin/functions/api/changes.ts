import { handleChanges, type Env } from "../../server/api";

export const onRequestGet = ({ request, env }: { request: Request; env: Env }) => handleChanges(request, env);
