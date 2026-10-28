import { handleDelete, type Env } from "../../server/api";

export const onRequestPost = ({ request, env }: { request: Request; env: Env }) => handleDelete(request, env);
