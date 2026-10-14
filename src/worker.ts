// Production entry (wrangler `main`). Config and manifest are bundled as text, so the deployed
// Worker runs exactly the YAML in this repo: corpus and model selection stay config, not code.
import corpusYaml from "../config/corpus.yaml";
import chadbotYaml from "../config/chadbot.yaml";
import noticesYaml from "../content/notices.yaml";
import { parseConfig } from "./config";
import { parseManifest } from "./corpus";
import { createWorker } from "./index";
import { parseNotices } from "./notices";

const runtime = { config: parseConfig(chadbotYaml), manifest: parseManifest(corpusYaml), notices: parseNotices(noticesYaml) };

export default createWorker(() => runtime);
