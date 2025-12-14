/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';
import { CustomRequest } from "../types/express";
import { handleError2 } from "../service/error-handling";
import { StatusCodes } from "http-status-codes";
import { v4 as uuidv4 } from 'uuid';
import {RawMaterialProductionService} from "../service/raw-material-production-service"; // For generating a production batch ID

/**
 * @description Executes a production run for a menu item, deducting all required raw materials.
 * @route POST /api/v1/production
 * @access Admin, Manager, Production Staff
 */
export const runProduction = async (req: CustomRequest, res: Response) => {
    const currentUser = req.user?.data;
    const storeId = currentUser?.storeId;
    const userId = currentUser?.id;

    if (!storeId || !userId) {
        return handleError2(
            res,
            'User/Store context missing.',
            StatusCodes.BAD_REQUEST
        );
    }

    const {menuItemId} = req.body;

    if (!menuItemId) {
        return handleError2(res, 'Menu Item ID is required for production.', StatusCodes.BAD_REQUEST);
    }

    // Generate a unique batch ID for auditing
    const productionBatchId = uuidv4();

    try {
        // Execute Production Service
        await RawMaterialProductionService.runProduction(
            menuItemId,
            storeId,
            userId,
            productionBatchId
        );

        // Return Success Response
        return res.status(StatusCodes.OK).json({
            message: 'Production completed successfully.',
            menuItemId: menuItemId,
            productionBatchId: productionBatchId,
            storeId: storeId,
        });

    } catch (error: any) {
        // Handle specific inventory-related errors
        if (error.message.includes('not exist')) {
            return handleError2(
                res,
                'Inventory record missing for one or more ingredients.',
                StatusCodes.NOT_FOUND,
                error instanceof Error ? error : undefined
            );
        }
        if (error.message.includes('No Bill of Materials defined')) {
            return handleError2(
                res,
                error.message,
                StatusCodes.BAD_REQUEST,
                error instanceof Error ? error : undefined
            );
        }

        // Catch all other errors (e.g. negative stock constraint violation if implemented)
        return handleError2(
            res,
            'Production failed due to a server or inventory constraint error.',
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined
        );
    }
};