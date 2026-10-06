// Централна карта икона значение. Единственото място, където се решава
// как изглежда даден домейн обект — не се пишат икони по компонентите.
import {
  AlertTriangle, ArrowUpFromLine, Ban, Building2, CheckCircle2, CircleDot, Clock, Container, CreditCard, Factory, FileText, Gauge, Hourglass, MapPin, Navigation, Package, PackageCheck, RefreshCw, Route, Scale, Truck, User, Warehouse, XCircle,
} from 'lucide-react';

export const StopIcon = {
 DELIVERY: Package,
 PICKUP: RefreshCw,
 LOAD: Truck,
 UNLOAD: Factory,
};

export const StopLabel = {
 DELIVERY: 'Доставка',
 PICKUP: 'Вземане',
 LOAD: 'Товарене',
 UNLOAD: 'Разтоварване',
};

export const OrderIcon = {
 PENDING_ADMIN: Hourglass,
 CONFIRMED: CheckCircle2,
 DELIVERY_SCHEDULED: Clock,
 CONTAINER_DELIVERED: PackageCheck,
 AWAITING_FILL: Container,
 PICKUP_SCHEDULED: Clock,
 SCHEDULED: Clock,
 IN_TRANSIT: Navigation,
 AT_DISPOSAL: Warehouse,
 PENDING_VERIFICATION: Hourglass,
 COMPLETED: CheckCircle2,
 CANCELLED: Ban,
};

// Тонът определя цвета на бейджа — семантичен, не брандов.
export const OrderTone = {
 PENDING_ADMIN: 'warn',
 CONFIRMED: 'info',
 DELIVERY_SCHEDULED: 'info',
 CONTAINER_DELIVERED: 'brand',
 AWAITING_FILL: 'neutral',
 PICKUP_SCHEDULED: 'info',
 SCHEDULED: 'info',
 IN_TRANSIT: 'brand',
 AT_DISPOSAL: 'brand',
 PENDING_VERIFICATION: 'warn',
 COMPLETED: 'ok',
 CANCELLED: 'danger',
};

export const TripTone = {
 PLANNED: 'neutral',
 IN_PROGRESS: 'brand',
 AT_DISPOSAL: 'info',
 PENDING_VERIFICATION: 'warn',
 COMPLETED: 'ok',
 CANCELLED: 'danger',
};

export const InvoiceTone = {
 DRAFT: 'neutral', SENT: 'info', PAID: 'ok', OVERDUE: 'danger', CANCELLED: 'neutral',
};

export const ContainerTone = {
 AVAILABLE: 'ok', DEPLOYED: 'brand', IN_TRANSIT: 'info',
 AT_DISPOSAL: 'warn', MAINTENANCE: 'neutral',
};

export const EntityIcon = {
 client: Building2, person: User, truck: Truck, trip: Route, container: Container,
 site: Warehouse, invoice: FileText, payment: CreditCard, weight: Scale,
 fuel: Gauge, location: MapPin, status: CircleDot, issue: AlertTriangle, cancel: XCircle,
};
