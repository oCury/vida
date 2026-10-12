import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fixa a raiz do workspace: evita que o Next confunda este projeto com
  // outro package-lock.json presente em ~/Projetos (fora deste repo).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
