import type { Env } from "../../server/api";
import { handlePosts } from "../../server/posts";

export const onRequestGet = ({ request, env }: { request: Request; env: Env }) => handlePosts(request, env);
export const onRequestPost = ({ request, env }: { request: Request; env: Env }) => handlePosts(request, env);
