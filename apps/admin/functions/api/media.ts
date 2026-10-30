import type { Env } from "../../server/api";
import { handleMedia } from "../../server/media";

export const onRequestGet = ({ request, env }: { request: Request; env: Env }) => handleMedia(request, env);
export const onRequestPost = ({ request, env }: { request: Request; env: Env }) => handleMedia(request, env);
