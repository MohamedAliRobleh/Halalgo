import { Router } from 'express';
import { getProfile } from '../controllers/profiles.controller.js';

export const profilesRouter = Router();
profilesRouter.get('/', getProfile);
