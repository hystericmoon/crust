import { handleRestore, type Env } from "../../server/api";

export const onRequestPost = ({ request, env }: { request: Request; env: Env }) => handleRestore(request, env);
