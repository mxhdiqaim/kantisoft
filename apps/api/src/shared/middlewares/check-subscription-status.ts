import { CustomRequest } from "../../types/express";
import { NextFunction, Response } from "express";
import db from "../database";
import { eq } from "drizzle-orm";
import { storeSubscriptions } from "../../schema/store-subscriptions-schema";
import { handleError2 } from "../../service/error-handling";
import { StatusCodes } from "http-status-codes";

export const checkSubscriptionStatus = async (
    req: CustomRequest,
    res: Response,
    next: NextFunction,
) => {
    const currentUser = req.user?.data;
    const storeId = currentUser?.storeId;

    if (!storeId) {
        // This should ideally be caught by `checkUserHasStore` middleware first
        return handleError2(
            res,
            "User not authenticated.",
            StatusCodes.UNAUTHORIZED,
        );
    }

    const sub = await db.query.storeSubscriptions.findFirst({
        where: eq(storeSubscriptions.storeId, storeId),
    });

    if (!sub || sub.status === "suspended") {
        return handleError2(
            res,
            "Subscription expired. Please contact support or pay your monthly fee to continue using the POS.",
            StatusCodes.PAYMENT_REQUIRED,
        );
    }

    // If active or in grace period, let them through
    next();
};
