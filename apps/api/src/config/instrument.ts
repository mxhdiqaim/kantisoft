import * as Sentry from "@sentry/bun";
import { helperUtil } from "../shared/utils";

const SENTRY_DSN = helperUtil.getEnvVariable("SENTRY_DSN");

Sentry.init({
    dsn: SENTRY_DSN,

    sendDefaultPii: true,
    tracesSampleRate: 1.0,
});
