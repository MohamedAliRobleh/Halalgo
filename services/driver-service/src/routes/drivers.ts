import { Router } from 'express';
import {
  updateLocation,
  updateAvailability,
  updateLocationSchema,
  updateAvailabilitySchema,
} from '../controllers/location.controller.js';
import { validate } from '../middleware/validate.js';

export const driversRouter = Router();

driversRouter.patch('/location', validate(updateLocationSchema), updateLocation);
driversRouter.patch('/availability', validate(updateAvailabilitySchema), updateAvailability);
