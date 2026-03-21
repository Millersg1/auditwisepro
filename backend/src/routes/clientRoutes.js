import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listClients, getClientStats, getClient,
  createClient, updateClient, deleteClient,
} from '../controllers/clientController.js';

const router = Router();

router.get('/', authenticate, listClients);
router.get('/stats', authenticate, getClientStats);
router.get('/:id', authenticate, getClient);
router.post('/', authenticate, createClient);
router.put('/:id', authenticate, updateClient);
router.delete('/:id', authenticate, deleteClient);

export default router;
