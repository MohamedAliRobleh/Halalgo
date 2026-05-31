import { Router } from 'express';
import { searchStores, searchMenuItems } from '../controllers/search.controller.js';

export const searchRouter = Router();
searchRouter.get('/stores', searchStores);
searchRouter.get('/menu', searchMenuItems);
