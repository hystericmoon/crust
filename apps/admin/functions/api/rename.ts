import { handleRename, type Env } from "../../server/api";

export const onRequestPost = ({ request, env }: { request: Request; env: Env }) => handleRename(request, env);
