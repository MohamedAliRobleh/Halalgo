import { Router } from 'express';
import { z } from 'zod';
import {
  getMenuByStore,
  createMenuItem,
  updateItemAvailability,
  deleteMenuItem,
  createMenuItemSchema,
} from '../controllers/menu.controller.js';
import { validate } from '../middleware/validate.js';

export const menuRouter = Router();

menuRouter.get('/:storeId', getMenuByStore);
menuRouter.post('/:storeId/items', validate(createMenuItemSchema), createMenuItem);
menuRouter.patch(
  '/items/:id/availability',
  validate(z.object({ isAvailable: z.boolean() })),
  updateItemAvailability,
);
menuRouter.delete('/items/:id', deleteMenuItem);
