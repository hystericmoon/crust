import type { Env } from "../../server/api";
import { handleMediaFile } from "../../server/media";

export const onRequestGet = ({ request, env, params }: { request: Request; env: Env; params: { file: string } }) =>
  handleMediaFile(request, env, params.file);
