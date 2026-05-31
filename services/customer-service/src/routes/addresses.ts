import { Router } from 'express';
import {
  getAddresses,
  createAddress,
  deleteAddress,
  createAddressSchema,
} from '../controllers/addresses.controller.js';
import { validate } from '../middleware/validate.js';

export const addressesRouter = Router();

addressesRouter.get('/', getAddresses);
addressesRouter.post('/', validate(createAddressSchema), createAddress);
addressesRouter.delete('/:id', deleteAddress);
