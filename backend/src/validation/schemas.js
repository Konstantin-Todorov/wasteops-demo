const { z } = require('zod');

// Границите на България — заявка извън тях е почти сигурно грешка при въвеждане.
const lat = z.coerce.number().min(41).max(44.3);
const lng = z.coerce.number().min(22).max(28.7);

const ORDER_STATUS = ['PENDING_ADMIN','CONFIRMED','DELIVERY_SCHEDULED','CONTAINER_DELIVERED',
  'AWAITING_FILL','PICKUP_SCHEDULED','SCHEDULED','IN_TRANSIT','AT_DISPOSAL',
  'PENDING_VERIFICATION','COMPLETED','CANCELLED'];
const TRIP_STATUS = ['PLANNED','IN_PROGRESS','AT_DISPOSAL','PENDING_VERIFICATION','COMPLETED','CANCELLED'];
const STOP_STATUS = ['PENDING','ARRIVED','COMPLETED','ISSUE_REPORTED'];
const STOP_TYPE = ['DELIVERY','PICKUP','SWAP','LOAD','UNLOAD'];
const INVOICE_STATUS = ['DRAFT','SENT','PAID','OVERDUE','CANCELLED'];
const CONTAINER_STATUS = ['AVAILABLE','DEPLOYED','IN_TRANSIT','AT_DISPOSAL','MAINTENANCE'];
const ROLES = ['ADMIN','DISPATCHER','DRIVER','ACCOUNTANT','CORPORATE_CLIENT','INDIVIDUAL_CLIENT'];

const uuid = z.string().uuid('Невалиден идентификатор');

// Списък от статуси, разделени със запетая — ползва се във филтрите
const statusCsv = (allowed) => z.string().transform(s => s.split(',').map(x => x.trim()).filter(Boolean))
  .refine(arr => arr.length > 0 && arr.every(s => allowed.includes(s)),
    { message: `Допустими стойности: ${allowed.join(', ')}` });

const createOrder = z.object({
  clientId: uuid.optional(),
  orderType: z.enum(['CONTAINER','GARBAGE_TRUCK'], { message: 'Типът трябва да е CONTAINER или GARBAGE_TRUCK' }),
  wasteType: z.string().min(1, 'Видът отпадък е задължителен').max(200),
  volumeM3: z.coerce.number().positive().max(100).optional().nullable(),
  estimatedKg: z.coerce.number().int().positive().max(100000).optional().nullable(),
  containerTypeId: uuid.optional().nullable(),
  address: z.string().min(3, 'Адресът е твърде кратък').max(500),
  lat, lng,
  requestedDate: z.coerce.date(),
  timeWindowStart: z.coerce.date().optional().nullable(),
  timeWindowEnd: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  paymentMethod: z.string().max(50).optional().nullable(),
  sourceChannel: z.string().max(50).optional().nullable(),
});

const createTrip = z.object({
  truckId: uuid,
  date: z.coerce.date().optional(),
  orderIds: z.array(uuid).min(1, 'Изберете поне една заявка'),
  disposalSiteId: uuid.optional().nullable(),
});

const addStop = z.object({
  orderId: uuid,
  priority: z.boolean().optional(),
  swap: z.boolean().optional(),   // размяна вместо просто вземане
});

const updateStop = z.object({
  status: z.enum(STOP_STATUS).optional(),
  issueNote: z.string().max(1000).optional().nullable(),
  photos: z.array(z.string()).optional(),
});

const createClient = z.object({
  type: z.enum(['CORPORATE','INDIVIDUAL']),
  name: z.string().min(2, 'Името е твърде кратко').max(200),
  taxId: z.string().max(50).optional().nullable(),
  address: z.string().min(3).max(500),
  lat, lng,
  contactName: z.string().max(200).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  email: z.string().email('Невалиден имейл').optional().nullable().or(z.literal('')),
  notes: z.string().max(2000).optional().nullable(),
});

const createUser = z.object({
  email: z.string().email('Невалиден имейл'),
  password: z.string().min(8, 'Паролата трябва да е поне 8 знака'),
  name: z.string().min(2).max(200),
  role: z.enum(ROLES),
  clientId: uuid.optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  hourlyRate: z.coerce.number().nonnegative().optional().nullable(),
});

const resetPassword = z.object({
  password: z.string().min(8, 'Паролата трябва да е поне 8 знака'),
});

const createContainer = z.object({
  code: z.string().min(1).max(50),
  qrCode: z.string().min(1).max(100),
  containerTypeId: uuid,
  status: z.enum(CONTAINER_STATUS).optional(),
});

const assignContainer = z.object({
  containerId: uuid.nullable(),
});

const updateInvoice = z.object({
  amount: z.coerce.number().nonnegative().optional(),
  taxPct: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(INVOICE_STATUS).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  items: z.any().optional(),
});

module.exports = {
  ORDER_STATUS, TRIP_STATUS, STOP_STATUS, STOP_TYPE, INVOICE_STATUS, CONTAINER_STATUS, ROLES,
  statusCsv, uuid, lat, lng,
  createOrder, createTrip, addStop, updateStop, createClient,
  createUser, resetPassword, createContainer, assignContainer, updateInvoice,
};
