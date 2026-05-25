-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DISPATCHER', 'DRIVER', 'ACCOUNTANT', 'CORPORATE_CLIENT', 'INDIVIDUAL_CLIENT');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('CORPORATE', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('AVAILABLE', 'DEPLOYED', 'IN_TRANSIT', 'AT_DISPOSAL', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "TruckStatus" AS ENUM ('AVAILABLE', 'ON_ROUTE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('CONTAINER', 'GARBAGE_TRUCK');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_ADMIN', 'CONFIRMED', 'DELIVERY_SCHEDULED', 'CONTAINER_DELIVERED', 'AWAITING_FILL', 'PICKUP_SCHEDULED', 'SCHEDULED', 'IN_TRANSIT', 'AT_DISPOSAL', 'PENDING_VERIFICATION', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StopType" AS ENUM ('DELIVERY', 'PICKUP', 'LOAD', 'UNLOAD');

-- CreateEnum
CREATE TYPE "StopStatus" AS ENUM ('PENDING', 'ARRIVED', 'COMPLETED', 'ISSUE_REPORTED');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'AT_DISPOSAL', 'PENDING_VERIFICATION', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "client_id" TEXT,
    "hourly_rate" DOUBLE PRECISION,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "type" "ClientType" NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disposal_sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radius_m" INTEGER NOT NULL DEFAULT 300,
    "waste_types" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "disposal_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "container_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "volume_m3" DOUBLE PRECISION NOT NULL,
    "max_weight_kg" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "container_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "containers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "qr_code" TEXT NOT NULL,
    "container_type_id" TEXT NOT NULL,
    "status" "ContainerStatus" NOT NULL DEFAULT 'AVAILABLE',
    "current_lat" DOUBLE PRECISION,
    "current_lng" DOUBLE PRECISION,
    "current_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "containers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "order_type" "OrderType" NOT NULL,
    "waste_type" TEXT NOT NULL,
    "volume_m3" DOUBLE PRECISION,
    "estimated_kg" INTEGER,
    "container_type_id" TEXT,
    "container_id" TEXT,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "requested_date" TIMESTAMP(3) NOT NULL,
    "time_window_start" TIMESTAMP(3),
    "time_window_end" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_ADMIN',
    "notes" TEXT,
    "payment_method" TEXT,
    "source_channel" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_events" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "user_id" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "notes" TEXT,
    "photos" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trucks" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "capacity_m3" DOUBLE PRECISION NOT NULL,
    "capacity_kg" INTEGER NOT NULL,
    "status" "TruckStatus" NOT NULL DEFAULT 'AVAILABLE',
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "fuel_type" TEXT,
    "fuel_l100" DOUBLE PRECISION,
    "mileage_km" INTEGER,
    "gtp_date" TIMESTAMP(3),
    "civil_date" TIMESTAMP(3),
    "vignette_date" TIMESTAMP(3),
    "vignette_url" TEXT,
    "notes" TEXT,
    "driver_id" TEXT,

    CONSTRAINT "trucks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNED',
    "disposal_site_id" TEXT,
    "total_km" DOUBLE PRECISION,
    "route_json" JSONB,
    "unload_weight_kg" INTEGER,
    "unload_waste_type" TEXT,
    "unload_notes" TEXT,
    "unload_photos" TEXT[],
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_stops" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "stop_type" "StopType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "status" "StopStatus" NOT NULL DEFAULT 'PENDING',
    "arrived_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "photos" TEXT[],
    "issue_note" TEXT,

    CONSTRAINT "trip_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_logs" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT,
    "client_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "tax_pct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "currency" TEXT NOT NULL DEFAULT 'BGN',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "items" JSONB,
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL DEFAULT '',
    "tax_id" TEXT,
    "vat_id" TEXT,
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "email" TEXT,
    "bank_name" TEXT,
    "iban" TEXT,
    "invoice_prefix" TEXT NOT NULL DEFAULT 'INV',
    "invoice_next_num" INTEGER NOT NULL DEFAULT 1,
    "fuel_price_diesel" DOUBLE PRECISION NOT NULL DEFAULT 3.30,
    "fuel_price_gasoline" DOUBLE PRECISION NOT NULL DEFAULT 3.20,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "container_types_code_key" ON "container_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "containers_code_key" ON "containers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "containers_qr_code_key" ON "containers"("qr_code");

-- CreateIndex
CREATE UNIQUE INDEX "containers_current_order_id_key" ON "containers"("current_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_container_id_key" ON "orders"("container_id");

-- CreateIndex
CREATE UNIQUE INDEX "trucks_plate_key" ON "trucks"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "trucks_driver_id_key" ON "trucks"("driver_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_container_type_id_fkey" FOREIGN KEY ("container_type_id") REFERENCES "container_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_current_order_id_fkey" FOREIGN KEY ("current_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_container_type_id_fkey" FOREIGN KEY ("container_type_id") REFERENCES "container_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_disposal_site_id_fkey" FOREIGN KEY ("disposal_site_id") REFERENCES "disposal_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_logs" ADD CONSTRAINT "route_logs_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
