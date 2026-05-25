'use strict';
require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Изчистване на базата данни...');

  await prisma.tripStop.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.orderEvent.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.container.deleteMany();
  await prisma.order.deleteMany();
  await prisma.truck.deleteMany();
  await prisma.user.deleteMany();
  await prisma.client.deleteMany();
  await prisma.containerType.deleteMany();
  await prisma.disposalSite.deleteMany();

  console.log('Създаване на депа за отпадъци...');
  const disposalSites = await Promise.all([
    prisma.disposalSite.create({ data: { name: 'РДНО "Липник"', address: 'с. Липник, общ. Русе', lat: 43.8045, lng: 26.0512, radiusM: 300, wasteTypes: ['строителни', 'смесени', 'инертни'], active: true } }),
    prisma.disposalSite.create({ data: { name: 'Депо Бяла', address: 'гр. Бяла, обл. Русе', lat: 43.4676, lng: 25.7312, radiusM: 300, wasteTypes: ['смесени', 'битови'], active: true } }),
    prisma.disposalSite.create({ data: { name: 'Площадка Мартен', address: 'с. Мартен, общ. Русе', lat: 43.8742, lng: 25.9139, radiusM: 300, wasteTypes: ['инертни', 'строителни'], active: true } }),
    prisma.disposalSite.create({ data: { name: 'Депо Две могили', address: 'гр. Две могили, обл. Русе', lat: 43.5961, lng: 25.8803, radiusM: 300, wasteTypes: ['смесени', 'строителни'], active: true } }),
    prisma.disposalSite.create({ data: { name: 'Площадка Иваново', address: 'с. Иваново, общ. Русе', lat: 43.7001, lng: 26.1038, radiusM: 300, wasteTypes: ['инертни'], active: true } }),
  ]);
  console.log('  ' + disposalSites.length + ' депа създадени');

  console.log('Създаване на типове контейнери...');
  const containerTypes = await Promise.all([
    prisma.containerType.create({ data: { code: 'КОФ_1.1', name: 'Кофа 1.1 м³', volumeM3: 1.1, maxWeightKg: 500, description: 'Малка кофа за битови отпадъци' } }),
    prisma.containerType.create({ data: { code: 'КОН_4', name: 'Контейнер 4 м³', volumeM3: 4, maxWeightKg: 4000, description: 'Стандартен контейнер за строителни отпадъци' } }),
    prisma.containerType.create({ data: { code: 'КОН_7', name: 'Контейнер 7 м³', volumeM3: 7, maxWeightKg: 7000, description: 'Среден контейнер за смесени отпадъци' } }),
    prisma.containerType.create({ data: { code: 'КОН_10', name: 'Контейнер 10 м³', volumeM3: 10, maxWeightKg: 10000, description: 'Голям контейнер за строителни отпадъци' } }),
    prisma.containerType.create({ data: { code: 'РОЛ_20', name: 'Ролкова кутия 20 м³', volumeM3: 20, maxWeightKg: 15000, description: 'Ролков контейнер за едри отпадъци' } }),
    prisma.containerType.create({ data: { code: 'РОЛ_30', name: 'Ролкова кутия 30 м³', volumeM3: 30, maxWeightKg: 20000, description: 'Голям ролков контейнер за промишлени отпадъци' } }),
  ]);
  const [kof11, kon4, kon7, kon10, rol20, rol30] = containerTypes;
  console.log('  ' + containerTypes.length + ' типа контейнери създадени');

  console.log('Създаване на клиенти...');
  const clients = await Promise.all([
    // 8 corporate clients
    prisma.client.create({ data: { type: 'CORPORATE', name: 'Строй-Инвест ЕООД', taxId: 'BG123456789', address: 'ул. Тутракан 15, Русе', lat: 43.8521, lng: 26.0423, contactName: 'Петър Стоянов', contactPhone: '+359888111001', email: 'office@stroyinvest.bg', notes: 'Редовен клиент, плащане в 30 дни' } }),
    prisma.client.create({ data: { type: 'CORPORATE', name: 'Агрострой АД', taxId: 'BG987654321', address: 'бул. България 88, Русе', lat: 43.8645, lng: 26.0512, contactName: 'Мария Петрова', contactPhone: '+359888111002', email: 'm.petrova@agrostroy.bg', notes: 'Строителна компания - мащабни проекти' } }),
    prisma.client.create({ data: { type: 'CORPORATE', name: 'Рус-Метал ООД', taxId: 'BG111222333', address: 'Индустриална зона, Русе', lat: 43.8712, lng: 25.9987, contactName: 'Георги Николов', contactPhone: '+359888111003', email: 'georgi@rusmetal.bg', notes: 'Металообработваща фабрика' } }),
    prisma.client.create({ data: { type: 'CORPORATE', name: 'Дунав-Строй ЕООД', taxId: 'BG444555666', address: 'ул. Плиска 22, Русе', lat: 43.8389, lng: 26.0198, contactName: 'Стефан Иванов', contactPhone: '+359888111004', email: 'dunav@stroyeood.bg' } }),
    prisma.client.create({ data: { type: 'CORPORATE', name: 'БиоПак ООД', taxId: 'BG777888999', address: 'с. Николово, общ. Русе', lat: 43.9012, lng: 26.0845, contactName: 'Надежда Христова', contactPhone: '+359888111005', email: 'nadia@biopak.bg', notes: 'Производство на опаковки' } }),
    prisma.client.create({ data: { type: 'CORPORATE', name: 'Еко-Бетон АД', taxId: 'BG222333444', address: 'гр. Бяла, ул. Дунав 5', lat: 43.4712, lng: 25.7389, contactName: 'Валентин Ангелов', contactPhone: '+359888111006', email: 'v.angelov@ekobeton.bg' } }),
    prisma.client.create({ data: { type: 'CORPORATE', name: 'Мартен Индъстри ЕООД', taxId: 'BG555666777', address: 'с. Мартен, Промишлена зона', lat: 43.8798, lng: 25.9201, contactName: 'Красимир Димитров', contactPhone: '+359888111007', email: 'office@martenindustry.bg' } }),
    prisma.client.create({ data: { type: 'CORPORATE', name: 'Ценово Агро ООД', taxId: 'BG888999000', address: 'гр. Ценово, ул. Цар Освободител 1', lat: 43.5423, lng: 25.6234, contactName: 'Тодор Василев', contactPhone: '+359888111008', email: 't.vasilev@cenovoagro.bg', notes: 'Земеделска фирма' } }),
    // 7 individual clients
    prisma.client.create({ data: { type: 'INDIVIDUAL', name: 'Иван Петров', address: 'ул. Свобода 14, Русе', lat: 43.8476, lng: 26.0312, contactPhone: '+359888222001', email: 'ivan@gmail.com' } }),
    prisma.client.create({ data: { type: 'INDIVIDUAL', name: 'Елена Стоянова', address: 'ж.к. Дружба, бл. 15, Русе', lat: 43.8534, lng: 26.0534, contactPhone: '+359888222002', email: 'elena.stoyanova@abv.bg' } }),
    prisma.client.create({ data: { type: 'INDIVIDUAL', name: 'Димитър Георгиев', address: 'ул. Борисова 77, Русе', lat: 43.8601, lng: 26.0421, contactPhone: '+359888222003', email: 'dgeorgiev@gmail.com' } }),
    prisma.client.create({ data: { type: 'INDIVIDUAL', name: 'Антоанета Маринова', address: 'с. Иваново, ул. Централна 3', lat: 43.6987, lng: 26.1012, contactPhone: '+359888222004', email: 'a.marinova@abv.bg' } }),
    prisma.client.create({ data: { type: 'INDIVIDUAL', name: 'Пламен Тодоров', address: 'гр. Две могили, ул. Хаджи Димитър 8', lat: 43.5989, lng: 25.8834, contactPhone: '+359888222005', email: 'plamen.todorov@gmail.com' } }),
    prisma.client.create({ data: { type: 'INDIVIDUAL', name: 'Росица Николова', address: 'с. Борово, ул. Васил Левски 2', lat: 43.4512, lng: 25.7689, contactPhone: '+359888222006', email: 'r.nikolova@abv.bg' } }),
    prisma.client.create({ data: { type: 'INDIVIDUAL', name: 'Стоян Христов', address: 'гр. Бяла, ул. Оборище 11', lat: 43.4645, lng: 25.7298, contactPhone: '+359888222007', email: 'stoyan.hristov@gmail.com' } }),
  ]);
  const [
    stroyInvest, agrostroy, rusMetal, dunavStroy, bioPak, ekoBeton, martenIndustry, cenovoAgro,
    ivanPetrov, elenaStoyanova, dimitarGeorgiev, antoanetaMarinova, plamenTodorov, rositaNikolova, stoyanHristov
  ] = clients;
  console.log('  ' + clients.length + ' клиента създадени');

  console.log('Хеширане на пароли...');
  const hash = await bcrypt.hash('password123', 10);

  console.log('Създаване на потребители...');
  const users = await Promise.all([
    prisma.user.create({ data: { email: 'admin@wastelogix.bg', passwordHash: hash, name: 'Администратор', role: 'ADMIN' } }),
    prisma.user.create({ data: { email: 'dispatcher@wastelogix.bg', passwordHash: hash, name: 'Диспечер', role: 'DISPATCHER' } }),
    prisma.user.create({ data: { email: 'accountant@wastelogix.bg', passwordHash: hash, name: 'Счетоводител', role: 'ACCOUNTANT' } }),
    prisma.user.create({ data: { email: 'driver1@wastelogix.bg', passwordHash: hash, name: 'Калоян Митев', role: 'DRIVER' } }),
    prisma.user.create({ data: { email: 'driver2@wastelogix.bg', passwordHash: hash, name: 'Радослав Георгиев', role: 'DRIVER' } }),
    prisma.user.create({ data: { email: 'driver3@wastelogix.bg', passwordHash: hash, name: 'Симеон Тодоров', role: 'DRIVER' } }),
    prisma.user.create({ data: { email: 'corporate@buildco.bg', passwordHash: hash, name: 'Петър Стоянов', role: 'CORPORATE_CLIENT', clientId: stroyInvest.id } }),
    prisma.user.create({ data: { email: 'ivan@gmail.com', passwordHash: hash, name: 'Иван Петров', role: 'INDIVIDUAL_CLIENT', clientId: ivanPetrov.id } }),
  ]);
  const [adminUser, dispatcherUser, accountantUser, driver1, driver2, driver3, corpUser, indivUser] = users;
  console.log('  ' + users.length + ' потребители създадени');

  console.log('Създаване на камиони...');
  const trucks = await Promise.all([
    prisma.truck.create({ data: { plate: 'Р 1234 АВ', model: 'Mercedes Actros', capacityM3: 10, capacityKg: 8000, status: 'AVAILABLE', color: '#3B82F6', driverId: driver1.id } }),
    prisma.truck.create({ data: { plate: 'Р 5678 CD', model: 'MAN TGS', capacityM3: 7, capacityKg: 6000, status: 'AVAILABLE', color: '#10B981', driverId: driver2.id } }),
    prisma.truck.create({ data: { plate: 'Р 9012 EF', model: 'Volvo FE', capacityM3: 4, capacityKg: 4000, status: 'AVAILABLE', color: '#F59E0B', driverId: driver3.id } }),
  ]);
  console.log('  ' + trucks.length + ' камиона създадени');

  console.log('Създаване на контейнери...');
  const containers = await Promise.all([
    prisma.container.create({ data: { code: 'WO-001', qrCode: 'qr-001', containerTypeId: kon4.id, status: 'AVAILABLE' } }),
    prisma.container.create({ data: { code: 'WO-002', qrCode: 'qr-002', containerTypeId: kon4.id, status: 'AVAILABLE' } }),
    prisma.container.create({ data: { code: 'WO-003', qrCode: 'qr-003', containerTypeId: kon7.id, status: 'AVAILABLE' } }),
    prisma.container.create({ data: { code: 'WO-004', qrCode: 'qr-004', containerTypeId: kon7.id, status: 'AVAILABLE' } }),
    prisma.container.create({ data: { code: 'WO-005', qrCode: 'qr-005', containerTypeId: kon10.id, status: 'AVAILABLE' } }),
    prisma.container.create({ data: { code: 'WO-006', qrCode: 'qr-006', containerTypeId: kon10.id, status: 'AVAILABLE' } }),
    prisma.container.create({ data: { code: 'WO-007', qrCode: 'qr-007', containerTypeId: rol20.id, status: 'AVAILABLE' } }),
    prisma.container.create({ data: { code: 'WO-008', qrCode: 'qr-008', containerTypeId: rol20.id, status: 'AVAILABLE' } }),
    prisma.container.create({ data: { code: 'WO-009', qrCode: 'qr-009', containerTypeId: rol30.id, status: 'AVAILABLE' } }),
    prisma.container.create({ data: { code: 'WO-010', qrCode: 'qr-010', containerTypeId: kof11.id, status: 'AVAILABLE' } }),
  ]);
  console.log('  ' + containers.length + ' контейнера създадени');

  console.log('Създаване на заявки...');
  const now = new Date();
  const daysAgo = (n) => new Date(now.getTime() - n * 86400000);
  const daysAhead = (n) => new Date(now.getTime() + n * 86400000);

  // 8 PENDING_ADMIN
  const pendingOrders = await Promise.all([
    prisma.order.create({ data: { clientId: stroyInvest.id, orderType: 'CONTAINER', wasteType: 'строителни', volumeM3: 10, estimatedKg: 8000, containerTypeId: kon10.id, address: 'ул. Тутракан 15, Русе', lat: 43.8521, lng: 26.0423, requestedDate: daysAhead(2), status: 'PENDING_ADMIN', notes: 'Ремонт на офис сграда', paymentMethod: 'банков превод' } }),
    prisma.order.create({ data: { clientId: agrostroy.id, orderType: 'CONTAINER', wasteType: 'строителни', volumeM3: 7, estimatedKg: 6000, containerTypeId: kon7.id, address: 'бул. България 88, Русе', lat: 43.8645, lng: 26.0512, requestedDate: daysAhead(3), status: 'PENDING_ADMIN', paymentMethod: 'в брой' } }),
    prisma.order.create({ data: { clientId: rusMetal.id, orderType: 'GARBAGE_TRUCK', wasteType: 'метални', volumeM3: 8, estimatedKg: 7000, address: 'Индустриална зона, Русе', lat: 43.8712, lng: 25.9987, requestedDate: daysAhead(1), status: 'PENDING_ADMIN', notes: 'Метален скрап от производство' } }),
    prisma.order.create({ data: { clientId: ivanPetrov.id, orderType: 'CONTAINER', wasteType: 'смесени', volumeM3: 4, estimatedKg: 3000, containerTypeId: kon4.id, address: 'ул. Свобода 14, Русе', lat: 43.8476, lng: 26.0312, requestedDate: daysAhead(2), status: 'PENDING_ADMIN', paymentMethod: 'в брой' } }),
    prisma.order.create({ data: { clientId: elenaStoyanova.id, orderType: 'CONTAINER', wasteType: 'строителни', volumeM3: 4, estimatedKg: 3500, containerTypeId: kon4.id, address: 'ж.к. Дружба, бл. 15, Русе', lat: 43.8534, lng: 26.0534, requestedDate: daysAhead(4), status: 'PENDING_ADMIN' } }),
    prisma.order.create({ data: { clientId: bioPak.id, orderType: 'GARBAGE_TRUCK', wasteType: 'производствени', volumeM3: 6, estimatedKg: 4000, address: 'с. Николово, общ. Русе', lat: 43.9012, lng: 26.0845, requestedDate: daysAhead(2), status: 'PENDING_ADMIN', notes: 'Отпадъци от производствена линия' } }),
    prisma.order.create({ data: { clientId: plamenTodorov.id, orderType: 'CONTAINER', wasteType: 'строителни', volumeM3: 7, estimatedKg: 5000, containerTypeId: kon7.id, address: 'гр. Две могили, ул. Хаджи Димитър 8', lat: 43.5989, lng: 25.8834, requestedDate: daysAhead(5), status: 'PENDING_ADMIN' } }),
    prisma.order.create({ data: { clientId: cenovoAgro.id, orderType: 'GARBAGE_TRUCK', wasteType: 'земеделски', volumeM3: 10, estimatedKg: 8000, address: 'гр. Ценово, ул. Цар Освободител 1', lat: 43.5423, lng: 25.6234, requestedDate: daysAhead(3), status: 'PENDING_ADMIN', notes: 'Остатъци от прибиране на реколта' } }),
  ]);

  // 5 CONFIRMED
  const confirmedOrders = await Promise.all([
    prisma.order.create({ data: { clientId: dunavStroy.id, orderType: 'CONTAINER', wasteType: 'строителни', volumeM3: 10, estimatedKg: 9000, containerTypeId: kon10.id, address: 'ул. Плиска 22, Русе', lat: 43.8389, lng: 26.0198, requestedDate: daysAhead(1), status: 'CONFIRMED', paymentMethod: 'банков превод', notes: 'Потвърдено от администратор' } }),
    prisma.order.create({ data: { clientId: ekoBeton.id, orderType: 'GARBAGE_TRUCK', wasteType: 'инертни', volumeM3: 7, estimatedKg: 6500, address: 'гр. Бяла, ул. Дунав 5', lat: 43.4712, lng: 25.7389, requestedDate: daysAhead(2), status: 'CONFIRMED', notes: 'Бетонни отломки' } }),
    prisma.order.create({ data: { clientId: martenIndustry.id, orderType: 'CONTAINER', wasteType: 'промишлени', volumeM3: 20, estimatedKg: 12000, containerTypeId: rol20.id, address: 'с. Мартен, Промишлена зона', lat: 43.8798, lng: 25.9201, requestedDate: daysAhead(1), status: 'CONFIRMED', paymentMethod: 'банков превод' } }),
    prisma.order.create({ data: { clientId: dimitarGeorgiev.id, orderType: 'CONTAINER', wasteType: 'строителни', volumeM3: 4, estimatedKg: 2500, containerTypeId: kon4.id, address: 'ул. Борисова 77, Русе', lat: 43.8601, lng: 26.0421, requestedDate: daysAhead(3), status: 'CONFIRMED' } }),
    prisma.order.create({ data: { clientId: antoanetaMarinova.id, orderType: 'GARBAGE_TRUCK', wasteType: 'смесени', volumeM3: 3, estimatedKg: 2000, address: 'с. Иваново, ул. Централна 3', lat: 43.6987, lng: 26.1012, requestedDate: daysAhead(2), status: 'CONFIRMED', notes: 'Домакински отпадъци от ремонт' } }),
  ]);

  // 4 CONTAINER_DELIVERED
  const deliveredOrders = await Promise.all([
    prisma.order.create({ data: { clientId: stroyInvest.id, orderType: 'CONTAINER', wasteType: 'строителни', volumeM3: 7, estimatedKg: 5000, containerTypeId: kon7.id, address: 'ул. Тутракан 33, Русе', lat: 43.8489, lng: 26.0401, requestedDate: daysAgo(3), status: 'CONTAINER_DELIVERED', paymentMethod: 'банков превод' } }),
    prisma.order.create({ data: { clientId: agrostroy.id, orderType: 'CONTAINER', wasteType: 'инертни', volumeM3: 10, estimatedKg: 9000, containerTypeId: kon10.id, address: 'бул. Трети март 12, Русе', lat: 43.8567, lng: 26.0467, requestedDate: daysAgo(2), status: 'CONTAINER_DELIVERED', paymentMethod: 'в брой' } }),
    prisma.order.create({ data: { clientId: bioPak.id, orderType: 'CONTAINER', wasteType: 'производствени', volumeM3: 20, estimatedKg: 14000, containerTypeId: rol20.id, address: 'с. Николово, Складова зона', lat: 43.9045, lng: 26.0812, requestedDate: daysAgo(1), status: 'CONTAINER_DELIVERED' } }),
    prisma.order.create({ data: { clientId: dunavStroy.id, orderType: 'CONTAINER', wasteType: 'строителни', volumeM3: 4, estimatedKg: 3200, containerTypeId: kon4.id, address: 'ул. Борово 5, Русе', lat: 43.8345, lng: 26.0289, requestedDate: daysAgo(4), status: 'CONTAINER_DELIVERED', paymentMethod: 'банков превод' } }),
  ]);

  // 3 AWAITING_FILL
  const awaitingOrders = await Promise.all([
    prisma.order.create({ data: { clientId: rositaNikolova.id, orderType: 'CONTAINER', wasteType: 'строителни', volumeM3: 4, estimatedKg: 3800, containerTypeId: kon4.id, address: 'с. Борово, ул. Васил Левски 2', lat: 43.4512, lng: 25.7689, requestedDate: daysAgo(5), status: 'AWAITING_FILL' } }),
    prisma.order.create({ data: { clientId: stoyanHristov.id, orderType: 'CONTAINER', wasteType: 'смесени', volumeM3: 7, estimatedKg: 6000, containerTypeId: kon7.id, address: 'гр. Бяла, ул. Оборище 11', lat: 43.4645, lng: 25.7298, requestedDate: daysAgo(6), status: 'AWAITING_FILL', paymentMethod: 'в брой' } }),
    prisma.order.create({ data: { clientId: rusMetal.id, orderType: 'CONTAINER', wasteType: 'метални', volumeM3: 10, estimatedKg: 10000, containerTypeId: kon10.id, address: 'Индустриална зона север, Русе', lat: 43.8734, lng: 26.0023, requestedDate: daysAgo(7), status: 'AWAITING_FILL' } }),
  ]);

  // 3 IN_TRANSIT
  const inTransitOrders = await Promise.all([
    prisma.order.create({ data: { clientId: martenIndustry.id, orderType: 'GARBAGE_TRUCK', wasteType: 'промишлени', volumeM3: 7, estimatedKg: 6500, address: 'с. Мартен, ул. Дунав 1', lat: 43.8756, lng: 25.9178, requestedDate: daysAgo(1), status: 'IN_TRANSIT' } }),
    prisma.order.create({ data: { clientId: ekoBeton.id, orderType: 'GARBAGE_TRUCK', wasteType: 'инертни', volumeM3: 5, estimatedKg: 5500, address: 'гр. Бяла, Производствена зона', lat: 43.4689, lng: 25.7356, requestedDate: daysAgo(1), status: 'IN_TRANSIT' } }),
    prisma.order.create({ data: { clientId: cenovoAgro.id, orderType: 'GARBAGE_TRUCK', wasteType: 'земеделски', volumeM3: 8, estimatedKg: 7000, address: 'с. Ценово, Стопански двор', lat: 43.5401, lng: 25.6212, requestedDate: daysAgo(2), status: 'IN_TRANSIT' } }),
  ]);

  // 2 COMPLETED
  const completedOrders = await Promise.all([
    prisma.order.create({ data: { clientId: stroyInvest.id, orderType: 'CONTAINER', wasteType: 'строителни', volumeM3: 10, estimatedKg: 9500, containerTypeId: kon10.id, address: 'ул. Тутракан 8, Русе', lat: 43.8512, lng: 26.0412, requestedDate: daysAgo(14), status: 'COMPLETED', paymentMethod: 'банков превод', notes: 'Приключена заявка' } }),
    prisma.order.create({ data: { clientId: agrostroy.id, orderType: 'GARBAGE_TRUCK', wasteType: 'строителни', volumeM3: 7, estimatedKg: 6200, address: 'бул. Трети март 55, Русе', lat: 43.8578, lng: 26.0489, requestedDate: daysAgo(10), status: 'COMPLETED', paymentMethod: 'в брой' } }),
  ]);

  const allOrders = [
    ...pendingOrders, ...confirmedOrders, ...deliveredOrders,
    ...awaitingOrders, ...inTransitOrders, ...completedOrders
  ];
  console.log('  ' + allOrders.length + ' заявки създадени');

  console.log('Създаване на събития за заявки...');
  const eventData = [];

  for (const order of allOrders) {
    eventData.push({ orderId: order.id, eventType: 'order_created', userId: adminUser.id, notes: 'Заявката е подадена' });
  }
  for (const order of [...confirmedOrders, ...deliveredOrders, ...awaitingOrders, ...inTransitOrders, ...completedOrders]) {
    eventData.push({ orderId: order.id, eventType: 'admin_confirmed', userId: adminUser.id, notes: 'Заявката е потвърдена от администратор' });
  }
  for (const order of [...deliveredOrders, ...awaitingOrders]) {
    eventData.push({ orderId: order.id, eventType: 'container_delivered', userId: driver1.id, notes: 'Контейнерът е доставен' });
  }
  if (completedOrders[0].orderType === 'CONTAINER') {
    eventData.push({ orderId: completedOrders[0].id, eventType: 'container_delivered', userId: driver1.id, notes: 'Контейнерът е доставен' });
  }
  for (const order of awaitingOrders) {
    eventData.push({ orderId: order.id, eventType: 'container_full', notes: 'Клиентът е сигнализирал - контейнерът е пълен' });
  }
  for (const order of inTransitOrders) {
    eventData.push({ orderId: order.id, eventType: 'in_transit', userId: driver1.id, notes: 'В транзит към депото' });
  }
  for (const order of completedOrders) {
    eventData.push({ orderId: order.id, eventType: 'completed', userId: adminUser.id, notes: 'Заявката е приключена успешно' });
  }

  await prisma.orderEvent.createMany({ data: eventData });
  console.log('  ' + eventData.length + ' събития създадени');

  console.log('Актуализиране на статус на контейнери (DEPLOYED)...');
  await prisma.container.update({ where: { code: 'WO-003' }, data: { status: 'DEPLOYED', currentLat: deliveredOrders[0].lat, currentLng: deliveredOrders[0].lng, currentOrderId: deliveredOrders[0].id } });
  await prisma.container.update({ where: { code: 'WO-005' }, data: { status: 'DEPLOYED', currentLat: deliveredOrders[1].lat, currentLng: deliveredOrders[1].lng, currentOrderId: deliveredOrders[1].id } });
  await prisma.container.update({ where: { code: 'WO-007' }, data: { status: 'DEPLOYED', currentLat: deliveredOrders[2].lat, currentLng: deliveredOrders[2].lng, currentOrderId: deliveredOrders[2].id } });
  await prisma.container.update({ where: { code: 'WO-001' }, data: { status: 'DEPLOYED', currentLat: deliveredOrders[3].lat, currentLng: deliveredOrders[3].lng, currentOrderId: deliveredOrders[3].id } });
  await prisma.container.update({ where: { code: 'WO-002' }, data: { status: 'DEPLOYED', currentLat: awaitingOrders[0].lat, currentLng: awaitingOrders[0].lng, currentOrderId: awaitingOrders[0].id } });
  await prisma.container.update({ where: { code: 'WO-004' }, data: { status: 'DEPLOYED', currentLat: awaitingOrders[1].lat, currentLng: awaitingOrders[1].lng, currentOrderId: awaitingOrders[1].id } });
  await prisma.container.update({ where: { code: 'WO-006' }, data: { status: 'DEPLOYED', currentLat: awaitingOrders[2].lat, currentLng: awaitingOrders[2].lng, currentOrderId: awaitingOrders[2].id } });
  await prisma.container.update({ where: { code: 'WO-008' }, data: { status: 'IN_TRANSIT' } });

  console.log('Създаване на демо курсове...');
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const yesterdayMs = todayMs - 86400000;

  // Trip 1: Mercedes Actros (blue) — IN_PROGRESS today — Рuse zone
  const trip1 = await prisma.trip.create({
    data: {
      truckId: trucks[0].id,
      date: new Date(todayMs + 7.5 * 3600000),
      status: 'IN_PROGRESS',
      startedAt: new Date(todayMs + 8 * 3600000),
      totalKm: 42,
      disposalSiteId: disposalSites[0].id,
      stops: {
        create: [
          { orderId: inTransitOrders[0].id, stopType: 'LOAD',   sequence: 1, lat: 43.8756, lng: 25.9178, address: 'с. Мартен, ул. Дунав 1',         status: 'COMPLETED', arrivedAt: new Date(todayMs + 8.75 * 3600000), completedAt: new Date(todayMs + 9.25 * 3600000) },
          { orderId: deliveredOrders[0].id, stopType: 'PICKUP', sequence: 2, lat: 43.8489, lng: 26.0401, address: 'ул. Тутракан 33, Русе',           status: 'ARRIVED',   arrivedAt: new Date(todayMs + 10 * 3600000) },
          { orderId: inTransitOrders[0].id, stopType: 'UNLOAD', sequence: 3, lat: 43.8045, lng: 26.0512, address: 'РДНО "Липник", с. Липник, Русе', status: 'PENDING' },
        ]
      }
    }
  });

  // Trip 2: MAN TGS (green) — PLANNED today — Southern routes (Бяла / Борово / Ценово)
  const trip2 = await prisma.trip.create({
    data: {
      truckId: trucks[1].id,
      date: new Date(todayMs + 8 * 3600000),
      status: 'PLANNED',
      totalKm: 78,
      disposalSiteId: disposalSites[1].id,
      stops: {
        create: [
          { orderId: inTransitOrders[1].id, stopType: 'LOAD',   sequence: 1, lat: 43.4689, lng: 25.7356, address: 'гр. Бяла, Производствена зона',        status: 'PENDING' },
          { orderId: inTransitOrders[2].id, stopType: 'LOAD',   sequence: 2, lat: 43.5401, lng: 25.6212, address: 'с. Ценово, Стопански двор',            status: 'PENDING' },
          { orderId: awaitingOrders[0].id,  stopType: 'PICKUP', sequence: 3, lat: 43.4512, lng: 25.7689, address: 'с. Борово, ул. Васил Левски 2',        status: 'PENDING' },
          { orderId: inTransitOrders[1].id, stopType: 'UNLOAD', sequence: 4, lat: 43.4676, lng: 25.7312, address: 'Депо Бяла',                           status: 'PENDING' },
        ]
      }
    }
  });

  // Trip 3: Volvo FE (amber) — COMPLETED yesterday — Русе city
  const trip3 = await prisma.trip.create({
    data: {
      truckId: trucks[2].id,
      date: new Date(yesterdayMs + 7.5 * 3600000),
      status: 'COMPLETED',
      startedAt: new Date(yesterdayMs + 8 * 3600000),
      completedAt: new Date(yesterdayMs + 14 * 3600000),
      totalKm: 28,
      disposalSiteId: disposalSites[0].id,
      stops: {
        create: [
          { orderId: completedOrders[0].id, stopType: 'LOAD',   sequence: 1, lat: 43.8512, lng: 26.0412, address: 'ул. Тутракан 8, Русе',         status: 'COMPLETED', arrivedAt: new Date(yesterdayMs + 8.5 * 3600000),  completedAt: new Date(yesterdayMs + 9 * 3600000) },
          { orderId: completedOrders[1].id, stopType: 'LOAD',   sequence: 2, lat: 43.8578, lng: 26.0489, address: 'бул. Трети март 55, Русе',      status: 'COMPLETED', arrivedAt: new Date(yesterdayMs + 10 * 3600000), completedAt: new Date(yesterdayMs + 10.5 * 3600000) },
          { orderId: completedOrders[0].id, stopType: 'UNLOAD', sequence: 3, lat: 43.8045, lng: 26.0512, address: 'РДНО "Липник", с. Липник, Русе', status: 'COMPLETED', arrivedAt: new Date(yesterdayMs + 12 * 3600000), completedAt: new Date(yesterdayMs + 13 * 3600000) },
        ]
      }
    }
  });
  console.log('  3 демо курса създадени (IN_PROGRESS + PLANNED + COMPLETED)');

  console.log('Създаване на фактури...');
  const invoices = await Promise.all([
    prisma.invoice.create({ data: { clientId: stroyInvest.id, orderId: completedOrders[0].id, amount: 850.00, currency: 'BGN', status: 'PAID', dueDate: daysAgo(5), paidAt: daysAgo(3) } }),
    prisma.invoice.create({ data: { clientId: agrostroy.id, orderId: completedOrders[1].id, amount: 620.00, currency: 'BGN', status: 'PAID', dueDate: daysAgo(2), paidAt: daysAgo(1) } }),
    prisma.invoice.create({ data: { clientId: martenIndustry.id, orderId: inTransitOrders[0].id, amount: 580.00, currency: 'BGN', status: 'SENT', dueDate: daysAhead(14) } }),
    prisma.invoice.create({ data: { clientId: ekoBeton.id, orderId: inTransitOrders[1].id, amount: 490.00, currency: 'BGN', status: 'DRAFT', dueDate: daysAhead(30) } }),
    prisma.invoice.create({ data: { clientId: dunavStroy.id, orderId: confirmedOrders[0].id, amount: 920.00, currency: 'BGN', status: 'DRAFT', dueDate: daysAhead(30) } }),
  ]);
  console.log('  ' + invoices.length + ' фактури създадени');

  console.log('');
  console.log('Сийдването завърши успешно!');
  console.log('='.repeat(50));
  console.log('Депа: ' + disposalSites.length);
  console.log('Типове контейнери: ' + containerTypes.length);
  console.log('Контейнери: ' + containers.length);
  console.log('Клиенти: ' + clients.length + ' (8 корпоративни + 7 физически лица)');
  console.log('Потребители: ' + users.length);
  console.log('Камиони: ' + trucks.length);
  console.log('Заявки: ' + allOrders.length);
  console.log('Курсове: 3 (1 активен, 1 планиран, 1 завършен)');
  console.log('Фактури: ' + invoices.length);
  console.log('');
  console.log('ДЕМО АКАУНТИ (парола: password123):');
  console.log('  admin@wastelogix.bg       ADMIN');
  console.log('  dispatcher@wastelogix.bg  DISPATCHER');
  console.log('  accountant@wastelogix.bg  ACCOUNTANT');
  console.log('  driver1@wastelogix.bg     DRIVER (Калоян Митев)');
  console.log('  driver2@wastelogix.bg     DRIVER (Радослав Георгиев)');
  console.log('  driver3@wastelogix.bg     DRIVER (Симеон Тодоров)');
  console.log('  corporate@buildco.bg      CORPORATE_CLIENT');
  console.log('  ivan@gmail.com            INDIVIDUAL_CLIENT');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Грешка при сийдване:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { main };
