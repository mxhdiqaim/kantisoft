import * as Sentry from "@sentry/bun";
import { getEnvVariable } from "../shared/utils";

const SENTRY_DSN = getEnvVariable("SENTRY_DSN");

Sentry.init({
    dsn: SENTRY_DSN,

    sendDefaultPii: true,
    tracesSampleRate: 1.0,
});
