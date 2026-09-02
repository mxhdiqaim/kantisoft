import { Request, Response, NextFunction } from "express";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/express";
import { userService } from "../service";
import { helperUtil } from "../../../shared/utils";
import logger from "../../../shared/logger";
import { BadRequestError } from "../../../shared/errors/custom.error";

export default class WebhookController {
    public handleClerkWebhook = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const webhookSecret = helperUtil.getEnvVariable("CLERK_WEBHOOK_SECRET");

            const svix_id = req.headers["svix-id"] as string;
            const svix_timestamp = req.headers["svix-timestamp"] as string;
            const svix_signature = req.headers["svix-signature"] as string;

            if (!svix_id || !svix_timestamp || !svix_signature) {
                throw new BadRequestError("Missing Svix headers");
            }

            // Ensure body is a raw Buffer
            if (!Buffer.isBuffer(req.body)) {
                throw new BadRequestError("Request body must be raw Buffer. Check middleware order.");
            }

            const payload = req.body.toString("utf8");
            const wh = new Webhook(webhookSecret);
            let evt: WebhookEvent;

            try {
                evt = wh.verify(payload, {
                    "svix-id": svix_id,
                    "svix-timestamp": svix_timestamp,
                    "svix-signature": svix_signature,
                }) as WebhookEvent;
            } catch (err) {
                logger.error("Clerk Webhook verification failed", err as Error);
                throw new BadRequestError("Invalid webhook signature");
            }

            if (evt.type === "user.created") {
                const { id, email_addresses, first_name, last_name, phone_numbers } = evt.data;
                const primaryEmail = email_addresses?.[0]?.email_address;
                const primaryPhone = phone_numbers?.[0]?.phone_number;

                if (primaryEmail) {
                    await userService.syncClerkUserCreated(
                        id,
                        primaryEmail,
                        primaryPhone,
                        first_name || "Unknown",
                        last_name || "Unknown",
                    );
                    logger.info(`Processed Clerk user.created webhook for ${primaryEmail}`);
                }
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            next(error);
        }
    };
}
