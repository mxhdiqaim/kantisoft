import Express from "express";
import * as controller from "../../controllers/raw-material-controller/raw-material-stock-transaction-controller";

const router = Express.Router();

router.get("/:id", controller.getStockTransactions);

export default router;
