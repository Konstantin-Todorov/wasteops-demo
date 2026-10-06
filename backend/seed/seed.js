'use strict';
require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');
const { HQ, PLACES, STREETS, CORPORATE, INDIVIDUAL, WASTE_TYPES, DRIVER_NAMES } = require('./data');

/* ── помощни ───────────────────────────────────────────────────────────── */
let seed = 20261006;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = a => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const jitter = (v, m = 0.004) => v + (rnd() - 0.5) * m;
const daysFrom = d => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(8, 0, 0, 0); return x; };

function addressAt(place) {
  if (place.urban || place.industrial) return `${pick(STREETS)} ${int(1, 160)}, Русе`;
  return `${place.name}, ${pick(STREETS)} ${int(1, 60)}`;
}

async function main() {
  console.log('Изчистване…');
  await prisma.routeLog.deleteMany();
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

  /* ── депа ───────────────────────────────────────────────────────────── */
  const sites = await Promise.all([
    { name: 'РДНО „Липник"', address: 'с. Липник, общ. Русе', lat: 43.8045, lng: 26.0512, wasteTypes: ['строителни', 'смесени', 'инертни', 'земни маси'] },
    { name: 'Депо Бяла', address: 'гр. Бяла, обл. Русе', lat: 43.4676, lng: 25.7312, wasteTypes: ['смесени', 'битови'] },
    { name: 'Площадка Мартен', address: 'с. Мартен, общ. Русе', lat: 43.8742, lng: 25.9139, wasteTypes: ['инертни', 'строителни', 'метални'] },
    { name: 'Депо Две могили', address: 'гр. Две могили, обл. Русе', lat: 43.5961, lng: 25.8803, wasteTypes: ['смесени', 'строителни'] },
    { name: 'Сортировъчна Русе', address: 'Източна промишлена зона, Русе', lat: 43.8689, lng: 26.0012, wasteTypes: ['хартия и картон', 'пластмаса', 'метални', 'дървесни'] },
  ].map(d => prisma.disposalSite.create({ data: { ...d, radiusM: 300, active: true } })));
  console.log(`  ${sites.length} депа`);

  /* ── типове контейнери ──────────────────────────────────────────────── */
  const types = await Promise.all([
    { code: 'КОФ_1.1', name: 'Кофа 1.1 м³',        volumeM3: 1.1, maxWeightKg: 500,   description: 'Битови отпадъци — сметосъбирач' },
    { code: 'КОН_4',   name: 'Контейнер 4 м³',     volumeM3: 4,   maxWeightKg: 4000,  description: 'Строителни отпадъци — скип' },
    { code: 'КОН_7',   name: 'Контейнер 7 м³',     volumeM3: 7,   maxWeightKg: 7000,  description: 'Смесени отпадъци — скип' },
    { code: 'КОН_10',  name: 'Контейнер 10 м³',    volumeM3: 10,  maxWeightKg: 10000, description: 'Строителни — мултилифт' },
    { code: 'РОЛ_20',  name: 'Ролкова кутия 20 м³', volumeM3: 20, maxWeightKg: 15000, description: 'Едри отпадъци — мултилифт' },
    { code: 'РОЛ_30',  name: 'Ролкова кутия 30 м³', volumeM3: 30, maxWeightKg: 20000, description: 'Промишлени — мултилифт' },
  ].map(d => prisma.containerType.create({ data: d })));
  const [kof, kon4, kon7, kon10, rol20, rol30] = types;
  const skipTypes = [kon4, kon7];
  const liftTypes = [kon10, rol20, rol30];
  console.log(`  ${types.length} типа контейнери`);

  /* ── клиенти ────────────────────────────────────────────────────────── */
  const clients = [];
  for (const [name, sector, taxId, contact] of CORPORATE) {
    const place = sector === 'индустриална' ? pick(PLACES.filter(p => p.industrial || p.area === 'общ. Русе'))
                 : sector === 'търговска'   ? pick(PLACES.filter(p => p.urban))
                 : pick(PLACES);
    clients.push(await prisma.client.create({ data: {
      type: 'CORPORATE', name, taxId, address: addressAt(place),
      lat: jitter(place.lat), lng: jitter(place.lng),
      contactName: contact, contactPhone: `+3598881${int(10000, 99999)}`,
      email: `office@${name.toLowerCase().replace(/[^a-zа-я0-9]/gi, '').slice(0, 12)}.bg`,
      notes: `${sector} фирма · плащане в 30 дни`,
    } }));
  }
  for (const name of INDIVIDUAL) {
    const place = pick(PLACES.filter(p => !p.industrial));
    clients.push(await prisma.client.create({ data: {
      type: 'INDIVIDUAL', name, address: addressAt(place),
      lat: jitter(place.lat), lng: jitter(place.lng),
      contactPhone: `+3598882${int(10000, 99999)}`,
      email: `${name.split(' ')[0].toLowerCase()}@abv.bg`,
    } }));
  }
  const corporate = clients.filter(c => c.type === 'CORPORATE');
  const individuals = clients.filter(c => c.type === 'INDIVIDUAL');
  console.log(`  ${clients.length} клиенти (${corporate.length} фирми, ${individuals.length} частни)`);

  /* ── потребители ────────────────────────────────────────────────────── */
  const hash = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.create({ data: { email: 'admin@wastelogix.bg', passwordHash: hash, name: 'Иван Админов', role: 'ADMIN', phone: '+359888000001' } });
  await prisma.user.create({ data: { email: 'dispatcher@wastelogix.bg', passwordHash: hash, name: 'Диспечер', role: 'DISPATCHER', phone: '+359888000002' } });
  await prisma.user.create({ data: { email: 'accountant@wastelogix.bg', passwordHash: hash, name: 'Мария Счетоводител', role: 'ACCOUNTANT', phone: '+359888000003' } });
  const drivers = [];
  for (let i = 0; i < DRIVER_NAMES.length; i++) {
    drivers.push(await prisma.user.create({ data: {
      email: `driver${i + 1}@wastelogix.bg`, passwordHash: hash, name: DRIVER_NAMES[i],
      role: 'DRIVER', phone: `+35988800010${i}`, hourlyRate: 12 + i,
    } }));
  }
  await prisma.user.create({ data: { email: 'corporate@buildco.bg', passwordHash: hash, name: corporate[0].contactName, role: 'CORPORATE_CLIENT', clientId: corporate[0].id } });
  await prisma.user.create({ data: { email: 'ivan@gmail.com', passwordHash: hash, name: individuals[0].name, role: 'INDIVIDUAL_CLIENT', clientId: individuals[0].id } });
  console.log('  потребители готови');

  /* ── камиони ────────────────────────────────────────────────────────── */
  const trucks = await Promise.all([
    prisma.truck.create({ data: { plate: 'Р 5678 CD', model: 'ZOELLER Medium XL', year: 2021, capacityM3: 16, capacityKg: 9000,  color: '#16a34a', fuelType: 'дизел', fuelL100: 38, mileageKm: 142000, driverId: drivers[0].id, status: 'AVAILABLE', notes: 'Сметосъбирач — търговски маршрут' } }),
    prisma.truck.create({ data: { plate: 'Р 1234 АВ', model: 'MEILLER RS21',      year: 2020, capacityM3: 30, capacityKg: 18000, color: '#2563eb', fuelType: 'дизел', fuelL100: 42, mileageKm: 198000, driverId: drivers[1].id, status: 'AVAILABLE', notes: 'Мултилифт — ролкови контейнери' } }),
    prisma.truck.create({ data: { plate: 'Р 9012 EF', model: 'Skip handler AK12',  year: 2022, capacityM3: 10, capacityKg: 8000,  color: '#ea580c', fuelType: 'дизел', fuelL100: 34, mileageKm: 76000,  driverId: drivers[2].id, status: 'AVAILABLE', notes: 'Скип — малки контейнери' } }),
  ]);
  const [zoeller, meiller, skip] = trucks;
  console.log('  3 камиона');

  /* ── контейнери в парка ─────────────────────────────────────────────── */
  const containers = [];
  const park = [[kon4, 14, 'СК'], [kon7, 10, 'СК'], [kon10, 9, 'МЛ'], [rol20, 7, 'РЛ'], [rol30, 4, 'РЛ']];
  let n = 1;
  for (const [type, count, prefix] of park) {
    for (let i = 0; i < count; i++) {
      containers.push(await prisma.container.create({ data: {
        code: `${prefix}-${String(n).padStart(3, '0')}`,
        qrCode: `QR${String(n).padStart(5, '0')}`,
        containerTypeId: type.id, status: 'AVAILABLE',
      } }));
      n++;
    }
  }
  console.log(`  ${containers.length} контейнера`);


  /* ── заявки ─────────────────────────────────────────────────────────── */
  // Обемите следват как реално работи такава фирма:
  //   сметосъбирач — фиксиран търговски маршрут, 24–28 спирки на ден
  //   мултилифт и скип — по заявка, 7–9 спирки в цикъл депо↔клиент
  const orders = [];

  async function makeOrder({ client, orderType, status, containerType, day, wasteType, volumeM3, estimatedKg, channel }) {
    const w = wasteType || pick(WASTE_TYPES).name;
    return prisma.order.create({ data: {
      clientId: client.id, orderType, wasteType: w,
      volumeM3: volumeM3 ?? (orderType === 'CONTAINER' ? containerType?.volumeM3 : null),
      estimatedKg: estimatedKg ?? (orderType === 'GARBAGE_TRUCK' ? int(300, 2400) : null),
      containerTypeId: orderType === 'CONTAINER' ? containerType?.id : null,
      address: client.address, lat: client.lat, lng: client.lng,
      requestedDate: daysFrom(day), status,
      paymentMethod: client.type === 'CORPORATE' ? 'банков превод' : 'в брой',
      sourceChannel: channel || pick(['Телефон', 'Онлайн', 'Имейл', 'Договор']),
      notes: rnd() > 0.75 ? 'Достъп само до 16:00 ч.' : null,
    } });
  }

  // 1. Търговски маршрут на сметосъбирача — много малки спирки
  const routeClients = [...corporate.filter(c => /търговска|обществена/.test(c.notes || '')), ...corporate].slice(0, 28);
  const garbageOrders = [];
  for (const c of routeClients) {
    garbageOrders.push(await makeOrder({
      client: c, orderType: 'GARBAGE_TRUCK', status: 'CONFIRMED', day: 0,
      wasteType: pick(['смесени', 'хартия и картон', 'пластмаса']),
      estimatedKg: int(120, 900), channel: 'Договор',
    }));
  }

  // 2. Контейнерни заявки — различни етапи от жизнения цикъл
  const containerOrders = { pending: [], confirmed: [], awaiting: [], pickup: [], completed: [] };
  const builders = corporate.filter(c => /строителна|индустриална/.test(c.notes || ''));

  for (let i = 0; i < 9; i++)
    containerOrders.pending.push(await makeOrder({ client: pick([...builders, ...individuals]), orderType: 'CONTAINER',
      status: 'PENDING_ADMIN', containerType: pick([...skipTypes, ...liftTypes]), day: int(1, 4) }));

  for (let i = 0; i < 14; i++)
    containerOrders.confirmed.push(await makeOrder({ client: pick(builders), orderType: 'CONTAINER',
      status: 'CONFIRMED', containerType: pick([...skipTypes, ...liftTypes]), day: int(0, 2) }));

  // контейнери, които стоят при клиента и се пълнят
  for (let i = 0; i < 16; i++)
    containerOrders.awaiting.push(await makeOrder({ client: pick(builders), orderType: 'CONTAINER',
      status: 'AWAITING_FILL', containerType: pick([...skipTypes, ...liftTypes]), day: -int(2, 9) }));

  // клиентът е сигнализирал — чакат вземане
  for (let i = 0; i < 11; i++)
    containerOrders.pickup.push(await makeOrder({ client: pick(builders), orderType: 'CONTAINER',
      status: 'PICKUP_SCHEDULED', containerType: pick([...skipTypes, ...liftTypes]), day: 0 }));

  // история за BI
  for (let i = 0; i < 38; i++)
    containerOrders.completed.push(await makeOrder({ client: pick([...builders, ...individuals]), orderType: 'CONTAINER',
      status: 'COMPLETED', containerType: pick([...skipTypes, ...liftTypes]), day: -int(5, 45) }));

  orders.push(...garbageOrders, ...Object.values(containerOrders).flat());
  console.log(`  ${orders.length} заявки`);

  /* ── контейнери при клиенти ─────────────────────────────────────────── */
  // Контейнер, който стои при клиент, е зает — това е основата на
  // проследимостта и на таксата за престой.
  let freeContainers = [...containers];
  for (const o of [...containerOrders.awaiting, ...containerOrders.pickup]) {
    const match = freeContainers.find(c => c.containerTypeId === o.containerTypeId);
    if (!match) continue;
    freeContainers = freeContainers.filter(c => c.id !== match.id);
    await prisma.container.update({ where: { id: match.id }, data: {
      status: 'DEPLOYED', currentOrderId: o.id, currentLat: o.lat, currentLng: o.lng,
    } });
  }
  console.log(`  ${containers.length - freeContainers.length} контейнера при клиенти, ${freeContainers.length} свободни`);

  /* ── събития по заявките ────────────────────────────────────────────── */
  const events = [];
  const ev = (orderId, eventType, daysAgo, notes) => events.push({
    orderId, eventType, userId: admin.id, notes,
    createdAt: new Date(Date.now() - daysAgo * 86400000),
  });
  for (const o of orders) {
    ev(o.id, 'order_created', 10, 'Заявката е подадена');
    if (o.status !== 'PENDING_ADMIN') ev(o.id, 'admin_confirmed', 9, 'Потвърдена от диспечер');
    if (['AWAITING_FILL', 'PICKUP_SCHEDULED', 'COMPLETED'].includes(o.status)) ev(o.id, 'container_delivered', 7);
    if (['PICKUP_SCHEDULED', 'COMPLETED'].includes(o.status)) ev(o.id, 'container_full', 3, 'Клиентът сигнализира');
    if (o.status === 'COMPLETED') { ev(o.id, 'at_disposal', 2); ev(o.id, 'admin_verified', 1, 'Разтоварването е верифицирано'); }
  }
  await prisma.orderEvent.createMany({ data: events });
  console.log(`  ${events.length} събития`);

  /* ── курсове ────────────────────────────────────────────────────────── */
  // Всеки курс има толкова спирки, колкото реално има в този бизнес —
  // иначе картата и оптимизацията нямат какво да покажат.
  let tripCount = 0, stopCount = 0;

  async function makeTrip({ truck, date, status, orderList, stopTypeFor, site, completedUpTo }) {
    if (!orderList.length) return null;
    const stops = orderList.map((o, i) => ({
      orderId: o.id,
      stopType: stopTypeFor(o, i),
      sequence: i + 1,
      lat: o.lat, lng: o.lng, address: o.address,
      status: completedUpTo != null && i < completedUpTo ? 'COMPLETED' : 'PENDING',
      ...(completedUpTo != null && i < completedUpTo
        ? { arrivedAt: new Date(date.getTime() + i * 22 * 60000),
            completedAt: new Date(date.getTime() + (i * 22 + 9) * 60000) }
        : {}),
    }));
    const trip = await prisma.trip.create({ data: {
      truckId: truck.id, date, status, disposalSiteId: site.id,
      ...(status === 'COMPLETED' ? {
        startedAt: date,
        completedAt: new Date(date.getTime() + stops.length * 24 * 60000),
        totalKm: Math.round(stops.length * (truck.id === zoeller.id ? 3.4 : 11.5) * 10) / 10,
        unloadWeightKg: int(2200, 9000),
        unloadWasteType: pick(WASTE_TYPES).name,
      } : status === 'IN_PROGRESS' ? { startedAt: date } : {}),
      stops: { create: stops },
    } });
    tripCount++; stopCount += stops.length;
    return trip;
  }

  const shuffled = a => [...a].sort(() => rnd() - 0.5);

  // ── ДНЕС ────────────────────────────────────────────────────────────
  // Сметосъбирач: един дълъг търговски маршрут, вече наполовина изпълнен
  await makeTrip({
    truck: zoeller, date: daysFrom(0), status: 'IN_PROGRESS',
    orderList: garbageOrders.slice(0, 26),
    stopTypeFor: () => 'LOAD',
    site: sites[0], completedUpTo: 11,
  });

  // Мултилифт: цикъл доставка / вземане / размяна
  const liftToday = shuffled([...containerOrders.pickup, ...containerOrders.confirmed]).slice(0, 8);
  await makeTrip({
    truck: meiller, date: daysFrom(0), status: 'IN_PROGRESS',
    orderList: liftToday,
    stopTypeFor: (o) => o.status === 'PICKUP_SCHEDULED' ? (rnd() > 0.5 ? 'SWAP' : 'PICKUP') : 'DELIVERY',
    site: sites[2], completedUpTo: 3,
  });

  // Скип: собствен цикъл
  const skipToday = shuffled([...containerOrders.confirmed, ...containerOrders.pickup]).slice(0, 7);
  await makeTrip({
    truck: skip, date: daysFrom(0), status: 'PLANNED',
    orderList: skipToday,
    stopTypeFor: (o) => o.status === 'PICKUP_SCHEDULED' ? 'PICKUP' : 'DELIVERY',
    site: sites[0],
  });

  // ── УТРЕ ────────────────────────────────────────────────────────────
  await makeTrip({
    truck: meiller, date: daysFrom(1), status: 'PLANNED',
    orderList: shuffled(containerOrders.confirmed).slice(0, 7),
    stopTypeFor: () => 'DELIVERY', site: sites[2],
  });
  await makeTrip({
    truck: skip, date: daysFrom(1), status: 'PLANNED',
    orderList: shuffled(containerOrders.pending).slice(0, 6),
    stopTypeFor: () => 'DELIVERY', site: sites[0],
  });

  // ── ИСТОРИЯ (за BI и отчети) ────────────────────────────────────────
  const done = shuffled(containerOrders.completed);
  let cursor = 0;
  for (let d = 1; d <= 14; d++) {
    // сметосъбирачът кара всеки делник
    const dow = daysFrom(-d).getDay();
    if (dow !== 0) {
      await makeTrip({
        truck: zoeller, date: daysFrom(-d), status: 'COMPLETED',
        orderList: shuffled(garbageOrders).slice(0, int(22, 28)),
        stopTypeFor: () => 'LOAD', site: sites[0], completedUpTo: 99,
      });
    }
    // мултилифт и скип — през ден
    for (const truck of (d % 2 ? [meiller, skip] : [meiller])) {
      const batch = done.slice(cursor, cursor + int(6, 9));
      cursor += batch.length;
      if (cursor >= done.length) cursor = 0;
      if (batch.length >= 4) {
        await makeTrip({
          truck, date: daysFrom(-d), status: 'COMPLETED', orderList: batch,
          stopTypeFor: (_, i) => i % 3 === 0 ? 'SWAP' : i % 2 ? 'PICKUP' : 'DELIVERY',
          site: pick(sites), completedUpTo: 99,
        });
      }
    }
  }
  console.log(`  ${tripCount} курса, ${stopCount} спирки (средно ${(stopCount / tripCount).toFixed(1)} на курс)`);

  /* ── фактури ────────────────────────────────────────────────────────── */
  const settings = await prisma.companySettings.upsert({
    where: { id: 'default' }, update: {},
    create: { id: 'default', name: 'Управление на отпадъци ЕООД', taxId: '203031394',
              address: 'бул. Липник 123, Русе', invoicePrefix: 'INV', invoiceNextNum: 1 },
  });
  let num = 1;
  const invStatuses = ['PAID', 'PAID', 'PAID', 'SENT', 'SENT', 'OVERDUE', 'DRAFT'];
  for (const o of containerOrders.completed.slice(0, 32)) {
    const amount = Math.round((o.volumeM3 || 4) * settings.pricePerM3 * 100) / 100;
    const status = pick(invStatuses);
    await prisma.invoice.create({ data: {
      invoiceNumber: `INV-${String(num++).padStart(4, '0')}`,
      clientId: o.clientId, orderId: o.id, amount, taxPct: 20, status,
      items: [{ description: `${o.wasteType} — контейнер ${o.volumeM3} м³`, qty: o.volumeM3, unit: 'м³', price: settings.pricePerM3 }],
      dueDate: new Date(Date.now() + (status === 'OVERDUE' ? -int(3, 20) : int(5, 25)) * 86400000),
      ...(status === 'PAID' ? { paidAt: new Date(Date.now() - int(1, 14) * 86400000) } : {}),
    } });
  }
  await prisma.companySettings.update({ where: { id: 'default' }, data: { invoiceNextNum: num } });
  console.log(`  ${num - 1} фактури`);

  console.log('\nГотово.');
}


module.exports = { main };
