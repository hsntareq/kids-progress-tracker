import fs from "fs";
import type { NextConfig } from "next";
import path from "path";

const isProductionDeploy = process.env.GITHUB_ACTIONS === "true";

let nextConfig: NextConfig = {
	output: "export",
	basePath: isProductionDeploy ? "/kids-progress-tracker" : "",
	images: {
		unoptimized: true,
	},
};

const localConfigPath = path.join(__dirname, "next.config.local.js");
if (fs.existsSync(localConfigPath)) {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const localConfig = require(localConfigPath);
		nextConfig = { ...nextConfig, ...localConfig };
	} catch (err) {
		console.warn("Failed to load local config override:", err);
	}
}

export default nextConfig;
