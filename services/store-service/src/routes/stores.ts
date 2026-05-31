import { Router } from 'express';
import { z } from 'zod';
import {
  getNearbyStores,
  getStoreById,
  updateStoreStatus,
} from '../controllers/stores.controller.js';
import { validate } from '../middleware/validate.js';

export const storesRouter = Router();

storesRouter.get('/nearby', getNearbyStores);
storesRouter.get('/:id', getStoreById);
storesRouter.patch(
  '/:id/status',
  validate(z.object({ isOpen: z.boolean() })),
  updateStoreStatus,
);
