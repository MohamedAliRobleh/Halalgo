import { Router } from 'express';
import {
  createOrder,
  updateOrderStatus,
  getOrderById,
  createOrderSchema,
  updateStatusSchema,
} from '../controllers/orders.controller.js';
import { validate } from '../middleware/validate.js';

export const ordersRouter = Router();

ordersRouter.post('/', validate(createOrderSchema), createOrder);
ordersRouter.get('/:id', getOrderById);
ordersRouter.patch('/:id/status', validate(updateStatusSchema), updateOrderStatus);
