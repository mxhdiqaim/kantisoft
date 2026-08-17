/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { db } from "../shared/database";
import { activityLog } from "../schema/activity-log-schema";
import { users } from "../schema/users-schema";
import { stores } from "../schema/stores-schema";
import { handleError2 } from "../service/error-handling";
import { UserRoleEnum } from "../types/enums";
import { and, desc, eq, ne, sql, SQLWrapper } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";
import { determineFinalStoreId } from "../shared/utils/store-permission-utils";

export const getActivities = async (req: Request, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;

        if (!storeId) {
            return handleError2(res, "User not associated with a store.", StatusCodes.UNAUTHORIZED);
        }

        const { limit: queryLimit = 20, offset: queryOffset = 0, targetStoreId } = req.query;
        const userRole = currentUser?.role;

        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return; // Error already handled

        const limit = Math.max(1, Math.min(100, Number(queryLimit)));
        const offset = Math.max(0, Number(queryOffset));

        // Initialise base conditions for the current store
        const conditions: (SQLWrapper | undefined)[] = [eq(activityLog.storeId, finalStoreId)];

        let includeUsersTable = false; // Flag to determine if we need to join users' table for filtering
        let selectUsersColumns = false; // Flag to determine if we need to select user details

        // Determine permissions and build core conditions
        if (userRole === UserRoleEnum.MANAGER) {
            // Managers see all activities for their store.
            // We want to select user details for display, so we will join.
            selectUsersColumns = true;
        } else if (userRole === UserRoleEnum.ADMIN) {
            // Admins see all activities for their store, but not those performed by managers.
            // This requires joining the users table and filtering.
            includeUsersTable = true;
            selectUsersColumns = true;
            conditions.push(
                eq(activityLog.userId, users.id), // Ensure the activity has a user for role filtering
                ne(users.role, UserRoleEnum.MANAGER), // Filter out managers
            );
        } else {
            // Any other role is forbidden from viewing activity logs.
            return handleError2(
                res,
                "Forbidden: You do not have permission to view activity logs.",
                StatusCodes.FORBIDDEN,
            );
        }

        // Build the Drizzle query dynamically based on flags
        let queryBuilder: any = db
            .select({
                activityLog, // Select all columns from the activityLog
                store: {
                    // Always include store details if storeId is present
                    name: stores.name,
                },
                // Conditionally select user details
                user: selectUsersColumns
                    ? {
                          firstName: users.firstName,
                          lastName: users.lastName,
                          role: users.role, // Useful for debugging or future display
                      }
                    : {},
            })
            .from(activityLog)
            .leftJoin(stores, eq(activityLog.storeId, stores.id));

        // Conditionally apply leftJoin for users based on the flag
        if (includeUsersTable || selectUsersColumns) {
            // Join if we need to filter or select user columns
            queryBuilder = queryBuilder.leftJoin(users, eq(activityLog.userId, users.id));
        }

        // Apply all built conditions
        const finalQuery = queryBuilder.where(and(...conditions.filter(Boolean))); // Filter out undefined conditions

        // Execute the query with ordering and pagination
        const activities = await finalQuery.orderBy(desc(activityLog.createdAt)).limit(limit).offset(offset);

        // Get total count for pagination (important to run separately or use countDistinct)
        // The count query also needs to respect the same join and filter conditions
        let countQueryBuilder: any = db.select({ count: sql<number>`count(*)` }).from(activityLog);

        if (includeUsersTable || selectUsersColumns) {
            // Apply the same conditional join for count
            countQueryBuilder = countQueryBuilder.leftJoin(users, eq(activityLog.userId, users.id));
        }

        const finalCountQuery = countQueryBuilder.where(and(...conditions.filter(Boolean)));
        const totalCountResult = await finalCountQuery;
        const totalCount = totalCountResult[0]?.count || 0;

        const formattedData = activities.map((item: any) => {
            const user = item.user || {};
            const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "System";
            return {
                id: item.activityLog.id,
                action: item.activityLog.action,
                entity: item.activityLog.entity,
                entityId: item.activityLog.entityId,
                entityType: item.activityLog.entityType,
                details: item.activityLog.details,
                status: item.activityLog.status,
                createdAt: item.activityLog.createdAt,
                storeName: item.store?.name,
                userName: userName,
                userRole: user.role,
            };
        });

        res.status(StatusCodes.OK).json({
            data: formattedData,
            totalCount: totalCount,
            limit: limit,
            offset: offset,
        });
    } catch (error) {
        handleError2(
            res,
            "Failed to fetch activities due to an internal server error.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};
