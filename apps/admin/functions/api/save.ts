import { handleSave, type Env } from "../../server/api";

export const onRequestPost = ({ request, env }: { request: Request; env: Env }) => handleSave(request, env);
