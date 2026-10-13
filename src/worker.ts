// Production entry (wrangler `main`). Config and manifest are bundled as text, so the deployed
// Worker runs exactly the YAML in this repo: corpus and model selection stay config, not code.
import corpusYaml from "../config/corpus.yaml";
import chadbotYaml from "../config/chadbot.yaml";
import { parseConfig } from "./config";
import { parseManifest } from "./corpus";
import { createWorker } from "./index";

const runtime = { config: parseConfig(chadbotYaml), manifest: parseManifest(corpusYaml) };

export default createWorker(() => runtime);
